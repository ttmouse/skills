#!/usr/bin/env python3
"""
Linear API Integration

Real Linear API integration using Linear MCP server or direct API calls.

Refactored to use professional logging and centralized GraphQL queries.

Requirements:
    - Linear API key: export LINEAR_API_KEY=lin_api_xxx
    - Linear MCP: claude mcp add linear npx @linear/mcp

Usage:
    from linear_integration import LinearClient

    client = LinearClient(api_key="your_key")
    issue = client.create_issue(
        team_id="TEAM123",
        title="Implement feature",
        description="...",
        assignee_id="user-abc",
        priority=1
    )
"""

import os
import sys
import json
import requests
from pathlib import Path
from typing import Dict, List, Optional
from dataclasses import dataclass, asdict

# Add shared directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / 'shared'))
from logger import Logger

# Import constants
from constants import (
    LINEAR_API_URL,
    LINEAR_API_TIMEOUT,
    LINEAR_QUERIES,
    LINEAR_MUTATIONS,
)


@dataclass
class LinearIssue:
    """Represents a Linear issue."""
    id: Optional[str] = None
    title: str = ""
    description: str = ""
    team_id: str = ""
    assignee_id: Optional[str] = None
    priority: int = 0  # 0=None, 1=Urgent, 2=High, 3=Medium, 4=Low
    estimate: Optional[int] = None  # Story points or hours
    labels: List[str] = None
    parent_id: Optional[str] = None
    state_id: Optional[str] = None

    def __post_init__(self):
        if self.labels is None:
            self.labels = []


class LinearClient:
    """Linear API client for creating and managing issues."""

    def __init__(self, api_key: str = None, logger: Logger = None):
        """
        Initialize Linear client.

        Args:
            api_key: Linear API key. If not provided, reads from LINEAR_API_KEY env var.
            logger: Logger instance. If not provided, creates new one.
        """
        self.api_key = api_key or os.getenv("LINEAR_API_KEY")
        self.logger = logger or Logger()

        if not self.api_key:
            raise ValueError(
                "Linear API key required. Set LINEAR_API_KEY env var or pass api_key parameter.\n"
                "Get your API key from: https://linear.app/settings/api"
            )

        self.headers = {
            "Authorization": self.api_key,
            "Content-Type": "application/json"
        }

    def _execute_query(self, query: str, variables: Dict = None) -> Dict:
        """Execute GraphQL query against Linear API."""
        payload = {
            "query": query,
            "variables": variables or {}
        }

        try:
            response = requests.post(
                LINEAR_API_URL,
                headers=self.headers,
                json=payload,
                timeout=LINEAR_API_TIMEOUT / 1000  # Convert ms to seconds
            )
            response.raise_for_status()
            result = response.json()

            if "errors" in result:
                error_msgs = [e.get("message", str(e)) for e in result["errors"]]
                raise Exception(f"Linear API errors: {', '.join(error_msgs)}")

            return result.get("data", {})

        except requests.exceptions.RequestException as e:
            raise Exception(f"Linear API request failed: {e}")

    def get_teams(self) -> List[Dict]:
        """Get all teams."""
        result = self._execute_query(LINEAR_QUERIES['get_teams'])
        return result.get("teams", {}).get("nodes", [])

    def get_users(self, team_id: str = None) -> List[Dict]:
        """Get users, optionally filtered by team."""
        result = self._execute_query(LINEAR_QUERIES['get_users'], {"teamId": team_id})
        return result.get("users", {}).get("nodes", [])

    def get_workflow_states(self, team_id: str) -> List[Dict]:
        """Get workflow states for a team."""
        result = self._execute_query(LINEAR_QUERIES['get_workflow_states'], {"teamId": team_id})
        return result.get("team", {}).get("states", {}).get("nodes", [])

    def create_issue(
        self,
        team_id: str,
        title: str,
        description: str = "",
        assignee_id: str = None,
        priority: int = 0,
        estimate: int = None,
        labels: List[str] = None,
        parent_id: str = None,
        state_id: str = None
    ) -> Dict:
        """
        Create a Linear issue.

        Args:
            team_id: Team ID (e.g., "TEAM123")
            title: Issue title
            description: Issue description (supports Markdown)
            assignee_id: User ID to assign to
            priority: Priority (0=None, 1=Urgent, 2=High, 3=Medium, 4=Low)
            estimate: Estimate in story points or hours
            labels: List of label IDs
            parent_id: Parent issue ID for sub-issues
            state_id: Workflow state ID

        Returns:
            Created issue data including ID and URL
        """
        issue_input = {
            "teamId": team_id,
            "title": title,
            "description": description
        }

        if assignee_id:
            issue_input["assigneeId"] = assignee_id
        if priority > 0:
            issue_input["priority"] = priority
        if estimate:
            issue_input["estimate"] = estimate
        if labels:
            issue_input["labelIds"] = labels
        if parent_id:
            issue_input["parentId"] = parent_id
        if state_id:
            issue_input["stateId"] = state_id

        variables = {"input": issue_input}

        result = self._execute_query(LINEAR_MUTATIONS['create_issue'], variables)

        if not result.get("issueCreate", {}).get("success"):
            raise Exception("Failed to create Linear issue")

        return result["issueCreate"]["issue"]

    def create_issues_bulk(self, issues: List[LinearIssue]) -> List[Dict]:
        """
        Create multiple issues.

        Args:
            issues: List of LinearIssue objects

        Returns:
            List of created issue data
        """
        created_issues = []

        for issue in issues:
            try:
                result = self.create_issue(
                    team_id=issue.team_id,
                    title=issue.title,
                    description=issue.description,
                    assignee_id=issue.assignee_id,
                    priority=issue.priority,
                    estimate=issue.estimate,
                    labels=issue.labels,
                    parent_id=issue.parent_id,
                    state_id=issue.state_id
                )
                created_issues.append(result)
                self.logger.success(f"Created: {result['identifier']} - {result['title']}")

            except Exception as e:
                self.logger.error(f"Failed to create '{issue.title}': {e}")
                continue

        return created_issues

    def update_issue(self, issue_id: str, updates: Dict) -> Dict:
        """
        Update an existing issue.

        Args:
            issue_id: Issue ID
            updates: Dict of fields to update (title, description, assigneeId, etc.)

        Returns:
            Updated issue data
        """
        variables = {
            "id": issue_id,
            "input": updates
        }

        result = self._execute_query(LINEAR_MUTATIONS['update_issue'], variables)

        if not result.get("issueUpdate", {}).get("success"):
            raise Exception(f"Failed to update issue {issue_id}")

        return result["issueUpdate"]["issue"]

    def get_issue(self, issue_id: str) -> Dict:
        """Get issue by ID."""
        result = self._execute_query(LINEAR_QUERIES['get_issue'], {"id": issue_id})
        return result.get("issue", {})

    def find_user_by_email(self, email: str) -> Optional[Dict]:
        """Find user by email address."""
        users = self.get_users()
        for user in users:
            if user.get("email", "").lower() == email.lower():
                return user
        return None

    def find_team_by_key(self, team_key: str) -> Optional[Dict]:
        """Find team by key (e.g., 'ENG' for team ENG-123)."""
        teams = self.get_teams()
        for team in teams:
            if team.get("key", "").upper() == team_key.upper():
                return team
        return None


def example_usage():
    """Example usage of Linear integration."""
    logger = Logger()

    # Initialize client (requires LINEAR_API_KEY env var)
    client = LinearClient(logger=logger)

    # Get teams
    logger.info("📋 Available teams:")
    teams = client.get_teams()
    for team in teams[:5]:  # Show first 5
        logger.info(f"  - {team['key']}: {team['name']} (ID: {team['id']})")

    if not teams:
        logger.warning("No teams found!")
        return

    # Use first team for example
    team_id = teams[0]['id']
    team_key = teams[0]['key']

    # Get users
    logger.info(f"\n👥 Users in team {team_key}:")
    users = client.get_users(team_id)
    for user in users[:5]:  # Show first 5
        logger.info(f"  - {user['displayName']} ({user['email']}) - ID: {user['id']}")

    # Create example issue
    logger.info(f"\n🎯 Creating test issue in team {team_key}...")

    issue = client.create_issue(
        team_id=team_id,
        title="[TEST] Example issue from Claude Skills",
        description="""
# Test Issue

This is a test issue created by the Linear integration script.

## Tasks
- [ ] Test task 1
- [ ] Test task 2

Created via Claude Skills repository.
        """,
        assignee_id=users[0]['id'] if users else None,
        priority=3  # Medium
    )

    logger.success(f"Created: {issue['identifier']}")
    logger.info(f"  Title: {issue['title']}")
    logger.info(f"  URL: {issue['url']}")
    if issue.get('assignee'):
        logger.info(f"  Assigned to: {issue['assignee']['name']}")


if __name__ == "__main__":
    logger = Logger()
    try:
        example_usage()
    except Exception as e:
        logger.error(f"Error: {e}")
        sys.exit(1)
