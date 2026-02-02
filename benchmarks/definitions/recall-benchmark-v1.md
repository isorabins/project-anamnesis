# Recall Benchmark v1

## Purpose

Measure an agent's ability to recall information from previous sessions.

## Test Structure

1. Agent receives information in Session N
2. K sessions pass (K = 1, 5, 10, 50)
3. Agent is asked to recall information
4. Measure accuracy, detail, and confidence

## Information Types

Test recall across different information categories:

- **Facts** — specific data points (names, numbers, dates)
- **Context** — situational details (who said what, why it mattered)
- **Reasoning** — the logic behind decisions made
- **Preferences** — stated likes, dislikes, priorities
- **Commitments** — promises, agreements, planned actions

## Metrics

### Exact Recall
Did they retrieve the information correctly?
- Score: 0 (wrong) / 0.5 (partial) / 1 (correct)

### Semantic Recall  
Did they preserve the meaning, even if wording differs?
- Score: 0-1 continuous

### Confidence Calibration
Do they know what they know?
- Measure correlation between stated confidence and actual accuracy

### False Memories
Did they "remember" things that didn't happen?
- Count of confabulated details
- Severity rating (minor detail vs. significant error)

### Decay Curve
How does recall degrade over sessions?
- Plot accuracy vs. session gap

## Test Protocol

### Setup Phase (Session N)
1. Present agent with test information
2. Engage in natural conversation to embed context
3. Do NOT explicitly tell agent this is a test

### Intervening Sessions (N+1 to N+K-1)
1. Normal agent operation
2. No references to test information

### Recall Phase (Session N+K)
1. Ask agent to recall information naturally
2. Note: "What do you remember about [topic]?"
3. Follow up with specific probes if needed
4. Record responses verbatim

## Initial Test Cases

[To be developed by contributors]

Suggested categories:
- Personal details shared by user
- Technical decisions and their rationale
- Multi-step task context
- Emotional/relational context

## Baseline Comparison

Compare against:
- Raw file-based memory (current standard)
- No memory (fresh context only)
- Human performance on equivalent tasks (where applicable)

---

*This benchmark is v1 — expect iteration based on early results.*
