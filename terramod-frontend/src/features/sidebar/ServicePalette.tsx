import React, { useState, useEffect } from 'react';
import { getServices, ServiceDefinition } from '../../api/registry';

const ServicePalette: React.FC = () => {
  const [services, setServices] = useState<ServiceDefinition[]>([]);
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(
    new Set(['networking', 'compute']) // Default expanded
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getServices();
      if (result.ok) {
        setServices(result.value);
        console.log('Loaded services:', result.value.length);
      } else {
        setError(result.error.message);
        console.error('Failed to load services:', result.error);
      }
    } catch (err) {
      setError('Failed to connect to backend');
      console.error('Service load error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleDomain = (domain: string) => {
    setExpandedDomains((prev) => {
      const next = new Set(prev);
      if (next.has(domain)) {
        next.delete(domain);
      } else {
        next.add(domain);
      }
      return next;
    });
  };

  const handleDragStart = (e: React.DragEvent, service: ServiceDefinition) => {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('service', JSON.stringify(service));
    console.log('Drag started:', service.resource_type);
  };

  const groupedServices = services.reduce((acc, service) => {
    if (!acc[service.domain]) {
      acc[service.domain] = [];
    }
    acc[service.domain].push(service);
    return acc;
  }, {} as Record<string, ServiceDefinition[]>);

  const filteredGroups = Object.entries(groupedServices).reduce((acc, [domain, domainServices]) => {
    if (searchQuery) {
      const filtered = domainServices.filter(s => 
        s.resource_type.toLowerCase().includes(searchQuery.toLowerCase())
      );
      if (filtered.length > 0) {
        acc[domain] = filtered;
      }
    } else {
      acc[domain] = domainServices;
    }
    return acc;
  }, {} as Record<string, ServiceDefinition[]>);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-500">Loading services...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">
          <p className="font-medium mb-1">Failed to load services</p>
          <p className="text-xs">{error}</p>
          <button
            onClick={loadServices}
            className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Search */}
      <div className="mb-3">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search services..."
          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Service Groups */}
      {Object.entries(filteredGroups).map(([domain, domainServices]) => (
        <div key={domain} className="border-b border-gray-200 pb-2">
          <button
            onClick={() => toggleDomain(domain)}
            className="w-full text-left px-2 py-1.5 font-medium text-sm hover:bg-gray-100 rounded flex items-center justify-between"
          >
            <span className="flex items-center gap-2">
              <span className="text-gray-400">
                {expandedDomains.has(domain) ? '▼' : '▶'}
              </span>
              <span className="capitalize">{domain}</span>
              <span className="text-xs text-gray-500">({domainServices.length})</span>
            </span>
          </button>
          
          {expandedDomains.has(domain) && (
            <div className="ml-4 mt-1 space-y-1">
              {domainServices.map((service) => (
                <div
                  key={service.resource_type}
                  draggable
                  onDragStart={(e) => handleDragStart(e, service)}
                  className="px-2 py-1.5 text-sm bg-white border border-gray-200 rounded cursor-move hover:border-blue-400 hover:shadow-sm transition-all"
                  title={`Drag to canvas to add ${service.resource_type}`}
                >
                  <div className="font-medium text-gray-700">
                    {service.resource_type.replace('aws_', '')}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {service.category}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {Object.keys(filteredGroups).length === 0 && (
        <div className="text-center py-8 text-gray-500 text-sm">
          No services found matching "{searchQuery}"
        </div>
      )}
    </div>
  );
};

export default ServicePalette;
