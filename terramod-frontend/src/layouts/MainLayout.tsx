import React, { useState } from 'react';
import { useUIStore } from '../store/uiStore';
import { useInfraStore } from '../store/infraStore';
import LeftPanel from '../features/modules/LeftPanel';
import ModuleContent from '../features/modules/ModuleContent';
import DeploymentConfigBar from '../features/modules/DeploymentConfigBar';
import ResourceInspector from '../features/inspector/ResourceInspector';
import ExportModal from '../features/export/ExportModal';
import StackSelector from '../features/stack/StackSelector';
import StackWizard from '../features/stack/StackWizard';
import CostEstimateModal from '../features/cost/CostEstimateModal';

const Header: React.FC<{
    onExport: () => void;
    onShowCosts: () => void;
    onNewStack: () => void;
}> = ({ onExport, onShowCosts, onNewStack }) => {
    const clearGraph = useInfraStore((state) => state.clearGraph);
    const domains = useInfraStore((state) => state.domains);
    const resources = useInfraStore((state) => state.resources);
    const connections = useInfraStore((state) => state.connections);
    const setActiveModuleId = useUIStore((state) => state.setActiveModuleId);
    const setSelectedId = useUIStore((state) => state.setSelectedId);

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
                    {domainCount} {domainCount === 1 ? 'module' : 'modules'} •
                    {' '}{resourceCount} {resourceCount === 1 ? 'resource' : 'resources'}
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

                {/* Cost Estimate Button - Prominent */}
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
    const [selectedStackId, setSelectedStackId] = useState<string | null>(null);

    const domains = useInfraStore((state) => state.domains);
    const currentStackType = useInfraStore((state) => state.currentStackType);
    const setCurrentStackType = useInfraStore((state) => state.setCurrentStackType);

    // Show stack selector if no domains exist and no stack type selected
    const shouldShowStackSelector = domains.size === 0 && !currentStackType && !selectedStackId;

    const handleStackSelected = (stackId: string) => {
        setSelectedStackId(stackId);
        setCurrentStackType(stackId);
    };

    const handleStackWizardComplete = () => {
        setSelectedStackId(null);
        // Stack is now created, show main interface
    };

    const handleStackWizardCancel = () => {
        setSelectedStackId(null);
        setCurrentStackType(null);
        setShowStackSelector(false);
    };

    const handleNewStack = () => {
        useInfraStore.getState().clearGraph();
        setCurrentStackType(null);
        setShowStackSelector(true);
    };

    // Stack Wizard is showing
    if (selectedStackId) {
        return (
            <StackWizard
                stackId={selectedStackId}
                onComplete={handleStackWizardComplete}
                onCancel={handleStackWizardCancel}
            />
        );
    }

    // Stack Selector is showing
    if (shouldShowStackSelector || showStackSelector) {
        return (
            <StackSelector
                onStackSelected={handleStackSelected}
            />
        );
    }

    // Main interface
    return (
        <div className="flex flex-col h-screen bg-gray-900">
            <Header
                onExport={() => setExportModalOpen(true)}
                onShowCosts={() => setCostModalOpen(true)}
                onNewStack={handleNewStack}
            />

            <div className="flex flex-1 overflow-hidden">
                {/* Left: Module Gallery / Resource Palette */}
                <LeftPanel />

                {/* Center: Module Content */}
                <ModuleContent />

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

export default MainLayout;