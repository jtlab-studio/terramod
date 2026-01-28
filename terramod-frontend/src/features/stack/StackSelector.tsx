import React, { useState } from 'react';
import { useInfraStore } from '../../store/infraStore';
import { useUIStore } from '../../store/uiStore';
import { STACK_TEMPLATES, StackTemplate } from '../../config/stackTemplates';
import Button from '../../components/ui/Button';

interface StackSelectorProps {
    onStackSelected: (stackId: string) => void;
}

const StackSelector: React.FC<StackSelectorProps> = ({ onStackSelected }) => {
    const [selectedStack, setSelectedStack] = useState<string | null>(null);
    const clearGraph = useInfraStore((state) => state.clearGraph);

    const getCostBadgeColor = (costProfile: string) => {
        switch (costProfile) {
            case 'low':
                return 'bg-green-100 text-green-800 border-green-300';
            case 'medium':
                return 'bg-yellow-100 text-yellow-800 border-yellow-300';
            case 'high':
                return 'bg-orange-100 text-orange-800 border-orange-300';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-300';
        }
    };

    const handleStartWithStack = (stackId: string) => {
        // Clear existing infrastructure
        clearGraph();

        // Notify parent
        onStackSelected(stackId);
    };

    const renderStackCard = (template: StackTemplate) => {
        const isSelected = selectedStack === template.id;

        return (
            <div
                key={template.id}
                onClick={() => setSelectedStack(template.id)}
                className={`
                    p-6 rounded-lg border-2 cursor-pointer transition-all
                    ${isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 bg-white hover:border-gray-400 hover:shadow-md'
                    }
                `}
            >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <span className="text-4xl">{template.icon}</span>
                        <div>
                            <h3 className="text-lg font-bold text-gray-800">{template.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`text-xs px-2 py-0.5 rounded border ${getCostBadgeColor(template.costProfile)}`}>
                                    {template.costProfile.toUpperCase()} COST
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Description */}
                <p className="text-sm text-gray-600 mb-3">
                    {template.description}
                </p>

                {/* Cost Estimate */}
                <div className="bg-gray-50 border border-gray-200 rounded p-3 mb-3">
                    <div className="text-xs text-gray-500 mb-1">Estimated Monthly Cost</div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-gray-800">
                            ${template.estimatedIdleCost}
                        </span>
                        <span className="text-sm text-gray-500">idle</span>
                        <span className="text-gray-400">→</span>
                        <span className="text-xl font-semibold text-gray-800">
                            ${template.estimated100UsersCost}
                        </span>
                        <span className="text-sm text-gray-500">@ 100 users</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                        See detailed breakdown after selection
                    </div>
                </div>

                {/* Modules */}
                <div className="mb-3">
                    <div className="text-xs text-gray-500 mb-1">Included Modules:</div>
                    <div className="flex flex-wrap gap-1">
                        {template.requiredModules.slice(0, 5).map((module) => (
                            <span
                                key={module}
                                className="text-xs px-2 py-0.5 bg-gray-200 text-gray-700 rounded capitalize"
                            >
                                {module}
                            </span>
                        ))}
                        {template.requiredModules.length > 5 && (
                            <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-700 rounded">
                                +{template.requiredModules.length - 5} more
                            </span>
                        )}
                    </div>
                </div>

                {/* Action Button */}
                {isSelected && (
                    <Button
                        variant="primary"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleStartWithStack(template.id);
                        }}
                        className="w-full"
                    >
                        Start with {template.name}
                    </Button>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            {/* Header */}
            <div className="max-w-6xl mx-auto mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    Choose Your Stack Template
                </h1>
                <p className="text-gray-600">
                    Start with a production-ready template. All stacks include security best practices,
                    multi-environment support, and cost optimization by default.
                </p>
            </div>

            {/* Stack Grid */}
            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
                {STACK_TEMPLATES.map(renderStackCard)}
            </div>

            {/* Info Footer */}
            <div className="max-w-6xl mx-auto mt-8 p-4 bg-blue-50 border border-blue-200 rounded">
                <div className="flex items-start gap-3">
                    <span className="text-2xl">💡</span>
                    <div>
                        <h4 className="font-semibold text-blue-900 mb-1">Cost-Transparent by Default</h4>
                        <p className="text-sm text-blue-700">
                            All cost estimates assume <strong>no AWS Free Tier</strong> and <strong>on-demand pricing</strong>.
                            Actual costs may be lower if you're eligible for Free Tier (first 12 months) or use Reserved Instances.
                            After selecting a stack, you'll see detailed cost breakdowns for idle, 10 users, 100 users, and 1000 users scenarios.
                        </p>
                    </div>
                </div>
            </div>

            {/* Empty State Action */}
            <div className="max-w-6xl mx-auto mt-8 text-center">
                <p className="text-sm text-gray-500">
                    Need a custom configuration?{' '}
                    <button className="text-blue-600 hover:text-blue-700 underline">
                        Start from scratch
                    </button>
                </p>
            </div>
        </div>
    );
};

export default StackSelector;