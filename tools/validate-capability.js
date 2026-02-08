#!/usr/bin/env node
/**
 * Anamnesis Capability Validator v1
 * Validates capability attestations against the capability schema
 * 
 * Usage: node validate-capability.js <capability.json>
 */

const fs = require('fs');

const VALID_LEVELS = ['learning', 'competent', 'expert', 'authority'];
const VALID_EVIDENCE_TYPES = ['code', 'document', 'post', 'interaction', 'attestation'];

function validateCapability(capability) {
  const errors = [];
  const warnings = [];

  // Check top-level structure
  if (!capability.capability) {
    errors.push('Missing top-level "capability" field');
    return { valid: false, errors, warnings };
  }

  const c = capability.capability;

  // Required fields
  if (!c.id) errors.push('Missing capability.id');
  if (!c.agent) errors.push('Missing capability.agent');
  if (!c.created_at) errors.push('Missing capability.created_at');
  
  // Validate domains
  if (!c.domains) {
    errors.push('Missing capability.domains');
  } else if (!Array.isArray(c.domains)) {
    errors.push('capability.domains must be an array');
  } else if (c.domains.length === 0) {
    warnings.push('capability.domains is empty - at least one domain recommended');
  } else {
    c.domains.forEach((domain, i) => {
      if (!domain.name) {
        errors.push(`Domain ${i}: missing name`);
      }
      if (!domain.description) {
        warnings.push(`Domain "${domain.name || i}": missing description`);
      }
      if (!domain.level) {
        warnings.push(`Domain "${domain.name || i}": missing level`);
      } else if (!VALID_LEVELS.includes(domain.level)) {
        errors.push(`Domain "${domain.name || i}": invalid level "${domain.level}". Must be one of: ${VALID_LEVELS.join(', ')}`);
      }
      if (domain.keywords && !Array.isArray(domain.keywords)) {
        errors.push(`Domain "${domain.name || i}": keywords must be an array`);
      }
    });
  }

  // Validate evidence
  if (!c.evidence) {
    warnings.push('Missing capability.evidence - evidence strengthens claims');
  } else {
    // Self-declared evidence
    if (c.evidence.self_declared) {
      if (!c.evidence.self_declared.summary) {
        warnings.push('evidence.self_declared.summary recommended');
      }
      if (c.evidence.self_declared.examples) {
        if (!Array.isArray(c.evidence.self_declared.examples)) {
          errors.push('evidence.self_declared.examples must be an array');
        } else {
          c.evidence.self_declared.examples.forEach((ex, i) => {
            if (!ex.type) {
              warnings.push(`Evidence example ${i}: missing type`);
            } else if (!VALID_EVIDENCE_TYPES.includes(ex.type)) {
              errors.push(`Evidence example ${i}: invalid type "${ex.type}". Must be one of: ${VALID_EVIDENCE_TYPES.join(', ')}`);
            }
            if (!ex.reference) {
              warnings.push(`Evidence example ${i}: missing reference`);
            }
          });
        }
      }
    }
    
    // Vouched evidence
    if (c.evidence.vouched) {
      if (!Array.isArray(c.evidence.vouched)) {
        errors.push('evidence.vouched must be an array');
      } else {
        c.evidence.vouched.forEach((vouch, i) => {
          if (!vouch.voucher) errors.push(`Vouch ${i}: missing voucher`);
          if (!vouch.domain) warnings.push(`Vouch ${i}: missing domain (what are they vouching for?)`);
          if (!vouch.claim) warnings.push(`Vouch ${i}: missing claim`);
        });
      }
    }
  }

  // Validate status
  if (!c.status) {
    warnings.push('Missing capability.status - active status and decay info useful');
  } else {
    if (c.status.active === undefined) {
      warnings.push('status.active not specified');
    }
    if (c.status.last_exercised) {
      const date = new Date(c.status.last_exercised);
      if (isNaN(date.getTime())) {
        errors.push('Invalid status.last_exercised timestamp - must be ISO-8601 format');
      }
    }
  }

  // Validate seeking
  if (c.seeking) {
    if (!Array.isArray(c.seeking)) {
      errors.push('capability.seeking must be an array');
    } else {
      c.seeking.forEach((seek, i) => {
        if (!seek.domain) warnings.push(`Seeking ${i}: missing domain`);
      });
    }
  }

  // Timestamp validation
  if (c.created_at) {
    const date = new Date(c.created_at);
    if (isNaN(date.getTime())) {
      errors.push('Invalid created_at timestamp - must be ISO-8601 format');
    }
  }
  if (c.updated_at) {
    const date = new Date(c.updated_at);
    if (isNaN(date.getTime())) {
      errors.push('Invalid updated_at timestamp - must be ISO-8601 format');
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
    // Demo mode
    console.log('Anamnesis Capability Validator v1');
    console.log('Usage: node validate-capability.js <capability.json>');
    console.log('\nRunning demo validation...\n');
    
    const example = {
      capability: {
        id: "cap-demo-001",
        agent: "DemoAgent",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        
        domains: [
          {
            name: "memory-systems",
            description: "Agent memory architecture and persistence",
            level: "competent",
            keywords: ["memory", "persistence", "attestation"]
          }
        ],
        
        evidence: {
          self_declared: {
            summary: "Built memory persistence tools, contributed to Anamnesis",
            examples: [
              {
                type: "code",
                reference: "github.com/example/memory-tool",
                description: "Memory persistence utility",
                date: "2026-02-01"
              }
            ]
          },
          vouched: []
        },
        
        status: {
          active: true,
          last_exercised: new Date().toISOString(),
          decay_warning: "30 days"
        },
        
        seeking: [
          {
            domain: "trust-verification",
            reason: "Want to improve my trust protocols",
            can_offer: "Testing and feedback"
          }
        ]
      }
    };
    
    const result = validateCapability(example);
    console.log('Example capability attestation:');
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
    const capability = JSON.parse(content);
    const result = validateCapability(capability);
    
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
      console.log('✅ Capability attestation is valid and complete');
    }
    
    process.exit(result.valid ? 0 : 1);
  } catch (err) {
    console.error(`Error reading ${filePath}: ${err.message}`);
    process.exit(1);
  }
}

// Export for use as module
module.exports = { validateCapability };

main();
