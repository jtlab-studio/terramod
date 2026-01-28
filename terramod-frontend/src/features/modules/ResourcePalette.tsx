import React, { useState, useEffect, useMemo } from 'react';
import { useUIStore } from '../../store/uiStore';
import { useInfraStore } from '../../store/infraStore';
import { getDomainServices, ServiceDefinition } from '../../api/registry';

const ResourcePalette: React.FC = () => {
    const activeModuleId = useUIStore((state) => state.activeModuleId);
    const setActiveModuleId = useUIStore((state) => state.setActiveModuleId);
    const domains = useInfraStore((state) => state.domains);
    const addResource = useInfraStore((state) => state.addResource);
    const setSelectedId = useUIStore((state) => state.setSelectedId);
    const deploymentConfig = useInfraStore((state) => state.deploymentConfig);

    const [services, setServices] = useState<ServiceDefinition[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const activeModule = activeModuleId ? domains.get(activeModuleId) : null;

    useEffect(() => {
        if (activeModule) {
            loadDomainServices(activeModule.type);
        }
    }, [activeModule?.type]);

    const loadDomainServices = async (domain: string) => {
        setIsLoading(true);
        try {
            const result = await getDomainServices(domain as any);
            if (result.ok) {
                setServices(result.value);
            } else {
                console.error('Failed to load services:', result.error);
            }
        } catch (err) {
            console.error('Service load error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredServices = useMemo(() => {
        if (!searchQuery) return services;
        return services.filter(s =>
            s.resource_type.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [services, searchQuery]);

    const getServiceIcon = (resourceType: string): string => {
        const type = resourceType.replace('aws_', '');
        const icons: Record<string, string> = {
            vpc: '🌐',
            subnet: '📍',
            internet_gateway: '🌐',
            nat_gateway: '🔄',
            route_table: '📋',
            security_group: '🔒',
            instance: '💻',
            autoscaling_group: '📈',
            ecs_cluster: '🐳',
            eks_cluster: '☸️',
            lambda_function: '⚡',
            api_gateway_rest_api: '🔌',
            db_instance: '🗃️',
            dynamodb_table: '⚡',
            s3_bucket: '🗄️',
            sqs_queue: '📨',
            sns_topic: '📢',
            iam_role: '👤',
            iam_policy: '📜',
            cloudwatch_log_group: '📊',
            cloudwatch_metric_alarm: '🔔',
            lb: '⚖️',
            alb: '⚖️',
            nlb: '⚖️'
        };
        return icons[type] || '📦';
    };

    const getDefaultStrategy = (resourceType: string) => {
        const strategies: Record<string, string> = {
            aws_vpc: 'single',
            aws_subnet: 'per-az',
            aws_nat_gateway: 'per-az',
            aws_instance: 'per-az',
            aws_lb: 'multi-az',
            aws_alb: 'multi-az',
            aws_nlb: 'multi-az',
            aws_rds_cluster: 'multi-az'
        };
        return strategies[resourceType] || 'single';
    };

    const getDefaultArguments = (service: ServiceDefinition): Record<string, any> => {
        const defaults: Record<string, any> = {};

        if (service.resource_type === 'aws_vpc') {
            defaults.cidr_block = '10.0.0.0/16';
            defaults.enable_dns_hostnames = true;
            defaults.enable_dns_support = true;
        } else if (service.resource_type === 'aws_subnet') {
            defaults.cidr_block = '10.0.1.0/24';
            defaults.availability_zone = deploymentConfig.availabilityZones[0] || 'us-east-1a';
        } else if (service.resource_type === 'aws_instance') {
            defaults.ami = 'ami-0c55b159cbfafe1f0';
            defaults.instance_type = 't3.micro';
        } else if (service.resource_type === 'aws_s3_bucket') {
            defaults.bucket = `my-bucket-${Date.now()}`;
        } else if (service.resource_type === 'aws_security_group') {
            defaults.description = 'Security group created by Terramod';
        }

        return defaults;
    };

    const handleDoubleClick = (service: ServiceDefinition) => {
        if (!activeModule) return;

        const resourceId = `resource_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const resourceName = `${service.resource_type.replace('aws_', '').replace(/_/g, '-')}-${activeModule.resourceIds.length + 1}`;

        const defaultStrategy = getDefaultStrategy(service.resource_type) as any;

        const newResource = {
            id: resourceId,
            type: service.resource_type,
            domainId: activeModule.id,
            name: resourceName,
            arguments: getDefaultArguments(service),
            deployment: {
                strategy: defaultStrategy,
                cidrAuto: service.resource_type === 'aws_subnet'
            },
            position: { x: 0, y: 0 },
            validationState: { isValid: true, errors: [], warnings: [] }
        };

        addResource(newResource);
        setSelectedId(resourceId);
    };

    if (!activeModule) {
        return null;
    }

    return (
        <div className="flex flex-col h-full">
            {/* Back button */}
            <button
                onClick={() => setActiveModuleId(null)}
                className="px-3 py-2 text-sm text-gray-300 hover:text-gray-100 hover:bg-gray-800 rounded transition-colors text-left flex items-center gap-2 mb-3"
            >
                <span>←</span>
                <span>Back to Modules</span>
            </button>

            {/* Active module indicator */}
            <div className="mb-4 p-3 bg-gray-800 border border-gray-700 rounded">
                <div className="text-xs text-gray-400 mb-1">Active Module</div>
                <div className="font-semibold text-gray-100">{activeModule.name}</div>
                <div className="text-xs text-gray-500 capitalize">{activeModule.type}</div>
            </div>

            {/* Search */}
            <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search resources..."
                className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 text-gray-200 placeholder-gray-500 rounded focus:outline-none focus:ring-2 focus:ring-gray-600 mb-3"
            />

            {/* Resources list */}
            <div className="flex-1 overflow-y-auto space-y-2">
                {isLoading ? (
                    <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mx-auto mb-2"></div>
                        <p className="text-sm text-gray-400">Loading resources...</p>
                    </div>
                ) : filteredServices.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-sm">
                        {searchQuery ? `No resources found matching "${searchQuery}"` : 'No resources available'}
                    </div>
                ) : (
                    filteredServices.map((service) => (
                        <div
                            key={service.resource_type}
                            onDoubleClick={() => handleDoubleClick(service)}
                            className="p-2 bg-gray-800 border border-gray-700 rounded cursor-pointer hover:border-gray-600 hover:bg-gray-750 transition-all"
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-lg">{getServiceIcon(service.resource_type)}</span>
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-gray-200 text-xs truncate">
                                        {service.resource_type.replace('aws_', '').replace(/_/g, ' ')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default ResourcePalette;