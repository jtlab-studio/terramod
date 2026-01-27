import React, { useState } from 'react';
import { useUIStore } from '../store/uiStore';
import { useInfraStore } from '../store/infraStore';
import Canvas from '../features/canvas/Canvas';
import InspectorPanel from '../features/inspector/InspectorPanel';
import ServicePalette from '../features/sidebar/ServicePalette';
import DomainList from '../features/sidebar/DomainList';
import ExportModal from '../features/export/ExportModal';
import ValidationPanel from '../features/validation/ValidationPanel';
import { useConnectionMode } from '../features/canvas/ConnectionTool';

const Header: React.FC<{ onExport: () => void }> = ({ onExport }) => {
    const clearGraph = useInfraStore((state) => state.clearGraph);
    const domains = useInfraStore((state) => state.domains);
    const resources = useInfraStore((state) => state.resources);
    const connections = useInfraStore((state) => state.connections);
    const { isConnecting, startConnecting, stopConnecting } = useConnectionMode();

    const handleNew = () => {
        if (domains.size > 0 || resources.size > 0) {
            if (confirm('Clear current project? This cannot be undone.')) {
                clearGraph();
            }
        }
    };

    const handleSave = () => {
        // Save to localStorage
        const projectData = {
            domains: Array.from(domains.values()),
            resources: Array.from(resources.values()),
            connections: Array.from(connections.values()),
            timestamp: new Date().toISOString()
        };
        
        localStorage.setItem('terramod_project', JSON.stringify(projectData));
        alert('✅ Project saved to browser storage');
    };

    const handleLoad = () => {
        const saved = localStorage.getItem('terramod_project');
        if (saved) {
            if (confirm('Load saved project? Current work will be replaced.')) {
                try {
                    const projectData = JSON.parse(saved);
                    clearGraph();
                    
                    // Import saved data
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

    const toggleConnectionMode = () => {
        if (isConnecting) {
            stopConnecting();
        } else {
            startConnecting();
        }
    };

    const resourceCount = resources.size;
    const domainCount = domains.size;
    const connectionCount = connections.size;

    return (
        <header className="h-14 bg-gray-800 text-white flex items-center justify-between px-4">
            <div className="flex items-center gap-4">
                <h1 className="text-xl font-bold">Terramod</h1>
                <div className="text-xs text-gray-300">
                    {domainCount} {domainCount === 1 ? 'domain' : 'domains'} • 
                    {' '}{resourceCount} {resourceCount === 1 ? 'resource' : 'resources'} •
                    {' '}{connectionCount} {connectionCount === 1 ? 'connection' : 'connections'}
                </div>
            </div>
            <div className="flex items-center gap-2">
                <button 
                    onClick={handleNew}
                    className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors text-sm"
                >
                    🆕 New
                </button>
                <button 
                    onClick={handleSave}
                    className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors text-sm"
                    disabled={resourceCount === 0}
                >
                    💾 Save
                </button>
                <button 
                    onClick={handleLoad}
                    className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors text-sm"
                >
                    📂 Load
                </button>
                <button 
                    onClick={toggleConnectionMode}
                    className={`px-3 py-1.5 rounded transition-colors text-sm font-medium ${
                        isConnecting 
                            ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                            : 'bg-gray-600 hover:bg-gray-700 text-white'
                    }`}
                    disabled={resourceCount === 0}
                >
                    {isConnecting ? '🔗 Connecting...' : '🔗 Connect'}
                </button>
                <button 
                    onClick={onExport}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors font-medium text-sm"
                    disabled={resourceCount === 0}
                >
                    📦 Export
                </button>
                <button 
                    onClick={handleImport}
                    className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors text-sm"
                >
                    📥 Import
                </button>
            </div>
        </header>
    );
};

const Sidebar: React.FC = () => {
    const [activeTab, setActiveTab] = React.useState<'services' | 'domains'>('services');

    return (
        <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col">
            <div className="flex border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('services')}
                    className={`flex-1 px-4 py-2 text-sm font-medium ${activeTab === 'services'
                            ? 'bg-white border-b-2 border-blue-600 text-blue-600'
                            : 'text-gray-600 hover:text-gray-800'
                        }`}
                >
                    Services
                </button>
                <button
                    onClick={() => setActiveTab('domains')}
                    className={`flex-1 px-4 py-2 text-sm font-medium ${activeTab === 'domains'
                            ? 'bg-white border-b-2 border-blue-600 text-blue-600'
                            : 'text-gray-600 hover:text-gray-800'
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
        <div className="flex flex-col h-screen">
            <Header onExport={() => setExportModalOpen(true)} />
            <div className="flex flex-1 overflow-hidden">
                {sidebarOpen && <Sidebar />}
                <div className="flex-1 bg-white relative">
                    <Canvas />
                    {/* Floating validation panel */}
                    <ValidationPanel />
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
