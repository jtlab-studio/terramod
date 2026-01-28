"""
Usage Scenario Assumptions

Defines typical usage patterns for different scenarios and stack types.
"""

from typing import Dict, Any
from app.cost import Scenario

# Usage assumptions per scenario for 3-tier web app
THREE_TIER_WEB_APP = {
    Scenario.IDLE: {
        'ec2_instances': 1,
        'ec2_hours_per_month': 730,
        'rds_hours_per_month': 730,
        'alb_hours_per_month': 730,
        'alb_new_connections': 100,
        'alb_active_connections': 10,
        'alb_processed_gb': 1,
        's3_storage_gb': 1,
        's3_get_requests': 1000,
        's3_put_requests': 100,
        's3_transfer_gb': 0.5,
        'nat_hours_per_month': 730,
        'nat_data_gb': 1,
        'cloudwatch_log_gb': 0.5,
        'cloudwatch_metrics': 5,
        'ebs_volumes': 1,
        'ebs_size_gb': 20
    },
    Scenario.USERS_10: {
        'ec2_instances': 1,
        'ec2_hours_per_month': 730,
        'rds_hours_per_month': 730,
        'alb_hours_per_month': 730,
        'alb_new_connections': 5000,
        'alb_active_connections': 100,
        'alb_processed_gb': 10,
        's3_storage_gb': 5,
        's3_get_requests': 50000,
        's3_put_requests': 5000,
        's3_transfer_gb': 2,
        'nat_hours_per_month': 730,
        'nat_data_gb': 5,
        'cloudwatch_log_gb': 2,
        'cloudwatch_metrics': 10,
        'ebs_volumes': 1,
        'ebs_size_gb': 20
    },
    Scenario.USERS_100: {
        'ec2_instances': 2,
        'ec2_hours_per_month': 1460,  # 2 instances * 730
        'rds_hours_per_month': 730,
        'alb_hours_per_month': 730,
        'alb_new_connections': 50000,
        'alb_active_connections': 1000,
        'alb_processed_gb': 100,
        's3_storage_gb': 20,
        's3_get_requests': 500000,
        's3_put_requests': 50000,
        's3_transfer_gb': 20,
        'nat_hours_per_month': 730,
        'nat_data_gb': 50,
        'cloudwatch_log_gb': 10,
        'cloudwatch_metrics': 20,
        'ebs_volumes': 2,
        'ebs_size_gb': 40
    },
    Scenario.USERS_1000: {
        'ec2_instances': 4,
        'ec2_hours_per_month': 2920,  # 4 instances * 730
        'rds_hours_per_month': 730,
        'alb_hours_per_month': 730,
        'alb_new_connections': 500000,
        'alb_active_connections': 10000,
        'alb_processed_gb': 1000,
        's3_storage_gb': 100,
        's3_get_requests': 5000000,
        's3_put_requests': 500000,
        's3_transfer_gb': 200,
        'nat_hours_per_month': 730,
        'nat_data_gb': 500,
        'cloudwatch_log_gb': 50,
        'cloudwatch_metrics': 50,
        'ebs_volumes': 4,
        'ebs_size_gb': 80
    }
}

# Serverless API assumptions
SERVERLESS_API = {
    Scenario.IDLE: {
        'lambda_invocations': 100,
        'lambda_memory_mb': 512,
        'lambda_avg_duration_ms': 200,
        'dynamodb_storage_gb': 0.1,
        'dynamodb_writes': 100,
        'dynamodb_reads': 1000,
        's3_storage_gb': 1,
        's3_get_requests': 100,
        's3_put_requests': 10,
        's3_transfer_gb': 0.1,
        'cloudwatch_log_gb': 0.1
    },
    Scenario.USERS_10: {
        'lambda_invocations': 5000,
        'lambda_memory_mb': 512,
        'lambda_avg_duration_ms': 200,
        'dynamodb_storage_gb': 1,
        'dynamodb_writes': 5000,
        'dynamodb_reads': 10000,
        's3_storage_gb': 5,
        's3_get_requests': 5000,
        's3_put_requests': 500,
        's3_transfer_gb': 1,
        'cloudwatch_log_gb': 0.5
    },
    Scenario.USERS_100: {
        'lambda_invocations': 50000,
        'lambda_memory_mb': 512,
        'lambda_avg_duration_ms': 200,
        'dynamodb_storage_gb': 5,
        'dynamodb_writes': 50000,
        'dynamodb_reads': 100000,
        's3_storage_gb': 20,
        's3_get_requests': 50000,
        's3_put_requests': 5000,
        's3_transfer_gb': 10,
        'cloudwatch_log_gb': 2
    },
    Scenario.USERS_1000: {
        'lambda_invocations': 500000,
        'lambda_memory_mb': 512,
        'lambda_avg_duration_ms': 200,
        'dynamodb_storage_gb': 25,
        'dynamodb_writes': 500000,
        'dynamodb_reads': 1000000,
        's3_storage_gb': 100,
        's3_get_requests': 500000,
        's3_put_requests': 50000,
        's3_transfer_gb': 100,
        'cloudwatch_log_gb': 10
    }
}

# Static website assumptions
STATIC_WEBSITE = {
    Scenario.IDLE: {
        's3_storage_gb': 1,
        's3_get_requests': 100,
        's3_put_requests': 10,
        'cloudfront_requests': 100,
        'cloudfront_data_transfer_gb': 0.1
    },
    Scenario.USERS_10: {
        's3_storage_gb': 5,
        's3_get_requests': 5000,
        's3_put_requests': 500,
        'cloudfront_requests': 5000,
        'cloudfront_data_transfer_gb': 2
    },
    Scenario.USERS_100: {
        's3_storage_gb': 10,
        's3_get_requests': 50000,
        's3_put_requests': 5000,
        'cloudfront_requests': 50000,
        'cloudfront_data_transfer_gb': 20
    },
    Scenario.USERS_1000: {
        's3_storage_gb': 50,
        's3_get_requests': 500000,
        's3_put_requests': 50000,
        'cloudfront_requests': 500000,
        'cloudfront_data_transfer_gb': 200
    }
}

# Container platform (ECS) assumptions
CONTAINER_PLATFORM = {
    Scenario.IDLE: {
        'ecs_fargate_vcpu': 0.25,
        'ecs_fargate_memory_gb': 0.5,
        'ecs_hours_per_month': 730,
        'ecs_tasks': 1,
        'alb_hours_per_month': 730,
        'alb_new_connections': 100,
        'alb_active_connections': 10,
        'alb_processed_gb': 1,
        'rds_hours_per_month': 730,
        's3_storage_gb': 5,
        'cloudwatch_log_gb': 1
    },
    Scenario.USERS_10: {
        'ecs_fargate_vcpu': 0.5,
        'ecs_fargate_memory_gb': 1,
        'ecs_hours_per_month': 730,
        'ecs_tasks': 2,
        'alb_hours_per_month': 730,
        'alb_new_connections': 5000,
        'alb_active_connections': 100,
        'alb_processed_gb': 10,
        'rds_hours_per_month': 730,
        's3_storage_gb': 10,
        'cloudwatch_log_gb': 5
    },
    Scenario.USERS_100: {
        'ecs_fargate_vcpu': 1,
        'ecs_fargate_memory_gb': 2,
        'ecs_hours_per_month': 1460,
        'ecs_tasks': 4,
        'alb_hours_per_month': 730,
        'alb_new_connections': 50000,
        'alb_active_connections': 1000,
        'alb_processed_gb': 100,
        'rds_hours_per_month': 730,
        's3_storage_gb': 50,
        'cloudwatch_log_gb': 20
    },
    Scenario.USERS_1000: {
        'ecs_fargate_vcpu': 2,
        'ecs_fargate_memory_gb': 4,
        'ecs_hours_per_month': 2920,
        'ecs_tasks': 8,
        'alb_hours_per_month': 730,
        'alb_new_connections': 500000,
        'alb_active_connections': 10000,
        'alb_processed_gb': 1000,
        'rds_hours_per_month': 730,
        's3_storage_gb': 200,
        'cloudwatch_log_gb': 100
    }
}

# Map stack types to assumptions
STACK_ASSUMPTIONS: Dict[str, Dict[Scenario, Dict[str, Any]]] = {
    '3-tier-web-app': THREE_TIER_WEB_APP,
    'serverless-api': SERVERLESS_API,
    'static-website': STATIC_WEBSITE,
    'container-platform': CONTAINER_PLATFORM
}


def get_assumptions(stack_type: str, scenario: Scenario) -> Dict[str, Any]:
    """Get usage assumptions for a stack type and scenario"""
    stack = STACK_ASSUMPTIONS.get(stack_type, THREE_TIER_WEB_APP)
    return stack.get(scenario, {})


def get_optimization_recommendations(stack_type: str, scenario: Scenario, total_cost: float) -> list[str]:
    """Get cost optimization recommendations based on cost breakdown"""
    recommendations = []
    
    # Universal recommendations
    if total_cost > 50:
        recommendations.append("Consider Reserved Instances after 3-6 months of consistent usage (40% savings)")
    
    if stack_type == '3-tier-web-app':
        if scenario in [Scenario.USERS_100, Scenario.USERS_1000]:
            recommendations.append("Use Auto Scaling to match capacity with demand")
            recommendations.append("Implement S3 Lifecycle Policies to archive old data to Glacier")
        recommendations.append("Use Compute Savings Plans for flexible EC2/Fargate savings (up to 66%)")
        recommendations.append("Right-size EC2 instances using CloudWatch metrics")
        
    elif stack_type == 'serverless-api':
        recommendations.append("Optimize Lambda memory allocation using AWS Lambda Power Tuning")
        recommendations.append("Use Lambda Provisioned Concurrency only for latency-critical functions")
        if scenario in [Scenario.USERS_100, Scenario.USERS_1000]:
            recommendations.append("Consider DynamoDB Reserved Capacity for predictable workloads")
            
    elif stack_type == 'static-website':
        recommendations.append("Enable CloudFront compression to reduce data transfer costs")
        recommendations.append("Use S3 Intelligent-Tiering for automatic cost optimization")
        
    elif stack_type == 'container-platform':
        recommendations.append("Use Fargate Spot for fault-tolerant workloads (70% savings)")
        recommendations.append("Right-size container resource allocation")
        if scenario in [Scenario.USERS_100, Scenario.USERS_1000]:
            recommendations.append("Consider Compute Savings Plans for Fargate")
    
    return recommendations