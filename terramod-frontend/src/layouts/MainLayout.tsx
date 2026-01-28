import React, { useState } from 'react';
import { useUIStore } from '../store/uiStore';
import { useInfraStore } from '../store/infraStore';
import ResourceListView from '../features/resources/ResourceListView';
import ResourceInspector from '../features/inspector/ResourceInspector';
import ExportModal from '../features/export/ExportModal';
import StackSelector from '../features/stack/StackSelector';
import CostEstimateModal from '../features/cost/CostEstimateModal';
import { getStackTemplate } from '../config/stackTemplates';

const Header: React.FC<{
    onExport: () => void;
    onShowCosts: () => void;
    onNewStack: () => void;
}> = ({ onExport, onShowCosts, onNewStack }) => {
    const clearGraph = useInfraStore((state) => state.clearGraph);
    const domains = useInfraStore((state) => state.domains);
    const resources = useInfraStore((state) => state.resources);
    const connections = useInfraStore((state) => state.connections);
    const currentStackType = useInfraStore((state) => state.currentStackType);

    const handleNew = () => {
        if (domains.size > 0 || resources.size > 0) {
            if (confirm('Start a new stack? Current work will be lost unless saved.')) {
                onNewStack();
            }
        } else {
            onNewStack();
        }
    };

    const handleSave = () => {
        const projectData = {
            currentStackType,
            domains: Array.from(domains.values()),
            resources: Array.from(resources.values()),
            connections: Array.from(connections.values()),
            timestamp: new Date().toISOString()
        };

        localStorage.setItem('terramod_project', JSON.stringify(projectData));

        const btn = document.getElementById('save-btn');
        if (btn) {
            const originalText = btn.textContent;
            btn.textContent = '✓ Saved';
            setTimeout(() => {
                btn.textContent = originalText;
            }, 2000);
        }
    };

    const handleLoad = () => {
        const saved = localStorage.getItem('terramod_project');
        if (saved) {
            if (confirm('Load saved project? Current work will be replaced.')) {
                try {
                    const projectData = JSON.parse(saved);
                    clearGraph();

                    useInfraStore.getState().importGraph({
                        domains: projectData.domains,
                        resources: projectData.resources,
                        connections: projectData.connections
                    });

                    if (projectData.currentStackType) {
                        useInfraStore.getState().setCurrentStackType(projectData.currentStackType);
                    }

                    alert('✓ Project loaded');
                } catch (error) {
                    alert('✕ Failed to load project');
                }
            }
        } else {
            alert('No saved project found');
        }
    };

    const resourceCount = resources.size;
    const template = currentStackType ? getStackTemplate(currentStackType) : null;

    return (
        <header className="h-16 backdrop-blur-xl bg-slate-900/50 border-b border-white/5 flex items-center justify-between px-6">
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                        <span className="text-white text-lg font-bold">T</span>
                    </div>
                    <h1 className="text-xl font-semibold text-white">Terramod</h1>
                </div>

                {template && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                        <span className="text-lg">{template.icon}</span>
                        <span className="text-sm font-medium text-slate-300">{template.name}</span>
                    </div>
                )}

                <div className="text-sm text-slate-400">
                    {resourceCount} {resourceCount === 1 ? 'resource' : 'resources'}
                </div>
            </div>

            <div className="flex items-center gap-2">
                <button
                    onClick={handleNew}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-all duration-200"
                >
                    New Stack
                </button>

                <div className="w-px h-6 bg-white/10"></div>

                <button
                    id="save-btn"
                    onClick={handleSave}
                    disabled={resourceCount === 0}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    Save
                </button>

                <button
                    onClick={handleLoad}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-all duration-200"
                >
                    Load
                </button>

                <div className="w-px h-6 bg-white/10"></div>

                <button
                    onClick={onShowCosts}
                    disabled={resourceCount === 0}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-violet-500/10 text-violet-300 hover:bg-violet-500/20 border border-violet-500/20 hover:border-violet-500/30 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    Estimate Costs
                </button>

                <button
                    onClick={onExport}
                    disabled={resourceCount === 0}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700 shadow-lg shadow-violet-500/20 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    Export
                </button>
            </div>
        </header>
    );
};

const MainLayout: React.FC = () => {
    const selectedId = useUIStore((state) => state.selectedId);
    const [exportModalOpen, setExportModalOpen] = useState(false);
    const [costModalOpen, setCostModalOpen] = useState(false);
    const [showStackSelector, setShowStackSelector] = useState(false);

    const domains = useInfraStore((state) => state.domains);
    const resources = useInfraStore((state) => state.resources);
    const addDomain = useInfraStore((state) => state.addDomain);
    const addResource = useInfraStore((state) => state.addResource);
    const currentStackType = useInfraStore((state) => state.currentStackType);
    const setCurrentStackType = useInfraStore((state) => state.setCurrentStackType);

    const shouldShowStackSelector = resources.size === 0 && !currentStackType;

    const handleStackSelected = (stackId: string) => {
        const template = getStackTemplate(stackId);
        if (!template) {
            alert('Stack template not found');
            return;
        }

        setCurrentStackType(stackId);

        const createdDomains: Record<string, string> = {};
        template.requiredModules.forEach((moduleType) => {
            const moduleId = `module_${moduleType}_${Date.now()}`;
            addDomain({
                id: moduleId,
                name: moduleType.charAt(0).toUpperCase() + moduleType.slice(1),
                type: moduleType,
                resourceIds: [],
                inputs: [],
                outputs: [],
                position: { x: 0, y: 0 },
                width: 200,
                height: 150,
                scope: 'regional'
            });
            createdDomains[moduleType] = moduleId;
        });

        template.starterResources.forEach((starterGroup) => {
            const domainId = createdDomains[starterGroup.domain];
            if (!domainId) return;

            starterGroup.resources.forEach((resourceDef) => {
                const resourceId = `resource_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                const defaultArgs = getDefaultArgumentsForResource(resourceDef.type);

                addResource({
                    id: resourceId,
                    type: resourceDef.type,
                    domainId: domainId,
                    name: resourceDef.name,
                    arguments: defaultArgs,
                    deployment: {
                        strategy: getDefaultDeploymentStrategy(resourceDef.type),
                        cidrAuto: resourceDef.type === 'aws_subnet'
                    },
                    position: { x: 0, y: 0 },
                    validationState: { isValid: true, errors: [], warnings: [] }
                });
            });
        });

        setShowStackSelector(false);
    };

    const handleNewStack = () => {
        useInfraStore.getState().clearGraph();
        setCurrentStackType(null);
        setShowStackSelector(true);
    };

    if (shouldShowStackSelector || showStackSelector) {
        return <StackSelector onStackSelected={handleStackSelected} />;
    }

    return (
        <div className="flex flex-col h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
            <Header
                onExport={() => setExportModalOpen(true)}
                onShowCosts={() => setCostModalOpen(true)}
                onNewStack={handleNewStack}
            />

            <div className="flex flex-1 overflow-hidden">
                <ResourceListView />

                <div className="w-96 backdrop-blur-xl bg-slate-900/30 border-l border-white/5 flex flex-col">
                    {selectedId ? (
                        <div className="p-6 overflow-y-auto">
                            <ResourceInspector resourceId={selectedId} />
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full p-6">
                            <div className="text-center">
                                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-violet-500/10 to-purple-600/10 border border-violet-500/20 flex items-center justify-center">
                                    <svg className="w-8 h-8 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <p className="text-sm text-slate-400">Select a resource to configure</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <ExportModal isOpen={exportModalOpen} onClose={() => setExportModalOpen(false)} />

            {currentStackType && (
                <CostEstimateModal
                    isOpen={costModalOpen}
                    onClose={() => setCostModalOpen(false)}
                    stackType={currentStackType}
                />
            )}
        </div>
    );
};

function getDefaultArgumentsForResource(resourceType: string): Record<string, any> {
    const defaults: Record<string, any> = {};

    if (resourceType === 'aws_vpc') {
        defaults.cidr_block = '10.0.0.0/16';
        defaults.enable_dns_hostnames = true;
        defaults.enable_dns_support = true;
    } else if (resourceType === 'aws_subnet') {
        defaults.cidr_block = '10.0.1.0/24';
    } else if (resourceType === 'aws_instance') {
        defaults.ami = 'ami-0c55b159cbfafe1f0';
        defaults.instance_type = 't3.micro';
    } else if (resourceType === 'aws_s3_bucket') {
        defaults.bucket = `my-bucket-${Date.now()}`;
    } else if (resourceType === 'aws_security_group') {
        defaults.description = 'Security group created by Terramod';
    }

    return defaults;
}

function getDefaultDeploymentStrategy(resourceType: string): any {
    const strategies: Record<string, string> = {
        'aws_vpc': 'single',
        'aws_subnet': 'per-az',
        'aws_nat_gateway': 'per-az',
        'aws_instance': 'per-az',
        'aws_lb': 'multi-az',
        'aws_alb': 'multi-az',
        'aws_nlb': 'multi-az',
        'aws_rds_cluster': 'multi-az'
    };
    return strategies[resourceType] || 'single';
}

export default MainLayout;