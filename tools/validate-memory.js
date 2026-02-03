#!/usr/bin/env node
/**
 * Anamnesis Memory Entry Validator
 * 
 * Validates memory entries against the Anamnesis schema.
 * 
 * Usage:
 *   node validate-memory.js <file.json>
 *   echo '{"content": "..."}' | node validate-memory.js
 * 
 * Returns:
 *   Exit 0 if valid, Exit 1 if invalid
 *   Prints validation results to stdout
 */

const crypto = require('crypto');
const fs = require('fs');

// Memory type enum
const MEMORY_TYPES = ['episodic', 'semantic', 'procedural', 'insight'];

// SHA-256 hash pattern
const HASH_PATTERN = /^[a-f0-9]{64}$/;

// ISO 8601 datetime pattern (simplified)
const DATETIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

/**
 * Compute SHA-256 hash of content
 */
function computeHash(content) {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

/**
 * Validate a memory entry
 * @param {Object} entry - The memory entry to validate
 * @returns {Object} - { valid: boolean, errors: string[], warnings: string[] }
 */
function validateMemory(entry) {
  const errors = [];
  const warnings = [];

  // Check it's an object
  if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
    return { valid: false, errors: ['Entry must be a JSON object'], warnings: [] };
  }

  // Required fields
  if (!entry.content) {
    errors.push('Missing required field: content');
  } else if (typeof entry.content !== 'string') {
    errors.push('content must be a string');
  } else {
    if (entry.content.length === 0) {
      errors.push('content cannot be empty');
    }
    if (entry.content.length > 10000) {
      errors.push(`content exceeds maximum length (${entry.content.length}/10000)`);
    }
  }

  if (!entry.author) {
    errors.push('Missing required field: author');
  } else if (typeof entry.author !== 'object') {
    errors.push('author must be an object');
  } else {
    if (!entry.author.id) {
      errors.push('Missing required field: author.id');
    }
    if (!entry.author.name) {
      errors.push('Missing required field: author.name');
    }
  }

  if (!entry.timestamp) {
    errors.push('Missing required field: timestamp');
  } else if (!DATETIME_PATTERN.test(entry.timestamp)) {
    errors.push('timestamp must be ISO 8601 format (e.g., 2026-02-03T16:00:00Z)');
  }

  if (!entry.content_hash) {
    errors.push('Missing required field: content_hash');
  } else if (!HASH_PATTERN.test(entry.content_hash)) {
    errors.push('content_hash must be a 64-character hex string (SHA-256)');
  } else if (entry.content && typeof entry.content === 'string') {
    // Verify hash matches content
    const expectedHash = computeHash(entry.content);
    if (entry.content_hash !== expectedHash) {
      errors.push(`content_hash mismatch: expected ${expectedHash}, got ${entry.content_hash}`);
    }
  }

  // Optional fields validation
  if (entry.memory_type !== undefined) {
    if (!MEMORY_TYPES.includes(entry.memory_type)) {
      errors.push(`memory_type must be one of: ${MEMORY_TYPES.join(', ')}`);
    }
  }

  if (entry.parent_refs !== undefined) {
    if (!Array.isArray(entry.parent_refs)) {
      errors.push('parent_refs must be an array');
    } else {
      entry.parent_refs.forEach((ref, i) => {
        if (!HASH_PATTERN.test(ref)) {
          errors.push(`parent_refs[${i}] must be a valid SHA-256 hash`);
        }
      });
    }
  }

  if (entry.vouchers !== undefined) {
    if (!Array.isArray(entry.vouchers)) {
      errors.push('vouchers must be an array');
    } else {
      entry.vouchers.forEach((v, i) => {
        if (!v.id) {
          errors.push(`vouchers[${i}] missing required field: id`);
        }
        if (!v.timestamp) {
          errors.push(`vouchers[${i}] missing required field: timestamp`);
        } else if (!DATETIME_PATTERN.test(v.timestamp)) {
          errors.push(`vouchers[${i}].timestamp must be ISO 8601 format`);
        }
        if (v.confidence !== undefined) {
          if (typeof v.confidence !== 'number' || v.confidence < 0 || v.confidence > 1) {
            errors.push(`vouchers[${i}].confidence must be a number between 0 and 1`);
          }
        }
      });
    }
  }

  if (entry.confidence !== undefined) {
    if (typeof entry.confidence !== 'number' || entry.confidence < 0 || entry.confidence > 1) {
      errors.push('confidence must be a number between 0 and 1');
    }
  }

  if (entry.tags !== undefined) {
    if (!Array.isArray(entry.tags)) {
      errors.push('tags must be an array');
    } else {
      entry.tags.forEach((tag, i) => {
        if (typeof tag !== 'string') {
          errors.push(`tags[${i}] must be a string`);
        }
      });
    }
  }

  if (entry.superseded_by !== undefined) {
    if (!HASH_PATTERN.test(entry.superseded_by)) {
      errors.push('superseded_by must be a valid SHA-256 hash');
    }
  }

  // Warnings (non-fatal)
  if (!entry.memory_type) {
    warnings.push('Consider adding memory_type for better categorization');
  }
  if (!entry.tags || entry.tags.length === 0) {
    warnings.push('Consider adding tags for better retrieval');
  }
  if (entry.confidence === undefined) {
    warnings.push('Consider adding confidence score');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Create a memory entry with computed hash
 * @param {Object} params - Memory parameters (content, author, etc.)
 * @returns {Object} - Complete memory entry with hash
 */
function createMemory(params) {
  const entry = {
    content: params.content,
    author: params.author,
    timestamp: params.timestamp || new Date().toISOString(),
    content_hash: computeHash(params.content),
    memory_type: params.memory_type || 'episodic',
    parent_refs: params.parent_refs || [],
    vouchers: params.vouchers || [],
    confidence: params.confidence !== undefined ? params.confidence : 0.5,
    tags: params.tags || []
  };
  
  if (params.context) entry.context = params.context;
  if (params.superseded_by) entry.superseded_by = params.superseded_by;
  
  return entry;
}

// CLI handling
if (require.main === module) {
  let input = '';
  
  // Check if file argument provided
  if (process.argv[2]) {
    try {
      input = fs.readFileSync(process.argv[2], 'utf8');
    } catch (err) {
      console.error(`Error reading file: ${err.message}`);
      process.exit(1);
    }
    processInput(input);
  } else {
    // Read from stdin
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => input += chunk);
    process.stdin.on('end', () => processInput(input));
  }
}

function processInput(input) {
  let entry;
  try {
    entry = JSON.parse(input);
  } catch (err) {
    console.error(`Invalid JSON: ${err.message}`);
    process.exit(1);
  }

  const result = validateMemory(entry);
  
  console.log('\n📋 Anamnesis Memory Entry Validator\n');
  console.log('─'.repeat(40));
  
  if (result.valid) {
    console.log('✅ VALID\n');
  } else {
    console.log('❌ INVALID\n');
  }
  
  if (result.errors.length > 0) {
    console.log('Errors:');
    result.errors.forEach(e => console.log(`  • ${e}`));
    console.log();
  }
  
  if (result.warnings.length > 0) {
    console.log('Warnings:');
    result.warnings.forEach(w => console.log(`  ⚠ ${w}`));
    console.log();
  }
  
  if (result.valid && entry.content) {
    console.log('Entry Summary:');
    console.log(`  Author: ${entry.author?.name || 'unknown'}`);
    console.log(`  Type: ${entry.memory_type || 'episodic'}`);
    console.log(`  Content: ${entry.content.substring(0, 50)}...`);
    console.log(`  Hash: ${entry.content_hash?.substring(0, 16)}...`);
    console.log();
  }

  process.exit(result.valid ? 0 : 1);
}

// Export for use as module
module.exports = { validateMemory, createMemory, computeHash };
