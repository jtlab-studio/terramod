import { post, get } from './client';

export interface CostDriver {
    name: string;
    value: number;
    unit: string;  // ADDED: Missing unit property
    cost: number;
    explanation: string;
}

export interface ResourceCost {
    resource_id: string;
    resource_type: string;
    resource_name: string;
    monthly_cost: number;
    annual_cost: number;
    cost_drivers: CostDriver[];
    optimization_suggestions: string[];
}

export interface ScenarioCost {
    scenario: string;
    total_monthly: number;
    total_annual: number;
    breakdown: ResourceCost[];
}

export interface CostEstimateReport {
    stack_type: string;
    region: string;
    currency: string;
    scenarios: Record<string, ScenarioCost>;
    free_tier_eligible: boolean;
    optimization_recommendations: string[];
    last_updated?: string;  // ADDED: Optional timestamp
}

export interface CostEstimateRequest {
    graph: {
        domains: any[];
        resources: any[];
        connections: any[];
    };
    stack_type: string;
    region: string;
    currency: string;
}

export async function estimateCosts(request: CostEstimateRequest) {
    return post<CostEstimateReport>('/api/v1/cost/estimate', request);
}

export async function getRegionalPricing(region: string) {
    return get<any>(`/api/v1/cost/pricing/${region}`);
}

export async function getScenarioAssumptions(stackType: string) {
    return get<any>(`/api/v1/cost/scenarios/${stackType}`);
}

export async function compareRegions(data: {
    graph: any;
    stack_type: string;
    regions: string[];
    currency: string;
}) {
    return post<any>('/api/v1/cost/compare', data);
}