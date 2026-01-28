import React, { useState, useMemo } from 'react';
import { useInfraStore } from '../../store/infraStore';
import { useUIStore } from '../../store/uiStore';
import { DomainType } from '../../types/domain';

const ResourceListView: React.FC = () => {
    const domains = useInfraStore((state) => state.domains);
    const resources = useInfraStore((state) => state.resources);
    const deploymentConfig = useInfraStore((state) => state.deploymentConfig);
    const deleteResource = useInfraStore((state) => state.deleteResource);
    const selectedId = useUIStore((state) => state.selectedId);
    const setSelectedId = useUIStore((state) => state.setSelectedId);

    const [activeTab, setActiveTab] = useState<'overview' | DomainType>('overview');

    const allDomains = Array.from(domains.values());
    const allResources = Array.from(resources.values());

    // Group resources by domain type
    const resourcesByDomain = useMemo(() => {
        const grouped: Record<string, any[]> = {};

        allDomains.forEach(domain => {
            const domainResources = domain.resourceIds
                .map(rid => resources.get(rid))
                .filter(Boolean);

            if (domainResources.length > 0) {
                grouped[domain.type] = domainResources;
            }
        });

        return grouped;
    }, [allDomains, resources]);

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

    const getCategoryIcon = (category: DomainType): string => {
        const icons: Record<DomainType, string> = {
            networking: '🌐',
            compute: '💻',
            serverless: '⚡',
            data: '🗄️',
            storage: '📦',
            messaging: '📨',
            identity: '👤',
            observability: '📊',
            edge: '🔀'
        };
        return icons[category];
    };

    const getCategoryLabel = (category: DomainType): string => {
        return category.charAt(0).toUpperCase() + category.slice(1);
    };

    const getDeploymentBadge = (strategy: string) => {
        const badges = {
            single: { text: '1x', color: 'bg-gray-700 text-gray-300', tooltip: 'Single instance' },
            'per-az': { text: `${deploymentConfig.availabilityZones.length}x`, color: 'bg-blue-700 text-blue-200', tooltip: 'One per AZ' },
            'multi-az': { text: 'Multi-AZ', color: 'bg-green-700 text-green-200', tooltip: 'Spans multiple AZs' },
            regional: { text: 'Regional', color: 'bg-purple-700 text-purple-200', tooltip: 'One per region' }
        };

        const badge = badges[strategy as keyof typeof badges] || badges.single;

        return (
            <span
                className={`px-2 py-0.5 rounded text-xs font-medium ${badge.color}`}
                title={badge.tooltip}
            >
                {badge.text}
            </span>
        );
    };

    const renderResourceCard = (resource: any) => {
        const isSelected = selectedId === resource.id;

        return (
            <div
                key={resource.id}
                onClick={() => setSelectedId(resource.id)}
                className={`p-4 rounded cursor-pointer transition-all ${isSelected
                        ? 'bg-gray-700 border-2 border-blue-600'
                        : 'bg-gray-800 border border-gray-700 hover:border-gray-600 hover:bg-gray-750'
                    }`}
            >
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="text-2xl">{getResourceIcon(resource.type)}</span>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <h3 className="font-medium text-gray-200 truncate">{resource.name}</h3>
                                {resource.deployment && getDeploymentBadge(resource.deployment.strategy)}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
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
                    <div className="mt-3 pt-3 border-t border-gray-700">
                        <div className="flex flex-wrap gap-1">
                            {deploymentConfig.availabilityZones.map((az: string) => (
                                <span
                                    key={az}
                                    className="text-xs px-2 py-0.5 bg-blue-900 border border-blue-700 text-blue-200 rounded"
                                >
                                    {az.split('-').pop()}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderOverviewTab = () => {
        if (allResources.length === 0) {
            return (
                <div className="flex items-center justify-center h-full">
                    <div className="text-center text-gray-500 max-w-md">
                        <div className="text-5xl mb-4">📦</div>
                        <p className="text-lg font-medium mb-2">No Resources Yet</p>
                        <p className="text-sm">
                            This stack template should have pre-populated resources.
                            If you see this message, something went wrong during stack creation.
                        </p>
                    </div>
                </div>
            );
        }

        return (
            <div className="space-y-6">
                {Object.entries(resourcesByDomain).map(([domainType, domainResources]) => (
                    <div key={domainType}>
                        {/* Category Header */}
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-2xl">{getCategoryIcon(domainType as DomainType)}</span>
                            <h3 className="text-lg font-semibold text-gray-100">
                                {getCategoryLabel(domainType as DomainType)}
                            </h3>
                            <span className="text-sm text-gray-500">
                                ({domainResources.length} {domainResources.length === 1 ? 'resource' : 'resources'})
                            </span>
                        </div>

                        {/* Resources Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                            {domainResources.map(renderResourceCard)}
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    const renderCategoryTab = (category: DomainType) => {
        const categoryResources = resourcesByDomain[category] || [];

        if (categoryResources.length === 0) {
            return (
                <div className="flex items-center justify-center h-full">
                    <div className="text-center text-gray-500 max-w-md">
                        <div className="text-5xl mb-4">{getCategoryIcon(category)}</div>
                        <p className="text-lg font-medium mb-2">No {getCategoryLabel(category)} Resources</p>
                        <p className="text-sm">
                            This stack doesn't include any {category} resources.
                        </p>
                    </div>
                </div>
            );
        }

        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {categoryResources.map(renderResourceCard)}
            </div>
        );
    };

    const availableCategories = Object.keys(resourcesByDomain) as DomainType[];

    return (
        <div className="flex flex-col h-full bg-gray-900">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-800 bg-gray-850">
                <h2 className="text-xl font-bold text-gray-100">Configure Resources</h2>
                <div className="text-sm text-gray-400 mt-1">
                    {allResources.length} {allResources.length === 1 ? 'resource' : 'resources'} •{' '}
                    {availableCategories.length} {availableCategories.length === 1 ? 'category' : 'categories'}
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-800 bg-gray-850">
                <div className="flex px-6 overflow-x-auto">
                    {/* Overview Tab */}
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'overview'
                                ? 'border-blue-500 text-blue-400'
                                : 'border-transparent text-gray-400 hover:text-gray-300'
                            }`}
                    >
                        📊 Overview
                    </button>

                    {/* Category Tabs */}
                    {availableCategories.map((category) => (
                        <button
                            key={category}
                            onClick={() => setActiveTab(category)}
                            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === category
                                    ? 'border-blue-500 text-blue-400'
                                    : 'border-transparent text-gray-400 hover:text-gray-300'
                                }`}
                        >
                            {getCategoryIcon(category)} {getCategoryLabel(category)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
                {activeTab === 'overview' && renderOverviewTab()}
                {activeTab !== 'overview' && renderCategoryTab(activeTab)}
            </div>

            {/* Helper Text */}
            <div className="px-6 py-3 border-t border-gray-800 bg-gray-850">
                <p className="text-xs text-gray-500">
                    💡 Click a resource to configure its properties in the right panel
                </p>
            </div>
        </div>
    );
};

export default ResourceListView;