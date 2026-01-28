import React, { useState } from 'react';
import { useInfraStore } from '../../store/infraStore';
import { validateGraph } from '../../api/graph';
import { generateTerraform } from '../../api/terraform';
import type { InfrastructureGraph } from '../../api/graph';
import { API_BASE_URL } from '../../config/constants';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState<'validate' | 'preview' | 'download'>('validate');
  const [isValidating, setIsValidating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
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
      const blockingErrors = result.value.blocking_errors || {};
      if (Object.keys(blockingErrors).length > 0) {
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
    setIsDownloading(true);
    setError(null);

    try {
      const graph: InfrastructureGraph = {
        domains,
        resources,
        connections
      };

      // Use fetch directly with proper response handling for binary data
      const response = await fetch(`${API_BASE_URL}/api/v1/terraform/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ graph, format: 'zip' })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Export failed: ${errorText}`);
      }

      // Get the blob directly (don't try to parse as JSON!)
      const blob = await response.blob();

      // Create download link
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
    } finally {
      setIsDownloading(false);
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

  if (!isOpen) return null;

  const renderValidationStep = () => {
    if (isValidating) {
      return (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Validating infrastructure...</p>
        </div>
      );
    }

    if (!validationResults) return null;

    const blockingErrors = validationResults.blocking_errors || {};
    const hasBlockingErrors = Object.keys(blockingErrors).length > 0;

    if (hasBlockingErrors) {
      return (
        <div className="space-y-4">
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
            <h3 className="text-red-300 font-semibold mb-2">❌ Cannot Export - Blocking Errors</h3>
            <p className="text-sm text-red-400 mb-3">
              Your infrastructure has validation errors that must be fixed before export.
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {Object.entries(blockingErrors).map(([elementId, errors]) => (
                <div key={elementId} className="bg-white/5 border border-red-500/20 rounded-lg p-2">
                  <div className="font-medium text-sm text-slate-300">{elementId}</div>
                  <ul className="list-disc list-inside text-sm text-red-400 mt-1">
                    {(errors as string[]).map((error, idx) => (
                      <li key={idx}>{error}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {validationResults.warnings && Object.keys(validationResults.warnings).length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
              <h4 className="text-amber-300 font-medium text-sm mb-2">⚠️ Warnings</h4>
              <div className="text-xs text-amber-400">
                {Object.keys(validationResults.warnings).length} warnings (non-blocking)
              </div>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
          <h3 className="text-green-300 font-semibold mb-2">✅ Validation Passed</h3>
          <p className="text-sm text-green-400">
            Your infrastructure is valid and ready to export.
          </p>
        </div>

        {validationResults.warnings && Object.keys(validationResults.warnings).length > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
            <h4 className="text-amber-300 font-medium text-sm mb-2">⚠️ Warnings</h4>
            <div className="space-y-1">
              {Object.entries(validationResults.warnings).map(([elementId, warnings]) => (
                <div key={elementId} className="text-xs text-amber-400">
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
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Generating Terraform...</p>
        </div>
      );
    }

    if (!terraformPreview) return null;

    return (
      <div className="space-y-4">
        <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-4">
          <h3 className="text-violet-300 font-semibold mb-2">📦 Terraform Project Generated</h3>
          <p className="text-sm text-slate-400">
            Your infrastructure will be exported as a modular Terraform project.
          </p>
        </div>

        <div className="space-y-2">
          <h4 className="font-medium text-sm text-slate-300">Project Structure:</h4>
          <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-xs font-mono text-slate-400">
            <div>terraform-project/</div>
            <div className="ml-2">├── modules/</div>
            {Object.keys(terraformPreview.modules).map((moduleName) => (
              <div key={moduleName} className="ml-4 text-violet-400">├── {moduleName}/</div>
            ))}
            <div className="ml-2">├── main.tf</div>
            <div className="ml-2">├── providers.tf</div>
            <div className="ml-2">└── terraform.tf</div>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-3">
          <h4 className="font-medium text-sm text-slate-300 mb-2">Modules:</h4>
          <div className="space-y-1 text-sm">
            {Object.entries(terraformPreview.modules).map(([name, module]: [string, any]) => (
              <div key={name} className="flex justify-between text-slate-400">
                <span>{name}</span>
                <span className="text-xs text-slate-500">
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
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🎉</div>
        <h3 className="text-xl font-semibold text-white mb-2">Export Complete!</h3>
        <p className="text-slate-400">Your Terraform project has been downloaded.</p>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-white/10 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">Export Terraform Project</h2>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0">
          {error && (
            <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-sm text-red-300">
              <strong>Error:</strong> {error}
            </div>
          )}

          {step === 'validate' && renderValidationStep()}
          {step === 'preview' && renderPreviewStep()}
          {step === 'download' && renderDownloadStep()}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 p-6 border-t border-white/10 flex items-center justify-between">
          <button
            onClick={handleClose}
            className="px-6 py-2.5 rounded-lg font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all"
          >
            Close
          </button>

          <div className="flex items-center gap-3">
            {step === 'validate' && validationResults && !(validationResults.blocking_errors && Object.keys(validationResults.blocking_errors).length > 0) && (
              <button
                onClick={() => setStep('preview')}
                disabled={isGenerating}
                className="px-6 py-2.5 rounded-lg font-medium bg-white/10 text-white hover:bg-white/20 border border-white/20 transition-all"
              >
                Continue to Preview
              </button>
            )}

            {step === 'preview' && (
              <button
                onClick={handleDownload}
                disabled={isDownloading}
                className="px-6 py-2.5 rounded-lg font-medium bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700 shadow-lg shadow-violet-500/20 transition-all disabled:opacity-50"
              >
                {isDownloading ? 'Downloading...' : 'Download ZIP'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;