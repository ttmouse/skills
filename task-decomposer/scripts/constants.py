#!/usr/bin/env python3
"""
Constants and Configuration for task-decomposer
Centralized GraphQL queries, API endpoints, and configuration.
"""

import sys
from pathlib import Path

# Add shared directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / 'shared'))
from constants_base import DEFAULT_TIMEOUT

# ===================================================================
# LINEAR API CONFIGURATION
# ===================================================================

LINEAR_API_URL = "https://api.linear.app/graphql"
LINEAR_API_TIMEOUT = DEFAULT_TIMEOUT  # 30 seconds

# ===================================================================
# LINEAR GRAPHQL QUERIES
# ===================================================================

LINEAR_QUERIES = {
    'get_teams': """
        query {
            teams {
                nodes {
                    id
                    name
                    key
                }
            }
        }
    """,

    'get_users': """
        query($teamId: String) {
            users {
                nodes {
                    id
                    name
                    email
                    displayName
                }
            }
        }
    """,

    'get_workflow_states': """
        query($teamId: String!) {
            team(id: $teamId) {
                states {
                    nodes {
                        id
                        name
                        type
                    }
                }
            }
        }
    """,

    'get_issue': """
        query($issueId: String!) {
            issue(id: $issueId) {
                id
                identifier
                title
                description
                priority
                estimate
                state {
                    id
                    name
                }
                assignee {
                    id
                    name
                }
            }
        }
    """,

    'search_users': """
        query($query: String!) {
            users(filter: { name: { contains: $query } }) {
                nodes {
                    id
                    name
                    email
                    displayName
                }
            }
        }
    """,
}

LINEAR_MUTATIONS = {
    'create_issue': """
        mutation CreateIssue($input: IssueCreateInput!) {
            issueCreate(input: $input) {
                success
                issue {
                    id
                    identifier
                    title
                    url
                    assignee {
                        id
                        name
                    }
                }
            }
        }
    """,

    'update_issue': """
        mutation UpdateIssue($id: String!, $input: IssueUpdateInput!) {
            issueUpdate(id: $id, input: $input) {
                success
                issue {
                    id
                    identifier
                    title
                }
            }
        }
    """,
}

# ===================================================================
# PRIORITY MAPPINGS
# ===================================================================

# Linear API priority values
LINEAR_PRIORITY = {
    'P0': 1,  # Urgent
    'P1': 2,  # High
    'P2': 3,  # Medium
    'P3': 4,  # Low
    'none': 0,  # No priority
}

# Reverse mapping
LINEAR_PRIORITY_NAMES = {
    0: 'None',
    1: 'Urgent',
    2: 'High',
    3: 'Medium',
    4: 'Low',
}

# ===================================================================
# ASSIGNMENT DETECTION KEYWORDS
# ===================================================================

# Keywords that suggest agent can handle the task
AGENT_KEYWORDS = [
    'automate', 'script', 'test', 'lint', 'format',
    'generate', 'compile', 'build', 'deploy', 'migrate',
    'refactor', 'optimize', 'fix bug', 'update dependency',
    'add test', 'documentation', 'type hint', 'config',
]

# Keywords that suggest human intervention needed
HUMAN_KEYWORDS = [
    'design', 'architecture', 'decision', 'strategy',
    'review', 'approve', 'ux', 'ui', 'user experience',
    'customer', 'stakeholder', 'meeting', 'discuss',
    'plan', 'estimate', 'prioritize', 'roadmap',
    'security review', 'compliance', 'legal',
]

# Keywords that require human review even if agent-assigned
REVIEW_KEYWORDS = [
    'security', 'auth', 'permission', 'payment', 'billing',
    'data migration', 'schema change', 'database',
    'production', 'deploy', 'release', 'config change',
    'api change', 'breaking change', 'critical',
]

# ===================================================================
# TASK LABELS
# ===================================================================

COMMON_LABELS = [
    'frontend',
    'backend',
    'api',
    'database',
    'testing',
    'documentation',
    'infrastructure',
    'security',
    'bug',
    'feature',
    'refactor',
    'chore',
]

RISK_LABELS = {
    'LOW': ['low-risk', 'safe', 'straightforward'],
    'MEDIUM': ['medium-risk', 'moderate', 'complex'],
    'HIGH': ['high-risk', 'critical', 'breaking-change'],
}

# ===================================================================
# ESTIMATION DEFAULTS
# ===================================================================

# Default estimates by complexity
DEFAULT_ESTIMATES = {
    'low': 2.0,      # 2 hours
    'medium': 8.0,   # 1 day
    'high': 24.0,    # 3 days
}

# Adjustment factors by label
ESTIMATE_ADJUSTMENTS = {
    'frontend': 1.2,    # UI work tends to take longer
    'testing': 0.8,     # Tests are more straightforward
    'documentation': 0.6,  # Documentation is faster
    'infrastructure': 1.5,  # Infrastructure is complex
    'security': 1.4,    # Security requires extra care
    'database': 1.3,    # DB changes need caution
}

# ===================================================================
# OUTPUT FORMATS
# ===================================================================

SUPPORTED_OUTPUT_FORMATS = ['markdown', 'json', 'yaml']

DEFAULT_OUTPUT_FORMAT = 'markdown'

# ===================================================================
# METRICS CONFIGURATION
# ===================================================================

# Default metrics data file
DEFAULT_METRICS_FILE = "assignment_metrics.json"

# Velocity calculation lookback period
DEFAULT_VELOCITY_DAYS = 30

# Accuracy thresholds
ACCURACY_THRESHOLDS = {
    'excellent': 0.9,   # 90%+ accurate
    'good': 0.75,       # 75-90% accurate
    'fair': 0.6,        # 60-75% accurate
    'poor': 0.0,        # <60% accurate
}

# ===================================================================
# DEPENDENCY GRAPH SETTINGS
# ===================================================================

# DOT graph styling
DOT_GRAPH_STYLE = {
    'graph': {
        'rankdir': 'TB',
        'bgcolor': 'transparent',
        'fontname': 'Arial',
    },
    'node': {
        'shape': 'box',
        'style': 'rounded,filled',
        'fillcolor': 'lightblue',
        'fontname': 'Arial',
    },
    'edge': {
        'arrowhead': 'vee',
        'color': 'gray',
    },
}

# Node colors by priority
NODE_COLORS = {
    'P0': '#ff6b6b',  # Red for critical
    'P1': '#ffa500',  # Orange for important
    'P2': '#4dabf7',  # Blue for nice-to-have
}

# ===================================================================
# RISK MATRIX SETTINGS
# ===================================================================

RISK_MATRIX_LEVELS = ['LOW', 'MEDIUM', 'HIGH']

RISK_MATRIX_IMPACTS = {
    'LOW': 'Minor impact, easy to fix',
    'MEDIUM': 'Moderate impact, requires attention',
    'HIGH': 'Major impact, needs immediate action',
}

# ===================================================================
# CLI DEFAULTS
# ===================================================================

DEFAULT_PROJECT_TYPE = None  # No default, must be specified
DEFAULT_COMPLEXITY = "medium"
DEFAULT_TEAM_ID = None  # Must be provided for Linear export

# ===================================================================
# GITHUB INTEGRATION (Future)
# ===================================================================

GITHUB_API_URL = "https://api.github.com"
GITHUB_API_VERSION = "2022-11-28"

# ===================================================================
# DECOMPOSITION SETTINGS
# ===================================================================

# Maximum number of subtasks to generate
MAX_SUBTASKS = 15

# Minimum hours per subtask (prevents micro-tasks)
MIN_TASK_HOURS = 0.5

# Maximum hours per subtask (suggests further decomposition)
MAX_TASK_HOURS = 16.0

# Default number of acceptance criteria per task
DEFAULT_ACCEPTANCE_CRITERIA_COUNT = 3

# Default number of testing criteria per task
DEFAULT_TESTING_CRITERIA_COUNT = 2
