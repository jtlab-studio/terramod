import React from 'react';
import { useInfraStore } from '../../store/infraStore';
import { useUIStore } from '../../store/uiStore';
import { DomainType } from '../../types/domain';

interface ModuleTemplate {
    type: DomainType;
    icon: string;
    name: string;
    description: string;
}

const MODULE_TEMPLATES: ModuleTemplate[] = [
    { type: 'networking', icon: '🌐', name: 'Networking', description: 'VPC, Subnets, Gateways, Security Groups' },
    { type: 'compute', icon: '💻', name: 'Compute', description: 'EC2, Auto Scaling, ECS, EKS' },
    { type: 'serverless', icon: '⚡', name: 'Serverless', description: 'Lambda, API Gateway' },
    { type: 'data', icon: '🗄️', name: 'Data', description: 'RDS, DynamoDB' },
    { type: 'storage', icon: '📦', name: 'Storage', description: 'S3 Buckets' },
    { type: 'messaging', icon: '📨', name: 'Messaging', description: 'SQS, SNS' },
    { type: 'identity', icon: '👤', name: 'Identity', description: 'IAM Roles, Policies' },
    { type: 'observability', icon: '📊', name: 'Observability', description: 'CloudWatch Logs, Alarms' },
    { type: 'edge', icon: '🔀', name: 'Edge', description: 'ALB, NLB' },
];

const ModuleGallery: React.FC = () => {
    const domains = useInfraStore((state) => Array.from(state.domains.values()));
    const addDomain = useInfraStore((state) => state.addDomain);
    const setActiveModuleId = useUIStore((state) => state.setActiveModuleId);
    const setSelectedId = useUIStore((state) => state.setSelectedId);

    const handleAddModule = (template: ModuleTemplate) => {
        // Check if module already exists
        const existing = domains.find(d => d.type === template.type);
        if (existing) {
            // Just select it
            setActiveModuleId(existing.id);
            setSelectedId(null);
            return;
        }

        // Create new module
        const moduleId = `module_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        addDomain({
            id: moduleId,
            name: template.name,
            type: template.type,
            resourceIds: [],
            inputs: [],
            outputs: [],
            position: { x: 0, y: 0 },
            width: 0,
            height: 0,
            scope: 'regional' // Default scope
        });

        setActiveModuleId(moduleId);
        setSelectedId(null);
    };

    const getModuleStatus = (type: DomainType) => {
        const module = domains.find(d => d.type === type);
        if (!module) return { added: false, resourceCount: 0 };
        return { added: true, resourceCount: module.resourceIds.length, moduleId: module.id };
    };

    const getModuleIcon = (type: DomainType): string => {
        const template = MODULE_TEMPLATES.find(t => t.type === type);
        return template?.icon || '📦';
    };

    return (
        <div className="space-y-4">
            {/* Added Modules Stack */}
            {domains.length > 0 && (
                <div>
                    <div className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Your Modules</div>
                    <div className="space-y-2">
                        {domains.map((domain) => (
                            <div
                                key={domain.id}
                                onClick={() => {
                                    setActiveModuleId(domain.id);
                                    setSelectedId(null);
                                }}
                                className="p-2 bg-gray-800 border border-gray-700 rounded cursor-pointer hover:border-gray-600 hover:bg-gray-750 transition-all"
                            >
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">{getModuleIcon(domain.type)}</span>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-sm text-gray-200 truncate">{domain.name}</div>
                                        <div className="text-xs text-gray-500">{domain.resourceIds.length} resources</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Available Modules Gallery */}
            <div>
                <div className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Available Modules</div>
                <div className="space-y-2">
                    {MODULE_TEMPLATES.map((template) => {
                        const status = getModuleStatus(template.type);

                        return (
                            <div
                                key={template.type}
                                className={`p-3 rounded-lg border transition-all cursor-pointer ${status.added
                                        ? 'bg-gray-800 border-gray-600 hover:border-gray-500'
                                        : 'bg-gray-850 border-gray-700 hover:border-gray-600'
                                    }`}
                                onClick={() => handleAddModule(template)}
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">{template.icon}</span>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-gray-100 text-sm">{template.name}</h3>
                                    </div>
                                    {status.added ? (
                                        <span className="text-green-500 text-lg">✓</span>
                                    ) : (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleAddModule(template);
                                            }}
                                            className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded transition-colors"
                                        >
                                            +
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default ModuleGallery;