import React, { useMemo } from 'react';
import { useInfraStore } from '../../store/infraStore';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import { ConnectionType } from '../../types/connection';

interface ConnectionInspectorProps {
  connectionId: string;
}

const ConnectionInspector: React.FC<ConnectionInspectorProps> = ({ connectionId }) => {
  const connection = useInfraStore((state) => state.connections.get(connectionId));
  const updateConnection = useInfraStore((state) => state.updateConnection);
  const deleteConnection = useInfraStore((state) => state.deleteConnection);
  const domains = useInfraStore((state) => state.domains);
  const resources = useInfraStore((state) => state.resources);

  const sourceElement = useMemo(() => {
    if (!connection) return null;
    return connection.sourceType === 'domain' 
      ? domains.get(connection.sourceId)
      : resources.get(connection.sourceId);
  }, [connection, domains, resources]);

  const targetElement = useMemo(() => {
    if (!connection) return null;
    return connection.targetType === 'domain'
      ? domains.get(connection.targetId)
      : resources.get(connection.targetId);
  }, [connection, domains, resources]);

  const availableOutputs = useMemo(() => {
    if (!sourceElement || !('outputs' in sourceElement)) return [];
    return sourceElement.outputs.map(o => ({ value: o.name, label: o.name }));
  }, [sourceElement]);

  const availableInputs = useMemo(() => {
    if (!targetElement || !('inputs' in targetElement)) return [];
    return targetElement.inputs.map(i => ({ value: i.name, label: i.name }));
  }, [targetElement]);

  if (!connection) {
    return <div className="p-4 text-gray-500">Connection not found</div>;
  }

  const handleTypeChange = (type: string) => {
    updateConnection(connectionId, { connectionType: type as ConnectionType });
  };

  const handleOutputChange = (outputName: string) => {
    updateConnection(connectionId, { outputName });
  };

  const handleInputChange = (inputName: string) => {
    updateConnection(connectionId, { inputName });
  };

  const handleDelete = () => {
    if (confirm('Delete this connection?')) {
      deleteConnection(connectionId);
    }
  };

  const getElementName = (element: any) => {
    if (!element) return 'Unknown';
    return 'name' in element ? element.name : element.id;
  };

  return (
    <div className="space-y-4 h-full overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-gray-50 pb-3 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold text-gray-800">Connection</h2>
          <button
            onClick={handleDelete}
            className="text-red-600 hover:text-red-700 text-sm"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Source */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
        <div className="p-2 bg-white border border-gray-200 rounded">
          <div className="font-medium text-sm">{getElementName(sourceElement)}</div>
          <div className="text-xs text-gray-500 mt-1">
            Type: {connection.sourceType}
          </div>
        </div>
      </div>

      {/* Target */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Target</label>
        <div className="p-2 bg-white border border-gray-200 rounded">
          <div className="font-medium text-sm">{getElementName(targetElement)}</div>
          <div className="text-xs text-gray-500 mt-1">
            Type: {connection.targetType}
          </div>
        </div>
      </div>

      {/* Connection Type */}
      <Select
        label="Connection Type"
        value={connection.connectionType}
        onChange={handleTypeChange}
        options={[
          { value: 'data', label: 'Data Flow' },
          { value: 'dependency', label: 'Dependency' },
          { value: 'implicit', label: 'Implicit' },
        ]}
      />

      {/* Output Selection (for domain connections) */}
      {connection.sourceType === 'domain' && availableOutputs.length > 0 && (
        <Select
          label="Source Output"
          value={connection.outputName || ''}
          onChange={handleOutputChange}
          options={[
            { value: '', label: 'Select output...' },
            ...availableOutputs
          ]}
        />
      )}

      {/* Input Selection (for domain connections) */}
      {connection.targetType === 'domain' && availableInputs.length > 0 && (
        <Select
          label="Target Input"
          value={connection.inputName || ''}
          onChange={handleInputChange}
          options={[
            { value: '', label: 'Select input...' },
            ...availableInputs
          ]}
        />
      )}

      {/* Connection Info */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm">
        <p className="text-gray-700">
          This connection represents a {connection.connectionType} relationship 
          from {getElementName(sourceElement)} to {getElementName(targetElement)}.
        </p>
      </div>
    </div>
  );
};

export default ConnectionInspector;
