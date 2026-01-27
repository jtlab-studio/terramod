import React, { useState, useCallback } from 'react';
import { useInfraStore } from '../../store/infraStore';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { DomainInput, DomainOutput } from '../../types/domain';

interface DomainInspectorProps {
  domainId: string;
}

const DomainInspector: React.FC<DomainInspectorProps> = ({ domainId }) => {
  const domain = useInfraStore((state) => state.domains.get(domainId));
  const updateDomain = useInfraStore((state) => state.updateDomain);
  const deleteDomain = useInfraStore((state) => state.deleteDomain);
  const resources = useInfraStore((state) => 
    domain?.resourceIds.map(id => state.resources.get(id)).filter(Boolean) || []
  );

  const [editingInput, setEditingInput] = useState<number | null>(null);
  const [editingOutput, setEditingOutput] = useState<number | null>(null);

  if (!domain) return (
    <div className="p-4 text-gray-500">Domain not found</div>
  );

  const handleNameChange = useCallback((name: string) => {
    updateDomain(domainId, { name });
  }, [domainId, updateDomain]);

  const handleAddInput = useCallback(() => {
    const newInput: DomainInput = {
      name: `input_${domain.inputs.length + 1}`,
      type: 'string',
      required: false,
      description: ''
    };
    updateDomain(domainId, {
      inputs: [...domain.inputs, newInput]
    });
    setEditingInput(domain.inputs.length);
  }, [domain, domainId, updateDomain]);

  const handleUpdateInput = useCallback((index: number, updates: Partial<DomainInput>) => {
    const newInputs = [...domain.inputs];
    newInputs[index] = { ...newInputs[index], ...updates };
    updateDomain(domainId, { inputs: newInputs });
  }, [domain, domainId, updateDomain]);

  const handleRemoveInput = useCallback((index: number) => {
    const newInputs = domain.inputs.filter((_, idx) => idx !== index);
    updateDomain(domainId, { inputs: newInputs });
    setEditingInput(null);
  }, [domain, domainId, updateDomain]);

  const handleAddOutput = useCallback(() => {
    const newOutput: DomainOutput = {
      name: `output_${domain.outputs.length + 1}`,
      type: 'string',
      description: ''
    };
    updateDomain(domainId, {
      outputs: [...domain.outputs, newOutput]
    });
    setEditingOutput(domain.outputs.length);
  }, [domain, domainId, updateDomain]);

  const handleUpdateOutput = useCallback((index: number, updates: Partial<DomainOutput>) => {
    const newOutputs = [...domain.outputs];
    newOutputs[index] = { ...newOutputs[index], ...updates };
    updateDomain(domainId, { outputs: newOutputs });
  }, [domain, domainId, updateDomain]);

  const handleRemoveOutput = useCallback((index: number) => {
    const newOutputs = domain.outputs.filter((_, idx) => idx !== index);
    updateDomain(domainId, { outputs: newOutputs });
    setEditingOutput(null);
  }, [domain, domainId, updateDomain]);

  const handleDelete = useCallback(() => {
    if (confirm(`Delete domain "${domain.name}" and all its resources?`)) {
      deleteDomain(domainId);
    }
  }, [domain, domainId, deleteDomain]);

  return (
    <div className="space-y-4 h-full overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-gray-50 pb-3 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold text-gray-800">Domain</h2>
          <button
            onClick={handleDelete}
            className="text-red-600 hover:text-red-700 text-sm"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Domain Name */}
      <Input
        label="Domain Name"
        value={domain.name}
        onChange={handleNameChange}
        required
      />

      {/* Domain Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
        <Badge variant="neutral">{domain.type}</Badge>
      </div>

      {/* Resources */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Resources ({resources.length})
        </label>
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {resources.length === 0 ? (
            <p className="text-sm text-gray-500">No resources in this domain</p>
          ) : (
            resources.map((resource) => (
              resource && (
                <div
                  key={resource.id}
                  className="text-sm px-2 py-1 bg-white border border-gray-200 rounded"
                >
                  <div className="font-medium">{resource.name}</div>
                  <div className="text-xs text-gray-500">{resource.type}</div>
                </div>
              )
            ))
          )}
        </div>
      </div>

      {/* Inputs */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Module Inputs ({domain.inputs.length})
          </label>
          <Button variant="secondary" onClick={handleAddInput} className="text-xs py-1">
            + Add Input
          </Button>
        </div>
        <div className="space-y-2">
          {domain.inputs.map((input, idx) => (
            <div key={idx} className="p-2 bg-white border border-gray-200 rounded">
              {editingInput === idx ? (
                <div className="space-y-2">
                  <Input
                    value={input.name}
                    onChange={(val) => handleUpdateInput(idx, { name: val })}
                    placeholder="Input name"
                  />
                  <Input
                    value={input.description || ''}
                    onChange={(val) => handleUpdateInput(idx, { description: val })}
                    placeholder="Description (optional)"
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      onClick={() => setEditingInput(null)}
                      className="text-xs py-1"
                    >
                      Done
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => handleRemoveInput(idx)}
                      className="text-xs py-1"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{input.name}</div>
                    {input.description && (
                      <div className="text-xs text-gray-500">{input.description}</div>
                    )}
                    <div className="text-xs text-gray-400 mt-1">
                      {input.type} • {input.required ? 'Required' : 'Optional'}
                    </div>
                  </div>
                  <button
                    onClick={() => setEditingInput(idx)}
                    className="text-blue-600 hover:text-blue-700 text-xs"
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Outputs */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Module Outputs ({domain.outputs.length})
          </label>
          <Button variant="secondary" onClick={handleAddOutput} className="text-xs py-1">
            + Add Output
          </Button>
        </div>
        <div className="space-y-2">
          {domain.outputs.map((output, idx) => (
            <div key={idx} className="p-2 bg-white border border-gray-200 rounded">
              {editingOutput === idx ? (
                <div className="space-y-2">
                  <Input
                    value={output.name}
                    onChange={(val) => handleUpdateOutput(idx, { name: val })}
                    placeholder="Output name"
                  />
                  <Input
                    value={output.description || ''}
                    onChange={(val) => handleUpdateOutput(idx, { description: val })}
                    placeholder="Description (optional)"
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      onClick={() => setEditingOutput(null)}
                      className="text-xs py-1"
                    >
                      Done
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => handleRemoveOutput(idx)}
                      className="text-xs py-1"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{output.name}</div>
                    {output.description && (
                      <div className="text-xs text-gray-500">{output.description}</div>
                    )}
                    <div className="text-xs text-gray-400 mt-1">{output.type}</div>
                  </div>
                  <button
                    onClick={() => setEditingOutput(idx)}
                    className="text-blue-600 hover:text-blue-700 text-xs"
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DomainInspector;
