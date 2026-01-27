import React from 'react';
import { useUIStore } from '../store/uiStore';
import Canvas from '../features/canvas/Canvas';
import InspectorPanel from '../features/inspector/InspectorPanel';

const Header: React.FC = () => {
    return (
        <header className="h-14 bg-gray-800 text-white flex items-center justify-between px-4">
            <div className="flex items-center gap-4">
                <h1 className="text-xl font-bold">Terramod</h1>
            </div>
            <div className="flex items-center gap-2">
                <button className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded">
                    New
                </button>
                <button className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded">
                    Save
                </button>
                <button className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded">
                    Export
                </button>
                <button className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded">
                    Import
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
                    <div className="text-sm text-gray-600">Drag services onto canvas</div>
                ) : (
                    <div className="text-sm text-gray-600">No domains yet</div>
                )}
            </div>
        </div>
    );
};

const MainLayout: React.FC = () => {
    const sidebarOpen = useUIStore((state) => state.sidebarOpen);
    const inspectorOpen = useUIStore((state) => state.inspectorOpen);

    return (
        <div className="flex flex-col h-screen">
            <Header />
            <div className="flex flex-1 overflow-hidden">
                {sidebarOpen && <Sidebar />}
                <div className="flex-1 bg-white">
                    <Canvas />
                </div>
                {inspectorOpen && <InspectorPanel />}
            </div>
        </div>
    );
};

export default MainLayout;