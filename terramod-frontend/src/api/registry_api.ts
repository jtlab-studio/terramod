import { get } from './client';
import { DomainType } from '../types/domain';

export interface ServiceDefinition {
    resource_type: string;
    domain: DomainType;
    category: string;
    required_inputs: string[];
    optional_inputs: string[];
    exports: string[];
    allowed_consumers: string[];
}

export interface ResourceSchema {
    resource_type: string;
    inputs: Record<string, ArgumentSchema>;
    outputs: Record<string, OutputSchema>;
}

export interface ArgumentSchema {
    name: string;
    type: string;
    required: boolean;
    default?: any;
    description: string;
}

export interface OutputSchema {
    name: string;
    type: string;
    description: string;
}

export async function getServices() {
    return get<ServiceDefinition[]>('/api/v1/registry/services');
}

export async function getResourceSchema(resourceType: string) {
    return get<ResourceSchema>(`/api/v1/registry/schema/${resourceType}`);
}

export async function getDomainServices(domain: DomainType) {
    return get<ServiceDefinition[]>(`/api/v1/registry/services/${domain}`);
}