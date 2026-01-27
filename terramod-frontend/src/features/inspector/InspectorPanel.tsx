import React from 'react';
import { useUIStore } from '../../store/uiStore';
import { useInfraStore } from '../../store/infraStore';
import ResourceInspector from './ResourceInspector';
import DomainInspector from './DomainInspector';
import ConnectionInspector from './ConnectionInspector';

const InspectorPanel: React.FC = () => {
  const selectedId = useUIStore((state) => state.selectedId);
  const inspectorOpen = useUIStore((state) => state.inspectorOpen);
  const domains = useInfraStore((state) => state.domains);
  const resources = useInfraStore((state) => state.resources);
  const connections = useInfraStore((state) => state.connections);

  if (!inspectorOpen || !selectedId) {
    return (
      <div className="w-80 bg-gray-900 border-l border-gray-800 p-4">
        <p className="text-gray-500 text-sm">Select an element to configure</p>
      </div>
    );
  }

  const renderInspector = () => {
    if (domains.has(selectedId)) {
      return <DomainInspector domainId={selectedId} />;
    }
    if (resources.has(selectedId)) {
      return <ResourceInspector resourceId={selectedId} />;
    }
    if (connections.has(selectedId)) {
      return <ConnectionInspector connectionId={selectedId} />;
    }
    return <p className="text-gray-500 text-sm">Element not found</p>;
  };

  return (
    <div className="w-80 bg-gray-900 border-l border-gray-800 p-4 overflow-y-auto">
      {renderInspector()}
    </div>
  );
};

export default InspectorPanel;