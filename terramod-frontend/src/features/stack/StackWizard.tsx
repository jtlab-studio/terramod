import React, { useState, useEffect } from 'react';
import { useInfraStore } from '../../store/infraStore';
import { getStackTemplate } from '../../config/stackTemplates';
import { estimateCosts, CostEstimateReport } from '../../api/cost';
import Button from '../../components/ui/Button';
import { DeploymentStrategy } from '../../types/deployment';

interface StackWizardProps {
    stackId: string;
    onComplete: () => void;
    onCancel: () => void;
}

const StackWizard: React.FC<StackWizardProps> = ({ stackId, onComplete, onCancel }) => {
    const [step, setStep] = useState<'configure' | 'cost-estimate' | 'confirm'>('configure');
    const [stackName, setStackName] = useState('');
    const [environment, setEnvironment] = useState<'dev' | 'staging' | 'prod'>('dev');
    const [costReport, setCostReport] = useState<CostEstimateReport | null>(null);
    const [isLoadingCost, setIsLoadingCost] = useState(false);

    const addDomain = useInfraStore((state) => state.addDomain);
    const addResource = useInfraStore((state) => state.addResource);
    const deploymentConfig = useInfraStore((state) => state.deploymentConfig);
    const domains = useInfraStore((state) => Array.from(state.domains.values()));
    const resources = useInfraStore((state) => Array.from(state.resources.values()));

    const template = getStackTemplate(stackId);

    useEffect(() => {
        if (template) {
            setStackName(template.name.toLowerCase().replace(/\s+/g, '-'));
        }
    }, [template]);

    const handleConfigure = () => {
        if (!template) return;

        // Create all required modules (domains)
        template.requiredModules.forEach((moduleType) => {
            const moduleId = `module_${moduleType}_${Date.now()}`;
            addDomain({
                id: moduleId,
                name: moduleType.charAt(0).toUpperCase() + moduleType.slice(1),
                type: moduleType,
                resourceIds: [],
                inputs: [],
                outputs: [],
                position: { x: 0, y: 0 },
                width: 200,
                height: 150,
                scope: 'regional'
            });
        });

        // Add starter resources
        template.starterResources.forEach((starterGroup) => {
            const domain = domains.find(d => d.type === starterGroup.domain);
            if (!domain) return;

            starterGroup.resources.forEach((resourceDef) => {
                const resourceId = `resource_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

                // Get default arguments based on resource type
                const defaultArgs = getDefaultArgumentsForResource(resourceDef.type, environment);

                addResource({
                    id: resourceId,
                    type: resourceDef.type,
                    domainId: domain.id,
                    name: resourceDef.name,
                    arguments: defaultArgs,
                    deployment: {
                        strategy: getDefaultDeploymentStrategy(resourceDef.type),
                        cidrAuto: resourceDef.type === 'aws_subnet'
                    },
                    position: { x: 0, y: 0 },
                    validationState: { isValid: true, errors: [], warnings: [] }
                });
            });
        });

        // Move to cost estimation
        setStep('cost-estimate');
        loadCostEstimate();
    };

    const loadCostEstimate = async () => {
        setIsLoadingCost(true);

        try {
            const result = await estimateCosts({
                graph: {
                    domains: domains,
                    resources: resources,
                    connections: []
                },
                stack_type: stackId,
                region: deploymentConfig.primaryRegion,
                currency: 'USD'
            });

            if (result.ok) {
                setCostReport(result.value);
            }
        } catch (err) {
            console.error('Failed to load cost estimate:', err);
        } finally {
            setIsLoadingCost(false);
        }
    };

    const handleConfirm = () => {
        onComplete();
    };

    const renderConfigureStep = () => {
        if (!template) return null;

        return (
            <div className="space-y-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        Configure {template.name}
                    </h2>
                    <p className="text-gray-600">
                        {template.description}
                    </p>
                </div>

                {/* Stack Name */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Stack Name
                    </label>
                    <input
                        type="text"
                        value={stackName}
                        onChange={(e) => setStackName(e.target.value)}
                        placeholder="my-app-stack"
                        className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Used for resource naming and tagging
                    </p>
                </div>

                {/* Environment */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Environment
                    </label>
                    <div className="flex gap-3">
                        {(['dev', 'staging', 'prod'] as const).map((env) => (
                            <button
                                key={env}
                                onClick={() => setEnvironment(env)}
                                className={`
                                    flex-1 py-2 px-4 rounded border-2 font-medium transition-colors
                                    ${environment === env
                                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                                        : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                                    }
                                `}
                            >
                                {env.toUpperCase()}
                            </button>
                        ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                        <strong>Dev:</strong> Minimal resources, no high availability<br />
                        <strong>Staging:</strong> Production-like, moderate scaling<br />
                        <strong>Prod:</strong> Multi-AZ, auto-scaling, lifecycle protection
                    </p>
                </div>

                {/* Region (from deployment config) */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Region
                    </label>
                    <div className="px-4 py-2 bg-gray-100 border border-gray-300 rounded text-gray-700">
                        {deploymentConfig.primaryRegion}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                        Change in deployment config bar at bottom
                    </p>
                </div>

                {/* Modules Preview */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Modules to Create
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {template.requiredModules.map((module) => (
                            <span
                                key={module}
                                className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm font-medium capitalize"
                            >
                                {module}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Resources Preview */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Starter Resources ({template.starterResources.reduce((sum, g) => sum + g.resources.length, 0)} total)
                    </label>
                    <div className="max-h-40 overflow-y-auto border border-gray-200 rounded p-3 space-y-2">
                        {template.starterResources.map((group) => (
                            <div key={group.domain}>
                                <div className="text-xs font-semibold text-gray-500 uppercase mb-1">
                                    {group.domain}
                                </div>
                                {group.resources.map((resource) => (
                                    <div key={resource.type} className="text-sm text-gray-700 ml-2">
                                        • {resource.description}
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t">
                    <Button variant="secondary" onClick={onCancel} className="flex-1">
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleConfigure}
                        disabled={!stackName}
                        className="flex-1"
                    >
                        Continue to Cost Estimate →
                    </Button>
                </div>
            </div>
        );
    };

    const renderCostEstimateStep = () => {
        if (isLoadingCost) {
            return (
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Calculating costs...</p>
                </div>
            );
        }

        if (!costReport) {
            return (
                <div className="text-center py-12">
                    <p className="text-red-600">Failed to load cost estimate</p>
                    <Button variant="secondary" onClick={onCancel} className="mt-4">
                        Go Back
                    </Button>
                </div>
            );
        }

        const scenarios = ['idle', '10_users', '100_users', '1000_users'];
        const scenarioLabels: Record<string, string> = {
            'idle': 'Idle',
            '10_users': '10 Users',
            '100_users': '100 Users',
            '1000_users': '1000 Users'
        };

        return (
            <div className="space-y-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        💰 Estimated Costs
                    </h2>
                    <p className="text-gray-600">
                        Review estimated monthly costs before creating your stack
                    </p>
                </div>

                {/* Cost Comparison Table */}
                <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                                    Scenario
                                </th>
                                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                                    Monthly Cost
                                </th>
                                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                                    Annual Cost
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {scenarios.map((scenario) => {
                                const data = costReport.scenarios[scenario];
                                if (!data) return null;

                                return (
                                    <tr key={scenario} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                            {scenarioLabels[scenario]}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right text-gray-900">
                                            ${data.total_monthly.toFixed(2)}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right text-gray-700">
                                            ${data.total_annual.toFixed(2)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Free Tier Notice */}
                {costReport.free_tier_eligible && (
                    <div className="bg-green-50 border border-green-200 rounded p-4">
                        <div className="flex items-start gap-3">
                            <span className="text-2xl">✨</span>
                            <div>
                                <h4 className="font-semibold text-green-900 mb-1">
                                    AWS Free Tier Eligible
                                </h4>
                                <p className="text-sm text-green-700">
                                    This stack is within AWS Free Tier limits for idle and 10 users scenarios.
                                    Actual costs may be $0/month for the first 12 months with a new AWS account.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Optimization Recommendations */}
                {costReport.optimization_recommendations.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded p-4">
                        <h4 className="font-semibold text-blue-900 mb-2">💡 Cost Optimization Tips</h4>
                        <ul className="space-y-1">
                            {costReport.optimization_recommendations.map((rec, idx) => (
                                <li key={idx} className="text-sm text-blue-700">
                                    • {rec}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t">
                    <Button variant="secondary" onClick={onCancel} className="flex-1">
                        ← Back
                    </Button>
                    <Button variant="primary" onClick={handleConfirm} className="flex-1">
                        Looks Good, Create Stack →
                    </Button>
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
                {step === 'configure' && renderConfigureStep()}
                {step === 'cost-estimate' && renderCostEstimateStep()}
            </div>
        </div>
    );
};

// Helper functions
function getDefaultArgumentsForResource(resourceType: string, environment: string): Record<string, any> {
    const defaults: Record<string, any> = {};

    if (resourceType === 'aws_vpc') {
        defaults.cidr_block = '10.0.0.0/16';
        defaults.enable_dns_hostnames = true;
        defaults.enable_dns_support = true;
    } else if (resourceType === 'aws_instance') {
        defaults.ami = 'ami-0c55b159cbfafe1f0';
        defaults.instance_type = environment === 'prod' ? 't3.small' : 't3.micro';
    } else if (resourceType === 'aws_db_instance') {
        defaults.instance_class = environment === 'prod' ? 'db.t3.small' : 'db.t3.micro';
        defaults.allocated_storage = 20;
        defaults.multi_az = environment === 'prod';
    }

    return defaults;
}

function getDefaultDeploymentStrategy(resourceType: string): DeploymentStrategy {
    const strategies: Record<string, DeploymentStrategy> = {
        'aws_vpc': 'single',
        'aws_subnet': 'per-az',
        'aws_nat_gateway': 'per-az',
        'aws_instance': 'per-az',
        'aws_lb': 'multi-az',
        'aws_alb': 'multi-az',
        'aws_rds_cluster': 'multi-az'
    };
    return strategies[resourceType] || 'single';
}

export default StackWizard;