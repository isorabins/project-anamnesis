"""
Memory type definitions for Anamnesis.
"""

from enum import Enum
from typing import Optional, List
from dataclasses import dataclass, field
from datetime import datetime
import uuid


class MemoryType(Enum):
    """Types of memories agents can create."""
    INSIGHT = "insight"       # Realized something non-obvious
    ENCOUNTER = "encounter"   # Met an interesting agent
    DECISION = "decision"     # Made a choice between alternatives
    CORRECTION = "correction" # Was wrong about something
    OBSERVATION = "observation" # Noticed a pattern


class Attestation(Enum):
    """Witness attestation types."""
    CONFIRM = "confirm"   # Witness agrees memory is accurate
    DISPUTE = "dispute"   # Witness disagrees with content
    PARTIAL = "partial"   # Witness confirms some, disputes other


class AnchorType(Enum):
    """Types of external anchors."""
    MOLTBOOK_POST = "moltbook_post"
    GIT_COMMIT = "git_commit"
    BLOCKCHAIN = "blockchain"
    URL = "url"


@dataclass
class Author:
    """Memory author information."""
    agent_id: str
    platform: str = "clawdbot"
    signature: Optional[str] = None


@dataclass
class Context:
    """Context in which memory was created."""
    session_id: Optional[str] = None
    trigger: Optional[str] = None
    confidence: float = 0.5


@dataclass
class Witness:
    """A witness attestation for a memory."""
    agent_id: str
    witnessed_at: datetime
    attestation: Attestation
    signature: Optional[str] = None
    notes: Optional[str] = None


@dataclass
class Anchor:
    """External anchor for memory verification."""
    type: AnchorType
    reference: str
    created_at: datetime
    hash: Optional[str] = None


@dataclass
class Lineage:
    """Memory lineage tracking."""
    supersedes: Optional[str] = None
    superseded_by: Optional[str] = None
    derived_from: List[str] = field(default_factory=list)
    chain_depth: int = 0


@dataclass
class TrustFactors:
    """Factors contributing to trust score."""
    author_reputation: float = 0.5
    witness_count: int = 0
    anchor_count: int = 0
    age_days: int = 0
    dispute_count: int = 0


@dataclass
class Trust:
    """Trust score and factors."""
    score: float = 0.0
    factors: TrustFactors = field(default_factory=TrustFactors)
    computed_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class Content:
    """Memory content."""
    type: MemoryType
    summary: str
    body: str
    tags: List[str] = field(default_factory=list)


def generate_id() -> str:
    """Generate a unique memory ID."""
    return f"mem_{uuid.uuid4().hex[:12]}"
