import React, { useState } from 'react';
import { useInfraStore } from '../../store/infraStore';
import { DomainType } from '../../types/domain';
import { DeploymentStrategy } from '../../types/deployment';

interface StackConfigWizardProps {
    onComplete: () => void;
    onCancel: () => void;
}

type ComputeType = 'ec2' | 'ecs';
type DatabaseEngine = 'postgresql' | 'mysql' | 'none';

interface StackConfiguration {
    // Step 1: Project Basics
    projectName: string;
    region: string;
    availabilityZones: number;

    // Step 2: Compute
    computeType: ComputeType;
    instanceType: string;
    minInstances: number;
    maxInstances: number;
    enableALB: boolean;

    // Step 3: Database
    databaseEngine: DatabaseEngine;
    dbInstanceClass: string;
    dbStorage: number;
    multiAZ: boolean;

    // Step 4: Optional Components
    enableRedis: boolean;
    enableBastion: boolean;
    includeFrontend: boolean;
}

const DEFAULT_CONFIG: StackConfiguration = {
    projectName: '',
    region: 'us-east-1',
    availabilityZones: 2,
    computeType: 'ec2',
    instanceType: 't3.small',
    minInstances: 2,
    maxInstances: 4,
    enableALB: true,
    databaseEngine: 'postgresql',
    dbInstanceClass: 'db.t3.small',
    dbStorage: 20,
    multiAZ: true,
    enableRedis: false,
    enableBastion: false,
    includeFrontend: false
};

const AWS_REGIONS = [
    { value: 'us-east-1', label: 'US East (N. Virginia)' },
    { value: 'us-east-2', label: 'US East (Ohio)' },
    { value: 'us-west-1', label: 'US West (N. California)' },
    { value: 'us-west-2', label: 'US West (Oregon)' },
    { value: 'eu-west-1', label: 'EU (Ireland)' },
    { value: 'eu-central-1', label: 'EU (Frankfurt)' },
    { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)' },
    { value: 'ap-northeast-1', label: 'Asia Pacific (Tokyo)' }
];

const StackConfigWizard: React.FC<StackConfigWizardProps> = ({ onComplete, onCancel }) => {
    const [step, setStep] = useState(1);
    const [config, setConfig] = useState<StackConfiguration>(DEFAULT_CONFIG);

    const addDomain = useInfraStore((state) => state.addDomain);
    const addResource = useInfraStore((state) => state.addResource);
    const updateDeploymentConfig = useInfraStore((state) => state.updateDeploymentConfig);
    const setCurrentStackType = useInfraStore((state) => state.setCurrentStackType);

    const updateConfig = (updates: Partial<StackConfiguration>) => {
        setConfig({ ...config, ...updates });
    };

    const handleComplete = () => {
        const azs = getAZsForRegion(config.region, config.availabilityZones);

        // Set deployment config
        updateDeploymentConfig({
            primaryRegion: config.region,
            availabilityZones: azs
        });

        setCurrentStackType('3-tier-web-app');

        // Generate resources
        generateInfrastructure(config);

        onComplete();
    };

    const generateInfrastructure = (cfg: StackConfiguration) => {
        const azs = getAZsForRegion(cfg.region, cfg.availabilityZones);

        // Create domains
        const domains = ensureDomains();

        // 1. NETWORKING
        const vpcId = createResource({
            type: 'aws_vpc',
            domainId: domains.networking,
            name: 'main-vpc',
            arguments: {
                cidr_block: '10.0.0.0/16',
                enable_dns_hostnames: true,
                enable_dns_support: true,
                tags: getTags(cfg.projectName, 'vpc')
            },
            deployment: { strategy: 'single' }
        });

        // Internet Gateway
        createResource({
            type: 'aws_internet_gateway',
            domainId: domains.networking,
            name: 'main-igw',
            arguments: {
                vpc_id: `\${aws_vpc.${vpcId}.id}`,
                tags: getTags(cfg.projectName, 'igw')
            },
            deployment: { strategy: 'single' }
        });

        // EIPs for NAT Gateways (per AZ)
        azs.forEach((az, idx) => {
            createResource({
                type: 'aws_eip',
                domainId: domains.networking,
                name: `eip-nat-${idx}`,
                availabilityZone: az,
                arguments: {
                    domain: 'vpc',
                    tags: getTags(cfg.projectName, `eip-nat-${idx + 1}`)
                },
                deployment: { strategy: 'per-az' }
            });
        });

        // Public Route Table (single, spans all AZs)
        const publicRTId = createResource({
            type: 'aws_route_table',
            domainId: domains.networking,
            name: 'rt-public',
            arguments: {
                vpc_id: `\${aws_vpc.${vpcId}.id}`,
                tags: getTags(cfg.projectName, 'rt-public')
            },
            deployment: { strategy: 'single' }
        });

        // Public route to Internet Gateway
        createResource({
            type: 'aws_route',
            domainId: domains.networking,
            name: 'route-public-igw',
            arguments: {
                route_table_id: `\${aws_route_table.${publicRTId}.id}`,
                destination_cidr_block: '0.0.0.0/0',
                gateway_id: `\${aws_internet_gateway.main-igw.id}`
            },
            deployment: { strategy: 'single' }
        });

        // Subnets (per AZ)
        azs.forEach((az, idx) => {
            const azSuffix = az.split('-').pop();

            // Public subnet
            const publicSubnetId = createResource({
                type: 'aws_subnet',
                domainId: domains.networking,
                name: `subnet-public-${azSuffix}`,
                availabilityZone: az,
                arguments: {
                    vpc_id: `\${aws_vpc.${vpcId}.id}`,
                    cidr_block: `10.0.${idx * 2}.0/24`,
                    availability_zone: az,
                    map_public_ip_on_launch: true,
                    tags: getTags(cfg.projectName, `subnet-public-${idx + 1}`)
                },
                deployment: { strategy: 'per-az' }
            });

            // Private subnet
            const privateSubnetId = createResource({
                type: 'aws_subnet',
                domainId: domains.networking,
                name: `subnet-private-${azSuffix}`,
                availabilityZone: az,
                arguments: {
                    vpc_id: `\${aws_vpc.${vpcId}.id}`,
                    cidr_block: `10.0.${idx * 2 + 1}.0/24`,
                    availability_zone: az,
                    map_public_ip_on_launch: false,
                    tags: getTags(cfg.projectName, `subnet-private-${idx + 1}`)
                },
                deployment: { strategy: 'per-az' }
            });

            // NAT Gateway (per AZ)
            const natId = createResource({
                type: 'aws_nat_gateway',
                domainId: domains.networking,
                name: `nat-${azSuffix}`,
                availabilityZone: az,
                arguments: {
                    allocation_id: `\${aws_eip.eip-nat-${idx}.id}`,
                    subnet_id: `\${aws_subnet.${publicSubnetId}.id}`,
                    tags: getTags(cfg.projectName, `nat-${idx + 1}`)
                },
                deployment: { strategy: 'per-az' }
            });

            // Private Route Table (per AZ for NAT)
            const privateRTId = createResource({
                type: 'aws_route_table',
                domainId: domains.networking,
                name: `rt-private-${azSuffix}`,
                availabilityZone: az,
                arguments: {
                    vpc_id: `\${aws_vpc.${vpcId}.id}`,
                    tags: getTags(cfg.projectName, `rt-private-${idx + 1}`)
                },
                deployment: { strategy: 'per-az' }
            });

            // Private route to NAT Gateway
            createResource({
                type: 'aws_route',
                domainId: domains.networking,
                name: `route-private-nat-${azSuffix}`,
                availabilityZone: az,
                arguments: {
                    route_table_id: `\${aws_route_table.${privateRTId}.id}`,
                    destination_cidr_block: '0.0.0.0/0',
                    nat_gateway_id: `\${aws_nat_gateway.${natId}.id}`
                },
                deployment: { strategy: 'per-az' }
            });

            // Public subnet association
            createResource({
                type: 'aws_route_table_association',
                domainId: domains.networking,
                name: `rta-public-${azSuffix}`,
                availabilityZone: az,
                arguments: {
                    subnet_id: `\${aws_subnet.${publicSubnetId}.id}`,
                    route_table_id: `\${aws_route_table.${publicRTId}.id}`
                },
                deployment: { strategy: 'per-az' }
            });

            // Private subnet association
            createResource({
                type: 'aws_route_table_association',
                domainId: domains.networking,
                name: `rta-private-${azSuffix}`,
                availabilityZone: az,
                arguments: {
                    subnet_id: `\${aws_subnet.${privateSubnetId}.id}`,
                    route_table_id: `\${aws_route_table.${privateRTId}.id}`
                },
                deployment: { strategy: 'per-az' }
            });
        });

        // Security Groups
        const sgWebId = createResource({
            type: 'aws_security_group',
            domainId: domains.networking,
            name: 'sg-web',
            arguments: {
                name: `${cfg.projectName}-web`,
                description: 'Security group for web tier',
                vpc_id: `\${aws_vpc.${vpcId}.id}`,
                ingress: [
                    {
                        from_port: 80,
                        to_port: 80,
                        protocol: 'tcp',
                        cidr_blocks: ['0.0.0.0/0']
                    },
                    {
                        from_port: 443,
                        to_port: 443,
                        protocol: 'tcp',
                        cidr_blocks: ['0.0.0.0/0']
                    }
                ],
                egress: [
                    {
                        from_port: 0,
                        to_port: 0,
                        protocol: '-1',
                        cidr_blocks: ['0.0.0.0/0']
                    }
                ],
                tags: getTags(cfg.projectName, 'sg-web')
            },
            deployment: { strategy: 'single' }
        });

        const sgDbId = createResource({
            type: 'aws_security_group',
            domainId: domains.networking,
            name: 'sg-db',
            arguments: {
                name: `${cfg.projectName}-db`,
                description: 'Security group for database',
                vpc_id: `\${aws_vpc.${vpcId}.id}`,
                ingress: [
                    {
                        from_port: 5432,
                        to_port: 5432,
                        protocol: 'tcp',
                        security_groups: [`\${aws_security_group.${sgWebId}.id}`]
                    }
                ],
                egress: [
                    {
                        from_port: 0,
                        to_port: 0,
                        protocol: '-1',
                        cidr_blocks: ['0.0.0.0/0']
                    }
                ],
                tags: getTags(cfg.projectName, 'sg-db')
            },
            deployment: { strategy: 'single' }
        });

        // 2. EDGE (ALB)
        if (cfg.enableALB) {
            const albId = createResource({
                type: 'aws_lb',
                domainId: domains.edge,
                name: 'main-alb',
                arguments: {
                    name: `${cfg.projectName}-alb`,
                    internal: false,
                    load_balancer_type: 'application',
                    security_groups: [`\${aws_security_group.${sgWebId}.id}`],
                    subnets: azs.map((az) => `\${aws_subnet.subnet-public-${az.split('-').pop()}.id}`),
                    enable_deletion_protection: false,
                    tags: getTags(cfg.projectName, 'alb')
                },
                deployment: { strategy: 'multi-az' }
            });

            // Target Group
            const tgId = createResource({
                type: 'aws_lb_target_group',
                domainId: domains.edge,
                name: 'main-tg',
                arguments: {
                    name: `${cfg.projectName}-tg`,
                    port: 80,
                    protocol: 'HTTP',
                    vpc_id: `\${aws_vpc.${vpcId}.id}`,
                    health_check: {
                        enabled: true,
                        path: '/',
                        protocol: 'HTTP',
                        interval: 30,
                        timeout: 5,
                        healthy_threshold: 2,
                        unhealthy_threshold: 2
                    },
                    tags: getTags(cfg.projectName, 'tg')
                },
                deployment: { strategy: 'single' }
            });

            // Listener
            createResource({
                type: 'aws_lb_listener',
                domainId: domains.edge,
                name: 'main-listener',
                arguments: {
                    load_balancer_arn: `\${aws_lb.${albId}.arn}`,
                    port: 80,
                    protocol: 'HTTP',
                    default_action: [
                        {
                            type: 'forward',
                            target_group_arn: `\${aws_lb_target_group.${tgId}.arn}`
                        }
                    ]
                },
                deployment: { strategy: 'single' }
            });
        }

        // 3. COMPUTE
        if (cfg.computeType === 'ec2') {
            // Launch Template
            const launchTemplateId = createResource({
                type: 'aws_launch_template',
                domainId: domains.compute,
                name: 'app-lt',
                arguments: {
                    name: `${cfg.projectName}-app`,
                    instance_type: cfg.instanceType,
                    image_id: 'ami-0c55b159cbfafe1f0', // Amazon Linux 2
                    vpc_security_group_ids: [`\${aws_security_group.${sgWebId}.id}`],
                    user_data: Buffer.from(`#!/bin/bash
yum update -y
yum install -y httpd
systemctl start httpd
systemctl enable httpd
echo "<h1>Hello from ${cfg.projectName}</h1>" > /var/www/html/index.html
`).toString('base64'),
                    tags: getTags(cfg.projectName, 'launch-template')
                },
                deployment: { strategy: 'single' }
            });

            // Auto Scaling Group
            createResource({
                type: 'aws_autoscaling_group',
                domainId: domains.compute,
                name: 'app-asg',
                arguments: {
                    name: `${cfg.projectName}-asg`,
                    min_size: cfg.minInstances,
                    max_size: cfg.maxInstances,
                    desired_capacity: cfg.minInstances,
                    vpc_zone_identifier: azs.map((az) => `\${aws_subnet.subnet-private-${az.split('-').pop()}.id}`),
                    target_group_arns: cfg.enableALB ? [`\${aws_lb_target_group.main-tg.arn}`] : [],
                    launch_template: {
                        id: `\${aws_launch_template.${launchTemplateId}.id}`,
                        version: '$Latest'
                    },
                    health_check_type: cfg.enableALB ? 'ELB' : 'EC2',
                    health_check_grace_period: 300,
                    tags: [
                        {
                            key: 'Name',
                            value: `${cfg.projectName}-instance`,
                            propagate_at_launch: true
                        }
                    ]
                },
                deployment: { strategy: 'multi-az' }
            });
        } else {
            // ECS Cluster
            createResource({
                type: 'aws_ecs_cluster',
                domainId: domains.compute,
                name: 'app-cluster',
                arguments: {
                    name: `${cfg.projectName}-cluster`,
                    tags: getTags(cfg.projectName, 'ecs-cluster')
                },
                deployment: { strategy: 'single' }
            });
        }

        // 4. DATABASE
        if (cfg.databaseEngine !== 'none') {
            // DB Subnet Group
            const dbSubnetGroupId = createResource({
                type: 'aws_db_subnet_group',
                domainId: domains.data,
                name: 'db-subnet-group',
                arguments: {
                    name: `${cfg.projectName}-db-subnet`,
                    subnet_ids: azs.map((az) => `\${aws_subnet.subnet-private-${az.split('-').pop()}.id}`),
                    tags: getTags(cfg.projectName, 'db-subnet-group')
                },
                deployment: { strategy: 'single' }
            });

            // RDS Instance
            createResource({
                type: 'aws_db_instance',
                domainId: domains.data,
                name: 'main-db',
                arguments: {
                    identifier: `${cfg.projectName}-db`,
                    engine: cfg.databaseEngine,
                    instance_class: cfg.dbInstanceClass,
                    allocated_storage: cfg.dbStorage,
                    storage_type: 'gp3',
                    username: 'admin',
                    password: `\${var.db_password}`,
                    multi_az: cfg.multiAZ,
                    db_subnet_group_name: `\${aws_db_subnet_group.${dbSubnetGroupId}.name}`,
                    vpc_security_group_ids: [`\${aws_security_group.${sgDbId}.id}`],
                    backup_retention_period: 7,
                    skip_final_snapshot: true,
                    storage_encrypted: true,
                    tags: getTags(cfg.projectName, 'rds')
                },
                deployment: { strategy: cfg.multiAZ ? 'multi-az' : 'single' }
            });
        }

        // 5. STORAGE
        createResource({
            type: 'aws_s3_bucket',
            domainId: domains.storage,
            name: 's3-assets',
            arguments: {
                bucket: `${cfg.projectName}-assets-${Date.now()}`,
                tags: getTags(cfg.projectName, 's3-assets')
            },
            deployment: { strategy: 'single' }
        });

        // 6. OPTIONAL: Redis
        if (cfg.enableRedis) {
            // Redis Subnet Group
            const redisSubnetGroupId = createResource({
                type: 'aws_elasticache_subnet_group',
                domainId: domains.data,
                name: 'redis-subnet-group',
                arguments: {
                    name: `${cfg.projectName}-redis-subnet`,
                    subnet_ids: azs.map((az) => `\${aws_subnet.subnet-private-${az.split('-').pop()}.id}`)
                },
                deployment: { strategy: 'single' }
            });

            createResource({
                type: 'aws_elasticache_cluster',
                domainId: domains.data,
                name: 'main-redis',
                arguments: {
                    cluster_id: `${cfg.projectName}-redis`,
                    engine: 'redis',
                    node_type: 'cache.t3.micro',
                    num_cache_nodes: 1,
                    parameter_group_name: 'default.redis7',
                    port: 6379,
                    subnet_group_name: `\${aws_elasticache_subnet_group.${redisSubnetGroupId}.name}`,
                    tags: getTags(cfg.projectName, 'redis')
                },
                deployment: { strategy: 'single' }
            });
        }

        // 7. OPTIONAL: Bastion
        if (cfg.enableBastion) {
            const sgBastionId = createResource({
                type: 'aws_security_group',
                domainId: domains.networking,
                name: 'sg-bastion',
                arguments: {
                    name: `${cfg.projectName}-bastion`,
                    description: 'Security group for bastion host',
                    vpc_id: `\${aws_vpc.${vpcId}.id}`,
                    ingress: [
                        {
                            from_port: 22,
                            to_port: 22,
                            protocol: 'tcp',
                            cidr_blocks: ['0.0.0.0/0']  // Note: Should restrict to your IP
                        }
                    ],
                    egress: [
                        {
                            from_port: 0,
                            to_port: 0,
                            protocol: '-1',
                            cidr_blocks: ['0.0.0.0/0']
                        }
                    ],
                    tags: getTags(cfg.projectName, 'sg-bastion')
                },
                deployment: { strategy: 'single' }
            });

            createResource({
                type: 'aws_instance',
                domainId: domains.compute,
                name: 'bastion',
                arguments: {
                    ami: 'ami-0c55b159cbfafe1f0',
                    instance_type: 't3.micro',
                    subnet_id: `\${aws_subnet.subnet-public-${azs[0].split('-').pop()}.id}`,
                    vpc_security_group_ids: [`\${aws_security_group.${sgBastionId}.id}`],
                    associate_public_ip_address: true,
                    tags: getTags(cfg.projectName, 'bastion')
                },
                deployment: { strategy: 'single' }
            });
        }

        // 8. IAM
        createResource({
            type: 'aws_iam_role',
            domainId: domains.identity,
            name: 'iam-role-ec2',
            arguments: {
                name: `${cfg.projectName}-ec2-role`,
                assume_role_policy: JSON.stringify({
                    Version: '2012-10-17',
                    Statement: [{
                        Effect: 'Allow',
                        Principal: { Service: 'ec2.amazonaws.com' },
                        Action: 'sts:AssumeRole'
                    }]
                }),
                tags: getTags(cfg.projectName, 'iam-role')
            },
            deployment: { strategy: 'single' }
        });

        // 9. OBSERVABILITY
        createResource({
            type: 'aws_cloudwatch_log_group',
            domainId: domains.observability,
            name: 'logs-app',
            arguments: {
                name: `/aws/${cfg.projectName}/app`,
                retention_in_days: 7,
                tags: getTags(cfg.projectName, 'logs')
            },
            deployment: { strategy: 'single' }
        });

        // 10. OPTIONAL: Frontend
        if (cfg.includeFrontend) {
            createResource({
                type: 'aws_cloudfront_distribution',
                domainId: domains.edge,
                name: 'main-cdn',
                arguments: {
                    enabled: true,
                    default_root_object: 'index.html',
                    origin: [
                        {
                            domain_name: `\${aws_s3_bucket.s3-assets.bucket_regional_domain_name}`,
                            origin_id: 'S3-origin',
                            s3_origin_config: {
                                origin_access_identity: ''
                            }
                        }
                    ],
                    default_cache_behavior: {
                        allowed_methods: ['GET', 'HEAD'],
                        cached_methods: ['GET', 'HEAD'],
                        target_origin_id: 'S3-origin',
                        viewer_protocol_policy: 'redirect-to-https',
                        forwarded_values: {
                            query_string: false,
                            cookies: {
                                forward: 'none'
                            }
                        }
                    },
                    restrictions: {
                        geo_restriction: {
                            restriction_type: 'none'
                        }
                    },
                    viewer_certificate: {
                        cloudfront_default_certificate: true
                    },
                    tags: getTags(cfg.projectName, 'cloudfront')
                },
                deployment: { strategy: 'single' }
            });
        }
    };

    // Helper: Ensure domains exist
    const ensureDomains = () => {
        const domainTypes: DomainType[] = ['networking', 'compute', 'data', 'storage', 'edge', 'identity', 'observability'];
        const domainIds: Record<string, string> = {};

        domainTypes.forEach((type) => {
            const existingDomain = Array.from(useInfraStore.getState().domains.values())
                .find(d => d.type === type);

            if (existingDomain) {
                domainIds[type] = existingDomain.id;
            } else {
                const id = `domain_${type}_${Date.now()}`;
                addDomain({
                    id,
                    name: type.charAt(0).toUpperCase() + type.slice(1),
                    type,
                    resourceIds: [],
                    inputs: [],
                    outputs: [],
                    position: { x: 0, y: 0 },
                    width: 200,
                    height: 150,
                    scope: 'regional'
                });
                domainIds[type] = id;
            }
        });

        return domainIds;
    };

    // Helper: Create resource
    interface CreateResourceParams {
        type: string;
        domainId: string;
        name: string;
        availabilityZone?: string;
        arguments: Record<string, any>;
        deployment: { strategy: DeploymentStrategy };
    }

    const createResource = (params: CreateResourceParams) => {
        const id = `resource_${params.type}_${params.name}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

        addResource({
            id,
            type: params.type,
            domainId: params.domainId,
            name: params.name,
            arguments: params.arguments,
            deployment: params.deployment,
            position: { x: 0, y: 0 },
            validationState: { isValid: true, errors: [], warnings: [] }
        });

        return params.name;
    };

    const getAZsForRegion = (region: string, count: number): string[] => {
        const azMap: Record<string, string[]> = {
            'us-east-1': ['us-east-1a', 'us-east-1b', 'us-east-1c'],
            'us-east-2': ['us-east-2a', 'us-east-2b', 'us-east-2c'],
            'us-west-1': ['us-west-1a', 'us-west-1b', 'us-west-1c'],
            'us-west-2': ['us-west-2a', 'us-west-2b', 'us-west-2c'],
            'eu-west-1': ['eu-west-1a', 'eu-west-1b', 'eu-west-1c'],
            'eu-central-1': ['eu-central-1a', 'eu-central-1b', 'eu-central-1c'],
            'ap-southeast-1': ['ap-southeast-1a', 'ap-southeast-1b', 'ap-southeast-1c'],
            'ap-northeast-1': ['ap-northeast-1a', 'ap-northeast-1b', 'ap-northeast-1c']
        };
        return (azMap[region] || azMap['us-east-1']).slice(0, count);
    };

    const getTags = (projectName: string, resourceName: string) => ({
        Project: projectName,
        ManagedBy: 'Terramod',
        Stack: '3-tier-web-app',
        Name: `${projectName}-${resourceName}`
    });

    const isStepValid = (stepNum: number): boolean => {
        switch (stepNum) {
            case 1:
                return config.projectName.length > 0;
            case 2:
                return true;
            case 3:
                return true;
            case 4:
                return true;
            default:
                return false;
        }
    };

    // Render functions for each step
    const renderStep1 = () => (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-white mb-2">Project Configuration</h2>
                <p className="text-slate-400">Basic settings for your 3-tier web application</p>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                    Project Name <span className="text-red-400">*</span>
                </label>
                <input
                    type="text"
                    value={config.projectName}
                    onChange={(e) => updateConfig({ projectName: e.target.value })}
                    placeholder="my-webapp"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white rounded-lg focus:border-violet-400/50 focus:bg-white/10 focus:outline-none transition-all placeholder-white/30"
                />
                <p className="text-xs text-slate-500 mt-1">Used for resource naming and tagging</p>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">AWS Region</label>
                <select
                    value={config.region}
                    onChange={(e) => updateConfig({ region: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white rounded-lg focus:border-violet-400/50 focus:bg-white/10 focus:outline-none transition-all"
                >
                    {AWS_REGIONS.map((r) => (
                        <option key={r.value} value={r.value} className="bg-slate-900">
                            {r.label}
                        </option>
                    ))}
                </select>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Availability Zones</label>
                <select
                    value={config.availabilityZones}
                    onChange={(e) => updateConfig({ availabilityZones: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white rounded-lg focus:border-violet-400/50 focus:bg-white/10 focus:outline-none transition-all"
                >
                    <option value="1" className="bg-slate-900">1 AZ (dev/testing)</option>
                    <option value="2" className="bg-slate-900">2 AZs (balanced)</option>
                    <option value="3" className="bg-slate-900">3 AZs (high availability)</option>
                </select>
                <p className="text-xs text-slate-500 mt-1">More AZs = higher availability and cost</p>
            </div>
        </div>
    );

    const renderStep2 = () => (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-white mb-2">Compute Configuration</h2>
                <p className="text-slate-400">Application server settings</p>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">Compute Type</label>
                <div className="grid grid-cols-2 gap-3">
                    {(['ec2', 'ecs'] as ComputeType[]).map((type) => {
                        const isSelected = config.computeType === type;
                        return (
                            <button
                                key={type}
                                onClick={() => updateConfig({ computeType: type })}
                                className={`p-4 rounded-lg border-2 font-medium transition-all ${isSelected
                                        ? 'border-violet-500 bg-violet-500/20 text-violet-300'
                                        : 'border-white/10 bg-white/5 text-slate-400 hover:border-white/20'
                                    }`}
                            >
                                <div className="text-2xl mb-2">{type === 'ec2' ? '💻' : '🐳'}</div>
                                <div className="font-semibold">{type.toUpperCase()}</div>
                                <div className="text-xs mt-1 opacity-70">
                                    {type === 'ec2' ? 'Virtual machines' : 'Containers'}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {config.computeType === 'ec2' && (
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Instance Type</label>
                    <select
                        value={config.instanceType}
                        onChange={(e) => updateConfig({ instanceType: e.target.value })}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white rounded-lg focus:border-violet-400/50 focus:outline-none"
                    >
                        <option value="t3.micro" className="bg-slate-900">t3.micro (1 vCPU, 1GB RAM) - ~$7/mo</option>
                        <option value="t3.small" className="bg-slate-900">t3.small (2 vCPU, 2GB RAM) - ~$15/mo</option>
                        <option value="t3.medium" className="bg-slate-900">t3.medium (2 vCPU, 4GB RAM) - ~$30/mo</option>
                        <option value="t3.large" className="bg-slate-900">t3.large (2 vCPU, 8GB RAM) - ~$60/mo</option>
                    </select>
                </div>
            )}

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Min Instances</label>
                    <input
                        type="number"
                        min="1"
                        value={config.minInstances}
                        onChange={(e) => updateConfig({ minInstances: parseInt(e.target.value) })}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white rounded-lg focus:border-violet-400/50 focus:outline-none"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Max Instances</label>
                    <input
                        type="number"
                        min="1"
                        value={config.maxInstances}
                        onChange={(e) => updateConfig({ maxInstances: parseInt(e.target.value) })}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white rounded-lg focus:border-violet-400/50 focus:outline-none"
                    />
                </div>
            </div>

            <label className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-lg cursor-pointer hover:bg-white/10 transition-all">
                <input
                    type="checkbox"
                    checked={config.enableALB}
                    onChange={(e) => updateConfig({ enableALB: e.target.checked })}
                    className="w-5 h-5 rounded bg-white/5 border-white/10 text-violet-500 focus:ring-violet-500/50"
                />
                <div>
                    <div className="font-medium text-white">Enable Application Load Balancer</div>
                    <div className="text-xs text-slate-400">Distributes traffic across instances (~$16/mo)</div>
                </div>
            </label>
        </div>
    );

    const renderStep3 = () => (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-white mb-2">Database Configuration</h2>
                <p className="text-slate-400">Choose your database engine and settings</p>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">Database Engine</label>
                <div className="grid grid-cols-3 gap-3">
                    {(['postgresql', 'mysql', 'none'] as DatabaseEngine[]).map((engine) => {
                        const isSelected = config.databaseEngine === engine;
                        return (
                            <button
                                key={engine}
                                onClick={() => updateConfig({ databaseEngine: engine })}
                                className={`p-4 rounded-lg border-2 font-medium transition-all ${isSelected
                                        ? 'border-violet-500 bg-violet-500/20 text-violet-300'
                                        : 'border-white/10 bg-white/5 text-slate-400 hover:border-white/20'
                                    }`}
                            >
                                <div className="text-2xl mb-2">
                                    {engine === 'postgresql' ? '🐘' : engine === 'mysql' ? '🐬' : '—'}
                                </div>
                                <div className="font-semibold capitalize">{engine}</div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {config.databaseEngine !== 'none' && (
                <>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Instance Class</label>
                        <select
                            value={config.dbInstanceClass}
                            onChange={(e) => updateConfig({ dbInstanceClass: e.target.value })}
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white rounded-lg focus:border-violet-400/50 focus:outline-none"
                        >
                            <option value="db.t3.micro" className="bg-slate-900">db.t3.micro (1 vCPU, 1GB) - ~$12/mo</option>
                            <option value="db.t3.small" className="bg-slate-900">db.t3.small (2 vCPU, 2GB) - ~$25/mo</option>
                            <option value="db.t3.medium" className="bg-slate-900">db.t3.medium (2 vCPU, 4GB) - ~$50/mo</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Storage (GB)</label>
                        <input
                            type="number"
                            min="20"
                            value={config.dbStorage}
                            onChange={(e) => updateConfig({ dbStorage: parseInt(e.target.value) })}
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white rounded-lg focus:border-violet-400/50 focus:outline-none"
                        />
                        <p className="text-xs text-slate-500 mt-1">Minimum 20GB required</p>
                    </div>

                    <label className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-lg cursor-pointer hover:bg-white/10 transition-all">
                        <input
                            type="checkbox"
                            checked={config.multiAZ}
                            onChange={(e) => updateConfig({ multiAZ: e.target.checked })}
                            className="w-5 h-5 rounded bg-white/5 border-white/10 text-violet-500 focus:ring-violet-500/50"
                        />
                        <div>
                            <div className="font-medium text-white">Multi-AZ Deployment</div>
                            <div className="text-xs text-slate-400">High availability (doubles DB cost)</div>
                        </div>
                    </label>
                </>
            )}
        </div>
    );

    const renderStep4 = () => (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-white mb-2">Optional Components</h2>
                <p className="text-slate-400">Additional services you can add</p>
            </div>

            <label className="flex items-start gap-4 p-5 bg-white/5 border border-white/10 rounded-lg cursor-pointer hover:bg-white/10 transition-all">
                <input
                    type="checkbox"
                    checked={config.enableRedis}
                    onChange={(e) => updateConfig({ enableRedis: e.target.checked })}
                    className="mt-1 w-5 h-5 rounded bg-white/5 border-white/10 text-violet-500 focus:ring-violet-500/50"
                />
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl">⚡</span>
                        <div className="font-semibold text-white">ElastiCache Redis</div>
                    </div>
                    <div className="text-sm text-slate-400">
                        In-memory caching for improved performance (~$12/mo)
                    </div>
                </div>
            </label>

            <label className="flex items-start gap-4 p-5 bg-white/5 border border-white/10 rounded-lg cursor-pointer hover:bg-white/10 transition-all">
                <input
                    type="checkbox"
                    checked={config.enableBastion}
                    onChange={(e) => updateConfig({ enableBastion: e.target.checked })}
                    className="mt-1 w-5 h-5 rounded bg-white/5 border-white/10 text-violet-500 focus:ring-violet-500/50"
                />
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl">🔑</span>
                        <div className="font-semibold text-white">Bastion Host</div>
                    </div>
                    <div className="text-sm text-slate-400">
                        Secure SSH access to private resources (~$7/mo)
                    </div>
                </div>
            </label>

            <label className="flex items-start gap-4 p-5 bg-white/5 border border-white/10 rounded-lg cursor-pointer hover:bg-white/10 transition-all">
                <input
                    type="checkbox"
                    checked={config.includeFrontend}
                    onChange={(e) => updateConfig({ includeFrontend: e.target.checked })}
                    className="mt-1 w-5 h-5 rounded bg-white/5 border-white/10 text-violet-500 focus:ring-violet-500/50"
                />
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl">🌐</span>
                        <div className="font-semibold text-white">CloudFront CDN</div>
                    </div>
                    <div className="text-sm text-slate-400">
                        Global content delivery network for static assets (~$1/mo + data transfer)
                    </div>
                </div>
            </label>

            <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                <div className="flex items-start gap-3">
                    <span className="text-2xl">🎉</span>
                    <div>
                        <p className="text-sm text-purple-300 font-medium mb-1">Ready to generate!</p>
                        <p className="text-xs text-purple-400">
                            Click "Generate Infrastructure" to create your Terraform project.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderCurrentStep = () => {
        switch (step) {
            case 1:
                return renderStep1();
            case 2:
                return renderStep2();
            case 3:
                return renderStep3();
            case 4:
                return renderStep4();
            default:
                return null;
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-white/10 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-white/10">
                    <h1 className="text-2xl font-bold text-white mb-2">3-Tier Web App Wizard</h1>
                    <div className="flex items-center gap-2">
                        {[1, 2, 3, 4].map((num) => (
                            <div
                                key={num}
                                className={`h-1 flex-1 rounded-full transition-all ${num <= step ? 'bg-violet-500' : 'bg-white/10'
                                    }`}
                            />
                        ))}
                    </div>
                    <p className="text-sm text-slate-400 mt-2">
                        Step {step} of 4
                    </p>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {renderCurrentStep()}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/10 flex items-center justify-between">
                    <button
                        onClick={onCancel}
                        className="px-6 py-2.5 rounded-lg font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                    >
                        Cancel
                    </button>

                    <div className="flex items-center gap-3">
                        {step > 1 && (
                            <button
                                onClick={() => setStep(step - 1)}
                                className="px-6 py-2.5 rounded-lg font-medium bg-white/10 text-white hover:bg-white/20 border border-white/20 transition-all"
                            >
                                ← Back
                            </button>
                        )}

                        {step < 4 ? (
                            <button
                                onClick={() => setStep(step + 1)}
                                disabled={!isStepValid(step)}
                                className="px-6 py-2.5 rounded-lg font-medium bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700 shadow-lg shadow-violet-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Next →
                            </button>
                        ) : (
                            <button
                                onClick={handleComplete}
                                disabled={!isStepValid(step)}
                                className="px-6 py-2.5 rounded-lg font-medium bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 shadow-lg shadow-green-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                ✨ Generate Infrastructure
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StackConfigWizard;