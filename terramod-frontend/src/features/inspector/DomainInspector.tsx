import React from 'react';
import { useInfraStore } from '../../store/infraStore';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';

interface DomainInspectorProps {
  domainId: string;
}

const DomainInspector: React.FC<DomainInspectorProps> = ({ domainId }) => {
  const domain = useInfraStore((state) => state.domains.get(domainId));
  const updateDomain = useInfraStore((state) => state.updateDomain);
  const resources = useInfraStore((state) => 
    domain?.resourceIds.map(id => state.resources.get(id)).filter(Boolean) || []
  );

  if (!domain) return null;

  const handleNameChange = (name: string) => {
    updateDomain(domainId, { name });
  };

  const handleAddInput = () => {
    const newInput = {
      name: 'new_input',
      type: 'string',
      required: false,
    };
    updateDomain(domainId, {
      inputs: [...domain.inputs, newInput],
    });
  };

  const handleRemoveInput = (index: number) => {
    const newInputs = domain.inputs.filter((_, idx) => idx !== index);
    updateDomain(domainId, { inputs: newInputs });
  };

  const handleAddOutput = () => {
    const newOutput = {
      name: 'new_output',
      type: 'string',
    };
    updateDomain(domainId, {
      outputs: [...domain.outputs, newOutput],
    });
  };

  const handleRemoveOutput = (index: number) => {
    const newOutputs = domain.outputs.filter((_, idx) => idx !== index);
    updateDomain(domainId, { outputs: newOutputs });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">Domain: {domain.name}</h2>
      
      <Input
        label="Name"
        value={domain.name}
        onChange={handleNameChange}
      />

      <div>
        <p className="text-sm font-medium mb-1">Type</p>
        <Badge variant="neutral">{domain.type}</Badge>
      </div>

      <div>
        <p className="text-sm font-medium mb-1">Resources ({resources.length})</p>
        <div className="space-y-1">
          {resources.map((resource) => (
            resource && (
              <div key={resource.id} className="text-sm text-gray-600">
                {resource.name}
              </div>
            )
          ))}
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <p className="text-sm font-medium">Inputs</p>
          <button
            onClick={handleAddInput}
            className="text-xs text-blue-600 hover:text-blue-700"
          >
            + Add
          </button>
        </div>
        <div className="space-y-2">
          {domain.inputs.map((input, idx) => (
            <div key={idx} className="flex justify-between items-center text-sm">
              <span>{input.name}</span>
              <button
                onClick={() => handleRemoveInput(idx)}
                className="text-red-600 hover:text-red-700"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <p className="text-sm font-medium">Outputs</p>
          <button
            onClick={handleAddOutput}
            className="text-xs text-blue-600 hover:text-blue-700"
          >
            + Add
          </button>
        </div>
        <div className="space-y-2">
          {domain.outputs.map((output, idx) => (
            <div key={idx} className="flex justify-between items-center text-sm">
              <span>{output.name}</span>
              <button
                onClick={() => handleRemoveOutput(idx)}
                className="text-red-600 hover:text-red-700"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DomainInspector;
