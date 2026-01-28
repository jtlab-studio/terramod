import { DomainType } from '../types/domain';

export interface StackTemplate {
    id: string;
    name: string;
    description: string;
    icon: string;
    category: 'web' | 'api' | 'data' | 'container';

    // Cost estimation metadata
    costProfile: 'low' | 'medium' | 'high';
    estimatedIdleCost: number;      // USD per month
    estimated100UsersCost: number;   // USD per month

    // Required modules for this stack
    requiredModules: DomainType[];

    // Recommended starter resources
    starterResources: {
        domain: DomainType;
        resources: {
            type: string;
            name: string;
            description: string;
        }[];
    }[];

    // Usage description for cost assumptions
    usageDescription: string;
}

export const STACK_TEMPLATES: StackTemplate[] = [
    {
        id: '3-tier-web-app',
        name: '3-Tier Web Application',
        description: 'VPC, Load Balancer, EC2 instances, RDS database, S3 storage',
        icon: '🌐',
        category: 'web',
        costProfile: 'medium',
        estimatedIdleCost: 87,
        estimated100UsersCost: 133,
        requiredModules: ['networking', 'compute', 'data', 'storage', 'edge', 'identity', 'observability'],
        starterResources: [
            {
                domain: 'networking',
                resources: [
                    { type: 'aws_vpc', name: 'main-vpc', description: 'Primary VPC' },
                    { type: 'aws_subnet', name: 'public-subnet', description: 'Public subnet per AZ' },
                    { type: 'aws_subnet', name: 'private-subnet', description: 'Private subnet per AZ' },
                    { type: 'aws_internet_gateway', name: 'igw', description: 'Internet gateway' },
                    { type: 'aws_nat_gateway', name: 'nat', description: 'NAT gateway per AZ' },
                    { type: 'aws_security_group', name: 'web-sg', description: 'Web server security group' },
                ]
            },
            {
                domain: 'edge',
                resources: [
                    { type: 'aws_lb', name: 'main-alb', description: 'Application load balancer' }
                ]
            },
            {
                domain: 'compute',
                resources: [
                    { type: 'aws_instance', name: 'web-server', description: 'EC2 web server (t3.micro)' }
                ]
            },
            {
                domain: 'data',
                resources: [
                    { type: 'aws_db_instance', name: 'main-db', description: 'PostgreSQL RDS (db.t3.micro)' }
                ]
            },
            {
                domain: 'storage',
                resources: [
                    { type: 'aws_s3_bucket', name: 'app-assets', description: 'Static assets bucket' }
                ]
            },
            {
                domain: 'identity',
                resources: [
                    { type: 'aws_iam_role', name: 'ec2-role', description: 'EC2 instance role' }
                ]
            },
            {
                domain: 'observability',
                resources: [
                    { type: 'aws_cloudwatch_log_group', name: 'app-logs', description: 'Application logs' }
                ]
            }
        ],
        usageDescription: 'Typical web application with 2-4 EC2 instances behind a load balancer, PostgreSQL database, and S3 for static assets. Auto-scales based on CPU usage.'
    },

    {
        id: 'serverless-api',
        name: 'Serverless REST API',
        description: 'API Gateway, Lambda functions, DynamoDB, CloudWatch',
        icon: '⚡',
        category: 'api',
        costProfile: 'low',
        estimatedIdleCost: 2,
        estimated100UsersCost: 50,
        requiredModules: ['serverless', 'data', 'storage', 'identity', 'observability'],
        starterResources: [
            {
                domain: 'serverless',
                resources: [
                    { type: 'aws_lambda_function', name: 'api-handler', description: 'Main API handler (512MB)' },
                    { type: 'aws_api_gateway_rest_api', name: 'main-api', description: 'REST API Gateway' }
                ]
            },
            {
                domain: 'data',
                resources: [
                    { type: 'aws_dynamodb_table', name: 'app-data', description: 'DynamoDB table (on-demand)' }
                ]
            },
            {
                domain: 'storage',
                resources: [
                    { type: 'aws_s3_bucket', name: 'api-assets', description: 'API assets bucket' }
                ]
            },
            {
                domain: 'identity',
                resources: [
                    { type: 'aws_iam_role', name: 'lambda-role', description: 'Lambda execution role' }
                ]
            },
            {
                domain: 'observability',
                resources: [
                    { type: 'aws_cloudwatch_log_group', name: 'lambda-logs', description: 'Lambda function logs' }
                ]
            }
        ],
        usageDescription: 'Fully serverless API with Lambda functions, DynamoDB storage, and API Gateway. Ideal for variable workloads with automatic scaling.'
    },

    {
        id: 'static-website',
        name: 'Static Website + CDN',
        description: 'S3, CloudFront, Route53, ACM certificate',
        icon: '📄',
        category: 'web',
        costProfile: 'low',
        estimatedIdleCost: 5,
        estimated100UsersCost: 25,
        requiredModules: ['storage', 'edge', 'identity'],
        starterResources: [
            {
                domain: 'storage',
                resources: [
                    { type: 'aws_s3_bucket', name: 'website-bucket', description: 'Website content bucket' }
                ]
            },
            {
                domain: 'edge',
                resources: [
                    { type: 'aws_cloudfront_distribution', name: 'cdn', description: 'CloudFront CDN' }
                ]
            },
            {
                domain: 'identity',
                resources: [
                    { type: 'aws_iam_role', name: 's3-access-role', description: 'S3 bucket access role' }
                ]
            }
        ],
        usageDescription: 'Static website hosted on S3 with CloudFront CDN for global distribution. Perfect for blogs, documentation, and marketing sites.'
    },

    {
        id: 'container-platform',
        name: 'Container Platform (ECS)',
        description: 'VPC, ALB, ECS Fargate, RDS, CloudWatch',
        icon: '🐳',
        category: 'container',
        costProfile: 'high',
        estimatedIdleCost: 120,
        estimated100UsersCost: 250,
        requiredModules: ['networking', 'compute', 'data', 'storage', 'edge', 'identity', 'observability'],
        starterResources: [
            {
                domain: 'networking',
                resources: [
                    { type: 'aws_vpc', name: 'main-vpc', description: 'Primary VPC' },
                    { type: 'aws_subnet', name: 'private-subnet', description: 'Private subnet per AZ' },
                    { type: 'aws_security_group', name: 'ecs-sg', description: 'ECS tasks security group' }
                ]
            },
            {
                domain: 'compute',
                resources: [
                    { type: 'aws_ecs_cluster', name: 'main-cluster', description: 'ECS Fargate cluster' }
                ]
            },
            {
                domain: 'edge',
                resources: [
                    { type: 'aws_lb', name: 'main-alb', description: 'Application load balancer' }
                ]
            },
            {
                domain: 'data',
                resources: [
                    { type: 'aws_db_instance', name: 'main-db', description: 'PostgreSQL RDS' }
                ]
            },
            {
                domain: 'storage',
                resources: [
                    { type: 'aws_s3_bucket', name: 'app-storage', description: 'Application storage' }
                ]
            },
            {
                domain: 'identity',
                resources: [
                    { type: 'aws_iam_role', name: 'ecs-task-role', description: 'ECS task execution role' }
                ]
            },
            {
                domain: 'observability',
                resources: [
                    { type: 'aws_cloudwatch_log_group', name: 'ecs-logs', description: 'ECS container logs' }
                ]
            }
        ],
        usageDescription: 'Container-based platform using ECS Fargate with automatic scaling, RDS database, and load balancing. Higher cost but production-grade.'
    }
];

export function getStackTemplate(stackId: string): StackTemplate | undefined {
    return STACK_TEMPLATES.find(t => t.id === stackId);
}

export function getCostRange(stackId: string): string {
    const template = getStackTemplate(stackId);
    if (!template) return 'Unknown';

    const idleCost = template.estimatedIdleCost;
    const highCost = template.estimated100UsersCost;

    return `$${idleCost} - $${highCost}/month`;
}