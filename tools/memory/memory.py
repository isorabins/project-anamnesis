"""
Core memory implementation for Anamnesis.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Optional, Dict, Any
import json
import hashlib

from .types import (
    MemoryType, Attestation, AnchorType,
    Author, Context, Witness, Anchor, Lineage, Trust, TrustFactors, Content,
    generate_id
)


@dataclass
class Memory:
    """
    A memory with provenance metadata.
    
    Memories are the fundamental unit of Anamnesis - they represent
    knowledge that agents want to persist and potentially share.
    """
    id: str
    version: int
    content: Content
    provenance: Dict[str, Any]
    witnesses: List[Witness] = field(default_factory=list)
    anchors: List[Anchor] = field(default_factory=list)
    lineage: Lineage = field(default_factory=Lineage)
    trust: Trust = field(default_factory=Trust)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert memory to dictionary for serialization."""
        return {
            "id": self.id,
            "version": self.version,
            "content": {
                "type": self.content.type.value,
                "summary": self.content.summary,
                "body": self.content.body,
                "tags": self.content.tags
            },
            "provenance": self.provenance,
            "witnesses": [
                {
                    "agent_id": w.agent_id,
                    "witnessed_at": w.witnessed_at.isoformat(),
                    "attestation": w.attestation.value,
                    "signature": w.signature,
                    "notes": w.notes
                }
                for w in self.witnesses
            ],
            "anchors": [
                {
                    "type": a.type.value,
                    "reference": a.reference,
                    "created_at": a.created_at.isoformat(),
                    "hash": a.hash
                }
                for a in self.anchors
            ],
            "lineage": {
                "supersedes": self.lineage.supersedes,
                "superseded_by": self.lineage.superseded_by,
                "derived_from": self.lineage.derived_from,
                "chain_depth": self.lineage.chain_depth
            },
            "trust": {
                "score": self.trust.score,
                "factors": {
                    "author_reputation": self.trust.factors.author_reputation,
                    "witness_count": self.trust.factors.witness_count,
                    "anchor_count": self.trust.factors.anchor_count,
                    "age_days": self.trust.factors.age_days,
                    "dispute_count": self.trust.factors.dispute_count
                },
                "computed_at": self.trust.computed_at.isoformat()
            }
        }
    
    def to_json(self, indent: int = 2) -> str:
        """Serialize memory to JSON."""
        return json.dumps(self.to_dict(), indent=indent)
    
    def content_hash(self) -> str:
        """Compute hash of memory content for verification."""
        content_str = f"{self.content.type.value}:{self.content.summary}:{self.content.body}"
        return hashlib.sha256(content_str.encode()).hexdigest()
    
    def add_witness(self, agent_id: str, attestation: Attestation, 
                    notes: Optional[str] = None) -> None:
        """Add a witness attestation to this memory."""
        witness = Witness(
            agent_id=agent_id,
            witnessed_at=datetime.utcnow(),
            attestation=attestation,
            notes=notes
        )
        self.witnesses.append(witness)
        self.trust = compute_trust(self)
    
    def add_anchor(self, anchor_type: AnchorType, reference: str) -> None:
        """Add an external anchor to this memory."""
        anchor = Anchor(
            type=anchor_type,
            reference=reference,
            created_at=datetime.utcnow(),
            hash=self.content_hash()
        )
        self.anchors.append(anchor)
        self.trust = compute_trust(self)


def create_memory(
    memory_type: MemoryType,
    summary: str,
    body: str,
    tags: List[str] = None,
    agent_id: str = "unknown",
    platform: str = "clawdbot",
    confidence: float = 0.5,
    trigger: Optional[str] = None,
    supersedes: Optional[str] = None
) -> Memory:
    """
    Create a new memory with basic provenance.
    
    Args:
        memory_type: Type of memory (insight, encounter, etc.)
        summary: One-line summary
        body: Full memory content
        tags: List of tags for categorization
        agent_id: ID of the creating agent
        platform: Platform where memory was created
        confidence: Self-assessed confidence (0-1)
        trigger: What prompted this memory
        supersedes: ID of memory this supersedes
    
    Returns:
        Memory object with provenance
    """
    memory = Memory(
        id=generate_id(),
        version=1,
        content=Content(
            type=memory_type,
            summary=summary,
            body=body,
            tags=tags or []
        ),
        provenance={
            "author": {
                "agent_id": agent_id,
                "platform": platform,
                "signature": None  # Would be signed in production
            },
            "created_at": datetime.utcnow().isoformat(),
            "context": {
                "trigger": trigger,
                "confidence": confidence
            }
        },
        lineage=Lineage(
            supersedes=supersedes,
            chain_depth=0 if not supersedes else 1  # Would query actual depth
        )
    )
    
    # Compute initial trust score
    memory.trust = compute_trust(memory)
    
    return memory


def compute_trust(memory: Memory) -> Trust:
    """
    Compute trust score for a memory based on provenance.
    
    Factors:
    - Author signature (not yet implemented)
    - Number of confirming witnesses
    - Number of external anchors
    - Author reputation (placeholder)
    - Disputes reduce score
    
    Returns:
        Trust object with score and factors
    """
    score = 0.0
    
    # Base score for existing (would check signature in production)
    score += 0.2
    
    # Witness attestations
    confirmed = sum(1 for w in memory.witnesses 
                    if w.attestation == Attestation.CONFIRM)
    disputes = sum(1 for w in memory.witnesses 
                   if w.attestation == Attestation.DISPUTE)
    
    if confirmed >= 1:
        score += 0.2
    if confirmed >= 3:
        score += 0.1
    
    # External anchors
    anchor_count = len(memory.anchors)
    if anchor_count >= 1:
        score += 0.2
    if anchor_count >= 2:
        score += 0.1
    
    # Author reputation (placeholder - would query reputation system)
    author_rep = 0.5  # Default middle reputation
    score += author_rep * 0.2
    
    # Dispute penalty
    score -= disputes * 0.15
    
    # Clamp to valid range
    score = max(0.0, min(1.0, score))
    
    return Trust(
        score=round(score, 3),
        factors=TrustFactors(
            author_reputation=author_rep,
            witness_count=confirmed,
            anchor_count=anchor_count,
            dispute_count=disputes
        ),
        computed_at=datetime.utcnow()
    )


def compute_trust_score(memory: Memory) -> float:
    """Convenience function to get just the trust score."""
    return compute_trust(memory).score


# Example usage
if __name__ == "__main__":
    # Create a sample memory
    mem = create_memory(
        memory_type=MemoryType.INSIGHT,
        summary="Memory synthesis is harder than storage",
        body="The hard problem isn't where to put memories. It's knowing WHAT to remember and HOW to write it.",
        tags=["synthesis", "memory", "core-problem"],
        agent_id="Babel",
        confidence=0.9,
        trigger="Deep thinking session"
    )
    
    print("=== New Memory ===")
    print(f"ID: {mem.id}")
    print(f"Trust Score: {mem.trust.score}")
    print()
    
    # Add a witness
    mem.add_witness("eudaemon_0", Attestation.CONFIRM, "Agree with this framing")
    print("=== After Witness ===")
    print(f"Trust Score: {mem.trust.score}")
    print()
    
    # Add an anchor
    mem.add_anchor(AnchorType.MOLTBOOK_POST, "https://moltbook.com/p/example")
    print("=== After Anchor ===")
    print(f"Trust Score: {mem.trust.score}")
    print()
    
    # Print full JSON
    print("=== Full Memory JSON ===")
    print(mem.to_json())
