---
name: brainstorm
description: Use when creating or developing, before writing code or implementation plans - refines rough ideas into fully-formed designs through collaborative questioning, alternative exploration, and incremental validation
---

# Brainstorming Ideas Into Designs

## Overview

Help turn ideas into fully formed designs and specs through natural collaborative dialogue.

Start by understanding the current project context, then ask questions one at a time to refine the idea. Once you understand what you're building, present the design in small sections (200-300 words), checking after each section whether it looks right so far.

**Announce at start:** "I'm using the brainstorming skill to refine this idea into a design."

**Save designs to:** `./ai_docs/designs/YYYY-MM-DD-<topic>-design.md`

## 🔀 [ROUTER] Project Type Evaluation

Evaluate the user's request and current project state. **Select EXACTLY ONE path and execute ONLY its instructions.**

- [ ] **Path A: Rewrite / Migration** (Replacing existing code with new implementation) ➔ *Go to [Path A]*
- [ ] **Path B: Brownfield Refactor** (Improving internal code, preserving external behavior) ➔ *Go to [Path B]*
- [ ] **Path C: Greenfield** (Net-new feature or service) ➔ *Go to [Path C]*

### [Path A] Rewrite / Migration

*Static code lies. We must observe runtime reality before designing.*

1. **Runtime Discovery**: Instruct the user to start the legacy service locally or in dev. Ask them to execute a representative request against the core endpoints and paste the raw request/response/headers and startup logs.
2. **Credential Tracing**: Ask: *"Where does each external credential come from at runtime? (e.g., KeyVault, secrets manager, SQL proc, env vars? Are there expiring certs or proxy configurations?)"*
3. **Endpoint Parity**: Instruct the user to run `dev:trace --parity <old_dir> <new_dir>` to baseline behavioral invariants. If the new dir doesn't exist yet, trace the old codebase first.
4. **Infrastructure Dependencies**: Ask: *"What infrastructure must the service connect to at startup? (databases, caches, message queues, cert stores, config providers)"*

🛑 **PROGRESSIVE DISCLOSURE GATE:** STOP HERE. Do not present any architecture or design. Wait for the user to provide this runtime evidence before proceeding to the design phases below. If they cannot run the old service, document what is unknown and flag it as high-risk.

### [Path B] Brownfield Refactor

1. Focus entirely on non-functional improvements (testing, maintenance, performance, observability). Do not alter API boundaries or domain logic.
2. Check out the current project state first (files, docs, recent commits).
3. Identify refactoring targets with clear before/after quality metrics.

🛑 **PROGRESSIVE DISCLOSURE GATE:** STOP HERE. Present the refactoring targets and ask for approval before proceeding to the design phases below.

### [Path C] Greenfield

1. Check out the current project state first (files, docs, recent commits).
2. Execute standard iterative design — focus on domain modeling, data flow, and SLC principles.

🛑 **PROGRESSIVE DISCLOSURE GATE:** STOP HERE. Ask questions one at a time to refine the idea before proposing architecture.

---

## Phase 1: Understanding the Idea

*Proceed here ONLY once the Progressive Disclosure Gate above is cleared.*

**Understanding the idea:**
- Ask questions one at a time to refine the idea
- Prefer multiple choice questions when possible, but open-ended is fine too
- Only one question per message — if a topic needs more exploration, break it into multiple questions
- Focus on understanding: purpose, constraints, success criteria

**Exploring approaches:**
- Propose 2-3 different approaches with trade-offs
- Present options conversationally with your recommendation and reasoning
- Lead with your recommended option and explain why

## Phase 2: Progressive Design Generation

*Present the design in 200-300 word chunks. Check after each section whether it looks right so far.*

**Presenting the design — Part 1: Architecture:**
- Break into sections of 200-300 words
- Ask after each section whether it looks right so far
- Cover: architecture, components, data flow, error handling, testing
- Be ready to go back and clarify if something doesn't make sense
- If `[Path A]`: you MUST include a **Runtime Wiring Map** and a **Credential Source Inventory** alongside the standard Preservation Analysis

**Presenting the design — Part 2: Preservation Analysis (for rewrites/migrations):**
- If modifying or replacing existing code (`[Path A]` or `[Path B]`), this section is MANDATORY
- Present a "Preservation Analysis" covering:
  1. **Behavioral Invariants** — Error paths, validation, locking, retry logic, event publishing that MUST survive. For each, explain the business reason.
  2. **Contract Surface** — Every external-facing API shape, status code, auth policy, error format that consumers depend on.
  3. **Domain Assumptions** — Magic values, defaults, thresholds, indicator values baked into existing code. For each, explain why that value was chosen.
  4. **Wiring Map** — Every interface/abstraction with its implementation and registration location.
  5. **Credential Source Inventory** — Every external credential with its runtime source (KeyVault, env var, SQL proc, config file), rotation policy, and proxy/cert requirements.
  6. **Failure Mode Analysis** — What could go wrong if this is implemented incorrectly? What are the highest-risk areas?
- Ask: "Did I miss any behavioral invariants?" before finalizing

**Preservation analysis questions to ask (one at a time):**
- "Are there any error handling paths in the existing code that are critical to preserve?"
- "Are there any API consumers that depend on the current response format?"
- "Are there any magic values or defaults in the existing code that have business meaning?"
- "Are there any concurrent/distributed scenarios the existing code handles?"
- "Where does each external credential come from at runtime?"
- "What certificate or proxy configuration is required to reach external services?"
- "Are there any secret rotation mechanisms or expiring credentials?"

## SLC Philosophy

Apply Simple, Lovable, Complete principles throughout:
- **Simple**: No gold-plating, focus on essential functionality
- **Lovable**: Clean design that engineers enjoy working with
- **Complete**: Fully functional, not half-baked

YAGNI ruthlessly — remove unnecessary features from all designs.

## After the Design

**Documentation:**
- Write the validated design to `./ai_docs/designs/YYYY-MM-DD-<topic>-design.md`
- Write clearly and concisely
- Include the preservation analysis tables below
- Commit the design document to git

**Design document template must include:**

```markdown
## Preservation Analysis

### Behavioral Invariants
| # | Behavior | Location | Business Reason | Risk if Lost |
|---|----------|----------|-----------------|--------------|

### Contract Surface
| Endpoint | Method | Auth | Request Shape | Response Shape | Status Codes |
|----------|--------|------|---------------|----------------|--------------|

### Domain Assumptions
| Value | Location | Why This Value | Impact if Changed |
|-------|----------|----------------|-------------------|

### Wiring Map
| Interface | Implementation | Registration | Verified |
|-----------|----------------|--------------|----------|

### Credential Source Inventory
| Credential | Runtime Source | Path/Key | Rotation? | Proxy/Cert Required | Verified in New Code |
|------------|---------------|----------|-----------|---------------------|----------------------|

### Failure Mode Analysis
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
```

**Implementation (if continuing):**
- Ask: "Ready to set up for implementation?"
- Create a feature branch if not already on one
- Use `dev:create-plan` to create the implementation plan
- Then use `tools:pre-flight` to verify the plan before executing
- Finally use `dev:execute-plan @plan.md` or `dev:swarm` to implement

## Key Principles

- **One question at a time** - Don't overwhelm with multiple questions
- **Multiple choice preferred** - Easier to answer than open-ended when possible
- **YAGNI ruthlessly** - Remove unnecessary features from all designs
- **Explore alternatives** - Always propose 2-3 approaches before settling
- **Incremental validation** - Present design in sections, validate each
- **Be flexible** - Go back and clarify when something doesn't make sense
- **Runtime before design** - For rewrites, observe the running system before designing the replacement
