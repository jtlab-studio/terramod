import React, { useState } from 'react';
import { useUIStore } from '../store/uiStore';
import { useInfraStore } from '../store/infraStore';
import Canvas from '../features/canvas/Canvas';
import InspectorPanel from '../features/inspector/InspectorPanel';
import ServicePalette from '../features/sidebar/ServicePalette';
import DomainList from '../features/sidebar/DomainList';
import ExportModal from '../features/export/ExportModal';

const Header: React.FC<{ onExport: () => void }> = ({ onExport }) => {
    const clearGraph = useInfraStore((state) => state.clearGraph);
    const domains = useInfraStore((state) => state.domains);
    const resources = useInfraStore((state) => state.resources);
    const connections = useInfraStore((state) => state.connections);

    const handleNew = () => {
        if (domains.size > 0 || resources.size > 0) {
            if (confirm('Clear current project? This cannot be undone.')) {
                clearGraph();
            }
        }
    };

    const handleClearCanvas = () => {
        if (confirm('🗑️ Clear entire canvas?\n\nThis will:\n• Delete all resources\n• Delete all connections\n• Delete all domains\n• Clear localStorage\n\nThis cannot be undone!')) {
            // Clear store
            clearGraph();

            // Clear localStorage
            localStorage.clear();

            // Reload page to ensure clean state
            window.location.reload();
        }
    };

    const handleSave = () => {
        const projectData = {
            domains: Array.from(domains.values()),
            resources: Array.from(resources.values()),
            connections: Array.from(connections.values()),
            timestamp: new Date().toISOString()
        };

        localStorage.setItem('terramod_project', JSON.stringify(projectData));

        // Visual feedback
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

                    alert('✅ Project loaded');
                } catch (error) {
                    alert('❌ Failed to load project');
                }
            }
        } else {
            alert('No saved project found');
        }
    };

    const handleImport = () => {
        alert('Import from Terraform coming in Phase 2');
    };

    const resourceCount = resources.size;
    const domainCount = domains.size;
    const connectionCount = connections.size;

    return (
        <header className="h-14 bg-gray-900 border-b border-gray-800 text-white flex items-center justify-between px-4">
            <div className="flex items-center gap-4">
                <h1 className="text-xl font-bold text-gray-100">Terramod</h1>
                <div className="text-xs text-gray-400">
                    {domainCount} {domainCount === 1 ? 'domain' : 'domains'} •
                    {' '}{resourceCount} {resourceCount === 1 ? 'resource' : 'resources'} •
                    {' '}{connectionCount} {connectionCount === 1 ? 'connection' : 'connections'}
                </div>
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={handleNew}
                    className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded transition-colors text-sm border border-gray-700"
                >
                    🆕 New
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
                <button
                    onClick={onExport}
                    className="px-4 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-100 rounded transition-colors font-medium text-sm border border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={resourceCount === 0}
                >
                    📦 Export
                </button>
                <button
                    onClick={handleImport}
                    className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded transition-colors text-sm border border-gray-700"
                >
                    📥 Import
                </button>

                {/* Separator */}
                <div className="h-6 w-px bg-gray-700 mx-1"></div>

                {/* Clear Canvas Button */}
                <button
                    onClick={handleClearCanvas}
                    className="px-3 py-1.5 bg-red-900 hover:bg-red-800 text-red-200 rounded transition-colors text-sm border border-red-700"
                    title="Clear entire canvas and localStorage"
                >
                    🗑️ Clear All
                </button>
            </div>
        </header>
    );
};

const Sidebar: React.FC = () => {
    const [activeTab, setActiveTab] = React.useState<'services' | 'domains'>('services');

    return (
        <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
            <div className="flex border-b border-gray-800">
                <button
                    onClick={() => setActiveTab('services')}
                    className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'services'
                        ? 'bg-gray-800 border-b-2 border-gray-600 text-gray-200'
                        : 'text-gray-400 hover:text-gray-300 hover:bg-gray-850'
                        }`}
                >
                    Services
                </button>
                <button
                    onClick={() => setActiveTab('domains')}
                    className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'domains'
                        ? 'bg-gray-800 border-b-2 border-gray-600 text-gray-200'
                        : 'text-gray-400 hover:text-gray-300 hover:bg-gray-850'
                        }`}
                >
                    Domains
                </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
                {activeTab === 'services' ? (
                    <ServicePalette />
                ) : (
                    <DomainList />
                )}
            </div>
        </div>
    );
};

const MainLayout: React.FC = () => {
    const sidebarOpen = useUIStore((state) => state.sidebarOpen);
    const inspectorOpen = useUIStore((state) => state.inspectorOpen);
    const [exportModalOpen, setExportModalOpen] = useState(false);

    return (
        <div className="flex flex-col h-screen bg-gray-900">
            <Header onExport={() => setExportModalOpen(true)} />
            <div className="flex flex-1 overflow-hidden">
                {sidebarOpen && <Sidebar />}
                <div className="flex-1 bg-gray-900 relative">
                    <Canvas />
                </div>
                {inspectorOpen && <InspectorPanel />}
            </div>

            {/* Export Modal */}
            <ExportModal
                isOpen={exportModalOpen}
                onClose={() => setExportModalOpen(false)}
            />
        </div>
    );
};

export default MainLayout;