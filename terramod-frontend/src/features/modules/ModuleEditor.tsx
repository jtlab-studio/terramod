import React, { useState, useMemo } from 'react';
import { useInfraStore } from '../../store/infraStore';
import { useUIStore } from '../../store/uiStore';
import { getDefaultStrategy } from '../../types/deployment';
import type { DeploymentStrategy } from '../../types/deployment';
import { ServiceDefinition } from '../../api/registry';

const ModuleEditor: React.FC = () => {
    const activeModuleId = useUIStore((state) => state.activeModuleId);
    const selectedId = useUIStore((state) => state.selectedId);
    const setSelectedId = useUIStore((state) => state.setSelectedId);

    const domains = useInfraStore((state) => state.domains);
    const resources = useInfraStore((state) => state.resources);
    const addResource = useInfraStore((state) => state.addResource);
    const deleteResource = useInfraStore((state) => state.deleteResource);
    const deploymentConfig = useInfraStore((state) => state.deploymentConfig);

    const [dropHighlight, setDropHighlight] = useState(false);

    const activeModule = activeModuleId ? domains.get(activeModuleId) : null;

    const moduleResources = useMemo(() => {
        if (!activeModule) return [];
        return activeModule.resourceIds
            .map(rid => resources.get(rid))
            .filter(Boolean);
    }, [activeModule, resources]);

    const generateResourceId = (prefix: string): string => {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    };

    const getDefaultArguments = (service: ServiceDefinition, strategy: DeploymentStrategy): Record<string, any> => {
        const defaults: Record<string, any> = {};

        if (service.resource_type === 'aws_vpc') {
            defaults.cidr_block = '10.0.0.0/16';
        } else if (service.resource_type === 'aws_subnet') {
            // Auto-calculate CIDR if per-az
            if (strategy === 'per-az') {
                defaults.cidr_block = '10.0.1.0/24'; // Will be overridden per AZ
            } else {
                defaults.cidr_block = '10.0.1.0/24';
            }
        } else if (service.resource_type === 'aws_instance') {
            defaults.ami = 'ami-0c55b159cbfafe1f0';
            defaults.instance_type = 't3.micro';
        } else if (service.resource_type === 'aws_s3_bucket') {
            defaults.bucket = `my-bucket-${Date.now()}`;
        }

        return defaults;
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDropHighlight(false);

        if (!activeModule) {
            alert('Please select a module first');
            return;
        }

        try {
            const serviceData = e.dataTransfer.getData('service');
            if (!serviceData) return;

            const service: ServiceDefinition = JSON.parse(serviceData);

            // Check if service matches module domain
            if (service.domain !== activeModule.type) {
                const confirm = window.confirm(
                    `This service (${service.domain}) doesn't match the module type (${activeModule.type}). Add anyway?`
                );
                if (!confirm) return;
            }

            const resourceId = generateResourceId(service.resource_type);
            const resourceName = `${service.resource_type.replace('aws_', '').replace(/_/g, '_')}_${activeModule.resourceIds.length + 1}`;

            const defaultStrategy = getDefaultStrategy(service.resource_type);

            const newResource = {
                id: resourceId,
                type: service.resource_type,
                domainId: activeModule.id,
                name: resourceName,
                arguments: getDefaultArguments(service, defaultStrategy),
                deployment: {
                    strategy: defaultStrategy,
                    cidrAuto: service.resource_type === 'aws_subnet'
                },
                position: { x: 0, y: 0 },
                validationState: { isValid: true, errors: [], warnings: [] }
            };

            addResource(newResource);
            setSelectedId(resourceId);

        } catch (error) {
            console.error('Drop failed:', error);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        setDropHighlight(true);
    };

    const handleDragLeave = () => {
        setDropHighlight(false);
    };

    const getDeploymentBadge = (strategy: DeploymentStrategy) => {
        const badges = {
            single: { text: '1x', color: 'bg-gray-700 text-gray-300', tooltip: 'Single instance' },
            'per-az': { text: `${deploymentConfig.availabilityZones.length}x`, color: 'bg-blue-700 text-blue-200', tooltip: 'One per AZ' },
            'multi-az': { text: 'Multi-AZ', color: 'bg-green-700 text-green-200', tooltip: 'Spans multiple AZs' },
            regional: { text: 'Regional', color: 'bg-purple-700 text-purple-200', tooltip: 'One per region' }
        };

        const badge = badges[strategy] || badges.single;

        return (
            <span
                className={`px-2 py-0.5 rounded text-xs font-medium ${badge.color}`}
                title={badge.tooltip}
            >
                {badge.text}
            </span>
        );
    };

    const getResourceIcon = (resourceType: string): string => {
        const type = resourceType.replace('aws_', '');
        const icons: Record<string, string> = {
            vpc: '🌐',
            subnet: '📍',
            security_group: '🔒',
            instance: '💻',
            s3_bucket: '🗄️',
            lambda_function: '⚡',
            iam_role: '👤',
            rds_cluster: '🗃️',
            lb: '⚖️',
            alb: '⚖️',
            nlb: '⚖️'
        };
        return icons[type] || '📦';
    };

    if (!activeModule) {
        return (
            <div className="flex-1 bg-gray-900 flex items-center justify-center">
                <div className="text-center text-gray-500">
                    <p className="text-lg font-medium mb-2">No Module Selected</p>
                    <p className="text-sm">Select a module from the left panel or create a new one</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 bg-gray-900 flex flex-col">
            {/* Module Header */}
            <div className="px-6 py-4 border-b border-gray-800 bg-gray-850">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-gray-100">{activeModule.name}</h2>
                        <div className="text-sm text-gray-400 capitalize mt-1">
                            {activeModule.type} • {activeModule.scope || 'regional'} scope
                        </div>
                    </div>
                    <div className="text-sm text-gray-500">
                        {moduleResources.length} resource{moduleResources.length !== 1 ? 's' : ''}
                    </div>
                </div>
            </div>

            {/* Drop Zone */}
            <div
                className={`flex-1 overflow-y-auto p-6 transition-colors ${dropHighlight ? 'bg-gray-800 border-4 border-dashed border-gray-600' : ''
                    }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
            >
                {moduleResources.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center text-gray-500 max-w-md">
                            <div className="text-5xl mb-4">📦</div>
                            <p className="text-lg font-medium mb-2">No Resources Yet</p>
                            <p className="text-sm">
                                Drag services from the right sidebar to add them to this module
                            </p>
                            <div className="mt-4 p-4 bg-gray-800 border border-gray-700 rounded text-xs text-left">
                                <p className="font-medium text-gray-300 mb-2">💡 Tips:</p>
                                <ul className="space-y-1 text-gray-400">
                                    <li>• Resources are grouped by module (Terraform module)</li>
                                    <li>• Each resource has a deployment strategy</li>
                                    <li>• Configure resources in the right inspector</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {moduleResources.map((resource) => {
                            if (!resource) return null;
                            const isSelected = selectedId === resource.id;

                            return (
                                <div
                                    key={resource.id}
                                    onClick={() => setSelectedId(resource.id)}
                                    className={`p-4 rounded-lg cursor-pointer transition-all ${isSelected
                                            ? 'bg-gray-700 border-2 border-gray-600 shadow-lg'
                                            : 'bg-gray-800 border border-gray-700 hover:border-gray-600 hover:bg-gray-750'
                                        }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-3 flex-1 min-w-0">
                                            <span className="text-2xl flex-shrink-0">{getResourceIcon(resource.type)}</span>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-medium text-gray-200 truncate">{resource.name}</h3>
                                                    {resource.deployment && getDeploymentBadge(resource.deployment.strategy)}
                                                </div>
                                                <div className="text-xs text-gray-400">
                                                    {resource.type.replace('aws_', '').replace(/_/g, ' ')}
                                                </div>

                                                {/* Show key arguments */}
                                                {Object.keys(resource.arguments).length > 0 && (
                                                    <div className="mt-2 flex flex-wrap gap-2">
                                                        {Object.entries(resource.arguments).slice(0, 3).map(([key, value]) => (
                                                            <span
                                                                key={key}
                                                                className="text-xs px-2 py-0.5 bg-gray-900 border border-gray-700 text-gray-400 rounded"
                                                                title={`${key}: ${value}`}
                                                            >
                                                                {key}: {String(value).length > 20 ? String(value).substring(0, 17) + '...' : String(value)}
                                                            </span>
                                                        ))}
                                                        {Object.keys(resource.arguments).length > 3 && (
                                                            <span className="text-xs px-2 py-0.5 text-gray-500">
                                                                +{Object.keys(resource.arguments).length - 3} more
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (confirm(`Delete "${resource.name}"?`)) {
                                                    deleteResource(resource.id);
                                                }
                                            }}
                                            className="ml-2 text-red-400 hover:text-red-300 transition-colors"
                                            title="Delete resource"
                                        >
                                            🗑️
                                        </button>
                                    </div>

                                    {/* Deployment Preview for per-az */}
                                    {resource.deployment?.strategy === 'per-az' && (
                                        <div className="mt-3 pt-3 border-t border-gray-700">
                                            <div className="text-xs text-gray-400 mb-1">Will create:</div>
                                            <div className="flex flex-wrap gap-1">
                                                {deploymentConfig.availabilityZones.map((az: string) => (
                                                    <span
                                                        key={az}
                                                        className="text-xs px-2 py-1 bg-blue-900 border border-blue-700 text-blue-200 rounded"
                                                    >
                                                        {resource.name}_{az.split('-').pop()}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ModuleEditor;