import React, { useState } from 'react';
import { STACK_TEMPLATES, StackTemplate } from '../../config/stackTemplates';
import StackConfigWizard from './StackConfigWizard';

interface StackSelectorProps {
    onStackSelected: (stackId: string) => void;
}

const StackSelector: React.FC<StackSelectorProps> = ({ onStackSelected }) => {
    const [selectedStack, setSelectedStack] = useState<string | null>(null);
    const [showWizard, setShowWizard] = useState(false);

    const getCostBadgeColor = (costProfile: string) => {
        switch (costProfile) {
            case 'low':
                return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
            case 'medium':
                return 'bg-amber-500/10 text-amber-300 border-amber-500/30';
            case 'high':
                return 'bg-orange-500/10 text-orange-300 border-orange-500/30';
            default:
                return 'bg-slate-500/10 text-slate-300 border-slate-500/30';
        }
    };

    const handleStartWithStack = (stackId: string) => {
        if (stackId === '3-tier-web-app') {
            // Show wizard for 3-tier
            setSelectedStack(stackId);
            setShowWizard(true);
        } else {
            // Use simple generation for other templates (placeholders)
            onStackSelected(stackId);
        }
    };

    const handleWizardComplete = () => {
        setShowWizard(false);
        setSelectedStack(null);
        // Notify parent that stack was selected and resources created
        onStackSelected('3-tier-web-app');
    };

    const handleWizardCancel = () => {
        setShowWizard(false);
        setSelectedStack(null);
    };

    const renderStackCard = (template: StackTemplate) => {
        const isSelected = selectedStack === template.id;
        const is3Tier = template.id === '3-tier-web-app';

        return (
            <div
                key={template.id}
                onClick={() => setSelectedStack(template.id)}
                className={`group relative p-6 rounded-2xl backdrop-blur-xl cursor-pointer transition-all duration-200 ${isSelected
                        ? 'bg-violet-500/20 border-2 border-violet-400/50 shadow-2xl shadow-violet-500/20'
                        : 'bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 hover:shadow-xl'
                    }`}
            >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                        <div className="text-5xl">{template.icon}</div>
                        <div>
                            <h3 className="text-xl font-bold text-white mb-1">{template.name}</h3>
                            <span className={`inline-block text-xs px-3 py-1 rounded-full border font-medium ${getCostBadgeColor(template.costProfile)}`}>
                                {template.costProfile.toUpperCase()} COST
                            </span>
                        </div>
                    </div>
                    {is3Tier && (
                        <div className="px-3 py-1 rounded-full bg-green-500/20 text-green-300 text-xs font-semibold border border-green-500/30">
                            RECOMMENDED
                        </div>
                    )}
                </div>

                {/* Description */}
                <p className="text-sm text-slate-400 mb-4 leading-relaxed">
                    {template.description}
                </p>

                {/* Cost Estimate */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4">
                    <div className="text-xs text-slate-500 mb-2">Estimated Monthly Cost</div>
                    <div className="flex items-baseline gap-3">
                        <div>
                            <span className="text-2xl font-bold text-white">
                                ${template.estimatedIdleCost}
                            </span>
                            <span className="text-xs text-slate-500 ml-1">idle</span>
                        </div>
                        <span className="text-slate-600">→</span>
                        <div>
                            <span className="text-xl font-semibold text-white">
                                ${template.estimated100UsersCost}
                            </span>
                            <span className="text-xs text-slate-500 ml-1">@ 100 users</span>
                        </div>
                    </div>
                </div>

                {/* Modules */}
                <div className="mb-4">
                    <div className="text-xs text-slate-500 mb-2">Included Modules:</div>
                    <div className="flex flex-wrap gap-2">
                        {template.requiredModules.slice(0, 5).map((module) => (
                            <span
                                key={module}
                                className="text-xs px-3 py-1 bg-white/5 text-slate-400 rounded-lg border border-white/10 capitalize"
                            >
                                {module}
                            </span>
                        ))}
                        {template.requiredModules.length > 5 && (
                            <span className="text-xs px-3 py-1 bg-white/5 text-slate-400 rounded-lg border border-white/10">
                                +{template.requiredModules.length - 5} more
                            </span>
                        )}
                    </div>
                </div>

                {/* Action Button */}
                {isSelected && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleStartWithStack(template.id);
                        }}
                        className="w-full py-3 px-4 rounded-xl font-semibold bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700 shadow-lg shadow-violet-500/20 transition-all"
                    >
                        {is3Tier ? '🚀 Configure & Deploy' : 'Start with this Template'}
                    </button>
                )}

                {/* Placeholder Badge */}
                {!is3Tier && (
                    <div className="absolute top-4 right-4 px-2 py-1 rounded-lg bg-amber-500/10 text-amber-300 text-xs font-medium border border-amber-500/20">
                        Coming Soon
                    </div>
                )}
            </div>
        );
    };

    if (showWizard && selectedStack === '3-tier-web-app') {
        return (
            <StackConfigWizard
                onComplete={handleWizardComplete}
                onCancel={handleWizardCancel}
            />
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
            {/* Header */}
            <div className="max-w-7xl mx-auto mb-12">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                        <span className="text-white text-2xl font-bold">T</span>
                    </div>
                    <div>
                        <h1 className="text-4xl font-bold text-white mb-2">
                            Choose Your Stack Template
                        </h1>
                        <p className="text-slate-400 text-lg">
                            Start with production-ready infrastructure. Secure, scalable, and cost-optimized by default.
                        </p>
                    </div>
                </div>

                {/* Info Banner */}
                <div className="bg-violet-500/10 border border-violet-500/20 rounded-2xl p-6 backdrop-blur-xl">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-2xl">✨</span>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-white mb-2">Opinionated & Automated</h3>
                            <p className="text-sm text-slate-400 leading-relaxed">
                                Terramod generates secure, production-ready infrastructure with best practices built-in.
                                Multi-environment support, auto-scaling, encryption, backups, and monitoring are configured automatically.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stack Grid */}
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                {STACK_TEMPLATES.map(renderStackCard)}
            </div>

            {/* Cost Transparency Notice */}
            <div className="max-w-7xl mx-auto">
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-6 backdrop-blur-xl">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-2xl">💰</span>
                        </div>
                        <div>
                            <h4 className="text-lg font-semibold text-white mb-2">Cost-Transparent by Default</h4>
                            <p className="text-sm text-slate-400 leading-relaxed mb-3">
                                All cost estimates assume <strong className="text-white">no AWS Free Tier</strong> and <strong className="text-white">on-demand pricing</strong>.
                                Actual costs may be lower if you're eligible for Free Tier (first 12 months) or use Reserved Instances.
                            </p>
                            <p className="text-xs text-slate-500">
                                After selecting a stack, you'll see detailed cost breakdowns for multiple usage scenarios.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="max-w-7xl mx-auto mt-12 text-center">
                <p className="text-sm text-slate-500">
                    Need a custom configuration?{' '}
                    <button className="text-violet-400 hover:text-violet-300 underline transition-colors">
                        Contact us for enterprise support
                    </button>
                </p>
            </div>
        </div>
    );
};

export default StackSelector;