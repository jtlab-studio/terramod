import React, { useState, useEffect, useCallback } from 'react';
import { useInfraStore } from '../../store/infraStore';
import { getResourceSchema } from '../../api/registry';
import ArgumentField from './components/ArgumentField';
import { ResourceSchema } from '../../api/registry';

interface ResourceInspectorProps {
  resourceId: string;
}

const ResourceInspector: React.FC<ResourceInspectorProps> = ({ resourceId }) => {
  const resource = useInfraStore((state) => state.resources.get(resourceId));
  const updateResource = useInfraStore((state) => state.updateResource);
  const deleteResource = useInfraStore((state) => state.deleteResource);
  const domains = useInfraStore((state) => state.domains);

  const [schema, setSchema] = useState<ResourceSchema | null>(null);
  const [isLoadingSchema, setIsLoadingSchema] = useState(false);
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
      <div className="p-4 text-gray-400">
        Resource not found
      </div>
    );
  }

  const domain = domains.get(resource.domainId);

  return (
    <div className="space-y-4 h-full overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-gray-900 pb-3 border-b border-gray-800">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold text-gray-100">{resource.type}</h2>
          <button
            onClick={handleDelete}
            className="text-red-400 hover:text-red-300 text-sm"
          >
            Delete
          </button>
        </div>

        {domain && (
          <div className="text-xs text-gray-500">
            Domain: <span className="font-medium text-gray-400">{domain.name}</span>
          </div>
        )}
      </div>

      {/* Resource Name */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Resource Name
        </label>
        <input
          type="text"
          value={resource.name}
          onChange={(e) => handleNameChange(e.target.value)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-600"
          placeholder="Enter resource name"
        />
      </div>

      {/* Resource ID */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Resource ID
        </label>
        <div className="px-3 py-2 bg-gray-800 border border-gray-700 text-gray-400 rounded-md text-sm font-mono">
          {resource.id}
        </div>
      </div>

      {/* Loading Schema */}
      {isLoadingSchema && (
        <div className="py-8 text-center text-gray-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mx-auto mb-2"></div>
          Loading schema...
        </div>
      )}

      {/* Arguments */}
      {schema && !isLoadingSchema && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-300">Arguments</h3>
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
            <summary className="cursor-pointer text-sm font-medium text-gray-400 hover:text-gray-300">
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

      {/* Info message */}
      <div className="mt-6 p-3 bg-gray-800 border border-gray-700 rounded text-xs text-gray-400">
        <p className="font-medium text-gray-300 mb-1">💡 Configuration</p>
        <p>Configure the resource arguments above. Changes are saved automatically when you move focus.</p>
      </div>
    </div>
  );
};

export default ResourceInspector;