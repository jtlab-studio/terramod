import React, { useState } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { useInfraStore } from '../../store/infraStore';
import { validateGraph } from '../../api/graph';
import { generateTerraform, exportProject } from '../../api/terraform';
import type { InfrastructureGraph } from '../../api/graph';

interface ExportModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose }) => {
    const [step, setStep] = useState<'validate' | 'preview' | 'download'>('validate');
    const [isValidating, setIsValidating] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [validationResults, setValidationResults] = useState<any>(null);
    const [terraformPreview, setTerraformPreview] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const domains = useInfraStore((state) => Array.from(state.domains.values()));
    const resources = useInfraStore((state) => Array.from(state.resources.values()));
    const connections = useInfraStore((state) => Array.from(state.connections.values()));

    const handleValidate = async () => {
        setIsValidating(true);
        setError(null);

        try {
            const graph: InfrastructureGraph = {
                domains,
                resources,
                connections
            };

            const result = await validateGraph(graph);

            if (!result.ok) {
                setError(result.error.message);
                return;
            }

            setValidationResults(result.value);

            // Check if there are blocking errors
            if (result.value.blocking_errors &&
                Object.keys(result.value.blocking_errors).length > 0) {
                setStep('validate');
            } else {
                setStep('preview');
                handleGenerate();
            }
        } catch (err: any) {
            setError(err.message || 'Validation failed');
        } finally {
            setIsValidating(false);
        }
    };

    const handleGenerate = async () => {
        setIsGenerating(true);
        setError(null);

        try {
            const graph: InfrastructureGraph = {
                domains,
                resources,
                connections
            };

            const result = await generateTerraform(graph);

            if (!result.ok) {
                setError(result.error.message);
                return;
            }

            setTerraformPreview(result.value);
            setStep('preview');
        } catch (err: any) {
            setError(err.message || 'Generation failed');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDownload = async () => {
        try {
            const graph: InfrastructureGraph = {
                domains,
                resources,
                connections
            };

            const result = await exportProject(graph, 'zip');

            if (!result.ok) {
                setError(result.error.message);
                return;
            }

            // Trigger download
            const blob = result.value as Blob;
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'terraform-project.zip';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            setStep('download');

            // Auto-close after success
            setTimeout(() => {
                onClose();
                resetModal();
            }, 2000);
        } catch (err: any) {
            setError(err.message || 'Export failed');
        }
    };

    const resetModal = () => {
        setStep('validate');
        setValidationResults(null);
        setTerraformPreview(null);
        setError(null);
    };

    const handleClose = () => {
        onClose();
        setTimeout(resetModal, 300);
    };

    // Start validation when modal opens
    React.useEffect(() => {
        if (isOpen && step === 'validate') {
            handleValidate();
        }
    }, [isOpen]);

    const renderValidationStep = () => {
        if (isValidating) {
            return (
                <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Validating infrastructure...</p>
                </div>
            );
        }

        if (!validationResults) return null;

        const hasBlockingErrors = validationResults.blocking_errors &&
            Object.keys(validationResults.blocking_errors).length > 0;

        if (hasBlockingErrors) {
            return (
                <div className="space-y-4">
                    <div className="bg-red-50 border border-red-200 rounded p-4">
                        <h3 className="text-red-800 font-semibold mb-2">❌ Cannot Export - Blocking Errors</h3>
                        <p className="text-sm text-red-700 mb-3">
                            Your infrastructure has validation errors that must be fixed before export.
                        </p>

                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            {Object.entries(validationResults.blocking_errors).map(([elementId, errors]) => (
                                <div key={elementId} className="bg-white border border-red-300 rounded p-2">
                                    <div className="font-medium text-sm text-gray-800">{elementId}</div>
                                    <ul className="list-disc list-inside text-sm text-red-700 mt-1">
                                        {(errors as string[]).map((error, idx) => (
                                            <li key={idx}>{error}</li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>

                    {validationResults.warnings && Object.keys(validationResults.warnings).length > 0 && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                            <h4 className="text-yellow-800 font-medium text-sm mb-2">⚠️ Warnings</h4>
                            <div className="text-xs text-yellow-700">
                                {Object.keys(validationResults.warnings).length} warnings (non-blocking)
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        return (
            <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded p-4">
                    <h3 className="text-green-800 font-semibold mb-2">✅ Validation Passed</h3>
                    <p className="text-sm text-green-700">
                        Your infrastructure is valid and ready to export.
                    </p>
                </div>

                {validationResults.warnings && Object.keys(validationResults.warnings).length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                        <h4 className="text-yellow-800 font-medium text-sm mb-2">⚠️ Warnings</h4>
                        <div className="space-y-1">
                            {Object.entries(validationResults.warnings).map(([elementId, warnings]) => (
                                <div key={elementId} className="text-xs text-yellow-700">
                                    <span className="font-medium">{elementId}:</span>{' '}
                                    {(warnings as string[]).join(', ')}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderPreviewStep = () => {
        if (isGenerating) {
            return (
                <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Generating Terraform...</p>
                </div>
            );
        }

        if (!terraformPreview) return null;

        return (
            <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded p-4">
                    <h3 className="text-blue-800 font-semibold mb-2">📦 Terraform Project Generated</h3>
                    <p className="text-sm text-blue-700">
                        Your infrastructure will be exported as a modular Terraform project.
                    </p>
                </div>

                <div className="space-y-2">
                    <h4 className="font-medium text-sm">Project Structure:</h4>
                    <div className="bg-gray-50 border border-gray-200 rounded p-3 text-xs font-mono">
                        <div>terraform-project/</div>
                        <div className="ml-2">├── modules/</div>
                        {Object.keys(terraformPreview.modules).map((moduleName) => (
                            <div key={moduleName} className="ml-4">├── {moduleName}/</div>
                        ))}
                        <div className="ml-2">├── main.tf</div>
                        <div className="ml-2">├── providers.tf</div>
                        <div className="ml-2">└── terraform.tf</div>
                    </div>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded p-3">
                    <h4 className="font-medium text-sm mb-2">Modules:</h4>
                    <div className="space-y-1 text-sm">
                        {Object.entries(terraformPreview.modules).map(([name, module]: [string, any]) => (
                            <div key={name} className="flex justify-between">
                                <span className="text-gray-700">{name}</span>
                                <span className="text-gray-500 text-xs">
                                    {module.main_tf.split('\n').length} lines
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    const renderDownloadStep = () => {
        return (
            <div className="text-center py-8">
                <div className="text-6xl mb-4">🎉</div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Export Complete!</h3>
                <p className="text-gray-600">Your Terraform project has been downloaded.</p>
            </div>
        );
    };

    const footer = (
        <div className="flex justify-between items-center">
            <Button variant="secondary" onClick={handleClose}>
                Close
            </Button>

            {step === 'validate' && validationResults && !validationResults.blocking_errors && (
                <Button variant="primary" onClick={() => setStep('preview')} disabled={isGenerating}>
                    Continue to Preview
                </Button>
            )}

            {step === 'preview' && (
                <Button variant="primary" onClick={handleDownload}>
                    Download ZIP
                </Button>
            )}
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="Export Terraform Project"
            footer={footer}
            size="lg"
        >
            {error && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">
                    <strong>Error:</strong> {error}
                </div>
            )}

            {step === 'validate' && renderValidationStep()}
            {step === 'preview' && renderPreviewStep()}
            {step === 'download' && renderDownloadStep()}
        </Modal>
    );
};

export default ExportModal;