#!/usr/bin/env python3
"""
Assignment Metrics and Analytics

Track and analyze the effectiveness of agent/human assignments.

Refactored to use professional logging.

Usage:
    python assignment_metrics.py --analyze decomposition.json
    python assignment_metrics.py --track-completion task-123 --status completed --time 2.5
    python assignment_metrics.py --report --days 30
"""

import os
import sys
import json
import argparse
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from dataclasses import dataclass, asdict
from collections import defaultdict

# Add shared directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / 'shared'))
from logger import Logger

# Import constants
from constants import DEFAULT_METRICS_FILE


@dataclass
class TaskCompletion:
    """Record of a completed task."""
    task_id: str
    assignee_type: str  # agent, human
    estimated_hours: float
    actual_hours: float
    status: str  # completed, failed, blocked
    labels: List[str]
    completed_at: str
    required_review: bool
    review_findings: int = 0  # Number of issues found in review


class AssignmentMetrics:
    """Track and analyze assignment metrics."""

    def __init__(self, data_file: str = None, logger: Logger = None):
        """Initialize metrics tracker."""
        self.data_file = data_file or DEFAULT_METRICS_FILE
        self.logger = logger or Logger()
        self.completions: List[TaskCompletion] = []
        self.load_data()

    def load_data(self):
        """Load historical data from file."""
        if os.path.exists(self.data_file):
            try:
                with open(self.data_file, 'r') as f:
                    data = json.load(f)
                    self.completions = [
                        TaskCompletion(**c) for c in data.get("completions", [])
                    ]
            except Exception as e:
                self.logger.warning(f"Could not load metrics data: {e}")

    def save_data(self):
        """Save metrics data to file."""
        data = {
            "completions": [asdict(c) for c in self.completions],
            "last_updated": datetime.now().isoformat()
        }
        with open(self.data_file, 'w') as f:
            json.dump(data, f, indent=2)

    def record_completion(self, completion: TaskCompletion):
        """Record a task completion."""
        self.completions.append(completion)
        self.save_data()
        self.logger.success(f"Recorded completion for {completion.task_id}")

    def get_velocity_by_type(self, days: int = 30) -> Dict[str, Dict]:
        """Calculate velocity metrics by assignee type."""
        cutoff = datetime.now() - timedelta(days=days)

        agent_tasks = []
        human_tasks = []

        for c in self.completions:
            completed_at = datetime.fromisoformat(c.completed_at)
            if completed_at < cutoff:
                continue

            if c.status == "completed":
                if c.assignee_type == "agent":
                    agent_tasks.append(c)
                else:
                    human_tasks.append(c)

        def calculate_metrics(tasks):
            if not tasks:
                return {
                    "count": 0,
                    "avg_actual_hours": 0,
                    "avg_estimated_hours": 0,
                    "estimation_accuracy": 0,
                    "completion_rate": 0
                }

            total_actual = sum(t.actual_hours for t in tasks)
            total_estimated = sum(t.estimated_hours for t in tasks)

            return {
                "count": len(tasks),
                "avg_actual_hours": total_actual / len(tasks),
                "avg_estimated_hours": total_estimated / len(tasks),
                "estimation_accuracy": (total_estimated / total_actual * 100) if total_actual > 0 else 0,
                "completion_rate": len(tasks) / (len(tasks) + len([c for c in self.completions if c.status != "completed"])) * 100
            }

        return {
            "agent": calculate_metrics(agent_tasks),
            "human": calculate_metrics(human_tasks),
            "period_days": days,
            "total_tasks": len(agent_tasks) + len(human_tasks)
        }

    def get_review_effectiveness(self, days: int = 30) -> Dict:
        """Analyze effectiveness of review requirements."""
        cutoff = datetime.now() - timedelta(days=days)

        reviewed_tasks = [
            c for c in self.completions
            if c.required_review
            and datetime.fromisoformat(c.completed_at) >= cutoff
            and c.status == "completed"
        ]

        if not reviewed_tasks:
            return {
                "tasks_reviewed": 0,
                "avg_findings": 0,
                "high_risk_caught": 0
            }

        total_findings = sum(c.review_findings for c in reviewed_tasks)
        high_risk = len([c for c in reviewed_tasks if c.review_findings > 0])

        return {
            "tasks_reviewed": len(reviewed_tasks),
            "avg_findings": total_findings / len(reviewed_tasks),
            "high_risk_caught": high_risk,
            "catch_rate": (high_risk / len(reviewed_tasks) * 100) if reviewed_tasks else 0
        }

    def get_assignment_distribution(self, days: int = 30) -> Dict:
        """Get distribution of agent vs human assignments."""
        cutoff = datetime.now() - timedelta(days=days)

        recent = [
            c for c in self.completions
            if datetime.fromisoformat(c.completed_at) >= cutoff
        ]

        agent_count = len([c for c in recent if c.assignee_type == "agent"])
        human_count = len([c for c in recent if c.assignee_type == "human"])
        total = agent_count + human_count

        if total == 0:
            return {
                "agent_count": 0,
                "human_count": 0,
                "agent_pct": 0,
                "human_pct": 0,
                "total": 0
            }

        return {
            "agent_count": agent_count,
            "human_count": human_count,
            "agent_pct": (agent_count / total * 100),
            "human_pct": (human_count / total * 100),
            "total": total
        }

    def get_label_analysis(self, days: int = 30) -> Dict[str, Dict]:
        """Analyze assignments by label."""
        cutoff = datetime.now() - timedelta(days=days)

        recent = [
            c for c in self.completions
            if datetime.fromisoformat(c.completed_at) >= cutoff
            and c.status == "completed"
        ]

        by_label = defaultdict(lambda: {"agent": 0, "human": 0, "total_hours": 0})

        for c in recent:
            for label in c.labels:
                by_label[label][c.assignee_type] += 1
                by_label[label]["total_hours"] += c.actual_hours

        return dict(by_label)

    def generate_report(self, days: int = 30):
        """Generate comprehensive metrics report."""
        self.logger.section(f"ASSIGNMENT METRICS REPORT - Last {days} days", '=', 60)

        # Velocity metrics
        velocity = self.get_velocity_by_type(days)

        self.logger.info("📊 VELOCITY METRICS")
        self.logger.info("─" * 60)
        self.logger.info(f"Total tasks completed: {velocity['total_tasks']}\n")

        self.logger.info("🤖 Agent Performance:")
        agent = velocity['agent']
        self.logger.info(f"   Tasks: {agent['count']}")
        self.logger.info(f"   Avg actual time: {agent['avg_actual_hours']:.1f}h")
        self.logger.info(f"   Avg estimated: {agent['avg_estimated_hours']:.1f}h")
        self.logger.info(f"   Estimation accuracy: {agent['estimation_accuracy']:.1f}%\n")

        self.logger.info("👤 Human Performance:")
        human = velocity['human']
        self.logger.info(f"   Tasks: {human['count']}")
        self.logger.info(f"   Avg actual time: {human['avg_actual_hours']:.1f}h")
        self.logger.info(f"   Avg estimated: {human['avg_estimated_hours']:.1f}h")
        self.logger.info(f"   Estimation accuracy: {human['estimation_accuracy']:.1f}%\n")

        # Assignment distribution
        dist = self.get_assignment_distribution(days)
        self.logger.info("📈 ASSIGNMENT DISTRIBUTION")
        self.logger.info("─" * 60)
        self.logger.info(f"🤖 Agent:  {dist['agent_count']:3d} tasks ({dist['agent_pct']:.1f}%)")
        self.logger.info(f"👤 Human:  {dist['human_count']:3d} tasks ({dist['human_pct']:.1f}%)\n")

        # Review effectiveness
        review = self.get_review_effectiveness(days)
        self.logger.info("⚠️  REVIEW EFFECTIVENESS")
        self.logger.info("─" * 60)
        self.logger.info(f"Tasks reviewed: {review['tasks_reviewed']}")
        self.logger.info(f"Avg findings per review: {review['avg_findings']:.1f}")
        self.logger.info(f"High-risk caught: {review['high_risk_caught']}")
        if review['tasks_reviewed'] > 0:
            self.logger.info(f"Catch rate: {review['catch_rate']:.1f}%")
        self.logger.info("")

        # Label analysis
        labels = self.get_label_analysis(days)
        if labels:
            self.logger.info("🏷️  BY LABEL")
            self.logger.info("─" * 60)
            for label, stats in sorted(labels.items(), key=lambda x: x[1]['total_hours'], reverse=True)[:10]:
                total = stats['agent'] + stats['human']
                agent_pct = (stats['agent'] / total * 100) if total > 0 else 0
                self.logger.info(f"{label:15s}  🤖 {stats['agent']:2d}  👤 {stats['human']:2d}  " +
                      f"({agent_pct:.0f}% agent)  {stats['total_hours']:.1f}h")

        self.logger.info("")

    def export_csv(self, output_file: str):
        """Export metrics to CSV for analysis."""
        import csv

        with open(output_file, 'w', newline='') as f:
            if not self.completions:
                self.logger.warning("No data to export")
                return

            fieldnames = list(asdict(self.completions[0]).keys())
            writer = csv.DictWriter(f, fieldnames=fieldnames)

            writer.writeheader()
            for completion in self.completions:
                writer.writerow(asdict(completion))

        self.logger.success(f"Exported {len(self.completions)} records to {output_file}")


def main():
    """Main entry point."""
    logger = Logger()

    parser = argparse.ArgumentParser(description="Track and analyze assignment metrics")

    parser.add_argument("--data-file", default=None,
                        help=f"Metrics data file (default: {DEFAULT_METRICS_FILE})")

    # Recording
    parser.add_argument("--track-completion", metavar="TASK_ID",
                        help="Record task completion")
    parser.add_argument("--assignee-type", choices=["agent", "human"],
                        help="Type of assignee")
    parser.add_argument("--estimated", type=float,
                        help="Estimated hours")
    parser.add_argument("--actual", type=float,
                        help="Actual hours taken")
    parser.add_argument("--status", choices=["completed", "failed", "blocked"],
                        default="completed", help="Completion status")
    parser.add_argument("--labels", help="Comma-separated labels")
    parser.add_argument("--required-review", action="store_true",
                        help="Whether review was required")
    parser.add_argument("--review-findings", type=int, default=0,
                        help="Number of issues found in review")

    # Reporting
    parser.add_argument("--report", action="store_true",
                        help="Generate metrics report")
    parser.add_argument("--export-csv", metavar="FILE",
                        help="Export metrics to CSV")
    parser.add_argument("--days", type=int, default=30,
                        help="Number of days to analyze (default: 30)")

    args = parser.parse_args()

    metrics = AssignmentMetrics(args.data_file, logger=logger)

    if args.track_completion:
        if not args.assignee_type or args.estimated is None or args.actual is None:
            logger.error("--assignee-type, --estimated, and --actual required for tracking")
            sys.exit(1)

        completion = TaskCompletion(
            task_id=args.track_completion,
            assignee_type=args.assignee_type,
            estimated_hours=args.estimated,
            actual_hours=args.actual,
            status=args.status,
            labels=args.labels.split(',') if args.labels else [],
            completed_at=datetime.now().isoformat(),
            required_review=args.required_review,
            review_findings=args.review_findings
        )

        metrics.record_completion(completion)

    elif args.report:
        metrics.generate_report(args.days)

    elif args.export_csv:
        metrics.export_csv(args.export_csv)

    else:
        # Show quick summary
        dist = metrics.get_assignment_distribution(args.days)
        logger.info(f"\n📊 Quick Summary (last {args.days} days):")
        logger.info(f"   Total tasks: {dist['total']}")
        logger.info(f"   🤖 Agent: {dist['agent_count']} ({dist['agent_pct']:.1f}%)")
        logger.info(f"   👤 Human: {dist['human_count']} ({dist['human_pct']:.1f}%)")
        logger.info(f"\nUse --report for detailed analysis")
        logger.info(f"Use --track-completion to record task completions\n")


if __name__ == "__main__":
    main()
