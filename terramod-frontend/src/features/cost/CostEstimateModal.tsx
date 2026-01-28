import React, { useState, useEffect } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
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
                        <tr className="border-b border-gray-700">
                            <th className="text-left p-2 text-gray-300">Resource</th>
                            {scenarios.map(scenario => (
                                <th key={scenario} className="text-right p-2 text-gray-300">
                                    {scenarioLabels[scenario]}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from(resourceTypes).map(resourceType => {
                            const displayName = resourceType.replace('aws_', '').replace(/_/g, ' ');
                            return (
                                <tr key={resourceType} className="border-b border-gray-800">
                                    <td className="p-2 text-gray-300 capitalize">{displayName}</td>
                                    {scenarios.map(scenario => {
                                        const scenarioData = report.scenarios[scenario];
                                        const resourceCost = scenarioData?.breakdown.find(
                                            r => r.resource_type === resourceType
                                        );
                                        return (
                                            <td key={scenario} className="text-right p-2 text-gray-300">
                                                {resourceCost ? formatCurrency(resourceCost.monthly_cost) : '-'}
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                        <tr className="border-t-2 border-gray-600 font-bold">
                            <td className="p-2 text-gray-100">💵 TOTAL</td>
                            {scenarios.map(scenario => {
                                const scenarioData = report.scenarios[scenario];
                                return (
                                    <td key={scenario} className="text-right p-2 text-gray-100">
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

    const renderScenarioDetails = () => {
        if (!report || !selectedScenario) return null;

        const scenarioData = report.scenarios[selectedScenario];
        if (!scenarioData) return null;

        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-100">
                        {selectedScenario.replace('_', ' ').toUpperCase()} Scenario
                    </h3>
                    <button
                        onClick={() => setSelectedScenario(null)}
                        className="text-gray-400 hover:text-gray-300"
                    >
                        ← Back to Table
                    </button>
                </div>

                <div className="bg-gray-800 border border-gray-700 rounded p-4">
                    <div className="text-2xl font-bold text-gray-100 mb-2">
                        {formatCurrency(scenarioData.total_monthly)}/month
                    </div>
                    <div className="text-sm text-gray-400">
                        {formatCurrency(scenarioData.total_annual)}/year
                    </div>
                </div>

                <div>
                    <h4 className="font-medium text-gray-300 mb-2">Resource Breakdown</h4>
                    <div className="space-y-2">
                        {scenarioData.breakdown.map((resource, idx) => (
                            <div key={idx} className="bg-gray-800 border border-gray-700 rounded p-3">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <div className="font-medium text-gray-200">{resource.resource_name}</div>
                                        <div className="text-xs text-gray-500 capitalize">
                                            {resource.resource_type.replace('aws_', '').replace(/_/g, ' ')}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-semibold text-gray-100">
                                            {formatCurrency(resource.monthly_cost)}
                                        </div>
                                        <div className="text-xs text-gray-500">/month</div>
                                    </div>
                                </div>

                                {/* Cost Drivers */}
                                <details className="mt-2">
                                    <summary className="cursor-pointer text-xs text-gray-400 hover:text-gray-300">
                                        View Cost Breakdown
                                    </summary>
                                    <div className="mt-2 space-y-1">
                                        {resource.cost_drivers.map((driver, dIdx) => (
                                            <div key={dIdx} className="text-xs text-gray-400 flex justify-between">
                                                <span>{driver.name}: {driver.value} {driver.unit}</span>
                                                <span>{formatCurrency(driver.cost)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </details>

                                {/* Optimization Suggestions */}
                                {resource.optimization_suggestions.length > 0 && (
                                    <div className="mt-2 pt-2 border-t border-gray-700">
                                        {resource.optimization_suggestions.map((suggestion, sIdx) => (
                                            <div key={sIdx} className="text-xs text-blue-400">
                                                💡 {suggestion}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    const footer = (
        <div className="flex justify-between items-center">
            <div>
                {report?.free_tier_eligible && (
                    <div className="text-sm text-green-400">
                        ✨ Eligible for AWS Free Tier (first 12 months)
                    </div>
                )}
            </div>
            <Button variant="secondary" onClick={onClose}>
                Close
            </Button>
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="💰 Cost Estimation"
            footer={footer}
            size="lg"
        >
            {isLoading && (
                <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Calculating costs...</p>
                </div>
            )}

            {error && (
                <div className="bg-red-50 border border-red-200 rounded p-4 text-red-700 mb-4">
                    <strong>Error:</strong> {error}
                </div>
            )}

            {report && !selectedScenario && (
                <div className="space-y-4">
                    {/* Header Info */}
                    <div className="bg-blue-50 border border-blue-200 rounded p-4">
                        <h3 className="text-blue-800 font-semibold mb-2">
                            📊 Scenario-Based Cost Estimates
                        </h3>
                        <p className="text-sm text-blue-700">
                            Estimated monthly costs for {report.stack_type} in {report.region}
                        </p>
                        <p className="text-xs text-blue-600 mt-1">
                            Last updated: {new Date(report.last_updated).toLocaleDateString()}
                        </p>
                    </div>

                    {/* Comparison Table */}
                    {renderComparisonTable()}

                    {/* Click to view details */}
                    <div className="text-center text-sm text-gray-500 mt-2">
                        💡 Click on a scenario header to view detailed breakdown
                    </div>

                    {/* Optimization Recommendations */}
                    {report.optimization_recommendations.length > 0 && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
                            <h4 className="font-semibold text-yellow-800 mb-2">
                                💡 Optimization Opportunities
                            </h4>
                            <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
                                {report.optimization_recommendations.map((rec, idx) => (
                                    <li key={idx}>{rec}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            {report && selectedScenario && renderScenarioDetails(selectedScenario)}
        </Modal>
    );
};

export default CostEstimateModal;