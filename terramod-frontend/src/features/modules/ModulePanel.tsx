import React, { useState } from 'react';
import { useInfraStore } from '../../store/infraStore';
import { useUIStore } from '../../store/uiStore';
import { DomainType } from '../../types/domain';
import { ModuleScope } from '../../types/deployment';

const ModulePanel: React.FC = () => {
    const domains = useInfraStore((state) => Array.from(state.domains.values()));
    const resources = useInfraStore((state) => state.resources);
    const addDomain = useInfraStore((state) => state.addDomain);
    const selectedId = useUIStore((state) => state.selectedId);
    const setSelectedId = useUIStore((state) => state.setSelectedId);
    const activeModuleId = useUIStore((state) => state.activeModuleId);
    const setActiveModuleId = useUIStore((state) => state.setActiveModuleId);

    const [showNewModuleDialog, setShowNewModuleDialog] = useState(false);
    const [newModuleName, setNewModuleName] = useState('');
    const [newModuleType, setNewModuleType] = useState<DomainType>('networking');
    const [newModuleScope, setNewModuleScope] = useState<ModuleScope>('regional');

    const handleCreateModule = () => {
        if (!newModuleName.trim()) {
            alert('Please enter a module name');
            return;
        }

        const moduleId = `module_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        addDomain({
            id: moduleId,
            name: newModuleName,
            type: newModuleType,
            resourceIds: [],
            inputs: [],
            outputs: [],
            position: { x: 0, y: 0 },
            width: 0,
            height: 0,
            scope: newModuleScope
        });

        setActiveModuleId(moduleId);
        setShowNewModuleDialog(false);
        setNewModuleName('');
    };

    const getModuleIcon = (type: DomainType): string => {
        const icons: Record<DomainType, string> = {
            networking: '🌐',
            compute: '💻',
            serverless: '⚡',
            data: '🗄️',
            storage: '📦',
            messaging: '📨',
            identity: '👤',
            observability: '📊',
            edge: '🔀'
        };
        return icons[type] || '📦';
    };

    const getScopeColor = (scope: ModuleScope): string => {
        const colors: Record<ModuleScope, string> = {
            global: '#EF4444',
            regional: '#3B82F6',
            'multi-az': '#10B981'
        };
        return colors[scope] || '#6B7280';
    };

    return (
        <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-800">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-bold text-gray-100">Modules</h2>
                    <button
                        onClick={() => setShowNewModuleDialog(true)}
                        className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded text-sm transition-colors"
                        title="Create new module"
                    >
                        + New
                    </button>
                </div>
                <div className="text-xs text-gray-400">
                    {domains.length} module{domains.length !== 1 ? 's' : ''}
                </div>
            </div>

            {/* Module List */}
            <div className="flex-1 overflow-y-auto p-2">
                {domains.length === 0 ? (
                    <div className="text-center py-8 px-4">
                        <p className="text-sm text-gray-400 mb-2">No modules yet</p>
                        <p className="text-xs text-gray-500">Click "+ New" to create your first module</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {domains.map((domain) => {
                            const resourceCount = domain.resourceIds.length;
                            const isActive = activeModuleId === domain.id;
                            const isSelected = selectedId === domain.id;

                            return (
                                <div
                                    key={domain.id}
                                    onClick={() => {
                                        setActiveModuleId(domain.id);
                                        setSelectedId(null); // Clear resource selection
                                    }}
                                    onDoubleClick={() => setSelectedId(domain.id)}
                                    className={`p-3 rounded cursor-pointer transition-all ${isActive
                                            ? 'bg-gray-700 border-2 border-gray-600 shadow-sm'
                                            : isSelected
                                                ? 'bg-gray-700 border-2 border-blue-500'
                                                : 'bg-gray-800 border border-gray-700 hover:border-gray-600 hover:bg-gray-750'
                                        }`}
                                >
                                    {/* Module Header */}
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <span className="text-xl flex-shrink-0">{getModuleIcon(domain.type)}</span>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-sm text-gray-200 truncate">
                                                    {domain.name}
                                                </div>
                                                <div className="text-xs text-gray-400 capitalize">{domain.type}</div>
                                            </div>
                                        </div>
                                        <div className="text-xs text-gray-500 ml-2">{resourceCount}</div>
                                    </div>

                                    {/* Module Scope Badge */}
                                    {domain.scope && (
                                        <div className="flex items-center gap-1">
                                            <span
                                                className="w-2 h-2 rounded-full"
                                                style={{ backgroundColor: getScopeColor(domain.scope) }}
                                            />
                                            <span className="text-xs text-gray-400 capitalize">{domain.scope}</span>
                                        </div>
                                    )}

                                    {isActive && (
                                        <div className="mt-2 text-xs text-blue-400">
                                            ← Active
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* New Module Dialog */}
            {showNewModuleDialog && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 w-96">
                        <h3 className="text-lg font-bold text-gray-100 mb-4">Create New Module</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                    Module Name
                                </label>
                                <input
                                    type="text"
                                    value={newModuleName}
                                    onChange={(e) => setNewModuleName(e.target.value)}
                                    placeholder="e.g., networking, compute"
                                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 text-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-gray-600"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                    Domain Type
                                </label>
                                <select
                                    value={newModuleType}
                                    onChange={(e) => setNewModuleType(e.target.value as DomainType)}
                                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 text-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-gray-600"
                                >
                                    <option value="networking">Networking</option>
                                    <option value="compute">Compute</option>
                                    <option value="serverless">Serverless</option>
                                    <option value="data">Data</option>
                                    <option value="storage">Storage</option>
                                    <option value="messaging">Messaging</option>
                                    <option value="identity">Identity</option>
                                    <option value="observability">Observability</option>
                                    <option value="edge">Edge</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                    Module Scope
                                </label>
                                <select
                                    value={newModuleScope}
                                    onChange={(e) => setNewModuleScope(e.target.value as ModuleScope)}
                                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 text-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-gray-600"
                                >
                                    <option value="global">Global (IAM, Route53)</option>
                                    <option value="regional">Regional (VPC, S3)</option>
                                    <option value="multi-az">Multi-AZ (Compute, RDS)</option>
                                </select>
                                <p className="text-xs text-gray-500 mt-1">
                                    {newModuleScope === 'global' && 'Resources deployed once globally'}
                                    {newModuleScope === 'regional' && 'Resources deployed once per region'}
                                    {newModuleScope === 'multi-az' && 'Resources deployed across availability zones'}
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-2 mt-6">
                            <button
                                onClick={handleCreateModule}
                                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-100 rounded transition-colors font-medium"
                            >
                                Create Module
                            </button>
                            <button
                                onClick={() => {
                                    setShowNewModuleDialog(false);
                                    setNewModuleName('');
                                }}
                                className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-gray-300 rounded transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Instructions */}
            <div className="p-3 border-t border-gray-800 bg-gray-850">
                <div className="text-xs text-gray-400 space-y-1">
                    <p><strong className="text-gray-300">Single-click:</strong> Open module</p>
                    <p><strong className="text-gray-300">Double-click:</strong> Configure module</p>
                </div>
            </div>
        </div>
    );
};

export default ModulePanel;