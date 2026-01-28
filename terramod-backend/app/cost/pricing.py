"""
AWS Pricing Database

Cached AWS pricing data updated weekly. Prices in USD.
Last updated: 2025-01-28
"""

from typing import Dict, Optional

# Regional pricing multipliers (relative to us-east-1)
REGIONAL_MULTIPLIERS = {
    'us-east-1': 1.0,
    'us-east-2': 1.0,
    'us-west-1': 1.02,
    'us-west-2': 1.0,
    'eu-west-1': 1.10,      # Ireland
    'eu-central-1': 1.12,   # Frankfurt
    'ap-southeast-1': 1.08, # Singapore
    'ap-northeast-1': 1.09  # Tokyo
}

# EC2 On-Demand Pricing (us-east-1, Linux, per hour)
EC2_PRICING = {
    't3.micro': 0.0104,
    't3.small': 0.0208,
    't3.medium': 0.0416,
    't3.large': 0.0832,
    't3.xlarge': 0.1664,
    't4g.micro': 0.0084,
    't4g.small': 0.0168,
    't4g.medium': 0.0336,
    't4g.large': 0.0672,
}

# RDS On-Demand Pricing (us-east-1, per hour)
RDS_PRICING = {
    'db.t3.micro': 0.017,
    'db.t3.small': 0.034,
    'db.t3.medium': 0.068,
    'db.t3.large': 0.136,
}

# Lambda Pricing
LAMBDA_PRICING = {
    'request': 0.20 / 1_000_000,  # Per request
    'duration': 0.0000166667,      # Per GB-second
    'free_tier_requests': 1_000_000,
    'free_tier_duration': 400_000   # GB-seconds
}

# S3 Pricing (us-east-1, per GB per month)
S3_PRICING = {
    'storage_standard': 0.023,
    'storage_ia': 0.0125,
    'storage_glacier': 0.004,
    'get_request': 0.0004 / 1000,   # Per 1000 requests
    'put_request': 0.005 / 1000,    # Per 1000 requests
    'data_transfer_out': 0.09,      # Per GB (after 1GB free)
    'free_tier_storage': 5,         # GB
    'free_tier_get': 20_000,
    'free_tier_put': 2_000
}

# DynamoDB On-Demand Pricing
DYNAMODB_PRICING = {
    'write_request': 1.25 / 1_000_000,   # Per million writes
    'read_request': 0.25 / 1_000_000,    # Per million reads
    'storage': 0.25,                      # Per GB per month
    'free_tier_write': 1_000_000,
    'free_tier_read': 2_500_000,
    'free_tier_storage': 25               # GB
}

# Application Load Balancer Pricing
ALB_PRICING = {
    'hour': 0.0225,                       # Per hour
    'lcu': 0.008,                         # Per LCU-hour
    'free_tier_hours': 750                # First year only
}

# NAT Gateway Pricing
NAT_GATEWAY_PRICING = {
    'hour': 0.045,                        # Per hour
    'data_processed': 0.045               # Per GB
}

# CloudWatch Pricing
CLOUDWATCH_PRICING = {
    'log_ingestion': 0.50,                # Per GB
    'log_storage': 0.03,                  # Per GB per month
    'metric': 0.30,                       # Per custom metric per month
    'alarm': 0.10,                        # Per alarm per month
    'free_tier_logs': 5,                  # GB ingestion
    'free_tier_storage': 5,               # GB storage
    'free_tier_metrics': 10
}

# EBS Pricing (per GB per month)
EBS_PRICING = {
    'gp3': 0.08,
    'gp2': 0.10,
    'io1': 0.125,
    'io2': 0.125,
    'st1': 0.045,
    'sc1': 0.015
}


def get_ec2_price(instance_type: str, region: str = 'us-east-1') -> float:
    """Get EC2 instance price per hour"""
    base_price = EC2_PRICING.get(instance_type, 0.0104)  # Default to t3.micro
    multiplier = REGIONAL_MULTIPLIERS.get(region, 1.0)
    return base_price * multiplier


def get_rds_price(instance_class: str, region: str = 'us-east-1') -> float:
    """Get RDS instance price per hour"""
    base_price = RDS_PRICING.get(instance_class, 0.017)  # Default to db.t3.micro
    multiplier = REGIONAL_MULTIPLIERS.get(region, 1.0)
    return base_price * multiplier


def get_lambda_cost(
    requests: int,
    gb_seconds: float,
    region: str = 'us-east-1',
    include_free_tier: bool = True
) -> float:
    """Calculate Lambda cost"""
    multiplier = REGIONAL_MULTIPLIERS.get(region, 1.0)
    
    # Apply free tier
    if include_free_tier:
        requests = max(0, requests - LAMBDA_PRICING['free_tier_requests'])
        gb_seconds = max(0, gb_seconds - LAMBDA_PRICING['free_tier_duration'])
    
    request_cost = requests * LAMBDA_PRICING['request']
    duration_cost = gb_seconds * LAMBDA_PRICING['duration']
    
    return (request_cost + duration_cost) * multiplier


def get_s3_cost(
    storage_gb: float,
    get_requests: int,
    put_requests: int,
    data_transfer_gb: float,
    region: str = 'us-east-1',
    include_free_tier: bool = True
) -> float:
    """Calculate S3 cost"""
    multiplier = REGIONAL_MULTIPLIERS.get(region, 1.0)
    
    # Apply free tier
    if include_free_tier:
        storage_gb = max(0, storage_gb - S3_PRICING['free_tier_storage'])
        get_requests = max(0, get_requests - S3_PRICING['free_tier_get'])
        put_requests = max(0, put_requests - S3_PRICING['free_tier_put'])
        data_transfer_gb = max(0, data_transfer_gb - 1)  # 1GB free transfer
    
    storage_cost = storage_gb * S3_PRICING['storage_standard']
    get_cost = get_requests * S3_PRICING['get_request']
    put_cost = put_requests * S3_PRICING['put_request']
    transfer_cost = data_transfer_gb * S3_PRICING['data_transfer_out']
    
    return (storage_cost + get_cost + put_cost + transfer_cost) * multiplier


def get_dynamodb_cost(
    storage_gb: float,
    write_requests: int,
    read_requests: int,
    region: str = 'us-east-1',
    include_free_tier: bool = True
) -> float:
    """Calculate DynamoDB on-demand cost"""
    multiplier = REGIONAL_MULTIPLIERS.get(region, 1.0)
    
    # Apply free tier
    if include_free_tier:
        storage_gb = max(0, storage_gb - DYNAMODB_PRICING['free_tier_storage'])
        write_requests = max(0, write_requests - DYNAMODB_PRICING['free_tier_write'])
        read_requests = max(0, read_requests - DYNAMODB_PRICING['free_tier_read'])
    
    storage_cost = storage_gb * DYNAMODB_PRICING['storage']
    write_cost = write_requests * DYNAMODB_PRICING['write_request']
    read_cost = read_requests * DYNAMODB_PRICING['read_request']
    
    return (storage_cost + write_cost + read_cost) * multiplier


def calculate_alb_cost(
    hours: float,
    new_connections: int,
    active_connections: int,
    processed_bytes: int,
    region: str = 'us-east-1'
) -> float:
    """Calculate ALB cost including LCU calculation"""
    multiplier = REGIONAL_MULTIPLIERS.get(region, 1.0)
    
    # Calculate LCU consumption
    # 1 LCU = 25 new connections/sec OR 3000 active connections/min OR 1GB/hour processed
    lcu_new = new_connections / (25 * 3600)
    lcu_active = active_connections / (3000 * 60)
    lcu_bytes = processed_bytes / (1024**3)  # Convert to GB
    
    # Take the maximum
    lcu_hours = max(lcu_new, lcu_active, lcu_bytes) * hours
    
    hour_cost = hours * ALB_PRICING['hour']
    lcu_cost = lcu_hours * ALB_PRICING['lcu']
    
    return (hour_cost + lcu_cost) * multiplier


def apply_regional_multiplier(cost: float, region: str) -> float:
    """Apply regional pricing multiplier"""
    return cost * REGIONAL_MULTIPLIERS.get(region, 1.0)


def convert_currency(usd_amount: float, target_currency: str) -> float:
    """Convert USD to target currency (simplified)"""
    # In production, use real exchange rates
    rates = {
        'USD': 1.0,
        'EUR': 0.92,
        'GBP': 0.79,
        'JPY': 149.0
    }
    return usd_amount * rates.get(target_currency, 1.0)