import React from 'react';
import { useInfraStore } from '../../store/infraStore';
import Select from '../../components/ui/Select';
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

  if (!connection) return null;

  const sourceElement = connection.sourceType === 'domain' 
    ? domains.get(connection.sourceId)
    : resources.get(connection.sourceId);

  const targetElement = connection.targetType === 'domain'
    ? domains.get(connection.targetId)
    : resources.get(connection.targetId);

  const handleTypeChange = (type: ConnectionType) => {
    updateConnection(connectionId, { connectionType: type });
  };

  const handleOutputChange = (outputName: string) => {
    updateConnection(connectionId, { outputName });
  };

  const handleInputChange = (inputName: string) => {
    updateConnection(connectionId, { inputName });
  };

  const handleDelete = () => {
    deleteConnection(connectionId);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">Connection</h2>
      
      <div>
        <p className="text-sm font-medium mb-1">Source</p>
        <p className="text-sm text-gray-600">
          {sourceElement ? ('name' in sourceElement ? sourceElement.name : sourceElement.id) : 'Unknown'}
        </p>
      </div>

      <div>
        <p className="text-sm font-medium mb-1">Target</p>
        <p className="text-sm text-gray-600">
          {targetElement ? ('name' in targetElement ? targetElement.name : targetElement.id) : 'Unknown'}
        </p>
      </div>

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

      <button
        onClick={handleDelete}
        className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
      >
        Delete Connection
      </button>
    </div>
  );
};

export default ConnectionInspector;
