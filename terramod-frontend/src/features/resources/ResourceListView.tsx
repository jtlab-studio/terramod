import React, { useState, useMemo } from 'react';
import { useInfraStore } from '../../store/infraStore';
import { useUIStore } from '../../store/uiStore';
import { DomainType } from '../../types/domain';
import ResourceInspector from '../inspector/ResourceInspector';

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
                className={`group relative p-1.5 rounded-lg backdrop-blur-sm cursor-pointer transition-all duration-200 w-28 ${isSelected
                    ? 'bg-violet-500/10 border border-violet-500/50 shadow-lg shadow-violet-500/10'
                    : 'bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20'
                    }`}
            >
                <div className="flex flex-col gap-1">
                    <div className="flex items-start justify-between gap-1">
                        <div className="text-sm flex-shrink-0">{getResourceIcon(resource.type)}</div>
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
                            className="flex-shrink-0 w-4 h-4 flex items-center justify-center rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 opacity-0 group-hover:opacity-100"
                            title="Delete"
                        >
                            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <h3 className="font-medium text-white truncate text-[11px] leading-tight">{resource.name}</h3>
                    <div className="flex items-center gap-1 flex-wrap">
                        <span className={`px-1 py-0.5 rounded text-[9px] font-medium border leading-none ${getEnvironmentColor(env)}`}>
                            {env.slice(0, 3).toUpperCase()}
                        </span>
                        {az && (
                            <span className="px-1 py-0.5 rounded text-[9px] font-medium bg-violet-500/10 text-violet-300 border border-violet-500/20 leading-none">
                                {az.split('-').pop()?.toUpperCase()}
                            </span>
                        )}
                    </div>
                </div>
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
            <div className="space-y-6">
                {/* Group by Environment */}
                {environments.map((env) => (
                    <div key={env}>
                        <div className="sticky top-0 z-10 backdrop-blur-xl bg-slate-900/50 py-2 mb-3 -mx-6 px-6 border-b border-white/5">
                            <div className="flex items-center gap-2">
                                <div className={`px-3 py-1 rounded-lg border ${getEnvironmentColor(env)}`}>
                                    <span className="font-bold uppercase text-xs">{env}</span>
                                </div>
                                <div className="text-xs text-slate-500">
                                    {Object.values(resourcesByEnvAndDomain[env] || {}).flat().length} resources
                                </div>
                            </div>
                        </div>

                        {/* Intelligent row packing - domains flow together, sharing rows naturally */}
                        <div className="flex flex-wrap gap-3">
                            {Object.entries(resourcesByEnvAndDomain[env] || {}).map(([domainType, domainResources]) => (
                                <div key={`${env}-${domainType}`} className="flex-shrink-0">
                                    {/* Domain header inline with cards */}
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-600/20 border border-violet-500/30 flex items-center justify-center">
                                            <span className="text-sm">{getCategoryIcon(domainType as DomainType)}</span>
                                        </div>
                                        <h4 className="text-xs font-semibold text-white">
                                            {getCategoryLabel(domainType as DomainType)} ({domainResources.length})
                                        </h4>
                                    </div>

                                    {/* Cards flow horizontally within domain group */}
                                    <div className="flex flex-wrap gap-2">
                                        {domainResources.map(renderResourceCard)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/5">
                    {Object.entries(resourcesByDomain).map(([domainType, domainResources]) => (
                        <button
                            key={domainType}
                            onClick={() => setActiveTab(domainType as DomainType)}
                            className="p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all"
                        >
                            <div className="text-xl mb-1">{getCategoryIcon(domainType as DomainType)}</div>
                            <div className="text-xs font-medium text-white">{getCategoryLabel(domainType as DomainType)}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">{domainResources.length} resources</div>
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
            <div className="space-y-6">
                {Object.entries(resourcesByEnv).sort(([a], [b]) => {
                    const order = { dev: 1, staging: 2, prod: 3 };
                    return ((order as any)[a] || 99) - ((order as any)[b] || 99);
                }).map(([env, envResources]) => (
                    <div key={env}>
                        <div className="flex items-center gap-2 mb-3">
                            <div className={`px-3 py-1 rounded-lg border ${getEnvironmentColor(env)}`}>
                                <span className="font-bold uppercase text-xs">{env}</span>
                            </div>
                            <div className="text-xs text-slate-500">
                                {envResources.length} {envResources.length === 1 ? 'resource' : 'resources'}
                            </div>
                        </div>

                        {/* Cards flow and wrap naturally */}
                        <div className="flex flex-wrap gap-2">
                            {envResources.map(renderResourceCard)}
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    const availableCategories = Object.keys(resourcesByDomain) as DomainType[];

    return (
        <div className="flex h-full relative">
            {/* Main content - full width when no selection */}
            <div className="flex flex-col flex-1">
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

            {/* Slide-in Inspector Panel - slides from right */}
            <div
                className={`absolute top-0 right-0 h-full w-96 backdrop-blur-xl bg-slate-900/95 border-l border-white/10 shadow-2xl transform transition-transform duration-300 ease-in-out z-20 ${selectedId ? 'translate-x-0' : 'translate-x-full'
                    }`}
                onMouseLeave={() => {
                    // Close panel when mouse leaves
                    setSelectedId(null);
                }}
            >
                {selectedId && (
                    <div className="h-full flex flex-col">
                        <div className="flex-shrink-0 backdrop-blur-xl bg-slate-900/95 border-b border-white/10 p-4 flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-white">Configure Resource</h3>
                            <button
                                onClick={() => setSelectedId(null)}
                                className="w-6 h-6 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6">
                            <ResourceInspector resourceId={selectedId} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ResourceListView;