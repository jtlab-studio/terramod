import React, { useState, useEffect } from 'react';
import { useInfraStore } from '../../store/infraStore';
import { estimateCosts, CostEstimateReport } from '../../api/cost';

interface CostEstimateModalProps {
    isOpen: boolean;
    onClose: () => void;
    stackType: string;
}

const CostEstimateModal: React.FC<CostEstimateModalProps> = ({ isOpen, onClose, stackType }) => {
    const [report, setReport] = useState<CostEstimateReport | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedScenario, setSelectedScenario] = useState<string | null>(null);

    const domains = useInfraStore((state) => Array.from(state.domains.values()));
    const resources = useInfraStore((state) => Array.from(state.resources.values()));
    const connections = useInfraStore((state) => Array.from(state.connections.values()));
    const deploymentConfig = useInfraStore((state) => state.deploymentConfig);

    useEffect(() => {
        if (isOpen && resources.length > 0) {
            loadCostEstimate();
        }
    }, [isOpen, resources.length]);

    const loadCostEstimate = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const result = await estimateCosts({
                graph: { domains, resources, connections },
                stack_type: stackType,
                region: deploymentConfig.primaryRegion,
                currency: 'USD'
            });

            if (!result.ok) {
                setError(result.error.message);
                return;
            }

            setReport(result.value);
        } catch (err: any) {
            setError(err.message || 'Failed to load cost estimate');
        } finally {
            setIsLoading(false);
        }
    };

    const formatCurrency = (amount: number): string => {
        return `$${amount.toFixed(2)}`;
    };

    const renderComparisonTable = () => {
        if (!report) return null;

        const scenarios = ['idle', '10_users', '100_users', '1000_users'];
        const scenarioLabels: Record<string, string> = {
            'idle': 'Idle',
            '10_users': '10 Users',
            '100_users': '100 Users',
            '1000_users': '1000 Users'
        };

        // Group costs by resource type
        const resourceTypes = new Set<string>();
        Object.values(report.scenarios).forEach(scenario => {
            scenario.breakdown.forEach(resource => {
                resourceTypes.add(resource.resource_type);
            });
        });

        return (
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-white/10">
                            <th className="text-left p-2 text-slate-300">Resource</th>
                            {scenarios.map(scenario => (
                                <th key={scenario} className="text-right p-2 text-slate-300">
                                    {scenarioLabels[scenario]}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from(resourceTypes).map(resourceType => {
                            const displayName = resourceType.replace('aws_', '').replace(/_/g, ' ');
                            return (
                                <tr key={resourceType} className="border-b border-white/5">
                                    <td className="p-2 text-slate-300 capitalize">{displayName}</td>
                                    {scenarios.map(scenario => {
                                        const scenarioData = report.scenarios[scenario];
                                        const resourceCost = scenarioData?.breakdown.find(
                                            r => r.resource_type === resourceType
                                        );
                                        return (
                                            <td key={scenario} className="text-right p-2 text-slate-300">
                                                {resourceCost ? formatCurrency(resourceCost.monthly_cost) : '-'}
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                        <tr className="border-t-2 border-violet-500/30 font-bold">
                            <td className="p-2 text-white">💵 TOTAL</td>
                            {scenarios.map(scenario => {
                                const scenarioData = report.scenarios[scenario];
                                return (
                                    <td key={scenario} className="text-right p-2 text-white">
                                        {formatCurrency(scenarioData?.total_monthly || 0)}
                                    </td>
                                );
                            })}
                        </tr>
                    </tbody>
                </table>
            </div>
        );
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-white/10 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex-shrink-0 p-6 border-b border-white/10">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-white">💰 Cost Estimation</h2>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Content - Scrollable */}
                <div className="flex-1 overflow-y-auto p-6 min-h-0">
                    {isLoading && (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500 mx-auto mb-4"></div>
                            <p className="text-slate-400">Calculating costs...</p>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-300">
                            <strong>Error:</strong> {error}
                        </div>
                    )}

                    {report && !selectedScenario && (
                        <div className="space-y-6">
                            {/* Header Info */}
                            <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-4">
                                <h3 className="text-violet-300 font-semibold mb-2">
                                    📊 Scenario-Based Cost Estimates
                                </h3>
                                <p className="text-sm text-slate-400">
                                    Estimated monthly costs for {report.stack_type} in {report.region}
                                </p>
                            </div>

                            {/* Comparison Table */}
                            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                                {renderComparisonTable()}
                            </div>

                            {/* Free Tier Notice */}
                            {report.free_tier_eligible && (
                                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                                    <div className="flex items-start gap-3">
                                        <span className="text-2xl">✨</span>
                                        <div>
                                            <h4 className="font-semibold text-green-300 mb-1">
                                                AWS Free Tier Eligible
                                            </h4>
                                            <p className="text-sm text-green-400">
                                                Idle costs may be $0/month for the first 12 months with a new AWS account.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Optimization Recommendations */}
                            {report.optimization_recommendations.length > 0 && (
                                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                                    <h4 className="font-semibold text-amber-300 mb-2">
                                        💡 Optimization Opportunities
                                    </h4>
                                    <ul className="list-disc list-inside text-sm text-amber-400 space-y-1">
                                        {report.optimization_recommendations.map((rec, idx) => (
                                            <li key={idx}>{rec}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex-shrink-0 p-6 border-t border-white/10 flex items-center justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 rounded-lg font-medium bg-white/10 text-white hover:bg-white/20 border border-white/20 transition-all"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CostEstimateModal;