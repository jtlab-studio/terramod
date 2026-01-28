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

    // Group resources by environment and domain
    const resourcesByEnvAndDomain = useMemo(() => {
        const grouped: Record<string, Record<string, any[]>> = {};

        allResources.forEach((resource) => {
            const env = (resource.arguments as any).tags?.Environment || 'unknown';
            const domain = domains.get(resource.domainId);
            if (!domain) return;

            if (!grouped[env]) grouped[env] = {};
            if (!grouped[env][domain.type]) grouped[env][domain.type] = [];

            grouped[env][domain.type].push(resource);
        });

        return grouped;
    }, [allResources, domains]);

    const environments = Object.keys(resourcesByEnvAndDomain).sort((a, b) => {
        const order = { dev: 1, staging: 2, prod: 3 };
        return ((order as any)[a] || 99) - ((order as any)[b] || 99);
    });

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
            launch_template: '📋', ecs_cluster: '🐳', eks_cluster: '☸️', lambda_function: '⚡',
            api_gateway_rest_api: '🔌', db_instance: '🗃️', db_subnet_group: '🗃️',
            dynamodb_table: '⚡', elasticache_cluster: '⚡', s3_bucket: '🗄️',
            sqs_queue: '📨', sns_topic: '📢', iam_role: '👤', iam_policy: '📜',
            cloudwatch_log_group: '📊', cloudwatch_metric_alarm: '🔔',
            lb: '⚖️', alb: '⚖️', nlb: '⚖️', cloudfront_distribution: '🌍'
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

    const getEnvironmentColor = (env: string) => {
        const colors = {
            dev: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
            staging: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
            prod: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
            unknown: 'bg-slate-500/10 text-slate-300 border-slate-500/30'
        };
        return colors[env as keyof typeof colors] || colors.unknown;
    };

    const renderResourceCard = (resource: any) => {
        const isSelected = selectedId === resource.id;
        const env = (resource.arguments as any).tags?.Environment || 'unknown';
        const az = (resource as any).availabilityZone;

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
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <h3 className="font-medium text-white truncate">{resource.name}</h3>
                                <span className={`px-2 py-0.5 rounded-md text-xs font-medium border ${getEnvironmentColor(env)}`}>
                                    {env.toUpperCase()}
                                </span>
                                {az && (
                                    <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-violet-500/10 text-violet-300 border border-violet-500/20">
                                        {az.split('-').pop()?.toUpperCase()}
                                    </span>
                                )}
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

                {/* Additional info for specific resource types */}
                {resource.type === 'aws_subnet' && resource.arguments.cidr_block && (
                    <div className="mt-3 pt-3 border-t border-white/5">
                        <div className="text-xs text-slate-400">
                            CIDR: <span className="text-slate-300 font-mono">{resource.arguments.cidr_block}</span>
                            {resource.arguments.map_public_ip_on_launch && (
                                <span className="ml-2 px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">
                                    Public
                                </span>
                            )}
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
                            Your infrastructure will appear here after you complete the stack configuration wizard.
                        </p>
                    </div>
                </div>
            );
        }

        return (
            <div className="space-y-8">
                {/* Group by Environment */}
                {environments.map((env) => (
                    <div key={env}>
                        <div className="sticky top-0 z-10 backdrop-blur-xl bg-slate-900/50 py-3 mb-4 -mx-6 px-6 border-b border-white/5">
                            <div className="flex items-center gap-3">
                                <div className={`px-4 py-2 rounded-xl border ${getEnvironmentColor(env)}`}>
                                    <span className="font-bold uppercase text-sm">{env}</span>
                                </div>
                                <div className="text-sm text-slate-400">
                                    {Object.values(resourcesByEnvAndDomain[env] || {}).flat().length} resources
                                </div>
                            </div>
                        </div>

                        {/* Group by Domain within Environment */}
                        {Object.entries(resourcesByEnvAndDomain[env] || {}).map(([domainType, domainResources]) => (
                            <div key={`${env}-${domainType}`} className="mb-6">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-600/20 border border-violet-500/30 flex items-center justify-center">
                                        <span className="text-lg">{getCategoryIcon(domainType as DomainType)}</span>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-semibold text-white">
                                            {getCategoryLabel(domainType as DomainType)}
                                        </h4>
                                        <p className="text-xs text-slate-500">
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
                ))}

                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-8 border-t border-white/5">
                    {Object.entries(resourcesByDomain).map(([domainType, domainResources]) => (
                        <button
                            key={domainType}
                            onClick={() => setActiveTab(domainType as DomainType)}
                            className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all"
                        >
                            <div className="text-2xl mb-2">{getCategoryIcon(domainType as DomainType)}</div>
                            <div className="text-sm font-medium text-white">{getCategoryLabel(domainType as DomainType)}</div>
                            <div className="text-xs text-slate-400 mt-1">{domainResources.length} resources</div>
                        </button>
                    ))}
                </div>
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

        // Group by environment for category view
        const resourcesByEnv: Record<string, any[]> = {};
        categoryResources.forEach((resource) => {
            const env = (resource.arguments as any).tags?.Environment || 'unknown';
            if (!resourcesByEnv[env]) resourcesByEnv[env] = [];
            resourcesByEnv[env].push(resource);
        });

        return (
            <div className="space-y-8">
                {Object.entries(resourcesByEnv).sort(([a], [b]) => {
                    const order = { dev: 1, staging: 2, prod: 3 };
                    return ((order as any)[a] || 99) - ((order as any)[b] || 99);
                }).map(([env, envResources]) => (
                    <div key={env}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className={`px-4 py-2 rounded-xl border ${getEnvironmentColor(env)}`}>
                                <span className="font-bold uppercase text-sm">{env}</span>
                            </div>
                            <div className="text-sm text-slate-400">
                                {envResources.length} {envResources.length === 1 ? 'resource' : 'resources'}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                            {envResources.map(renderResourceCard)}
                        </div>
                    </div>
                ))}
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
                        {allResources.length} {allResources.length === 1 ? 'resource' : 'resources'} across {environments.length} {environments.length === 1 ? 'environment' : 'environments'}
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