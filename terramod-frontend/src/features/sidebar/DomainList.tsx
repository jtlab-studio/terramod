import React, { useMemo } from 'react';
import { useInfraStore } from '../../store/infraStore';
import { useUIStore } from '../../store/uiStore';

const DomainList: React.FC = () => {
  const domains = useInfraStore((state) => Array.from(state.domains.values()));
  const resources = useInfraStore((state) => state.resources);
  const selectedId = useUIStore((state) => state.selectedId);
  const setSelectedId = useUIStore((state) => state.setSelectedId);

  const sortedDomains = useMemo(() => {
    return [...domains].sort((a, b) => a.name.localeCompare(b.name));
  }, [domains]);

  const getResourceCount = (domainId: string): number => {
    const domain = domains.find((d) => d.id === domainId);
    return domain?.resourceIds.length || 0;
  };

  const getResourceTypes = (domainId: string): string[] => {
    const domain = domains.find((d) => d.id === domainId);
    if (!domain) return [];

    const types = new Set<string>();
    domain.resourceIds.forEach(rid => {
      const resource = resources.get(rid);
      if (resource) {
        types.add(resource.type.replace('aws_', ''));
      }
    });
    return Array.from(types);
  };

  const handleDomainClick = (domainId: string) => {
    setSelectedId(domainId);
    console.log('Selected domain:', domainId);
  };

  const getDomainColor = (type: string): string => {
    const colors: Record<string, string> = {
      networking: '#3B82F6',
      compute: '#10B981',
      serverless: '#8B5CF6',
      data: '#F59E0B',
      storage: '#F97316',
      messaging: '#EC4899',
      identity: '#EF4444',
      observability: '#6366F1',
      edge: '#14B8A6',
    };
    return colors[type] || '#6B7280';
  };

  return (
    <div className="space-y-2">
      {domains.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-gray-400 mb-2">No domains yet</p>
          <p className="text-xs text-gray-500">
            Drag services from the palette to create domains
          </p>
        </div>
      ) : (
        <>
          <div className="text-xs text-gray-500 mb-2">
            {domains.length} domain{domains.length !== 1 ? 's' : ''} • {' '}
            {Array.from(resources.values()).length} resource{Array.from(resources.values()).length !== 1 ? 's' : ''}
          </div>

          {sortedDomains.map((domain) => {
            const resourceCount = getResourceCount(domain.id);
            const resourceTypes = getResourceTypes(domain.id);
            const isSelected = selectedId === domain.id;

            return (
              <div
                key={domain.id}
                onClick={() => handleDomainClick(domain.id)}
                className={`p-2 rounded cursor-pointer transition-all ${isSelected
                    ? 'bg-gray-700 border-2 border-gray-600 shadow-sm'
                    : 'bg-gray-800 border border-gray-700 hover:border-gray-600 hover:bg-gray-750'
                  }`}
              >
                <div className="flex items-start justify-between mb-1">
                  <div className="font-medium text-sm text-gray-200">{domain.name}</div>
                  <div className="text-xs text-gray-500">{resourceCount}</div>
                </div>

                <div className="text-xs text-gray-400 mb-1 capitalize flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: getDomainColor(domain.type) }}
                  />
                  {domain.type}
                </div>

                {resourceTypes.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {resourceTypes.slice(0, 3).map((type, idx) => (
                      <span
                        key={idx}
                        className="text-xs px-1.5 py-0.5 bg-gray-900 border border-gray-700 text-gray-400 rounded"
                      >
                        {type}
                      </span>
                    ))}
                    {resourceTypes.length > 3 && (
                      <span className="text-xs px-1.5 py-0.5 text-gray-500">
                        +{resourceTypes.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
};

export default DomainList;