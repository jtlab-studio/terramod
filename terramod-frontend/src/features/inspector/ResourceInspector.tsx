import React, { useState, useEffect } from 'react';
import { useInfraStore } from '../../store/infraStore';
import { useValidationStore } from '../../store/validationStore';
import { getResourceSchema } from '../../api/registry';
import ArgumentField from './components/ArgumentField';
import ValidationMessage from './components/ValidationMessage';

interface ResourceInspectorProps {
  resourceId: string;
}

const ResourceInspector: React.FC<ResourceInspectorProps> = ({ resourceId }) => {
  const resource = useInfraStore((state) => state.resources.get(resourceId));
  const updateResource = useInfraStore((state) => state.updateResource);
  const validationState = useValidationStore((state) => 
    state.getValidationState(resourceId)
  );

  const [schema, setSchema] = useState<any>(null);

  useEffect(() => {
    if (resource) {
      getResourceSchema(resource.type).then((result) => {
        if (result.ok) {
          setSchema(result.value);
        }
      });
    }
  }, [resource]);

  if (!resource) return null;

  const handleArgumentChange = (name: string, value: any) => {
    updateResource(resourceId, {
      arguments: { ...resource.arguments, [name]: value },
    });
  };

  const handleNameChange = (name: string) => {
    updateResource(resourceId, { name });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">{resource.type}</h2>
      
      <div>
        <label className="block text-sm font-medium mb-1">Name</label>
        <input
          type="text"
          value={resource.name}
          onChange={(e) => handleNameChange(e.target.value)}
          className="w-full px-3 py-2 border rounded"
        />
      </div>

      {schema && Object.entries(schema.inputs || {}).map(([name, argSchema]: [string, any]) => (
        <ArgumentField
          key={name}
          name={name}
          value={resource.arguments[name]}
          type={argSchema.type}
          required={argSchema.required}
          onChange={(value) => handleArgumentChange(name, value)}
        />
      ))}

      {validationState.errors.map((error, idx) => (
        <ValidationMessage key={idx} type="error" message={error} />
      ))}
      {validationState.warnings.map((warning, idx) => (
        <ValidationMessage key={idx} type="warning" message={warning} />
      ))}
    </div>
  );
};

export default ResourceInspector;
