import React from 'react';
import { useValidationStore } from '../../store/validationStore';
import { useInfraStore } from '../../store/infraStore';

const ValidationPanel: React.FC = () => {
    const errors = useValidationStore((state) => state.errors);
    const warnings = useValidationStore((state) => state.warnings);
    const domains = useInfraStore((state) => state.domains);
    const resources = useInfraStore((state) => state.resources);

    const totalErrors = Array.from(errors.values()).reduce((sum, arr) => sum + arr.length, 0);
    const totalWarnings = Array.from(warnings.values()).reduce((sum, arr) => sum + arr.length, 0);

    const [isExpanded, setIsExpanded] = React.useState(true);

    if (totalErrors === 0 && totalWarnings === 0) {
        return (
            <div className="fixed bottom-4 right-4 bg-green-50 border border-green-200 rounded-lg shadow-lg p-3 max-w-sm z-20">
                <div className="flex items-center gap-2">
                    <span className="text-green-600 text-xl">✓</span>
                    <div>
                        <div className="font-semibold text-green-800 text-sm">All Valid</div>
                        <div className="text-xs text-green-600">No validation issues</div>
                    </div>
                </div>
            </div>
        );
    }

    const getElementName = (elementId: string): string => {
        const resource = resources.get(elementId);
        if (resource) return resource.name;

        const domain = domains.get(elementId);
        if (domain) return domain.name;

        return elementId;
    };

    return (
        <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-lg max-w-md z-20">
            {/* Header */}
            <div
                className="flex items-center justify-between p-3 border-b border-gray-200 cursor-pointer hover:bg-gray-50"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-3">
                    {totalErrors > 0 && (
                        <div className="flex items-center gap-1">
                            <span className="text-red-600 text-lg">✕</span>
                            <span className="font-semibold text-red-800">{totalErrors}</span>
                        </div>
                    )}
                    {totalWarnings > 0 && (
                        <div className="flex items-center gap-1">
                            <span className="text-yellow-600 text-lg">⚠</span>
                            <span className="font-semibold text-yellow-800">{totalWarnings}</span>
                        </div>
                    )}
                    <span className="text-sm text-gray-600">Validation Issues</span>
                </div>
                <span className="text-gray-400 text-sm">{isExpanded ? '▼' : '▶'}</span>
            </div>

            {/* Content */}
            {isExpanded && (
                <div className="max-h-80 overflow-y-auto">
                    {/* Errors */}
                    {totalErrors > 0 && (
                        <div className="p-3 border-b border-gray-200">
                            <div className="font-semibold text-sm text-red-800 mb-2">Errors</div>
                            <div className="space-y-2">
                                {Array.from(errors.entries()).map(([elementId, errorList]) => (
                                    <div key={elementId} className="bg-red-50 border border-red-200 rounded p-2">
                                        <div className="font-medium text-xs text-red-900 mb-1">
                                            {getElementName(elementId)}
                                        </div>
                                        <ul className="list-disc list-inside text-xs text-red-700 space-y-1">
                                            {errorList.map((error, idx) => (
                                                <li key={idx}>{error}</li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Warnings */}
                    {totalWarnings > 0 && (
                        <div className="p-3">
                            <div className="font-semibold text-sm text-yellow-800 mb-2">Warnings</div>
                            <div className="space-y-2">
                                {Array.from(warnings.entries()).map(([elementId, warningList]) => (
                                    <div key={elementId} className="bg-yellow-50 border border-yellow-200 rounded p-2">
                                        <div className="font-medium text-xs text-yellow-900 mb-1">
                                            {getElementName(elementId)}
                                        </div>
                                        <ul className="list-disc list-inside text-xs text-yellow-700 space-y-1">
                                            {warningList.map((warning, idx) => (
                                                <li key={idx}>{warning}</li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ValidationPanel;