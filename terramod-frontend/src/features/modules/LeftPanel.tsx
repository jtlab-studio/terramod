import React from 'react';
import { useUIStore } from '../../store/uiStore';
import ModuleGallery from './ModuleGallery';
import ResourcePalette from './ResourcePalette';

const LeftPanel: React.FC = () => {
    const activeModuleId = useUIStore((state) => state.activeModuleId);

    return (
        <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-800">
                <h2 className="text-lg font-bold text-gray-100">
                    {activeModuleId ? 'Resources' : 'Modules'}
                </h2>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
                {activeModuleId ? <ResourcePalette /> : <ModuleGallery />}
            </div>
        </div>
    );
};

export default LeftPanel;