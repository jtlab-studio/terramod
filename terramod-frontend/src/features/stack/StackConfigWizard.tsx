import React, { useState } from 'react';
import { useInfraStore } from '../../store/infraStore';
import { DomainType } from '../../types/domain';
import { DeploymentStrategy } from '../../types/deployment';

interface StackConfigWizardProps {
    onComplete: () => void;
    onCancel: () => void;
}

type Environment = 'dev' | 'staging' | 'prod';
type ComputeType = 'ec2' | 'ecs';
type DatabaseEngine = 'postgresql' | 'mysql' | 'none';

interface StackConfiguration {
    // Step 1: Project & Environment
    projectName: string;
    region: string;
    environments: Environment[];

    // Step 2: Networking
    availabilityZones: {
        dev: number;
        staging: number;
        prod: number;
    };

    // Step 3: Compute
    computeType: ComputeType;
    instanceScaling: {
        dev: { min: number; max: number };
        staging: { min: number; max: number };
        prod: { min: number; max: number };
    };
    enableALB: boolean;

    // Step 4: Database
    databaseEngine: DatabaseEngine;
    multiAZ: {
        dev: boolean;
        staging: boolean;
        prod: boolean;
    };

    // Step 5: Optional Components
    enableRedis: boolean;
    enableBastion: boolean;

    // Step 6: Frontend
    includeFrontend: boolean;
}

const DEFAULT_CONFIG: StackConfiguration = {
    projectName: '',
    region: 'us-east-1',
    environments: ['dev', 'staging', 'prod'],
    availabilityZones: { dev: 1, staging: 2, prod: 3 },
    computeType: 'ec2',
    instanceScaling: {
        dev: { min: 1, max: 2 },
        staging: { min: 2, max: 3 },
        prod: { min: 3, max: 6 }
    },
    enableALB: true,
    databaseEngine: 'postgresql',
    multiAZ: { dev: false, staging: true, prod: true },
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
        // Set deployment config
        updateDeploymentConfig({
            primaryRegion: config.region,
            availabilityZones: [] // Will be set per-environment
        });

        setCurrentStackType('3-tier-web-app');

        // Generate resources for each environment
        config.environments.forEach((env) => {
            generateEnvironmentResources(env, config);
        });

        onComplete();
    };

    const generateEnvironmentResources = (env: Environment, cfg: StackConfiguration) => {
        const azCount = cfg.availabilityZones[env];
        const azs = getAZsForRegion(cfg.region, azCount);

        // Create domains (modules) - shared across environments
        const domains = ensureDomains();

        // 1. NETWORKING
        const vpcId = createResource({
            type: 'aws_vpc',
            domainId: domains.networking,
            name: `vpc-${env}`,
            environment: env,
            arguments: {
                cidr_block: getVPCCIDR(env),
                enable_dns_hostnames: true,
                enable_dns_support: true,
                tags: getTags(cfg.projectName, env, 'vpc')
            },
            deployment: { strategy: 'single' }
        });

        // Internet Gateway
        createResource({
            type: 'aws_internet_gateway',
            domainId: domains.networking,
            name: `igw-${env}`,
            environment: env,
            arguments: {
                vpc_id: `\${aws_vpc.${vpcId}.id}`,
                tags: getTags(cfg.projectName, env, 'igw')
            },
            deployment: { strategy: 'single' }
        });

        // Subnets (per AZ)
        azs.forEach((az, idx) => {
            // Public subnet
            createResource({
                type: 'aws_subnet',
                domainId: domains.networking,
                name: `subnet-public-${env}-${az.split('-').pop()}`,
                environment: env,
                availabilityZone: az,
                arguments: {
                    vpc_id: `\${aws_vpc.${vpcId}.id}`,
                    cidr_block: getSubnetCIDR(env, idx * 2),
                    availability_zone: az,
                    map_public_ip_on_launch: true,
                    tags: getTags(cfg.projectName, env, `subnet-public-${idx + 1}`)
                },
                deployment: { strategy: 'per-az' }
            });

            // Private subnet
            createResource({
                type: 'aws_subnet',
                domainId: domains.networking,
                name: `subnet-private-${env}-${az.split('-').pop()}`,
                environment: env,
                availabilityZone: az,
                arguments: {
                    vpc_id: `\${aws_vpc.${vpcId}.id}`,
                    cidr_block: getSubnetCIDR(env, idx * 2 + 1),
                    availability_zone: az,
                    map_public_ip_on_launch: false,
                    tags: getTags(cfg.projectName, env, `subnet-private-${idx + 1}`)
                },
                deployment: { strategy: 'per-az' }
            });

            // NAT Gateway (per AZ)
            createResource({
                type: 'aws_nat_gateway',
                domainId: domains.networking,
                name: `nat-${env}-${az.split('-').pop()}`,
                environment: env,
                availabilityZone: az,
                arguments: {
                    allocation_id: `\${aws_eip.nat-${env}-${idx}.id}`,
                    subnet_id: `\${aws_subnet.subnet-public-${env}-${az.split('-').pop()}.id}`,
                    tags: getTags(cfg.projectName, env, `nat-${idx + 1}`)
                },
                deployment: { strategy: 'per-az' }
            });
        });

        // Security Groups
        createResource({
            type: 'aws_security_group',
            domainId: domains.networking,
            name: `sg-web-${env}`,
            environment: env,
            arguments: {
                name: `${cfg.projectName}-web-${env}`,
                description: 'Security group for web tier',
                vpc_id: `\${aws_vpc.${vpcId}.id}`,
                tags: getTags(cfg.projectName, env, 'sg-web')
            },
            deployment: { strategy: 'single' }
        });

        // 2. EDGE (ALB)
        if (cfg.enableALB) {
            createResource({
                type: 'aws_lb',
                domainId: domains.edge,
                name: `alb-${env}`,
                environment: env,
                arguments: {
                    name: `${cfg.projectName}-alb-${env}`,
                    internal: false,
                    load_balancer_type: 'application',
                    security_groups: [`\${aws_security_group.sg-web-${env}.id}`],
                    subnets: azs.map((az) => `\${aws_subnet.subnet-public-${env}-${az.split('-').pop()}.id}`),
                    enable_deletion_protection: env === 'prod',
                    tags: getTags(cfg.projectName, env, 'alb')
                },
                deployment: { strategy: 'multi-az' }
            });
        }

        // 3. COMPUTE
        const instanceType = getInstanceType(env, cfg.computeType);
        const scaling = cfg.instanceScaling[env];

        if (cfg.computeType === 'ec2') {
            // Auto Scaling Group (spans AZs)
            createResource({
                type: 'aws_autoscaling_group',
                domainId: domains.compute,
                name: `asg-${env}`,
                environment: env,
                arguments: {
                    name: `${cfg.projectName}-asg-${env}`,
                    min_size: scaling.min,
                    max_size: scaling.max,
                    desired_capacity: scaling.min,
                    vpc_zone_identifier: azs.map((az) => `\${aws_subnet.subnet-private-${env}-${az.split('-').pop()}.id}`),
                    launch_template: {
                        id: `\${aws_launch_template.app-${env}.id}`,
                        version: '$Latest'
                    },
                    tags: getTags(cfg.projectName, env, 'asg')
                },
                deployment: { strategy: 'multi-az' }
            });

            // Launch Template
            createResource({
                type: 'aws_launch_template',
                domainId: domains.compute,
                name: `lt-app-${env}`,
                environment: env,
                arguments: {
                    name: `${cfg.projectName}-app-${env}`,
                    instance_type: instanceType,
                    image_id: 'ami-0c55b159cbfafe1f0', // Amazon Linux 2
                    vpc_security_group_ids: [`\${aws_security_group.sg-web-${env}.id}`],
                    tags: getTags(cfg.projectName, env, 'launch-template')
                },
                deployment: { strategy: 'single' }
            });
        } else {
            // ECS Cluster
            createResource({
                type: 'aws_ecs_cluster',
                domainId: domains.compute,
                name: `ecs-cluster-${env}`,
                environment: env,
                arguments: {
                    name: `${cfg.projectName}-cluster-${env}`,
                    tags: getTags(cfg.projectName, env, 'ecs-cluster')
                },
                deployment: { strategy: 'single' }
            });
        }

        // 4. DATABASE
        if (cfg.databaseEngine !== 'none') {
            const dbInstanceClass = getDBInstanceClass(env);
            const storage = getDBStorage(env);

            createResource({
                type: 'aws_db_instance',
                domainId: domains.data,
                name: `rds-${env}`,
                environment: env,
                arguments: {
                    identifier: `${cfg.projectName}-db-${env}`,
                    engine: cfg.databaseEngine,
                    instance_class: dbInstanceClass,
                    allocated_storage: storage,
                    storage_type: 'gp3',
                    multi_az: cfg.multiAZ[env],
                    db_subnet_group_name: `\${aws_db_subnet_group.main-${env}.name}`,
                    vpc_security_group_ids: [`\${aws_security_group.sg-db-${env}.id}`],
                    backup_retention_period: env === 'prod' ? 7 : 1,
                    skip_final_snapshot: env !== 'prod',
                    deletion_protection: env === 'prod',
                    storage_encrypted: true,
                    tags: getTags(cfg.projectName, env, 'rds')
                },
                deployment: { strategy: cfg.multiAZ[env] ? 'multi-az' : 'single' }
            });

            // DB Subnet Group
            createResource({
                type: 'aws_db_subnet_group',
                domainId: domains.data,
                name: `db-subnet-group-${env}`,
                environment: env,
                arguments: {
                    name: `${cfg.projectName}-db-subnet-${env}`,
                    subnet_ids: azs.map((az) => `\${aws_subnet.subnet-private-${env}-${az.split('-').pop()}.id}`),
                    tags: getTags(cfg.projectName, env, 'db-subnet-group')
                },
                deployment: { strategy: 'single' }
            });

            // DB Security Group
            createResource({
                type: 'aws_security_group',
                domainId: domains.networking,
                name: `sg-db-${env}`,
                environment: env,
                arguments: {
                    name: `${cfg.projectName}-db-${env}`,
                    description: 'Security group for database',
                    vpc_id: `\${aws_vpc.${vpcId}.id}`,
                    tags: getTags(cfg.projectName, env, 'sg-db')
                },
                deployment: { strategy: 'single' }
            });
        }

        // 5. STORAGE
        createResource({
            type: 'aws_s3_bucket',
            domainId: domains.storage,
            name: `s3-assets-${env}`,
            environment: env,
            arguments: {
                bucket: `${cfg.projectName}-assets-${env}-${Date.now()}`,
                tags: getTags(cfg.projectName, env, 's3-assets')
            },
            deployment: { strategy: 'single' }
        });

        // 6. OPTIONAL: Redis
        if (cfg.enableRedis) {
            createResource({
                type: 'aws_elasticache_cluster',
                domainId: domains.data,
                name: `redis-${env}`,
                environment: env,
                arguments: {
                    cluster_id: `${cfg.projectName}-redis-${env}`,
                    engine: 'redis',
                    node_type: env === 'prod' ? 'cache.t3.small' : 'cache.t3.micro',
                    num_cache_nodes: 1,
                    parameter_group_name: 'default.redis7',
                    port: 6379,
                    tags: getTags(cfg.projectName, env, 'redis')
                },
                deployment: { strategy: 'single' }
            });
        }

        // 7. OPTIONAL: Bastion
        if (cfg.enableBastion) {
            createResource({
                type: 'aws_instance',
                domainId: domains.compute,
                name: `bastion-${env}`,
                environment: env,
                arguments: {
                    ami: 'ami-0c55b159cbfafe1f0',
                    instance_type: 't3.micro',
                    subnet_id: `\${aws_subnet.subnet-public-${env}-${azs[0].split('-').pop()}.id}`,
                    vpc_security_group_ids: [`\${aws_security_group.sg-bastion-${env}.id}`],
                    tags: getTags(cfg.projectName, env, 'bastion')
                },
                deployment: { strategy: 'single' }
            });
        }

        // 8. IAM
        createResource({
            type: 'aws_iam_role',
            domainId: domains.identity,
            name: `iam-role-ec2-${env}`,
            environment: env,
            arguments: {
                name: `${cfg.projectName}-ec2-role-${env}`,
                assume_role_policy: JSON.stringify({
                    Version: '2012-10-17',
                    Statement: [{
                        Effect: 'Allow',
                        Principal: { Service: 'ec2.amazonaws.com' },
                        Action: 'sts:AssumeRole'
                    }]
                }),
                tags: getTags(cfg.projectName, env, 'iam-role')
            },
            deployment: { strategy: 'single' }
        });

        // 9. OBSERVABILITY
        createResource({
            type: 'aws_cloudwatch_log_group',
            domainId: domains.observability,
            name: `logs-app-${env}`,
            environment: env,
            arguments: {
                name: `/aws/${cfg.projectName}/${env}/app`,
                retention_in_days: env === 'prod' ? 30 : 7,
                tags: getTags(cfg.projectName, env, 'logs')
            },
            deployment: { strategy: 'single' }
        });

        // 10. OPTIONAL: Frontend
        if (cfg.includeFrontend) {
            createResource({
                type: 'aws_cloudfront_distribution',
                domainId: domains.edge,
                name: `cdn-${env}`,
                environment: env,
                arguments: {
                    enabled: true,
                    default_root_object: 'index.html',
                    origin: {
                        domain_name: `\${aws_s3_bucket.s3-assets-${env}.bucket_regional_domain_name}`,
                        origin_id: 'S3-origin'
                    },
                    default_cache_behavior: {
                        allowed_methods: ['GET', 'HEAD'],
                        cached_methods: ['GET', 'HEAD'],
                        target_origin_id: 'S3-origin',
                        viewer_protocol_policy: 'redirect-to-https'
                    },
                    tags: getTags(cfg.projectName, env, 'cloudfront')
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
        environment: Environment;
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

    // Helper functions
    const getVPCCIDR = (env: Environment): string => {
        const map = { dev: '10.0.0.0/16', staging: '10.1.0.0/16', prod: '10.2.0.0/16' };
        return map[env];
    };

    const getSubnetCIDR = (env: Environment, index: number): string => {
        const base = { dev: 0, staging: 1, prod: 2 };
        return `10.${base[env]}.${index}.0/24`;
    };

    const getInstanceType = (env: Environment, computeType: ComputeType): string => {
        if (computeType === 'ecs') return 't3.micro';
        const map = { dev: 't3.micro', staging: 't3.small', prod: 't3.medium' };
        return map[env];
    };

    const getDBInstanceClass = (env: Environment): string => {
        const map = { dev: 'db.t3.micro', staging: 'db.t3.small', prod: 'db.t3.medium' };
        return map[env];
    };

    const getDBStorage = (env: Environment): number => {
        const map = { dev: 20, staging: 50, prod: 100 };
        return map[env];
    };

    const getAZsForRegion = (region: string, count: number): string[] => {
        const azMap: Record<string, string[]> = {
            'us-east-1': ['us-east-1a', 'us-east-1b', 'us-east-1c', 'us-east-1d', 'us-east-1e', 'us-east-1f'],
            'us-east-2': ['us-east-2a', 'us-east-2b', 'us-east-2c'],
            'us-west-1': ['us-west-1a', 'us-west-1b', 'us-west-1c'],
            'us-west-2': ['us-west-2a', 'us-west-2b', 'us-west-2c', 'us-west-2d'],
            'eu-west-1': ['eu-west-1a', 'eu-west-1b', 'eu-west-1c'],
            'eu-central-1': ['eu-central-1a', 'eu-central-1b', 'eu-central-1c'],
            'ap-southeast-1': ['ap-southeast-1a', 'ap-southeast-1b', 'ap-southeast-1c'],
            'ap-northeast-1': ['ap-northeast-1a', 'ap-northeast-1b', 'ap-northeast-1c']
        };
        return (azMap[region] || azMap['us-east-1']).slice(0, count);
    };

    const getTags = (projectName: string, env: Environment, resourceName: string) => ({
        Project: projectName,
        Environment: env,
        ManagedBy: 'Terramod',
        Stack: '3-tier-web-app',
        Name: `${projectName}-${resourceName}-${env}`
    });

    const isStepValid = (stepNum: number): boolean => {
        switch (stepNum) {
            case 1:
                return config.projectName.length > 0 && config.environments.length > 0;
            case 2:
                return true; // AZ defaults are always valid
            case 3:
                return true; // Defaults are always valid
            case 4:
                return true; // Database can be 'none'
            case 5:
                return true; // Optional
            case 6:
                return true; // Optional
            default:
                return false;
        }
    };

    // Render functions for each step
    const renderStep1 = () => (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-white mb-2">Project & Environment</h2>
                <p className="text-slate-400">Basic configuration for your infrastructure</p>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                    Project Name <span className="text-red-400">*</span>
                </label>
                <input
                    type="text"
                    value={config.projectName}
                    onChange={(e) => updateConfig({ projectName: e.target.value })}
                    placeholder="my-ecommerce"
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
                <label className="block text-sm font-medium text-slate-300 mb-3">
                    Environments <span className="text-red-400">*</span>
                </label>
                <div className="flex gap-3">
                    {(['dev', 'staging', 'prod'] as Environment[]).map((env) => {
                        const isSelected = config.environments.includes(env);
                        return (
                            <button
                                key={env}
                                onClick={() => {
                                    const newEnvs = isSelected
                                        ? config.environments.filter((e) => e !== env)
                                        : [...config.environments, env];
                                    updateConfig({ environments: newEnvs });
                                }}
                                className={`flex-1 py-3 px-4 rounded-lg border-2 font-medium transition-all ${isSelected
                                    ? 'border-violet-500 bg-violet-500/20 text-violet-300'
                                    : 'border-white/10 bg-white/5 text-slate-400 hover:border-white/20'
                                    }`}
                            >
                                {env.charAt(0).toUpperCase() + env.slice(1)}
                            </button>
                        );
                    })}
                </div>
                <p className="text-xs text-slate-500 mt-2">Select one or more environments to deploy</p>
            </div>
        </div>
    );

    const renderStep2 = () => (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-white mb-2">Networking</h2>
                <p className="text-slate-400">Configure availability zones per environment</p>
            </div>

            {config.environments.map((env) => (
                <div key={env} className="p-4 bg-white/5 border border-white/10 rounded-lg">
                    <label className="block text-sm font-medium text-slate-300 mb-3 capitalize">
                        {env} Environment
                    </label>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-slate-400">Availability Zones:</span>
                        <select
                            value={config.availabilityZones[env]}
                            onChange={(e) =>
                                updateConfig({
                                    availabilityZones: {
                                        ...config.availabilityZones,
                                        [env]: parseInt(e.target.value)
                                    }
                                })
                            }
                            className="px-4 py-2 bg-white/5 border border-white/10 text-white rounded-lg focus:border-violet-400/50 focus:outline-none"
                        >
                            {[1, 2, 3].map((num) => (
                                <option key={num} value={num} className="bg-slate-900">
                                    {num} AZ{num > 1 ? 's' : ''}
                                </option>
                            ))}
                        </select>
                        <span className="text-xs text-slate-500">
                            (Default: Dev=1, Staging=2, Prod=3)
                        </span>
                    </div>
                </div>
            ))}

            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <div className="flex items-start gap-3">
                    <span className="text-2xl">💡</span>
                    <div>
                        <p className="text-sm text-blue-300 font-medium mb-1">Auto-configured networking</p>
                        <p className="text-xs text-blue-400">
                            VPC CIDR, public/private subnets, Internet Gateway, and NAT Gateways will be automatically
                            configured with secure defaults.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderStep3 = () => (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-white mb-2">Compute / Application Layer</h2>
                <p className="text-slate-400">Choose compute platform and scaling settings</p>
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

            {config.environments.map((env) => (
                <div key={env} className="p-4 bg-white/5 border border-white/10 rounded-lg">
                    <label className="block text-sm font-medium text-slate-300 mb-3 capitalize">
                        {env} - Instance Scaling
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Min Instances</label>
                            <input
                                type="number"
                                min="1"
                                value={config.instanceScaling[env].min}
                                onChange={(e) =>
                                    updateConfig({
                                        instanceScaling: {
                                            ...config.instanceScaling,
                                            [env]: {
                                                ...config.instanceScaling[env],
                                                min: parseInt(e.target.value)
                                            }
                                        }
                                    })
                                }
                                className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white rounded-lg focus:border-violet-400/50 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Max Instances</label>
                            <input
                                type="number"
                                min="1"
                                value={config.instanceScaling[env].max}
                                onChange={(e) =>
                                    updateConfig({
                                        instanceScaling: {
                                            ...config.instanceScaling,
                                            [env]: {
                                                ...config.instanceScaling[env],
                                                max: parseInt(e.target.value)
                                            }
                                        }
                                    })
                                }
                                className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white rounded-lg focus:border-violet-400/50 focus:outline-none"
                            />
                        </div>
                    </div>
                </div>
            ))}

            <div>
                <label className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-lg cursor-pointer hover:bg-white/10 transition-all">
                    <input
                        type="checkbox"
                        checked={config.enableALB}
                        onChange={(e) => updateConfig({ enableALB: e.target.checked })}
                        className="w-5 h-5 rounded bg-white/5 border-white/10 text-violet-500 focus:ring-violet-500/50"
                    />
                    <div>
                        <div className="font-medium text-white">Enable Application Load Balancer</div>
                        <div className="text-xs text-slate-400">Recommended for web applications</div>
                    </div>
                </label>
            </div>

            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <div className="flex items-start gap-3">
                    <span className="text-2xl">💡</span>
                    <div>
                        <p className="text-sm text-blue-300 font-medium mb-1">Auto-configured instance types</p>
                        <p className="text-xs text-blue-400">
                            Dev: t3.micro, Staging: t3.small, Prod: t3.medium (optimized for cost and performance)
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderStep4 = () => (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-white mb-2">Database Layer</h2>
                <p className="text-slate-400">Configure your database requirements</p>
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
                        <label className="block text-sm font-medium text-slate-300 mb-3">Multi-AZ Deployment</label>
                        {config.environments.map((env) => (
                            <label
                                key={env}
                                className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-lg mb-2 cursor-pointer hover:bg-white/10 transition-all"
                            >
                                <input
                                    type="checkbox"
                                    checked={config.multiAZ[env]}
                                    onChange={(e) =>
                                        updateConfig({
                                            multiAZ: {
                                                ...config.multiAZ,
                                                [env]: e.target.checked
                                            }
                                        })
                                    }
                                    className="w-5 h-5 rounded bg-white/5 border-white/10 text-violet-500 focus:ring-violet-500/50"
                                />
                                <div className="flex-1">
                                    <div className="font-medium text-white capitalize">{env}</div>
                                    <div className="text-xs text-slate-400">
                                        {config.multiAZ[env] ? 'High availability enabled' : 'Single-AZ (lower cost)'}
                                    </div>
                                </div>
                            </label>
                        ))}
                    </div>

                    <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                        <div className="flex items-start gap-3">
                            <span className="text-2xl">🔒</span>
                            <div>
                                <p className="text-sm text-blue-300 font-medium mb-1">Security built-in</p>
                                <p className="text-xs text-blue-400">
                                    Encryption at rest, automated backups, and deletion protection (Prod) are automatically configured.
                                </p>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );

    const renderStep5 = () => (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-white mb-2">Optional Components</h2>
                <p className="text-slate-400">Additional services (disabled by default)</p>
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
                        In-memory caching for improved performance. Adds ~$15-30/month per environment.
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
                        Secure SSH access to private resources. Adds ~$8/month per environment.
                    </div>
                </div>
            </label>

            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="flex items-start gap-3">
                    <span className="text-2xl">✅</span>
                    <div>
                        <p className="text-sm text-green-300 font-medium mb-1">Always included (no extra cost)</p>
                        <ul className="text-xs text-green-400 space-y-1">
                            <li>• CloudWatch Logs for application monitoring</li>
                            <li>• IAM roles with least-privilege access</li>
                            <li>• S3 bucket for static assets</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderStep6 = () => (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-white mb-2">Frontend (Optional)</h2>
                <p className="text-slate-400">Placeholder frontend for development and testing</p>
            </div>

            <label className="flex items-start gap-4 p-5 bg-white/5 border border-white/10 rounded-lg cursor-pointer hover:bg-white/10 transition-all">
                <input
                    type="checkbox"
                    checked={config.includeFrontend}
                    onChange={(e) => updateConfig({ includeFrontend: e.target.checked })}
                    className="mt-1 w-5 h-5 rounded bg-white/5 border-white/10 text-violet-500 focus:ring-violet-500/50"
                />
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">🌐</span>
                        <div className="font-semibold text-white">Include Sample Frontend</div>
                    </div>
                    <div className="text-sm text-slate-400 mb-3">
                        Basic HTML/CSS hosted on S3 + CloudFront for testing your backend. You can replace this with your own frontend later.
                    </div>
                    {config.includeFrontend && (
                        <div className="p-3 bg-white/5 border border-white/10 rounded text-xs text-slate-400">
                            <div className="font-medium text-white mb-1">Includes:</div>
                            <ul className="space-y-1">
                                <li>• S3 bucket configured for static website hosting</li>
                                <li>• CloudFront CDN for global distribution</li>
                                <li>• HTTPS enforced via CloudFront</li>
                            </ul>
                        </div>
                    )}
                </div>
            </label>

            <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                <div className="flex items-start gap-3">
                    <span className="text-2xl">🎉</span>
                    <div>
                        <p className="text-sm text-purple-300 font-medium mb-1">Ready to generate!</p>
                        <p className="text-xs text-purple-400">
                            Review your configuration and click "Generate Infrastructure" to create your stack.
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
            case 5:
                return renderStep5();
            case 6:
                return renderStep6();
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
                        {[1, 2, 3, 4, 5, 6].map((num) => (
                            <div
                                key={num}
                                className={`h-1 flex-1 rounded-full transition-all ${num <= step ? 'bg-violet-500' : 'bg-white/10'
                                    }`}
                            />
                        ))}
                    </div>
                    <p className="text-sm text-slate-400 mt-2">
                        Step {step} of 6
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

                        {step < 6 ? (
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