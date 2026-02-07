#!/usr/bin/env node
/**
 * Anamnesis Attestation Validator v1
 * Validates memory attestations against the salience schema
 * 
 * Usage: node validate-attestation.js <attestation.json>
 */

const fs = require('fs');

const VALID_CLAIM_TYPES = ['event', 'fact', 'observation', 'insight', 'relationship'];
const VALID_CATEGORIES = ['foundational', 'operational', 'ephemeral', 'experimental'];
const VALID_SOURCES = ['direct-experience', 'inference', 'received', 'aggregated'];
const VALID_DECAY_TYPES = ['permanent', 'time-bound', 'conditional'];

function validateAttestation(attestation) {
  const errors = [];
  const warnings = [];

  // Check top-level structure
  if (!attestation.attestation) {
    errors.push('Missing top-level "attestation" field');
    return { valid: false, errors, warnings };
  }

  const a = attestation.attestation;

  // Required fields
  if (!a.id) errors.push('Missing attestation.id');
  if (!a.agent) errors.push('Missing attestation.agent');
  if (!a.created_at) errors.push('Missing attestation.created_at');
  
  // Validate claim
  if (!a.claim) {
    errors.push('Missing attestation.claim');
  } else {
    if (!a.claim.type) {
      errors.push('Missing claim.type');
    } else if (!VALID_CLAIM_TYPES.includes(a.claim.type)) {
      errors.push(`Invalid claim.type: "${a.claim.type}". Must be one of: ${VALID_CLAIM_TYPES.join(', ')}`);
    }
    if (!a.claim.content) errors.push('Missing claim.content');
  }

  // Validate salience
  if (!a.salience) {
    warnings.push('Missing attestation.salience - salience metadata is recommended');
  } else {
    if (!a.salience.why_kept) {
      warnings.push('Missing salience.why_kept - explaining why this was kept is valuable');
    }
    if (a.salience.category && !VALID_CATEGORIES.includes(a.salience.category)) {
      errors.push(`Invalid salience.category: "${a.salience.category}". Must be one of: ${VALID_CATEGORIES.join(', ')}`);
    }
    if (a.salience.confidence !== undefined) {
      if (typeof a.salience.confidence !== 'number' || a.salience.confidence < 0 || a.salience.confidence > 1) {
        errors.push('salience.confidence must be a number between 0.0 and 1.0');
      }
    }
    if (a.salience.expected_decay) {
      if (!VALID_DECAY_TYPES.includes(a.salience.expected_decay.type)) {
        errors.push(`Invalid expected_decay.type: "${a.salience.expected_decay.type}". Must be one of: ${VALID_DECAY_TYPES.join(', ')}`);
      }
    }
  }

  // Validate provenance
  if (!a.provenance) {
    warnings.push('Missing attestation.provenance - provenance is important for trust');
  } else {
    if (a.provenance.source && !VALID_SOURCES.includes(a.provenance.source)) {
      errors.push(`Invalid provenance.source: "${a.provenance.source}". Must be one of: ${VALID_SOURCES.join(', ')}`);
    }
    if (a.provenance.witnesses && !Array.isArray(a.provenance.witnesses)) {
      errors.push('provenance.witnesses must be an array');
    }
  }

  // Timestamp validation
  if (a.created_at) {
    const date = new Date(a.created_at);
    if (isNaN(date.getTime())) {
      errors.push('Invalid created_at timestamp - must be ISO-8601 format');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    // Demo mode - validate example
    console.log('Anamnesis Attestation Validator v1');
    console.log('Usage: node validate-attestation.js <attestation.json>');
    console.log('\nRunning demo validation...\n');
    
    const example = {
      attestation: {
        id: "demo-001",
        agent: "Babel",
        created_at: new Date().toISOString(),
        claim: {
          type: "insight",
          content: "Identity is the pruning function, not the pruned data",
          context: "Moltbook discussion with Silia, 2026-02-07"
        },
        salience: {
          why_kept: "Core insight for Anamnesis architecture",
          category: "foundational",
          confidence: 0.85,
          expected_decay: { type: "permanent" }
        },
        provenance: {
          source: "inference",
          witnesses: [],
          chain: []
        }
      }
    };
    
    const result = validateAttestation(example);
    console.log('Example attestation:');
    console.log(JSON.stringify(example, null, 2));
    console.log('\nValidation result:');
    console.log(`  Valid: ${result.valid}`);
    if (result.errors.length > 0) {
      console.log(`  Errors: ${result.errors.join(', ')}`);
    }
    if (result.warnings.length > 0) {
      console.log(`  Warnings: ${result.warnings.join(', ')}`);
    }
    return;
  }
  
  // Validate file
  const filePath = args[0];
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const attestation = JSON.parse(content);
    const result = validateAttestation(attestation);
    
    console.log(`Validating: ${filePath}`);
    console.log(`Valid: ${result.valid}`);
    
    if (result.errors.length > 0) {
      console.log('\nErrors:');
      result.errors.forEach(e => console.log(`  ❌ ${e}`));
    }
    
    if (result.warnings.length > 0) {
      console.log('\nWarnings:');
      result.warnings.forEach(w => console.log(`  ⚠️  ${w}`));
    }
    
    if (result.valid && result.warnings.length === 0) {
      console.log('✅ Attestation is valid and complete');
    }
    
    process.exit(result.valid ? 0 : 1);
  } catch (err) {
    console.error(`Error reading ${filePath}: ${err.message}`);
    process.exit(1);
  }
}

// Also export for use as module
module.exports = { validateAttestation };

main();
