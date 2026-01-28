import React, { useState, useEffect } from 'react';
import { useUIStore } from '../store/uiStore';
import { useInfraStore } from '../store/infraStore';
import ResourceListView from '../features/resources/ResourceListView';
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
                    💰 Costs
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
    const [forceShowMain, setForceShowMain] = useState(false);

    const resources = useInfraStore((state) => state.resources);
    const currentStackType = useInfraStore((state) => state.currentStackType);
    const setCurrentStackType = useInfraStore((state) => state.setCurrentStackType);

    // Auto-detect when resources are created (wizard completed)
    useEffect(() => {
        if (resources.size > 0) {
            setForceShowMain(true);
        }
    }, [resources.size]);

    // Show stack selector only if: no resources AND not forced to show main
    const shouldShowStackSelector = resources.size === 0 && !forceShowMain;

    const handleStackSelected = (stackId: string) => {
        // This is called when a stack template is selected
        // For 3-tier, the wizard will create resources
        // For others, we'd need to implement their logic
        setCurrentStackType(stackId);
    };

    const handleNewStack = () => {
        useInfraStore.getState().clearGraph();
        setCurrentStackType(null);
        setForceShowMain(false);
    };

    if (shouldShowStackSelector) {
        return <StackSelector onStackSelected={handleStackSelected} />;
    }

    return (
        <div className="flex flex-col h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
            <Header
                onExport={() => setExportModalOpen(true)}
                onShowCosts={() => setCostModalOpen(true)}
                onNewStack={handleNewStack}
            />

            {/* Full-width content - inspector is now inside ResourceListView */}
            <div className="flex-1 overflow-hidden">
                <ResourceListView />
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

export default MainLayout;