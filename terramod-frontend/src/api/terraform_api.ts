import { post } from './client';
import { InfrastructureGraph } from './graph';

export interface TerraformModule {
    name: string;
    main_tf: string;
    variables_tf: string;
    outputs_tf: string;
}

export interface TerraformProject {
    modules: Record<string, TerraformModule>;
    root_main: string;
    providers: string;
    terraform_config: string;
}

export type ExportFormat = 'zip' | 'directory';

export async function generateTerraform(graph: InfrastructureGraph) {
    return post<TerraformProject>('/api/v1/terraform/generate', graph);
}

export async function importTerraform(files: File[]) {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));

    const response = await fetch('/api/v1/terraform/import', {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        return { ok: false, error: { message: 'Import failed' } };
    }

    const data = await response.json();
    return { ok: true, value: data };
}

export async function exportProject(graph: InfrastructureGraph, format: ExportFormat) {
    return post<Blob>('/api/v1/terraform/export', { graph, format });
}