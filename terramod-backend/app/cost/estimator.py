"""
Cost Estimation Engine

Calculates infrastructure costs based on usage scenarios and AWS pricing.
"""

from typing import Dict, List, Any
from app.cost import Scenario, CostDriver, ResourceCost, ScenarioCost, CostEstimateReport
from app.cost.pricing import (
    get_ec2_price, get_rds_price, get_lambda_cost, get_s3_cost,
    get_dynamodb_cost, calculate_alb_cost, NAT_GATEWAY_PRICING,
    CLOUDWATCH_PRICING, EBS_PRICING, apply_regional_multiplier
)
from app.cost.assumptions import get_assumptions, get_optimization_recommendations
import logging

logger = logging.getLogger(__name__)


class CostEstimator:
    """Main cost estimation engine"""
    
    def __init__(self):
        self.region = 'us-east-1'
        self.currency = 'USD'
    
    def estimate_stack_costs(
        self,
        graph: Dict[str, Any],
        stack_type: str,
        region: str = 'us-east-1',
        currency: str = 'USD'
    ) -> CostEstimateReport:
        """
        Estimate costs for all scenarios
        
        Args:
            graph: Infrastructure graph with domains, resources, connections
            stack_type: Stack template ID (e.g., '3-tier-web-app')
            region: AWS region
            currency: Target currency
            
        Returns:
            Complete cost estimate report
        """
        self.region = region
        self.currency = currency
        
        scenarios = {}
        
        # Calculate for each scenario
        for scenario in Scenario:
            scenario_cost = self.estimate_scenario(graph, stack_type, scenario)
            scenarios[scenario.value] = scenario_cost
        
        # Check free tier eligibility (idle scenario < $5/month)
        idle_cost = scenarios[Scenario.IDLE.value].total_monthly
        free_tier_eligible = idle_cost < 5.0
        
        # Get overall optimization recommendations
        max_cost = max(s.total_monthly for s in scenarios.values())
        optimizations = get_optimization_recommendations(stack_type, Scenario.USERS_1000, max_cost)
        
        return CostEstimateReport(
            stack_type=stack_type,
            region=region,
            currency=currency,
            scenarios=scenarios,
            free_tier_eligible=free_tier_eligible,
            optimization_recommendations=optimizations
        )
    
    def estimate_scenario(
        self,
        graph: Dict[str, Any],
        stack_type: str,
        scenario: Scenario
    ) -> ScenarioCost:
        """Estimate costs for a specific scenario"""
        
        assumptions = get_assumptions(stack_type, scenario)
        resources = graph.get('resources', [])
        
        resource_costs = []
        total_monthly = 0.0
        
        # Estimate each resource
        for resource in resources:
            cost = self._estimate_resource_cost(
                resource.get('type'),
                resource.get('name', 'unknown'),
                resource.get('arguments', {}),
                assumptions
            )
            
            if cost:
                resource_costs.append(cost)
                total_monthly += cost.monthly_cost
        
        total_annual = total_monthly * 12
        
        return ScenarioCost(
            scenario=scenario,
            total_monthly=total_monthly,
            total_annual=total_annual,
            breakdown=resource_costs
        )
    
    def _estimate_resource_cost(
        self,
        resource_type: str,
        resource_name: str,
        arguments: Dict[str, Any],
        assumptions: Dict[str, Any]
    ) -> ResourceCost | None:
        """Estimate cost for a single resource"""
        
        try:
            if resource_type == 'aws_instance':
                return self._estimate_ec2_cost(resource_name, arguments, assumptions)
            
            elif resource_type == 'aws_db_instance':
                return self._estimate_rds_cost(resource_name, arguments, assumptions)
            
            elif resource_type == 'aws_lambda_function':
                return self._estimate_lambda_cost(resource_name, arguments, assumptions)
            
            elif resource_type == 'aws_s3_bucket':
                return self._estimate_s3_cost(resource_name, arguments, assumptions)
            
            elif resource_type == 'aws_dynamodb_table':
                return self._estimate_dynamodb_cost(resource_name, arguments, assumptions)
            
            elif resource_type in ['aws_lb', 'aws_alb']:
                return self._estimate_alb_cost(resource_name, arguments, assumptions)
            
            elif resource_type == 'aws_nat_gateway':
                return self._estimate_nat_cost(resource_name, arguments, assumptions)
            
            elif resource_type == 'aws_cloudwatch_log_group':
                return self._estimate_cloudwatch_cost(resource_name, arguments, assumptions)
            
            else:
                # Resource type not priced separately (e.g., security groups, IAM roles)
                return None
                
        except Exception as e:
            logger.error(f"Failed to estimate cost for {resource_type}: {e}")
            return None
    
    def _estimate_ec2_cost(
        self,
        name: str,
        arguments: Dict[str, Any],
        assumptions: Dict[str, Any]
    ) -> ResourceCost:
        """Estimate EC2 instance costs"""
        
        instance_type = arguments.get('instance_type', 't3.micro')
        ebs_size = arguments.get('ebs_volume_size', 20)
        
        instances = assumptions.get('ec2_instances', 1)
        hours = assumptions.get('ec2_hours_per_month', 730)
        
        # EC2 compute cost
        hourly_rate = get_ec2_price(instance_type, self.region)
        compute_cost = hourly_rate * hours
        
        # EBS cost
        ebs_cost = ebs_size * EBS_PRICING['gp3'] * instances
        
        # Data transfer (simplified)
        transfer_cost = 0.0
        
        monthly_cost = compute_cost + ebs_cost + transfer_cost
        
        cost_drivers = [
            CostDriver(
                name="Instance hours",
                value=hours,
                cost=compute_cost,
                explanation=f"{instances}× {instance_type} × {hours/instances:.0f} hours"
            ),
            CostDriver(
                name="EBS storage",
                value=ebs_size * instances,
                cost=ebs_cost,
                explanation=f"{ebs_size}GB gp3 × {instances} instances"
            )
        ]
        
        optimizations = []
        if monthly_cost > 20:
            optimizations.append("Consider Reserved Instances for 40% savings")
        if instance_type.startswith('t3'):
            optimizations.append(f"Consider t4g.{instance_type.split('.')[1]} for 20% savings (ARM-based)")
        
        return ResourceCost(
            resource_id=name,
            resource_type='aws_instance',
            resource_name=name,
            monthly_cost=monthly_cost,
            annual_cost=monthly_cost * 12,
            cost_drivers=cost_drivers,
            optimization_suggestions=optimizations
        )
    
    def _estimate_rds_cost(
        self,
        name: str,
        arguments: Dict[str, Any],
        assumptions: Dict[str, Any]
    ) -> ResourceCost:
        """Estimate RDS costs"""
        
        instance_class = arguments.get('instance_class', 'db.t3.micro')
        allocated_storage = arguments.get('allocated_storage', 20)
        multi_az = arguments.get('multi_az', False)
        
        hours = assumptions.get('rds_hours_per_month', 730)
        
        # RDS instance cost
        hourly_rate = get_rds_price(instance_class, self.region)
        if multi_az:
            hourly_rate *= 2  # Multi-AZ doubles cost
        instance_cost = hourly_rate * hours
        
        # Storage cost
        storage_cost = allocated_storage * 0.115  # gp3 storage per GB per month
        
        # Backup storage (estimated at 50% of allocated)
        backup_cost = (allocated_storage * 0.5) * 0.095
        
        monthly_cost = instance_cost + storage_cost + backup_cost
        
        cost_drivers = [
            CostDriver(
                name="Instance hours",
                value=hours,
                cost=instance_cost,
                explanation=f"{instance_class} × {hours} hours{' × 2 (Multi-AZ)' if multi_az else ''}"
            ),
            CostDriver(
                name="Storage",
                value=allocated_storage,
                cost=storage_cost,
                explanation=f"{allocated_storage}GB gp3 storage"
            ),
            CostDriver(
                name="Backup storage",
                value=allocated_storage * 0.5,
                cost=backup_cost,
                explanation=f"Automated backups (~50% of allocated)"
            )
        ]
        
        optimizations = []
        if monthly_cost > 30:
            optimizations.append("Consider Reserved Instances for 35-65% savings")
        if not multi_az and arguments.get('environment') == 'prod':
            optimizations.append("Enable Multi-AZ for production high availability")
        
        return ResourceCost(
            resource_id=name,
            resource_type='aws_db_instance',
            resource_name=name,
            monthly_cost=monthly_cost,
            annual_cost=monthly_cost * 12,
            cost_drivers=cost_drivers,
            optimization_suggestions=optimizations
        )
    
    def _estimate_lambda_cost(
        self,
        name: str,
        arguments: Dict[str, Any],
        assumptions: Dict[str, Any]
    ) -> ResourceCost:
        """Estimate Lambda costs"""
        
        memory_mb = arguments.get('memory_size', 512)
        invocations = assumptions.get('lambda_invocations', 1000)
        avg_duration_ms = assumptions.get('lambda_avg_duration_ms', 200)
        
        # Calculate GB-seconds
        gb_seconds = (memory_mb / 1024) * (avg_duration_ms / 1000) * invocations
        
        monthly_cost = get_lambda_cost(invocations, gb_seconds, self.region, include_free_tier=True)
        
        cost_drivers = [
            CostDriver(
                name="Requests",
                value=invocations,
                cost=monthly_cost * 0.1,  # Requests are ~10% of cost
                explanation=f"{invocations:,} invocations"
            ),
            CostDriver(
                name="Duration",
                value=gb_seconds,
                cost=monthly_cost * 0.9,  # Duration is ~90% of cost
                explanation=f"{gb_seconds:.2f} GB-seconds ({memory_mb}MB × {avg_duration_ms}ms avg)"
            )
        ]
        
        optimizations = []
        if memory_mb > 512:
            optimizations.append("Optimize memory allocation using AWS Lambda Power Tuning")
        if invocations > 100000:
            optimizations.append("Use Lambda connection pooling to reduce cold starts")
        
        return ResourceCost(
            resource_id=name,
            resource_type='aws_lambda_function',
            resource_name=name,
            monthly_cost=monthly_cost,
            annual_cost=monthly_cost * 12,
            cost_drivers=cost_drivers,
            optimization_suggestions=optimizations
        )
    
    def _estimate_s3_cost(
        self,
        name: str,
        arguments: Dict[str, Any],
        assumptions: Dict[str, Any]
    ) -> ResourceCost:
        """Estimate S3 costs"""
        
        storage_gb = assumptions.get('s3_storage_gb', 1)
        get_requests = assumptions.get('s3_get_requests', 1000)
        put_requests = assumptions.get('s3_put_requests', 100)
        transfer_gb = assumptions.get('s3_transfer_gb', 0.5)
        
        monthly_cost = get_s3_cost(
            storage_gb, get_requests, put_requests, transfer_gb,
            self.region, include_free_tier=True
        )
        
        cost_drivers = [
            CostDriver(
                name="Storage",
                value=storage_gb,
                cost=monthly_cost * 0.4,
                explanation=f"{storage_gb}GB Standard storage"
            ),
            CostDriver(
                name="Requests",
                value=get_requests + put_requests,
                cost=monthly_cost * 0.3,
                explanation=f"{get_requests:,} GET + {put_requests:,} PUT"
            ),
            CostDriver(
                name="Data transfer",
                value=transfer_gb,
                cost=monthly_cost * 0.3,
                explanation=f"{transfer_gb}GB outbound transfer"
            )
        ]
        
        optimizations = []
        if storage_gb > 10:
            optimizations.append("Use S3 Lifecycle Policies to transition old data to Glacier")
        if transfer_gb > 10:
            optimizations.append("Use CloudFront CDN to reduce S3 transfer costs by up to 70%")
        
        return ResourceCost(
            resource_id=name,
            resource_type='aws_s3_bucket',
            resource_name=name,
            monthly_cost=monthly_cost,
            annual_cost=monthly_cost * 12,
            cost_drivers=cost_drivers,
            optimization_suggestions=optimizations
        )
    
    def _estimate_dynamodb_cost(
        self,
        name: str,
        arguments: Dict[str, Any],
        assumptions: Dict[str, Any]
    ) -> ResourceCost:
        """Estimate DynamoDB costs"""
        
        storage_gb = assumptions.get('dynamodb_storage_gb', 1)
        writes = assumptions.get('dynamodb_writes', 1000)
        reads = assumptions.get('dynamodb_reads', 10000)
        
        monthly_cost = get_dynamodb_cost(storage_gb, writes, reads, self.region, include_free_tier=True)
        
        cost_drivers = [
            CostDriver(
                name="Storage",
                value=storage_gb,
                cost=monthly_cost * 0.3,
                explanation=f"{storage_gb}GB storage"
            ),
            CostDriver(
                name="Write requests",
                value=writes,
                cost=monthly_cost * 0.4,
                explanation=f"{writes:,} write requests"
            ),
            CostDriver(
                name="Read requests",
                value=reads,
                cost=monthly_cost * 0.3,
                explanation=f"{reads:,} read requests"
            )
        ]
        
        optimizations = []
        if writes > 100000 or reads > 1000000:
            optimizations.append("Consider DynamoDB Reserved Capacity for predictable workloads (50-77% savings)")
        
        return ResourceCost(
            resource_id=name,
            resource_type='aws_dynamodb_table',
            resource_name=name,
            monthly_cost=monthly_cost,
            annual_cost=monthly_cost * 12,
            cost_drivers=cost_drivers,
            optimization_suggestions=optimizations
        )
    
    def _estimate_alb_cost(
        self,
        name: str,
        arguments: Dict[str, Any],
        assumptions: Dict[str, Any]
    ) -> ResourceCost:
        """Estimate Application Load Balancer costs"""
        
        hours = assumptions.get('alb_hours_per_month', 730)
        new_conns = assumptions.get('alb_new_connections', 1000)
        active_conns = assumptions.get('alb_active_connections', 100)
        processed_gb = assumptions.get('alb_processed_gb', 10)
        
        monthly_cost = calculate_alb_cost(hours, new_conns, active_conns, int(processed_gb * 1024**3), self.region)
        
        cost_drivers = [
            CostDriver(
                name="ALB hours",
                value=hours,
                cost=monthly_cost * 0.4,
                explanation=f"{hours} hours"
            ),
            CostDriver(
                name="LCU usage",
                value=processed_gb,
                cost=monthly_cost * 0.6,
                explanation=f"{processed_gb}GB processed, {new_conns:,} new conns/sec"
            )
        ]
        
        return ResourceCost(
            resource_id=name,
            resource_type='aws_lb',
            resource_name=name,
            monthly_cost=monthly_cost,
            annual_cost=monthly_cost * 12,
            cost_drivers=cost_drivers,
            optimization_suggestions=[]
        )
    
    def _estimate_nat_cost(
        self,
        name: str,
        arguments: Dict[str, Any],
        assumptions: Dict[str, Any]
    ) -> ResourceCost:
        """Estimate NAT Gateway costs"""
        
        hours = assumptions.get('nat_hours_per_month', 730)
        data_gb = assumptions.get('nat_data_gb', 10)
        
        hour_cost = hours * NAT_GATEWAY_PRICING['hour']
        data_cost = data_gb * NAT_GATEWAY_PRICING['data_processed']
        monthly_cost = apply_regional_multiplier(hour_cost + data_cost, self.region)
        
        cost_drivers = [
            CostDriver(
                name="NAT Gateway hours",
                value=hours,
                cost=hour_cost,
                explanation=f"{hours} hours"
            ),
            CostDriver(
                name="Data processed",
                value=data_gb,
                cost=data_cost,
                explanation=f"{data_gb}GB processed"
            )
        ]
        
        optimizations = []
        if data_gb > 100:
            optimizations.append("Consider VPC endpoints to reduce NAT Gateway data transfer costs")
        
        return ResourceCost(
            resource_id=name,
            resource_type='aws_nat_gateway',
            resource_name=name,
            monthly_cost=monthly_cost,
            annual_cost=monthly_cost * 12,
            cost_drivers=cost_drivers,
            optimization_suggestions=optimizations
        )
    
    def _estimate_cloudwatch_cost(
        self,
        name: str,
        arguments: Dict[str, Any],
        assumptions: Dict[str, Any]
    ) -> ResourceCost:
        """Estimate CloudWatch Logs costs"""
        
        log_gb = assumptions.get('cloudwatch_log_gb', 1)
        metrics = assumptions.get('cloudwatch_metrics', 5)
        
        log_ingestion_cost = max(0, log_gb - CLOUDWATCH_PRICING['free_tier_logs']) * CLOUDWATCH_PRICING['log_ingestion']
        log_storage_cost = log_gb * CLOUDWATCH_PRICING['log_storage']
        
        monthly_cost = apply_regional_multiplier(log_ingestion_cost + log_storage_cost, self.region)
        
        cost_drivers = [
            CostDriver(
                name="Log ingestion",
                value=log_gb,
                cost=log_ingestion_cost,
                explanation=f"{log_gb}GB ingested"
            ),
            CostDriver(
                name="Log storage",
                value=log_gb,
                cost=log_storage_cost,
                explanation=f"{log_gb}GB stored"
            )
        ]
        
        optimizations = []
        if log_gb > 10:
            optimizations.append("Set log retention policies to reduce storage costs")
        
        return ResourceCost(
            resource_id=name,
            resource_type='aws_cloudwatch_log_group',
            resource_name=name,
            monthly_cost=monthly_cost,
            annual_cost=monthly_cost * 12,
            cost_drivers=cost_drivers,
            optimization_suggestions=optimizations
        )