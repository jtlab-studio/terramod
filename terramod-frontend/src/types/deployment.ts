// Deployment configuration types for multi-AZ/region support

export type DeploymentStrategy =
    | 'single'      // One instance
    | 'per-az'      // One per availability zone
    | 'multi-az'    // Single resource spanning multiple AZs
    | 'regional';   // One per region

export type ModuleScope =
    | 'global'      // IAM, Route53, CloudFront
    | 'regional'    // VPC, S3, ECR
    | 'multi-az';   // Compute, data services

export interface DeploymentConfig {
    primaryRegion: string;
    availabilityZones: string[];

    // Optional multi-region
    replicaRegions?: Array<{
        region: string;
        azs: string[];
    }>;
}

export interface ResourceDeployment {
    strategy: DeploymentStrategy;

    // Auto-populated based on strategy
    count?: number;           // For count-based replication
    forEach?: string;         // For for_each expression

    // Smart CIDR auto-calculation for subnets
    cidrAuto?: boolean;
    cidrBase?: string;        // Base CIDR for auto-calculation

    // Region/AZ targeting
    region?: string;
    availabilityZone?: string;
}

export interface DeploymentAlias {
    // Backend will use this to generate proper Terraform
    type: 'region' | 'az';
    value: string;
    index: number;
}

// Preset deployment strategies per resource type
export const DEPLOYMENT_STRATEGY_PRESETS: Record<string, DeploymentStrategy> = {
    // Single instance per region
    'aws_vpc': 'single',
    'aws_internet_gateway': 'single',
    'aws_s3_bucket': 'single',

    // One per AZ
    'aws_subnet': 'per-az',
    'aws_nat_gateway': 'per-az',
    'aws_instance': 'per-az',

    // Spans multiple AZs
    'aws_lb': 'multi-az',
    'aws_alb': 'multi-az',
    'aws_nlb': 'multi-az',
    'aws_rds_cluster': 'multi-az',
    'aws_efs_file_system': 'multi-az',

    // Global resources
    'aws_iam_role': 'single',
    'aws_iam_policy': 'single',
    'aws_route53_zone': 'single',
};

export function getDefaultStrategy(resourceType: string): DeploymentStrategy {
    return DEPLOYMENT_STRATEGY_PRESETS[resourceType] || 'single';
}

export function needsAZConfiguration(strategy: DeploymentStrategy): boolean {
    return strategy === 'per-az' || strategy === 'multi-az';
}

export function generateCIDRs(baseIPv4: string, azCount: number): string[] {
    // Simple CIDR calculation for demo
    // In production, use proper CIDR library
    const base = baseIPv4.split('/')[0];
    const octets = base.split('.').map(Number);

    const cidrs: string[] = [];
    for (let i = 0; i < azCount; i++) {
        const newOctets = [...octets];
        newOctets[2] = octets[2] + i;
        cidrs.push(`${newOctets.join('.')}/24`);
    }

    return cidrs;
}