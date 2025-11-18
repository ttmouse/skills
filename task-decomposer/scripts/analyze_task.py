#!/usr/bin/env python3
"""
Task Decomposition Analyzer

Decompose high-level tasks into actionable, testifiable subtasks with comprehensive analysis.

Refactored to use professional logging and centralized constants.

Usage:
    python analyze_task.py "<task description>" [options]

Examples:
    python analyze_task.py "Implement user authentication"
    python analyze_task.py "Refactor payment processing" --project backend
    python analyze_task.py "Add dark mode" --export-linear --team-id TEAM123
    python analyze_task.py "..." --graph dependencies.dot --risk-matrix risks.md

Options:
    --project NAME          Project context (frontend, backend, mobile, etc.)
    --complexity LEVEL      Estimated complexity (low, medium, high)
    --export-linear         Export subtasks to Linear
    --team-id ID            Linear team ID for export
    --parent-id ID          Linear parent issue ID
    --export-github         Export to GitHub issues
    --repo OWNER/REPO       GitHub repository
    --graph FILE            Generate dependency graph (DOT format)
    --risk-matrix FILE      Generate risk matrix markdown
    --output FILE           Save decomposition to file
    --format FORMAT         Output format (markdown, json, yaml)
"""

import os
import sys
import json
import argparse
from pathlib import Path
from typing import List, Dict, Optional
from dataclasses import dataclass, asdict
from enum import Enum

# Add shared directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / 'shared'))
from logger import Logger

# Import constants
from constants import (
    AGENT_KEYWORDS,
    HUMAN_KEYWORDS,
    REVIEW_KEYWORDS,
    LINEAR_PRIORITY,
)


class Priority(Enum):
    P0 = "Critical Path"
    P1 = "Important"
    P2 = "Nice to Have"


class RiskLevel(Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"


class AssigneeType(Enum):
    AGENT = "agent"  # Can be fully automated by AI agent
    HUMAN = "human"  # Requires human decision/intervention
    EITHER = "either"  # Can be done by agent or human


@dataclass
class SubTask:
    """Represents a decomposed subtask."""
    id: int
    title: str
    description: str
    priority: Priority
    estimate_hours: float
    labels: List[str]
    dependencies: List[int]
    acceptance_criteria: List[str]
    testing_criteria: List[str]
    expected_outputs: List[str]
    risks: List[Dict[str, str]]
    assignee_type: AssigneeType = AssigneeType.AGENT
    assignee: Optional[str] = None
    requires_human_review: bool = False

    def to_markdown(self) -> str:
        """Convert subtask to markdown format."""
        deps = f"#{', #'.join(map(str, self.dependencies))}" if self.dependencies else "None"

        # Assignment info
        assignment_icon = "🤖" if self.assignee_type == AssigneeType.AGENT else "👤" if self.assignee_type == AssigneeType.HUMAN else "🔄"
        assignment_str = f"{assignment_icon} **Assignee:** {self.assignee or self.assignee_type.value}"
        if self.requires_human_review:
            assignment_str += " ⚠️ (Requires human review)"

        md = f"""### {self.id}. {self.title}
**Priority:** {self.priority.name} ({self.priority.value})
**Estimate:** {self.estimate_hours} hours
{assignment_str}
**Labels:** {', '.join(self.labels)}
**Dependencies:** {deps}

**Description:**
{self.description}

**Acceptance Criteria:**
{self._format_checklist(self.acceptance_criteria)}

**Testing:**
{self._format_checklist(self.testing_criteria)}

**Expected Outputs:**
{self._format_list(self.expected_outputs)}

**Risks:**
{self._format_risks()}
"""
        return md

    def _format_checklist(self, items: List[str]) -> str:
        """Format items as checklist."""
        return '\n'.join(f"- [ ] {item}" for item in items)

    def _format_list(self, items: List[str]) -> str:
        """Format items as bulleted list."""
        return '\n'.join(f"- {item}" for item in items)

    def _format_risks(self) -> str:
        """Format risk list."""
        if not self.risks:
            return "- None"
        return '\n'.join(
            f"- {risk['level']}: {risk['description']} (mitigation: {risk['mitigation']})"
            for risk in self.risks
        )


@dataclass
class Decomposition:
    """Complete task decomposition."""
    original_task: str
    rationale: str
    as_is_state: str
    to_be_state: str
    gap_analysis: str
    subtasks: List[SubTask]
    overall_risks: List[Dict[str, str]]

    def to_markdown(self) -> str:
        """Convert decomposition to markdown."""
        md = f"""# Task Decomposition: {self.original_task}

## Rationale

{self.rationale}

## State Analysis

**As-Is (Current State):**
{self.as_is_state}

**To-Be (Desired State):**
{self.to_be_state}

**Gap Analysis:**
{self.gap_analysis}

## Subtasks

{self._format_subtasks()}

## Overall Risk Assessment

{self._format_overall_risks()}

## Dependency Summary

{self._format_dependencies()}

## Estimation Summary

- Total subtasks: {len(self.subtasks)}
- Total estimated time: {sum(st.estimate_hours for st in self.subtasks)} hours
- Critical path items: {len([st for st in self.subtasks if st.priority == Priority.P0])}
"""
        return md

    def _format_subtasks(self) -> str:
        """Format all subtasks."""
        return '\n---\n\n'.join(st.to_markdown() for st in self.subtasks)

    def _format_overall_risks(self) -> str:
        """Format overall risks by level."""
        high = [r for r in self.overall_risks if r['level'] == 'HIGH']
        medium = [r for r in self.overall_risks if r['level'] == 'MEDIUM']
        low = [r for r in self.overall_risks if r['level'] == 'LOW']

        sections = []
        if high:
            sections.append("### HIGH Risk\n" + '\n\n'.join(
                f"**{r['name']}**\n"
                f"- Impact: {r['impact']}\n"
                f"- Probability: {r['probability']}\n"
                f"- Mitigation: {r['mitigation']}\n"
                f"- Owner: {r['owner']}"
                for r in high
            ))

        if medium:
            sections.append("### MEDIUM Risk\n" + '\n\n'.join(
                f"**{r['name']}**\n"
                f"- Impact: {r['impact']}\n"
                f"- Probability: {r['probability']}\n"
                f"- Mitigation: {r['mitigation']}\n"
                f"- Owner: {r['owner']}"
                for r in medium
            ))

        if low:
            sections.append("### LOW Risk\n" + '\n\n'.join(
                f"**{r['name']}**\n"
                f"- Impact: {r['impact']}\n"
                f"- Probability: {r['probability']}\n"
                f"- Mitigation: {r['mitigation']}\n"
                f"- Owner: {r['owner']}"
                for r in low
            ))

        return '\n\n'.join(sections)

    def _format_dependencies(self) -> str:
        """Format dependency summary."""
        lines = []
        for st in self.subtasks:
            if st.dependencies:
                deps = ', '.join(f"#{d}" for d in st.dependencies)
                lines.append(f"- Subtask #{st.id} depends on: {deps}")
            else:
                lines.append(f"- Subtask #{st.id} has no dependencies (can start immediately)")
        return '\n'.join(lines)


def detect_assignee_type(title: str, description: str, labels: List[str]) -> tuple[AssigneeType, bool]:
    """
    Detect whether task should be assigned to agent or human.

    Returns (assignee_type, requires_human_review)
    """
    title_lower = title.lower()
    desc_lower = description.lower()

    # Keywords requiring human intervention
    human_keywords = [
        "approve", "decision", "review stakeholder", "negotiate", "business decision",
        "prioritize", "strategic", "legal", "compliance", "privacy policy",
        "user research", "interview", "stakeholder", "sign off", "final approval"
    ]

    # Keywords requiring human review (but agent can do initial work)
    review_keywords = [
        "security", "audit", "penetration test", "vulnerability", "authentication",
        "payment", "financial", "billing", "critical", "production deploy", "migration"
    ]

    # Keywords indicating agent-friendly tasks
    agent_keywords = [
        "implement", "write test", "create unit test", "refactor", "update",
        "build", "develop", "code", "script", "automate", "generate",
        "format", "lint", "type check", "documentation code"
    ]

    # Check for human-required tasks
    if any(keyword in title_lower or keyword in desc_lower for keyword in human_keywords):
        return AssigneeType.HUMAN, False

    # Check for agent-friendly tasks FIRST to avoid false positives
    # (e.g., "Implement authentication" should be agent, not review-required)
    has_agent_keywords = any(keyword in title_lower or keyword in desc_lower for keyword in agent_keywords)
    has_review_keywords = any(keyword in title_lower or keyword in desc_lower for keyword in review_keywords)

    if has_agent_keywords and has_review_keywords:
        # Agent implementation of security-critical feature needs review
        return AssigneeType.AGENT, True
    elif has_review_keywords:
        # Review keyword without implementation context = human should handle
        return AssigneeType.HUMAN, False
    elif has_agent_keywords:
        # Pure agent work
        return AssigneeType.AGENT, False

    # Labels-based detection
    if "security" in labels or "audit" in labels or "review" in labels:
        return AssigneeType.AGENT, True

    if "planning" in labels or "research" in labels or "design" in labels:
        return AssigneeType.EITHER, False

    # Default: agent can do it
    return AssigneeType.AGENT, False


def analyze_task(task: str, project: str = None, complexity: str = "medium") -> Decomposition:
    """
    Analyze task and generate decomposition.

    This is a template/example implementation. In production, this would use
    LLM or more sophisticated analysis.
    """

    # Example decomposition (would be AI-generated in production)
    # Create subtasks and auto-detect assignee types
    subtask_data = [
        {
            "id": 1,
            "title": "Analyze requirements and design approach",
            "description": "Review requirements, research best practices, and design solution architecture.",
            "priority": Priority.P0,
            "estimate_hours": 2.0,
            "labels": ["planning", "research"],
            "dependencies": [],
            "acceptance_criteria": [
                "Requirements documented",
                "Technical approach defined",
                "Architecture diagram created"
            ],
            "testing_criteria": [
                "Review with stakeholders",
                "Validate approach with team"
            ],
            "expected_outputs": [
                "Requirements document",
                "Architecture diagram",
                "Technical design doc"
            ],
            "risks": []
        },
        {
            "id": 2,
            "title": "Implement core functionality",
            "description": f"Build the main components for: {task}",
            "priority": Priority.P0,
            "estimate_hours": 4.0,
            "labels": [project] if project else ["development"],
            "dependencies": [1],
            "acceptance_criteria": [
                "Core logic implemented",
                "Unit tests written (>80% coverage)",
                "Code reviewed"
            ],
            "testing_criteria": [
                "Run unit tests",
                "Test edge cases",
                "Verify error handling"
            ],
            "expected_outputs": [
                "Source code",
                "Unit tests",
                "API documentation"
            ],
            "risks": [
                {
                    "level": "MEDIUM",
                    "description": "Complexity underestimated",
                    "mitigation": "Buffer time allocated, incremental approach"
                }
            ]
        },
        {
            "id": 3,
            "title": "Integration testing and validation",
            "description": "Test integration with existing systems and validate functionality.",
            "priority": Priority.P1,
            "estimate_hours": 2.0,
            "labels": ["testing", "integration"],
            "dependencies": [2],
            "acceptance_criteria": [
                "Integration tests pass",
                "End-to-end scenarios validated",
                "Performance benchmarks met"
            ],
            "testing_criteria": [
                "Run integration test suite",
                "Test in staging environment",
                "Performance testing"
            ],
            "expected_outputs": [
                "Integration test results",
                "Test coverage report",
                "Performance metrics"
            ],
            "risks": []
        }
    ]

    # Build SubTask objects with auto-detected assignment
    subtasks = []
    for data in subtask_data:
        assignee_type, requires_review = detect_assignee_type(
            data["title"],
            data["description"],
            data["labels"]
        )
        subtasks.append(SubTask(
            id=data["id"],
            title=data["title"],
            description=data["description"],
            priority=data["priority"],
            estimate_hours=data["estimate_hours"],
            labels=data["labels"],
            dependencies=data["dependencies"],
            acceptance_criteria=data["acceptance_criteria"],
            testing_criteria=data["testing_criteria"],
            expected_outputs=data["expected_outputs"],
            risks=data["risks"],
            assignee_type=assignee_type,
            requires_human_review=requires_review
        ))

    decomposition = Decomposition(
        original_task=task,
        rationale=f"Task decomposed into {len(subtasks)} subtasks to enable parallel work, "
                   "clear testing criteria, and manageable scope per work item.",
        as_is_state="Current system does not have this functionality.",
        to_be_state=f"System will have: {task}",
        gap_analysis="Need to implement, test, and integrate new functionality.",
        subtasks=subtasks,
        overall_risks=[
            {
                "level": "MEDIUM",
                "name": "Scope creep",
                "impact": "Timeline delay",
                "probability": "Medium",
                "mitigation": "Clear requirements, regular review",
                "owner": "Project Manager"
            }
        ]
    )

    return decomposition


def export_to_linear(decomposition: Decomposition, team_id: str, parent_id: str = None, agent_user_id: str = "agent", human_user_ids: Dict[str, str] = None, dry_run: bool = True, logger: Logger = None):
    """
    Export decomposition to Linear with intelligent assignment.

    Args:
        decomposition: Task decomposition
        team_id: Linear team ID
        parent_id: Optional parent issue ID
        agent_user_id: User ID to use for agent-assigned tasks (default: "agent")
        human_user_ids: Dict mapping role to Linear user ID for human assignments
        dry_run: If True, show what would be created without actually creating (default: True)
        logger: Logger instance
    """
    logger = logger or Logger()

    logger.info(f"\n📤 Exporting to Linear team: {team_id}")
    if parent_id:
        logger.info(f"   Parent issue: {parent_id}")

    human_user_ids = human_user_ids or {}

    logger.info("\nTask Assignment Summary:")
    agent_tasks = [st for st in decomposition.subtasks if st.assignee_type == AssigneeType.AGENT and not st.requires_human_review]
    agent_review_tasks = [st for st in decomposition.subtasks if st.assignee_type == AssigneeType.AGENT and st.requires_human_review]
    human_tasks = [st for st in decomposition.subtasks if st.assignee_type == AssigneeType.HUMAN]
    either_tasks = [st for st in decomposition.subtasks if st.assignee_type == AssigneeType.EITHER]

    logger.info(f"  🤖 Agent-assigned tasks: {len(agent_tasks)}")
    logger.info(f"  🤖⚠️  Agent tasks requiring human review: {len(agent_review_tasks)}")
    logger.info(f"  👤 Human-assigned tasks: {len(human_tasks)}")
    logger.info(f"  🔄 Either agent or human: {len(either_tasks)}")

    # Try to use real Linear API if available
    use_real_api = not dry_run and os.getenv("LINEAR_API_KEY")

    if use_real_api:
        try:
            # Import Linear integration
            from linear_integration import LinearClient, LinearIssue

            client = LinearClient(logger=logger)
            logger.success("\nConnected to Linear API")

            # Create issues
            logger.info("\n📝 Creating Linear issues with assignments:")
            created_issues = []

            for st in decomposition.subtasks:
                # Determine assignee
                assignee_id = None
                if st.assignee:
                    assignee_id = st.assignee
                elif st.assignee_type == AssigneeType.AGENT:
                    assignee_id = agent_user_id
                elif st.assignee_type == AssigneeType.HUMAN:
                    # Try to match by labels
                    for label in st.labels:
                        if label in human_user_ids:
                            assignee_id = human_user_ids[label]
                            break
                    if not assignee_id:
                        assignee_id = human_user_ids.get("default")
                else:  # EITHER
                    assignee_id = agent_user_id

                # Build description
                description = f"""# {st.title}

{st.description}

## Acceptance Criteria
{chr(10).join(f'- [ ] {c}' for c in st.acceptance_criteria)}

## Testing
{chr(10).join(f'- [ ] {t}' for t in st.testing_criteria)}

## Expected Outputs
{chr(10).join(f'- {o}' for o in st.expected_outputs)}

## Assignment
- **Type:** {st.assignee_type.value}
- **Requires Review:** {'Yes' if st.requires_human_review else 'No'}

## Dependencies
{', '.join(f'#{d}' for d in st.dependencies) if st.dependencies else 'None'}
"""

                # Map priority to Linear (0=None, 1=Urgent, 2=High, 3=Medium, 4=Low)
                linear_priority = {
                    Priority.P0: 1,  # Urgent
                    Priority.P1: 2,  # High
                    Priority.P2: 4   # Low
                }.get(st.priority, 0)

                # Create issue
                issue = client.create_issue(
                    team_id=team_id,
                    title=st.title,
                    description=description,
                    assignee_id=assignee_id,
                    priority=linear_priority,
                    estimate=int(st.estimate_hours) if st.estimate_hours else None,
                    parent_id=parent_id
                )

                created_issues.append(issue)

                icon = "🤖" if st.assignee_type == AssigneeType.AGENT else "👤" if st.assignee_type == AssigneeType.HUMAN else "🔄"
                review_mark = " ⚠️" if st.requires_human_review else ""
                logger.info(f"  {icon} {issue['identifier']}: {st.title}{review_mark}")
                logger.info(f"      URL: {issue['url']}")

            logger.success(f"\nCreated {len(created_issues)} Linear issues")

        except ImportError:
            logger.warning("\nLinear integration module not found. Install with:")
            logger.info("   pip install requests")
            use_real_api = False
        except Exception as e:
            logger.warning(f"\nFailed to create Linear issues: {e}")
            logger.info("   Falling back to preview mode...")
            use_real_api = False

    if not use_real_api:
        # Preview mode
        logger.info("\n[DRY RUN] Would create Linear issues with assignments:")
        for st in decomposition.subtasks:
            # Determine assignee
            if st.assignee:
                assignee = st.assignee
            elif st.assignee_type == AssigneeType.AGENT:
                assignee = agent_user_id
            elif st.assignee_type == AssigneeType.HUMAN:
                # Try to match by labels
                assignee = None
                for label in st.labels:
                    if label in human_user_ids:
                        assignee = human_user_ids[label]
                        break
                if not assignee:
                    assignee = human_user_ids.get("default", "unassigned")
            else:  # EITHER
                assignee = agent_user_id  # Default to agent for flexibility

            icon = "🤖" if st.assignee_type == AssigneeType.AGENT else "👤" if st.assignee_type == AssigneeType.HUMAN else "🔄"
            review_mark = " ⚠️ [NEEDS REVIEW]" if st.requires_human_review else ""
            logger.info(f"  {icon} #{st.id}: {st.title}")
            logger.info(f"      Assignee: {assignee}{review_mark}")
            logger.info(f"      Estimate: {st.estimate_hours}h | Priority: {st.priority.name}")
            if st.dependencies:
                logger.info(f"      Depends on: #{', #'.join(map(str, st.dependencies))}")

        logger.info("\n💡 Assignment Rules Applied:")
        logger.info("  • Agent tasks: Fully automated work (code, tests, refactoring)")
        logger.info("  • Human tasks: Decisions, approvals, stakeholder work")
        logger.info("  • Review required: Security, payments, critical systems")

        if dry_run:
            logger.warning("\nThis was a DRY RUN. To create real issues:")
            logger.info("   1. Set LINEAR_API_KEY environment variable")
            logger.info("   2. Run without --dry-run flag (or use --create-linear)")
        else:
            logger.warning("\nLinear API key not found. Set with:")
            logger.info("   export LINEAR_API_KEY=your_key_here")
            logger.info("   Or use Linear MCP: claude mcp add linear npx @linear/mcp")


def export_to_github(decomposition: Decomposition, repo: str, logger: Logger = None):
    """Export decomposition to GitHub (placeholder)."""
    logger = logger or Logger()

    logger.info(f"\n📤 Exporting to GitHub repo: {repo}")

    logger.info("\nThis would create GitHub issues via API:")
    for st in decomposition.subtasks:
        logger.info(f"  - {st.title} ({', '.join(st.labels)})")

    logger.warning("\nGitHub API integration not implemented in this template.")
    logger.info("   Implement using PyGithub library.")


def generate_dependency_graph(decomposition: Decomposition, output_file: str, logger: Logger = None):
    """Generate DOT format dependency graph."""
    logger = logger or Logger()

    lines = ["digraph dependencies {"]
    lines.append('  rankdir=TB;')
    lines.append('  node [shape=box, style=rounded];')

    for st in decomposition.subtasks:
        label = f"{st.id}. {st.title}\\n{st.estimate_hours}h"
        color = "red" if st.priority == Priority.P0 else "orange" if st.priority == Priority.P1 else "lightblue"
        lines.append(f'  {st.id} [label="{label}", fillcolor={color}, style="filled,rounded"];')

    for st in decomposition.subtasks:
        for dep in st.dependencies:
            lines.append(f'  {dep} -> {st.id};')

    lines.append("}")

    with open(output_file, 'w') as f:
        f.write('\n'.join(lines))

    logger.success(f"\nDependency graph saved to: {output_file}")
    logger.info(f"  Generate PNG: dot -Tpng {output_file} -o dependencies.png")


def main():
    """Main entry point."""
    logger = Logger()

    parser = argparse.ArgumentParser(description="Decompose tasks into actionable subtasks with intelligent agent/human assignment")
    parser.add_argument("task", help="Task description to decompose")
    parser.add_argument("--project", help="Project context")
    parser.add_argument("--complexity", choices=["low", "medium", "high"], default="medium")
    parser.add_argument("--export-linear", action="store_true")
    parser.add_argument("--team-id", help="Linear team ID")
    parser.add_argument("--parent-id", help="Linear parent issue ID")
    parser.add_argument("--agent-user", default="agent", help="Linear user ID for agent-assigned tasks (default: 'agent')")
    parser.add_argument("--human-users", help="Comma-separated role:user_id pairs (e.g., 'backend:user123,frontend:user456,default:user789')")
    parser.add_argument("--dry-run", action="store_true", default=True, help="Preview without creating (default: True)")
    parser.add_argument("--create-linear", action="store_true", help="Actually create Linear issues (requires LINEAR_API_KEY)")
    parser.add_argument("--export-github", action="store_true")
    parser.add_argument("--repo", help="GitHub repository (owner/repo)")
    parser.add_argument("--graph", help="Generate dependency graph to file")
    parser.add_argument("--output", help="Save output to file")
    parser.add_argument("--format", choices=["markdown", "json", "yaml"], default="markdown")

    args = parser.parse_args()

    # Analyze task
    logger.info(f"Analyzing task: {args.task}\n")
    decomposition = analyze_task(args.task, args.project, args.complexity)

    # Generate output
    if args.format == "markdown":
        output = decomposition.to_markdown()
    elif args.format == "json":
        output = json.dumps(asdict(decomposition), indent=2, default=str)
    else:  # yaml
        import yaml
        output = yaml.dump(asdict(decomposition), default_flow_style=False)

    # Save or print
    if args.output:
        with open(args.output, 'w') as f:
            f.write(output)
        logger.success(f"Decomposition saved to: {args.output}")
    else:
        print(output)

    # Generate graph
    if args.graph:
        generate_dependency_graph(decomposition, args.graph, logger=logger)

    # Export to Linear
    if args.export_linear:
        if not args.team_id:
            logger.error("--team-id required for Linear export")
            sys.exit(1)

        # Parse human users mapping
        human_users = {}
        if args.human_users:
            for pair in args.human_users.split(','):
                if ':' in pair:
                    role, user_id = pair.split(':', 1)
                    human_users[role.strip()] = user_id.strip()

        # Determine if we should actually create issues
        dry_run = not args.create_linear

        export_to_linear(decomposition, args.team_id, args.parent_id, args.agent_user, human_users, dry_run, logger=logger)

    # Export to GitHub
    if args.export_github:
        if not args.repo:
            logger.error("--repo required for GitHub export")
            sys.exit(1)
        export_to_github(decomposition, args.repo, logger=logger)


if __name__ == "__main__":
    main()
