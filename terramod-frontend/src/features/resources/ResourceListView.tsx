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
            vpc: '🌐', subnet: '📍', internet_gateway: '🌐', nat_gateway: '🔄',
            route_table: '📋', security_group: '🔒', instance: '💻', autoscaling_group: '📈',
            ecs_cluster: '🐳', eks_cluster: '☸️', lambda_function: '⚡',
            api_gateway_rest_api: '🔌', db_instance: '🗃️', dynamodb_table: '⚡',
            s3_bucket: '🗄️', sqs_queue: '📨', sns_topic: '📢', iam_role: '👤',
            iam_policy: '📜', cloudwatch_log_group: '📊', cloudwatch_metric_alarm: '🔔',
            lb: '⚖️', alb: '⚖️', nlb: '⚖️'
        };
        return icons[type] || '📦';
    };

    const getCategoryIcon = (category: DomainType): string => {
        const icons: Record<DomainType, string> = {
            networking: '🌐', compute: '💻', serverless: '⚡', data: '🗃️',
            storage: '🗄️', messaging: '📨', identity: '👤', observability: '📊', edge: '⚖️'
        };
        return icons[category];
    };

    const getCategoryLabel = (category: DomainType): string => {
        return category.charAt(0).toUpperCase() + category.slice(1);
    };

    const getDeploymentBadge = (strategy: string) => {
        const badges = {
            single: { text: '1×', color: 'bg-slate-800/50 text-slate-400 border-slate-700/50' },
            'per-az': { text: `${deploymentConfig.availabilityZones.length}×`, color: 'bg-violet-500/10 text-violet-300 border-violet-500/30' },
            'multi-az': { text: 'Multi-AZ', color: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' },
            regional: { text: 'Regional', color: 'bg-purple-500/10 text-purple-300 border-purple-500/30' }
        };
        const badge = badges[strategy as keyof typeof badges] || badges.single;
        return (
            <span className={`px-2 py-0.5 rounded-md text-xs font-medium border ${badge.color}`}>
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
                className={`group relative p-4 rounded-xl backdrop-blur-sm cursor-pointer transition-all duration-200 ${isSelected
                        ? 'bg-violet-500/10 border-2 border-violet-500/50 shadow-lg shadow-violet-500/10'
                        : 'bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20'
                    }`}
            >
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="text-2xl">{getResourceIcon(resource.type)}</div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-medium text-white truncate">{resource.name}</h3>
                                {resource.deployment && getDeploymentBadge(resource.deployment.strategy)}
                            </div>
                            <div className="text-xs text-slate-400">
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
                        className="ml-2 w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 opacity-0 group-hover:opacity-100"
                        title="Delete resource"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>

                {resource.deployment?.strategy === 'per-az' && (
                    <div className="mt-3 pt-3 border-t border-white/5">
                        <div className="flex flex-wrap gap-1.5">
                            {deploymentConfig.availabilityZones.map((az: string) => (
                                <span
                                    key={az}
                                    className="px-2 py-1 text-xs rounded-md bg-violet-500/10 text-violet-300 border border-violet-500/20"
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
                    <div className="text-center max-w-md">
                        <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-violet-500/10 to-purple-600/10 border border-violet-500/20 flex items-center justify-center">
                            <span className="text-5xl">📦</span>
                        </div>
                        <h3 className="text-xl font-semibold text-white mb-2">No Resources Yet</h3>
                        <p className="text-sm text-slate-400">
                            This stack template should have pre-populated resources.
                            If you see this message, something went wrong during stack creation.
                        </p>
                    </div>
                </div>
            );
        }

        return (
            <div className="space-y-8">
                {Object.entries(resourcesByDomain).map(([domainType, domainResources]) => (
                    <div key={domainType}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-600/20 border border-violet-500/30 flex items-center justify-center">
                                <span className="text-xl">{getCategoryIcon(domainType as DomainType)}</span>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-white">
                                    {getCategoryLabel(domainType as DomainType)}
                                </h3>
                                <p className="text-xs text-slate-400">
                                    {domainResources.length} {domainResources.length === 1 ? 'resource' : 'resources'}
                                </p>
                            </div>
                        </div>

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
                    <div className="text-center max-w-md">
                        <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-violet-500/10 to-purple-600/10 border border-violet-500/20 flex items-center justify-center">
                            <span className="text-5xl">{getCategoryIcon(category)}</span>
                        </div>
                        <h3 className="text-xl font-semibold text-white mb-2">No {getCategoryLabel(category)} Resources</h3>
                        <p className="text-sm text-slate-400">
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
        <div className="flex flex-col h-full flex-1">
            <div className="backdrop-blur-xl bg-slate-900/30 border-b border-white/5">
                <div className="px-6 pt-6 pb-4">
                    <h2 className="text-2xl font-semibold text-white mb-1">Resources</h2>
                    <p className="text-sm text-slate-400">
                        {allResources.length} {allResources.length === 1 ? 'resource' : 'resources'} across {availableCategories.length} {availableCategories.length === 1 ? 'category' : 'categories'}
                    </p>
                </div>

                <div className="flex px-6 gap-2 overflow-x-auto pb-3 scrollbar-hide">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${activeTab === 'overview'
                                ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                                : 'text-slate-400 hover:text-slate-300 hover:bg-white/5'
                            }`}
                    >
                        Overview
                    </button>

                    {availableCategories.map((category) => (
                        <button
                            key={category}
                            onClick={() => setActiveTab(category)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${activeTab === category
                                    ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                                    : 'text-slate-400 hover:text-slate-300 hover:bg-white/5'
                                }`}
                        >
                            <span>{getCategoryIcon(category)}</span>
                            <span>{getCategoryLabel(category)}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
                {activeTab === 'overview' && renderOverviewTab()}
                {activeTab !== 'overview' && renderCategoryTab(activeTab)}
            </div>
        </div>
    );
};

export default ResourceListView;