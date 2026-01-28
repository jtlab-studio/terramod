"""
Cost Estimation API Routes
"""

from fastapi import APIRouter, HTTPException, status
from typing import Dict, List, Any
from pydantic import BaseModel
from app.cost.estimator import CostEstimator
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


class CostEstimateRequest(BaseModel):
    """Cost estimation request"""
    graph: Dict[str, Any]
    stack_type: str
    region: str = 'us-east-1'
    currency: str = 'USD'


class CostEstimateResponse(BaseModel):
    """Cost estimation response"""
    stack_type: str
    region: str
    currency: str
    scenarios: Dict[str, Any]
    free_tier_eligible: bool
    optimization_recommendations: List[str]


@router.post("/estimate", response_model=CostEstimateResponse)
async def estimate_costs(request: CostEstimateRequest):
    """
    Estimate infrastructure costs for all scenarios
    
    Returns cost estimates for idle, 10 users, 100 users, and 1000 users scenarios.
    """
    try:
        logger.info(f"Estimating costs for stack: {request.stack_type}, region: {request.region}")
        
        estimator = CostEstimator()
        report = estimator.estimate_stack_costs(
            graph=request.graph,
            stack_type=request.stack_type,
            region=request.region,
            currency=request.currency
        )
        
        # Convert to dict for response
        scenarios_dict = {}
        for scenario_key, scenario_cost in report.scenarios.items():
            scenarios_dict[scenario_key] = {
                'scenario': scenario_cost.scenario.value,
                'total_monthly': scenario_cost.total_monthly,
                'total_annual': scenario_cost.total_annual,
                'breakdown': [
                    {
                        'resource_id': rc.resource_id,
                        'resource_type': rc.resource_type,
                        'resource_name': rc.resource_name,
                        'monthly_cost': rc.monthly_cost,
                        'annual_cost': rc.annual_cost,
                        'cost_drivers': [
                            {
                                'name': cd.name,
                                'value': cd.value,
                                'cost': cd.cost,
                                'explanation': cd.explanation
                            }
                            for cd in rc.cost_drivers
                        ],
                        'optimization_suggestions': rc.optimization_suggestions
                    }
                    for rc in scenario_cost.breakdown
                ]
            }
        
        logger.info(f"Cost estimation complete: {len(scenarios_dict)} scenarios")
        
        return CostEstimateResponse(
            stack_type=report.stack_type,
            region=report.region,
            currency=report.currency,
            scenarios=scenarios_dict,
            free_tier_eligible=report.free_tier_eligible,
            optimization_recommendations=report.optimization_recommendations
        )
        
    except Exception as e:
        logger.error(f"Cost estimation failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Cost estimation failed: {str(e)}"
        )


@router.get("/pricing/{region}")
async def get_regional_pricing(region: str):
    """Get pricing information for a specific region"""
    try:
        from app.cost.pricing import REGIONAL_MULTIPLIERS, EC2_PRICING, RDS_PRICING
        
        multiplier = REGIONAL_MULTIPLIERS.get(region, 1.0)
        
        return {
            'region': region,
            'multiplier': multiplier,
            'sample_pricing': {
                'ec2_t3_micro': EC2_PRICING['t3.micro'] * multiplier,
                'rds_t3_micro': RDS_PRICING['db.t3.micro'] * multiplier
            }
        }
    except Exception as e:
        logger.error(f"Failed to get regional pricing: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/scenarios/{stack_type}")
async def get_scenario_assumptions(stack_type: str):
    """Get usage assumptions for a stack type"""
    try:
        from app.cost.assumptions import STACK_ASSUMPTIONS
        from app.cost import Scenario
        
        assumptions = STACK_ASSUMPTIONS.get(stack_type, {})
        
        return {
            'stack_type': stack_type,
            'scenarios': {
                scenario.value: assumptions.get(scenario, {})
                for scenario in Scenario
            }
        }
    except Exception as e:
        logger.error(f"Failed to get scenario assumptions: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


class CompareRegionsRequest(BaseModel):
    """Region comparison request"""
    graph: Dict[str, Any]
    stack_type: str
    regions: List[str]
    currency: str = 'USD'


@router.post("/compare")
async def compare_regions(request: CompareRegionsRequest):
    """Compare costs across multiple regions"""
    try:
        estimator = CostEstimator()
        comparisons = {}
        
        for region in request.regions:
            report = estimator.estimate_stack_costs(
                graph=request.graph,
                stack_type=request.stack_type,
                region=region,
                currency=request.currency
            )
            
            # Extract 100 users scenario for comparison
            scenario_100 = report.scenarios.get('100_users')
            if scenario_100:
                comparisons[region] = {
                    'monthly_cost': scenario_100.total_monthly,
                    'annual_cost': scenario_100.total_annual
                }
        
        return {
            'stack_type': request.stack_type,
            'comparisons': comparisons
        }
        
    except Exception as e:
        logger.error(f"Region comparison failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )