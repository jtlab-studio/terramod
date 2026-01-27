import { post } from './client';
import type { Domain } from '../types/domain';
import type { Resource } from '../types/resource';
import type { Connection } from '../types/connection';

export interface InfrastructureGraph {
    domains: Domain[];
    resources: Resource[];
    connections: Connection[];
}

export interface ValidationResults {
    errors: Record<string, string[]>;
    warnings: Record<string, string[]>;
    blocking_errors?: Record<string, string[]>; // Optional for compatibility
    can_export?: boolean;
}

export async function validateGraph(graph: InfrastructureGraph) {
    return post<ValidationResults>('/api/v1/graph/validate', graph);
}

export async function updateElement(
    id: string,
    type: 'domain' | 'resource' | 'connection',
    updates: any
) {
    return post<void>(`/api/v1/graph/${type}/${id}`, updates);
}
