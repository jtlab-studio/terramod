import React, { useState, useEffect, useCallback } from 'react';
import { useInfraStore } from '../../store/infraStore';
import { useValidationStore } from '../../store/validationStore';
import { getResourceSchema } from '../../api/registry';
import { validateGraph } from '../../api/graph';
import ArgumentField from './components/ArgumentField';
import ValidationMessage from './components/ValidationMessage';
import { ResourceSchema } from '../../api/registry';
import { VALIDATION_DEBOUNCE_MS } from '../../config/constants';

interface ResourceInspectorProps {
  resourceId: string;
}

const ResourceInspector: React.FC<ResourceInspectorProps> = ({ resourceId }) => {
  const resource = useInfraStore((state) => state.resources.get(resourceId));
  const updateResource = useInfraStore((state) => state.updateResource);
  const deleteResource = useInfraStore((state) => state.deleteResource);
  const domains = useInfraStore((state) => state.domains);
  const resources = useInfraStore((state) => state.resources);
  const connections = useInfraStore((state) => state.connections);
  
  const validationState = useValidationStore((state) => 
    state.getValidationState(resourceId)
  );
  const setValidationResults = useValidationStore((state) => state.setValidationResults);

  const [schema, setSchema] = useState<ResourceSchema | null>(null);
  const [isLoadingSchema, setIsLoadingSchema] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [localArguments, setLocalArguments] = useState<Record<string, any>>({});

  // Load resource schema
  useEffect(() => {
    if (resource) {
      setIsLoadingSchema(true);
      getResourceSchema(resource.type).then((result) => {
        if (result.ok) {
          setSchema(result.value);
        } else {
          console.error('Failed to load schema:', result.error);
        }
        setIsLoadingSchema(false);
      });

      // Initialize local arguments
      setLocalArguments(resource.arguments);
    }
  }, [resource?.type]);

  // Debounced validation
  useEffect(() => {
    const timer = setTimeout(() => {
      if (resource) {
        performValidation();
      }
    }, VALIDATION_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [localArguments]);

  const performValidation = useCallback(async () => {
    setIsValidating(true);
    
    try {
      const graph = {
        domains: Array.from(domains.values()),
        resources: Array.from(resources.values()),
        connections: Array.from(connections.values())
      };

      const result = await validateGraph(graph);
      
      if (result.ok) {
        setValidationResults(result.value);
      }
    } catch (error) {
      console.error('Validation failed:', error);
    } finally {
      setIsValidating(false);
    }
  }, [domains, resources, connections, setValidationResults]);

  const handleArgumentChange = useCallback((name: string, value: any) => {
    setLocalArguments(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleArgumentBlur = useCallback((name: string) => {
    if (resource) {
      updateResource(resourceId, {
        arguments: { ...resource.arguments, [name]: localArguments[name] }
      });
    }
  }, [resource, resourceId, localArguments, updateResource]);

  const handleNameChange = useCallback((name: string) => {
    updateResource(resourceId, { name });
  }, [resourceId, updateResource]);

  const handleDelete = useCallback(() => {
    if (confirm('Are you sure you want to delete this resource?')) {
      deleteResource(resourceId);
    }
  }, [resourceId, deleteResource]);

  if (!resource) {
    return (
      <div className="p-4 text-gray-500">
        Resource not found
      </div>
    );
  }

  const domain = domains.get(resource.domainId);

  return (
    <div className="space-y-4 h-full overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-gray-50 pb-3 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold text-gray-800">{resource.type}</h2>
          <button
            onClick={handleDelete}
            className="text-red-600 hover:text-red-700 text-sm"
          >
            Delete
          </button>
        </div>
        
        {domain && (
          <div className="text-xs text-gray-500">
            Domain: <span className="font-medium">{domain.name}</span>
          </div>
        )}
      </div>

      {/* Resource Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Resource Name
        </label>
        <input
          type="text"
          value={resource.name}
          onChange={(e) => handleNameChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter resource name"
        />
      </div>

      {/* Loading Schema */}
      {isLoadingSchema && (
        <div className="py-8 text-center text-gray-500">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          Loading schema...
        </div>
      )}

      {/* Arguments */}
      {schema && !isLoadingSchema && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">Arguments</h3>
            {isValidating && (
              <span className="text-xs text-gray-500">Validating...</span>
            )}
          </div>

          {/* Required arguments */}
          <div className="space-y-3">
            {Object.entries(schema.inputs).map(([name, argSchema]) => {
              if (argSchema.required) {
                return (
                  <ArgumentField
                    key={name}
                    name={name}
                    value={localArguments[name] ?? ''}
                    type={argSchema.type as any}
                    required={argSchema.required}
                    onChange={(value) => handleArgumentChange(name, value)}
                    onBlur={() => handleArgumentBlur(name)}
                  />
                );
              }
              return null;
            })}
          </div>

          {/* Optional arguments */}
          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-800">
              Optional Arguments ({Object.values(schema.inputs).filter(s => !s.required).length})
            </summary>
            <div className="mt-3 space-y-3">
              {Object.entries(schema.inputs).map(([name, argSchema]) => {
                if (!argSchema.required) {
                  return (
                    <ArgumentField
                      key={name}
                      name={name}
                      value={localArguments[name] ?? ''}
                      type={argSchema.type as any}
                      required={argSchema.required}
                      onChange={(value) => handleArgumentChange(name, value)}
                      onBlur={() => handleArgumentBlur(name)}
                    />
                  );
                }
                return null;
              })}
            </div>
          </details>
        </div>
      )}

      {/* Validation Messages */}
      {(validationState.errors.length > 0 || validationState.warnings.length > 0) && (
        <div className="space-y-2 pt-4 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700">Validation</h3>
          
          {validationState.errors.map((error, idx) => (
            <ValidationMessage key={`error-${idx}`} type="error" message={error} />
          ))}
          
          {validationState.warnings.map((warning, idx) => (
            <ValidationMessage key={`warning-${idx}`} type="warning" message={warning} />
          ))}
        </div>
      )}

      {/* Valid state indicator */}
      {validationState.isValid && validationState.errors.length === 0 && (
        <div className="flex items-center gap-2 text-sm text-green-600 pt-4 border-t border-gray-200">
          <span className="text-lg">✓</span>
          <span>Resource is valid</span>
        </div>
      )}
    </div>
  );
};

export default ResourceInspector;
