import React, { useMemo } from 'react';
import { useInfraStore } from '../../store/infraStore';
import { useUIStore } from '../../store/uiStore';
import type { DeploymentStrategy } from '../../types/deployment';

const ModuleContent: React.FC = () => {
    const activeModuleId = useUIStore((state) => state.activeModuleId);
    const selectedId = useUIStore((state) => state.selectedId);
    const setSelectedId = useUIStore((state) => state.setSelectedId);

    const domains = useInfraStore((state) => state.domains);
    const resources = useInfraStore((state) => state.resources);
    const deleteResource = useInfraStore((state) => state.deleteResource);
    const deploymentConfig = useInfraStore((state) => state.deploymentConfig);

    const activeModule = activeModuleId ? domains.get(activeModuleId) : null;

    const moduleResources = useMemo(() => {
        if (!activeModule) return [];
        return activeModule.resourceIds
            .map(rid => resources.get(rid))
            .filter(Boolean);
    }, [activeModule, resources]);

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

    if (!activeModule) {
        return (
            <div className="flex-1 bg-gray-900 flex items-center justify-center">
                <div className="text-center text-gray-500 max-w-md">
                    <div className="text-6xl mb-4">📦</div>
                    <p className="text-lg font-medium mb-2">No Module Selected</p>
                    <p className="text-sm">Select a module from the left panel to start</p>
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
                            {activeModule.type} module
                        </div>
                    </div>
                    <div className="text-sm text-gray-500">
                        {moduleResources.length} resource{moduleResources.length !== 1 ? 's' : ''}
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6">
                {moduleResources.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center text-gray-500 max-w-md">
                            <div className="text-5xl mb-4">📦</div>
                            <p className="text-lg font-medium mb-2">No Resources Yet</p>
                            <p className="text-sm">
                                Double-click resources from the left panel to add them
                            </p>
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
                                    className={`p-3 rounded cursor-pointer transition-all ${isSelected
                                            ? 'bg-gray-700 border-2 border-blue-600'
                                            : 'bg-gray-800 border border-gray-700 hover:border-gray-600 hover:bg-gray-750'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <span className="text-xl">{getResourceIcon(resource.type)}</span>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-medium text-gray-200 text-sm truncate">{resource.name}</h3>
                                                    {resource.deployment && getDeploymentBadge(resource.deployment.strategy)}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {resource.type.replace('aws_', '').replace(/_/g, ' ')}
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (confirm(`Delete "${resource.name}"?`)) {
                                                    deleteResource(resource.id);
                                                    if (selectedId === resource.id) {
                                                        setSelectedId(null);
                                                    }
                                                }
                                            }}
                                            className="ml-2 text-red-400 hover:text-red-300 transition-colors p-1"
                                            title="Delete resource"
                                        >
                                            🗑️
                                        </button>
                                    </div>

                                    {/* Deployment Preview for per-az */}
                                    {resource.deployment?.strategy === 'per-az' && (
                                        <div className="mt-2 pt-2 border-t border-gray-700">
                                            <div className="flex flex-wrap gap-1">
                                                {deploymentConfig.availabilityZones.map((az: string) => (
                                                    <span
                                                        key={az}
                                                        className="text-xs px-1.5 py-0.5 bg-blue-900 border border-blue-700 text-blue-200 rounded"
                                                    >
                                                        {az.split('-').pop()}
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

export default ModuleContent;