import React, { useState } from 'react';
import { useUIStore } from '../store/uiStore';
import { useInfraStore } from '../store/infraStore';
import ResourceListView from '../features/resources/ResourceListView';
import DeploymentConfigBar from '../features/modules/DeploymentConfigBar';
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
            btn.textContent = '✅ Saved!';
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

                    alert('✅ Project loaded');
                } catch (error) {
                    alert('❌ Failed to load project');
                }
            }
        } else {
            alert('No saved project found');
        }
    };

    const resourceCount = resources.size;
    const domainCount = domains.size;

    return (
        <header className="h-14 bg-gray-900 border-b border-gray-800 text-white flex items-center justify-between px-4">
            <div className="flex items-center gap-4">
                <h1 className="text-xl font-bold text-gray-100">Terramod</h1>
                {currentStackType && (
                    <div className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded">
                        {currentStackType.replace(/-/g, ' ').toUpperCase()}
                    </div>
                )}
                <div className="text-xs text-gray-400">
                    {resourceCount} {resourceCount === 1 ? 'resource' : 'resources'}
                </div>
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={handleNew}
                    className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded transition-colors text-sm border border-gray-700"
                >
                    🆕 New Stack
                </button>
                <button
                    id="save-btn"
                    onClick={handleSave}
                    className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded transition-colors text-sm border border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={resourceCount === 0}
                >
                    💾 Save
                </button>
                <button
                    onClick={handleLoad}
                    className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded transition-colors text-sm border border-gray-700"
                >
                    📂 Load
                </button>

                <div className="h-6 w-px bg-gray-700 mx-1"></div>

                {/* Cost Estimate Button */}
                <button
                    onClick={onShowCosts}
                    className="px-4 py-1.5 bg-blue-700 hover:bg-blue-600 text-blue-100 rounded transition-colors font-medium text-sm border border-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={resourceCount === 0}
                    title="See cost estimates for all scenarios"
                >
                    💰 Estimate Costs
                </button>

                <button
                    onClick={onExport}
                    className="px-4 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-100 rounded transition-colors font-medium text-sm border border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={resourceCount === 0}
                >
                    📦 Export Terraform
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
    const deploymentConfig = useInfraStore((state) => state.deploymentConfig);

    // Show stack selector if no resources exist and no stack type selected
    const shouldShowStackSelector = resources.size === 0 && !currentStackType;

    const handleStackSelected = (stackId: string) => {
        const template = getStackTemplate(stackId);
        if (!template) {
            alert('Stack template not found');
            return;
        }

        // Set current stack type
        setCurrentStackType(stackId);

        // Create all required modules (domains)
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

        // Add starter resources
        template.starterResources.forEach((starterGroup) => {
            const domainId = createdDomains[starterGroup.domain];
            if (!domainId) return;

            starterGroup.resources.forEach((resourceDef) => {
                const resourceId = `resource_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

                // Get default arguments based on resource type
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

        // Close stack selector and show main interface
        setShowStackSelector(false);
    };

    const handleNewStack = () => {
        useInfraStore.getState().clearGraph();
        setCurrentStackType(null);
        setShowStackSelector(true);
    };

    // Stack Selector is showing
    if (shouldShowStackSelector || showStackSelector) {
        return (
            <StackSelector
                onStackSelected={handleStackSelected}
            />
        );
    }

    // Main interface - Golden path: Resource list + Inspector
    return (
        <div className="flex flex-col h-screen bg-gray-900">
            <Header
                onExport={() => setExportModalOpen(true)}
                onShowCosts={() => setCostModalOpen(true)}
                onNewStack={handleNewStack}
            />

            <div className="flex flex-1 overflow-hidden">
                {/* Center: Resource List View */}
                <ResourceListView />

                {/* Right: Resource Inspector */}
                <div className="w-80 bg-gray-900 border-l border-gray-800 flex flex-col">
                    {selectedId ? (
                        <div className="p-4 overflow-y-auto">
                            <ResourceInspector resourceId={selectedId} />
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full p-4">
                            <div className="text-center text-gray-500">
                                <p className="text-sm">Select a resource to configure</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom: Deployment Config Bar */}
            <DeploymentConfigBar />

            {/* Export Modal */}
            <ExportModal
                isOpen={exportModalOpen}
                onClose={() => setExportModalOpen(false)}
            />

            {/* Cost Estimate Modal */}
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

// Helper functions
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