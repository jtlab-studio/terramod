import React, { useState, useEffect, useMemo } from 'react';
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
        console.log('✅ Loaded services:', result.value.length);
      } else {
        setError(result.error.message);
        console.error('❌ Failed to load services:', result.error);
      }
    } catch (err) {
      setError('Failed to connect to backend');
      console.error('❌ Service load error:', err);
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
    
    // Add visual feedback
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = '0.5';
    
    console.log('🎯 Drag started:', service.resource_type);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = '1';
  };

  // Group services by domain
  const groupedServices = useMemo(() => {
    return services.reduce((acc, service) => {
      if (!acc[service.domain]) {
        acc[service.domain] = [];
      }
      acc[service.domain].push(service);
      return acc;
    }, {} as Record<string, ServiceDefinition[]>);
  }, [services]);

  // Filter based on search
  const filteredGroups = useMemo(() => {
    if (!searchQuery) return groupedServices;
    
    const result: Record<string, ServiceDefinition[]> = {};
    Object.entries(groupedServices).forEach(([domain, domainServices]) => {
      const filtered = domainServices.filter(s => 
        s.resource_type.toLowerCase().includes(searchQuery.toLowerCase())
      );
      if (filtered.length > 0) {
        result[domain] = filtered;
      }
    });
    return result;
  }, [groupedServices, searchQuery]);

  // Get icon for service type
  const getServiceIcon = (resourceType: string): string => {
    const type = resourceType.replace('aws_', '');
    const icons: Record<string, string> = {
      vpc: '🌐',
      subnet: '📍',
      security_group: '🔒',
      instance: '💻',
      s3_bucket: '🗄️',
      lambda_function: '⚡',
      iam_role: '👤',
      cloudwatch_log_group: '📊'
    };
    return icons[type] || '📦';
  };

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
          <p className="font-medium mb-1">⚠️ Failed to load services</p>
          <p className="text-xs">{error}</p>
          <button
            onClick={loadServices}
            className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
          >
            🔄 Retry
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

      {/* Service count */}
      <div className="text-xs text-gray-500 mb-2">
        {services.length} services available
      </div>

      {/* Service Groups */}
      {Object.entries(filteredGroups).map(([domain, domainServices]) => (
        <div key={domain} className="border-b border-gray-200 pb-2">
          <button
            onClick={() => toggleDomain(domain)}
            className="w-full text-left px-2 py-1.5 font-medium text-sm hover:bg-gray-100 rounded flex items-center justify-between group"
          >
            <span className="flex items-center gap-2">
              <span className="text-gray-400 text-xs">
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
                  onDragEnd={handleDragEnd}
                  className="px-2 py-1.5 text-sm bg-white border border-gray-200 rounded cursor-move hover:border-blue-400 hover:shadow-sm transition-all"
                  title={`Drag to canvas: ${service.resource_type}`}
                >
                  <div className="flex items-center gap-2">
                    <span>{getServiceIcon(service.resource_type)}</span>
                    <div className="flex-1">
                      <div className="font-medium text-gray-700">
                        {service.resource_type.replace('aws_', '').replace(/_/g, ' ')}
                      </div>
                      <div className="text-xs text-gray-500 capitalize">
                        {service.category}
                      </div>
                    </div>
                    <span className="text-xs text-gray-400">↗</span>
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

      {/* Instructions */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-xs text-gray-600">
        <p className="font-medium mb-1">💡 How to use:</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Drag a service to the canvas</li>
          <li>Drop to create a new domain</li>
          <li>Configure in the inspector</li>
        </ol>
      </div>
    </div>
  );
};

export default ServicePalette;
