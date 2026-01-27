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
      networking: 'bg-blue-100 border-blue-300',
      compute: 'bg-green-100 border-green-300',
      serverless: 'bg-purple-100 border-purple-300',
      data: 'bg-yellow-100 border-yellow-300',
      storage: 'bg-orange-100 border-orange-300',
      messaging: 'bg-pink-100 border-pink-300',
      identity: 'bg-red-100 border-red-300',
      observability: 'bg-indigo-100 border-indigo-300',
      edge: 'bg-teal-100 border-teal-300',
    };
    return colors[type] || 'bg-gray-100 border-gray-300';
  };

  return (
    <div className="space-y-2">
      {domains.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-gray-500 mb-2">No domains yet</p>
          <p className="text-xs text-gray-400">
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
                className={`p-2 rounded cursor-pointer transition-all ${
                  isSelected
                    ? `${getDomainColor(domain.type)} border-2 shadow-sm`
                    : 'bg-white border border-gray-200 hover:border-gray-400'
                }`}
              >
                <div className="flex items-start justify-between mb-1">
                  <div className="font-medium text-sm">{domain.name}</div>
                  <div className="text-xs text-gray-500">{resourceCount}</div>
                </div>
                
                <div className="text-xs text-gray-600 mb-1 capitalize">
                  {domain.type}
                </div>

                {resourceTypes.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {resourceTypes.slice(0, 3).map((type, idx) => (
                      <span
                        key={idx}
                        className="text-xs px-1.5 py-0.5 bg-white border border-gray-200 rounded"
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
