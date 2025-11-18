# Task Decomposer

Intelligent task decomposition engine that breaks high-level Linear tasks into actionable, testable subtasks with comprehensive analysis, dependency tracking, and AI/human assignment recommendations.

## Overview

Transform complex tasks into structured deliverables optimized for team efficiency, testability, and risk management. Integrates with Linear API for seamless project management workflows.

### Key Features

- **Smart Decomposition** - Break tasks into 3-5 actionable subtasks
- **As-Is/To-Be Analysis** - Current state vs desired state gap analysis
- **Dependency Tracking** - Identify blocking relationships and critical paths
- **Assignment Intelligence** - AI vs human task detection using keyword analysis
- **Risk Assessment** - Identify potential blockers with mitigation strategies
- **Linear Integration** - Direct API integration for automated issue creation
- **Professional Output** - Colored console logging with markdown reports

## Architecture

### Scripts

| Script | Purpose | Lines |
|--------|---------|-------|
| `analyze_task.py` | Main decomposition engine | 728 |
| `linear_integration.py` | Linear API client | 330 |
| `assignment_metrics.py` | Assignment analytics | 352 |
| `constants.py` | Centralized config | 331 |

**Total**: 1,741 lines of Python

### Technology Stack

- **Python 3.8+** - Core language
- **Linear API** - GraphQL integration
- **Logger** - Professional colored output (from shared utilities)
- **Dataclasses** - Type-safe data structures

## Installation

### Prerequisites

```bash
# Python 3.8 or higher
python3 --version

# Required packages
pip install requests pyyaml
```

### Linear API Setup

1. Get your Linear API key from https://linear.app/settings/api
2. Set environment variable:

```bash
export LINEAR_API_KEY="your_key_here"
```

Or create a `.env` file:
```
LINEAR_API_KEY=your_key_here
```

## Usage

### Basic Task Decomposition

```bash
cd scripts

# Analyze and decompose a task
python3 analyze_task.py "Add dark mode toggle to application" --project frontend

# Output to file
python3 analyze_task.py "Implement user authentication" \
  --project backend \
  --output task-breakdown.md

# Specify number of subtasks
python3 analyze_task.py "Refactor database layer" \
  --project backend \
  --subtasks 5
```

### Linear Integration

```bash
# Export to Linear (creates actual issues)
python3 analyze_task.py "Build REST API" \
  --project backend \
  --export-linear \
  --team-id "TEAM-123"

# Dry-run mode (preview without creating)
python3 analyze_task.py "Add logging system" \
  --export-linear \
  --team-id "TEAM-123" \
  --dry-run
```

### Assignment Analytics

```bash
# View assignment distribution
python3 assignment_metrics.py

# Generate detailed report
python3 assignment_metrics.py --report

# Analyze specific project
python3 assignment_metrics.py --project "Mobile App Refactor"
```

## Output Format

### Markdown Report

```markdown
# Task Decomposition: Add dark mode toggle to application

## Rationale
Task decomposed into 3 subtasks to enable parallel work...

## State Analysis
**As-Is (Current State):** No dark mode functionality
**To-Be (Desired State):** System will have dark mode toggle
**Gap Analysis:** Need to implement, test, and integrate

## Subtasks

### 1. Analyze requirements and design approach
**Priority:** P0 (Critical Path)
**Estimate:** 2.0 hours
🔄 **Assignee:** either
**Labels:** planning, research

**Acceptance Criteria:**
- [ ] Requirements documented
- [ ] Technical approach defined
- [ ] Architecture diagram created

**Testing:**
- [ ] Review with stakeholders
- [ ] Validate approach with team

**Expected Outputs:**
- Requirements document
- Architecture diagram

### 2. Implement core functionality
**Priority:** P0 (Critical Path)
**Estimate:** 4.0 hours
🤖 **Assignee:** agent
**Labels:** frontend
**Dependencies:** #1

...
```

### Console Output

```
[*] Analyzing task: Add dark mode toggle to application

[*] 📊 Task Analysis Complete

Subtasks Generated: 3
Total Estimated Time: 8.0 hours
Critical Path Items: 2

[✓] Decomposition saved to: task-breakdown.md
```

## Assignment Intelligence

### AI-Suitable Tasks (🤖)

Detected by keywords:
- `automate`, `script`, `test`, `lint`, `format`
- `generate`, `compile`, `build`, `deploy`
- `refactor`, `optimize`, `fix bug`
- `update dependency`, `add test`, `documentation`

### Human-Required Tasks (👤)

Detected by keywords:
- `design`, `architecture`, `decision`, `strategy`
- `review`, `approve`, `ux`, `ui`
- `customer`, `stakeholder`, `meeting`
- `security review`, `compliance`, `legal`

### Mixed Tasks (🔄)

- Tasks not clearly matching either category
- Complex tasks requiring collaboration
- Strategic implementation work

## Configuration

### Environment Variables

```bash
# Required for Linear integration
LINEAR_API_KEY="lin_api_..."

# Optional: Default team ID
LINEAR_TEAM_ID="TEAM-123"

# Optional: Default project name
LINEAR_PROJECT="Backend Services"
```

### constants.py

Customize behavior via `scripts/constants.py`:

```python
# Modify assignment keywords
AGENT_KEYWORDS = [
    'automate', 'script', 'test', ...
]

HUMAN_KEYWORDS = [
    'design', 'architecture', 'decision', ...
]

# Adjust default estimates
DEFAULT_SUBTASK_ESTIMATE = 2.0  # hours

# Modify priority levels
LINEAR_PRIORITY = {
    'urgent': 1,
    'high': 2,
    'normal': 3,
    'low': 4
}
```

## Examples

### Example 1: Backend Feature

```bash
python3 analyze_task.py \
  "Implement rate limiting middleware" \
  --project "API Gateway" \
  --subtasks 4 \
  --output rate-limiting.md
```

**Output**: 4 subtasks with Redis integration, configuration, testing, and documentation

### Example 2: Frontend Component

```bash
python3 analyze_task.py \
  "Build data table component with sorting and filtering" \
  --project "React Dashboard" \
  --export-linear \
  --team-id "FE-TEAM"
```

**Result**: Creates Linear issues with proper dependencies and labels

### Example 3: Infrastructure Work

```bash
python3 analyze_task.py \
  "Set up CI/CD pipeline with automated testing" \
  --project "DevOps" \
  --subtasks 5 \
  --dry-run
```

**Output**: Preview of 5 subtasks covering pipeline setup, test integration, deployment, monitoring, and documentation

## Best Practices

### 1. Task Scope

- Keep original tasks high-level (8+ hours of work)
- Aim for 3-5 subtasks per decomposition
- Each subtask should be 2-6 hours of work
- Ensure subtasks are independently testable

### 2. Dependencies

- Explicitly mark blocking dependencies
- Identify critical path items
- Minimize cross-dependencies for parallel work
- Consider technical and business dependencies

### 3. Assignment

- Review auto-assigned labels (🤖 agent / 👤 human / 🔄 either)
- Override when business context requires it
- Use --dry-run to preview assignments
- Balance team workload distribution

### 4. Testing

- Define clear acceptance criteria
- Include both unit and integration tests
- Specify edge cases to validate
- Document expected test coverage

## Troubleshooting

### Linear API Issues

**Problem**: "Linear API key not found"
```bash
# Solution: Set environment variable
export LINEAR_API_KEY="lin_api_..."
```

**Problem**: "Team not found"
```bash
# List available teams
python3 linear_integration.py --list-teams
```

### Assignment Detection

**Problem**: Task assigned to wrong category

**Solution**: Add custom keywords to `constants.py`:
```python
# For your domain-specific terms
AGENT_KEYWORDS.append('custom-automation-term')
HUMAN_KEYWORDS.append('custom-strategy-term')
```

### Output Issues

**Problem**: Markdown formatting broken

**Solution**: Ensure output directory exists:
```bash
mkdir -p output
python3 analyze_task.py "Task" --output output/task.md
```

## Development

### Project Structure

```
task-decomposer/
├── SKILL.md              # Skill definition
├── README.md             # This file
├── scripts/
│   ├── analyze_task.py       # Main decomposition engine
│   ├── linear_integration.py # Linear API client
│   ├── assignment_metrics.py # Analytics and reporting
│   └── constants.py          # Configuration and constants
└── examples/
    └── sample-output.md      # Example decomposition
```

### Testing

```bash
# Test basic decomposition
python3 analyze_task.py "Test task" --dry-run

# Test Linear integration (dry-run, no actual issues created)
python3 analyze_task.py "Test task" \
  --export-linear \
  --team-id "TEST" \
  --dry-run

# Test assignment analytics
python3 assignment_metrics.py
```

### Extending

Add custom decomposition strategies:

```python
# In analyze_task.py
def custom_decomposition_strategy(task_description: str) -> List[Subtask]:
    """Implement your custom logic"""
    # Analyze task
    # Generate subtasks
    # Return structured output
    pass
```

## Refactoring History

**Date**: 2025-11-11
**Changes**: Refactored to eliminate code duplication and standardize logging

- Replaced 101 print() statements with Logger
- Centralized GraphQL queries and mutations in constants.py
- Fixed KeyError bug in assignment metrics
- Added missing `import os` in analyze_task.py
- Professional colored console output

**See**: `/tmp/qa-refactor/TASK_DECOMPOSER_REFACTORING_SUMMARY.md`

## License

Apache-2.0

## Support

- **Documentation**: See `SKILL.md` for detailed instructions
- **Examples**: Check `examples/` directory
- **Issues**: Report via project issue tracker
- **Shared Utilities**: See `../shared/README.md` for Logger and base utilities

---

**Last Updated**: 2025-11-11
**Version**: 2.0.0 (Post-refactoring)
