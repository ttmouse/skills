# Task Decomposition Framework

Comprehensive guide for breaking down tasks into actionable, testifiable subtasks.

## Core Principles

### 1. Actionability

Every subtask must be:
- **Specific** - Clear what needs to be done
- **Assignable** - Can be given to one person
- **Time-bound** - Completable in 1-4 hours
- **Testable** - Has clear success criteria

### 2. Testifiability

Every subtask must include:
- **Acceptance criteria** - What defines "done"
- **Test scenarios** - How to verify correctness
- **Verification steps** - Concrete validation process
- **Success metrics** - Measurable outcomes

### 3. Decomposition Rationale

Document why this breakdown:
- **Logical grouping** - Why these chunks make sense
- **Dependency structure** - Why this order
- **Team efficiency** - How this enables parallel work
- **Risk management** - How this mitigates complexity

## Decomposition Process

### Step 1: Understand the Task

**Questions to ask:**
- What is the complete scope?
- What is the current state (as-is)?
- What is the desired state (to-be)?
- What are the constraints?
- Who are the stakeholders?

**Gather context:**
- Read requirements thoroughly
- Review existing code/systems
- Identify dependencies
- Understand technical constraints

### Step 2: Identify Major Components

Break task into high-level phases:

**Example: "Implement user authentication"**
- Phase 1: Backend infrastructure
- Phase 2: API endpoints
- Phase 3: Frontend integration
- Phase 4: Security & testing

### Step 3: Decompose Each Component

Break phases into 1-4 hour chunks:

**Phase 1: Backend infrastructure**
→ Subtask 1: Design database schema (2h)
→ Subtask 2: Implement password hashing (3h)
→ Subtask 3: Create JWT service (4h)

### Step 4: Define Acceptance Criteria

For each subtask, specify:

```markdown
**Acceptance Criteria:**
- [ ] Specific deliverable exists
- [ ] Functionality works as specified
- [ ] Edge cases handled
- [ ] Tests written and passing
- [ ] Documentation updated
```

### Step 5: Identify Dependencies

Map what blocks what:

```
Subtask 1 (database) → Subtask 4 (API)
Subtask 2 (hashing) → Subtask 4 (API)
Subtask 3 (JWT) → Subtask 6 (middleware)
Subtask 4 (API) → Subtask 5 (frontend)
Subtask 5 (frontend) → Subtask 8 (integration tests)
```

### Step 6: Assess Risks

For each subtask and overall:

```markdown
**Risk Level:** MEDIUM
**Description:** JWT secret management complexity
**Impact:** Token forgery possible if misconfigured
**Probability:** Medium
**Mitigation:** Document env vars, use secrets manager
**Owner:** DevOps Team
```

### Step 7: Define Expected Outputs

Concrete deliverables:

```markdown
**Expected Outputs:**
- `services/auth/jwt.py` - Token service implementation
- `tests/test_jwt.py` - Unit tests (>90% coverage)
- `docs/jwt-setup.md` - Configuration guide
- Environment variable documentation
```

## Subtask Template

```markdown
### [ID]. [Title]
**Priority:** [P0/P1/P2] ([Description])
**Estimate:** [X] hours
**Labels:** [label1, label2, label3]
**Dependencies:** [#1, #2] or None

**Description:**
[2-3 sentences describing what needs to be done]

**Acceptance Criteria:**
- [ ] [Specific deliverable]
- [ ] [Functionality requirement]
- [ ] [Quality requirement]
- [ ] [Documentation requirement]

**Testing:**
- [ ] [Unit test scenario]
- [ ] [Integration test scenario]
- [ ] [Edge case scenario]
- [ ] [Performance/quality check]

**Expected Outputs:**
- [File/artifact 1]
- [File/artifact 2]
- [Documentation]

**Risks:**
- [LEVEL]: [Description] (mitigation: [Plan])
```

## Estimation Guidelines

### Task Sizing

**1 hour tasks:**
- Simple configuration changes
- Minor UI updates
- Documentation updates
- Basic bug fixes

**2 hour tasks:**
- Single component implementation
- Database schema design
- API endpoint creation
- Unit test suite for one module

**3 hour tasks:**
- Complex component with logic
- Service layer implementation
- Integration of multiple pieces
- Comprehensive test coverage

**4 hour tasks:**
- Full feature implementation
- Complex refactoring
- Security audit
- End-to-end integration

**Over 4 hours = DECOMPOSE FURTHER**

### Estimation Accuracy

Consider:
- Team skill level
- Technology familiarity
- Code complexity
- Testing requirements
- Documentation needs

Add buffer for:
- Code review time
- Unexpected complexity
- Integration issues
- Testing edge cases

## Dependency Management

### Types of Dependencies

**Hard dependencies:**
```
Database schema MUST exist before API implementation
```

**Soft dependencies:**
```
Frontend CAN start with mocked API while backend develops
```

**Optional dependencies:**
```
Documentation CAN be written in parallel with implementation
```

### Dependency Patterns

**Sequential (waterfall):**
```
1 → 2 → 3 → 4
```
Use when each step builds on previous.

**Parallel (concurrent):**
```
    1
  ↙  ↓  ↘
 2   3   4
```
Use when tasks are independent.

**Diamond (sync point):**
```
    1
  ↙   ↘
 2     3
  ↘   ↙
    4
```
Use when parallel work converges.

### Avoiding Circular Dependencies

❌ **Bad:**
```
A depends on B
B depends on C
C depends on A  # Circular!
```

✅ **Good:**
```
A depends on B
B depends on C
# No backwards dependencies
```

## Risk Assessment Framework

### Risk Levels

**HIGH:**
- Could block entire project
- Security implications
- Data loss potential
- Major refactoring required

**MEDIUM:**
- Could delay by >1 day
- Requires external dependency
- Performance concerns
- Integration complexity

**LOW:**
- Minor delays possible
- Easy workarounds exist
- Well-understood problem
- Low impact if fails

### Risk Template

```markdown
**[Risk Name]**
- Level: [HIGH/MEDIUM/LOW]
- Impact: [What happens if risk materializes]
- Probability: [Low/Medium/High]
- Mitigation: [How to prevent/handle]
- Owner: [Who manages this risk]
- Contingency: [Backup plan]
```

## State Analysis Framework

### As-Is (Current State)

Document what exists now:

```markdown
**As-Is:**
- System behavior
- Existing features
- Current limitations
- Pain points
- Technical debt
```

### To-Be (Desired State)

Document target state:

```markdown
**To-Be:**
- New functionality
- Improved behavior
- Resolved limitations
- Enhanced capabilities
- Quality improvements
```

### Gap Analysis

Identify what's needed:

```markdown
**Gap Analysis:**
- Missing components
- Required changes
- New infrastructure
- Skills needed
- External dependencies
```

## Examples by Task Type

### Feature Implementation

**Task:** "Add export to PDF functionality"

**Decomposition:**
1. Research PDF libraries (1h)
2. Design PDF layout template (2h)
3. Implement PDF generation service (3h)
4. Add export button to UI (2h)
5. Write integration tests (2h)

**Rationale:** Backend and frontend can work in parallel after research phase.

### Bug Fix

**Task:** "Fix memory leak in background processing"

**Decomposition:**
1. Reproduce and profile memory leak (2h)
2. Identify root cause (2h)
3. Implement fix (3h)
4. Add monitoring to prevent recurrence (2h)
5. Verify fix in production-like environment (1h)

**Rationale:** Diagnostic work must happen first, then fix, then prevention.

### Refactoring

**Task:** "Refactor legacy payment processing"

**Decomposition:**
1. Document current payment flow (2h)
2. Design new architecture (3h)
3. Implement new payment service (4h)
4. Add feature flag for gradual rollout (2h)
5. Migrate existing payments (3h)
6. Deprecate legacy code (2h)

**Rationale:** Careful migration with rollback capability.

### Technical Debt

**Task:** "Upgrade React 16 → 18"

**Decomposition:**
1. Audit dependencies for compatibility (2h)
2. Update React and React-DOM (1h)
3. Fix breaking changes in components (4h)
4. Update tests for new rendering behavior (3h)
5. Performance testing and optimization (2h)

**Rationale:** Assessment first, then upgrade, then fix breakages.

## Quality Checklist

Before finalizing decomposition:

**Completeness:**
- [ ] All aspects of original task covered
- [ ] No gaps in functionality
- [ ] Testing included
- [ ] Documentation included

**Actionability:**
- [ ] Every subtask is specific
- [ ] Each has clear deliverables
- [ ] Estimates are realistic
- [ ] Assignment is clear

**Testifiability:**
- [ ] Acceptance criteria defined
- [ ] Test scenarios specified
- [ ] Verification steps clear
- [ ] Success metrics measurable

**Dependencies:**
- [ ] All dependencies identified
- [ ] No circular dependencies
- [ ] Critical path clear
- [ ] Parallel work possible

**Risk Management:**
- [ ] Risks assessed
- [ ] Mitigation plans exist
- [ ] Owners assigned
- [ ] Contingencies defined

**Communication:**
- [ ] Rationale documented
- [ ] As-is/to-be clear
- [ ] Expected outputs defined
- [ ] Stakeholders identified

## Anti-Patterns to Avoid

### ❌ Overly Granular

Don't create 30-minute subtasks:
```
Bad: "Import library" (0.5h)
Bad: "Write one test" (0.5h)
Bad: "Update one file" (0.5h)
```

Better: Group into meaningful chunks (2-4h)

### ❌ Overly Broad

Don't create multi-day subtasks:
```
Bad: "Implement entire authentication system" (16h)
Bad: "Build all frontend components" (12h)
Bad: "Do all testing" (8h)
```

Better: Break into 1-4h pieces

### ❌ Vague Acceptance Criteria

Don't write unclear criteria:
```
Bad: "Code works"
Bad: "Looks good"
Bad: "Tests pass"
```

Better: Specific, measurable criteria

### ❌ Missing Dependencies

Don't assume independence:
```
Bad: Marking all tasks as independent when they're not
Bad: Not documenting blockers
Bad: Ignoring critical path
```

Better: Map dependencies explicitly

### ❌ No Risk Assessment

Don't ignore risks:
```
Bad: Marking all risks as "none"
Bad: Not identifying potential blockers
Bad: No mitigation plans
```

Better: Honest risk assessment with plans

## Summary

Effective task decomposition:

1. **Understand completely** - As-is, to-be, gaps
2. **Decompose logically** - 1-4h chunks
3. **Define clearly** - Acceptance criteria, testing
4. **Map dependencies** - What blocks what
5. **Assess risks** - Identify and mitigate
6. **Document rationale** - Why this breakdown
7. **Specify outputs** - Concrete deliverables
8. **Enable parallelism** - Where possible
9. **Maintain testability** - Every subtask
10. **Review quality** - Use checklist
