"""
Cost Estimation Module

Provides cost estimation for AWS infrastructure with scenario-based modeling.
"""

from dataclasses import dataclass
from typing import List, Dict, Optional
from enum import Enum


class Scenario(str, Enum):
    """Usage scenarios for cost estimation"""
    IDLE = 'idle'
    USERS_10 = '10_users'
    USERS_100 = '100_users'
    USERS_1000 = '1000_users'


@dataclass
class CostDriver:
    """Individual cost driver for a resource"""
    name: str
    value: float  # Quantity (hours, GB, requests, etc.)
    cost: float   # Cost in USD
    explanation: str


@dataclass
class ResourceCost:
    """Cost breakdown for a single resource"""
    resource_id: str
    resource_type: str
    resource_name: str
    monthly_cost: float
    annual_cost: float
    cost_drivers: List[CostDriver]
    optimization_suggestions: List[str]


@dataclass
class ScenarioCost:
    """Cost estimate for a specific usage scenario"""
    scenario: Scenario
    total_monthly: float
    total_annual: float
    breakdown: List[ResourceCost]


@dataclass
class CostEstimateReport:
    """Complete cost estimation report"""
    stack_type: str
    region: str
    currency: str
    scenarios: Dict[str, ScenarioCost]
    free_tier_eligible: bool
    optimization_recommendations: List[str]