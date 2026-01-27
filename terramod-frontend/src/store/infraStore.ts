import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Domain } from '../types/domain';
import { Resource } from '../types/resource';
import { Connection } from '../types/connection';
import { DeploymentConfig } from '../types/deployment';

interface InfraState {
  domains: Map<string, Domain>;
  resources: Map<string, Resource>;
  connections: Map<string, Connection>;

  // NEW: Deployment configuration
  deploymentConfig: DeploymentConfig;

  addDomain: (domain: Domain) => void;
  updateDomain: (id: string, updates: Partial<Domain>) => void;
  deleteDomain: (id: string) => void;
  addResource: (resource: Resource) => void;
  updateResource: (id: string, updates: Partial<Resource>) => void;
  deleteResource: (id: string) => void;
  addConnection: (connection: Connection) => void;
  updateConnection: (id: string, updates: Partial<Connection>) => void;
  deleteConnection: (id: string) => void;

  // NEW: Deployment config
  updateDeploymentConfig: (config: Partial<DeploymentConfig>) => void;

  clearGraph: () => void;
  importGraph: (data: { domains: Domain[]; resources: Resource[]; connections: Connection[] }) => void;
  exportGraph: () => { domains: Domain[]; resources: Resource[]; connections: Connection[] };
}

export const useInfraStore = create<InfraState>()(
  persist(
    (set, get) => ({
      domains: new Map(),
      resources: new Map(),
      connections: new Map(),

      // Default deployment configuration
      deploymentConfig: {
        primaryRegion: 'us-east-1',
        availabilityZones: ['us-east-1a', 'us-east-1b', 'us-east-1c']
      },

      addDomain: (domain) =>
        set((state) => {
          const newDomains = new Map(state.domains);
          newDomains.set(domain.id, domain);
          console.log('Added domain:', domain.id);
          return { domains: newDomains };
        }),

      updateDomain: (id, updates) =>
        set((state) => {
          const domain = state.domains.get(id);
          if (!domain) {
            console.warn('Domain not found:', id);
            return state;
          }
          const updated = { ...domain, ...updates };
          const newDomains = new Map(state.domains);
          newDomains.set(id, updated);
          console.log('Updated domain:', id, updates);
          return { domains: newDomains };
        }),

      deleteDomain: (id) =>
        set((state) => {
          const domain = state.domains.get(id);
          if (!domain) return state;

          const newDomains = new Map(state.domains);
          newDomains.delete(id);

          // Delete associated resources
          const newResources = new Map(state.resources);
          domain.resourceIds.forEach((rid) => {
            newResources.delete(rid);
          });

          // Delete connections involving deleted resources
          const newConnections = new Map(state.connections);
          for (const [connId, conn] of newConnections.entries()) {
            if (conn.sourceId === id || conn.targetId === id ||
              domain.resourceIds.includes(conn.sourceId) ||
              domain.resourceIds.includes(conn.targetId)) {
              newConnections.delete(connId);
            }
          }

          console.log('Deleted domain:', id);
          return { domains: newDomains, resources: newResources, connections: newConnections };
        }),

      addResource: (resource) =>
        set((state) => {
          const newResources = new Map(state.resources);
          newResources.set(resource.id, resource);

          // Add to domain's resource list if not already there
          const newDomains = new Map(state.domains);
          const domain = newDomains.get(resource.domainId);
          if (domain && !domain.resourceIds.includes(resource.id)) {
            const updatedDomain = {
              ...domain,
              resourceIds: [...domain.resourceIds, resource.id]
            };
            newDomains.set(domain.id, updatedDomain);
          }

          console.log('Added resource:', resource.id, 'to domain:', resource.domainId);
          return { resources: newResources, domains: newDomains };
        }),

      updateResource: (id, updates) =>
        set((state) => {
          const resource = state.resources.get(id);
          if (!resource) {
            console.warn('Resource not found:', id);
            return state;
          }

          const updated = { ...resource, ...updates };
          const newResources = new Map(state.resources);
          newResources.set(id, updated);

          console.log('Updated resource:', id, updates);
          return { resources: newResources };
        }),

      deleteResource: (id) =>
        set((state) => {
          const resource = state.resources.get(id);
          if (!resource) return state;

          const newResources = new Map(state.resources);
          newResources.delete(id);

          // Remove from domain's resource list
          const newDomains = new Map(state.domains);
          const domain = newDomains.get(resource.domainId);
          if (domain) {
            const updatedDomain = {
              ...domain,
              resourceIds: domain.resourceIds.filter(rid => rid !== id)
            };
            newDomains.set(domain.id, updatedDomain);
          }

          // Delete associated connections
          const newConnections = new Map(state.connections);
          for (const [connId, conn] of newConnections.entries()) {
            if (conn.sourceId === id || conn.targetId === id) {
              newConnections.delete(connId);
            }
          }

          console.log('Deleted resource:', id);
          return { resources: newResources, domains: newDomains, connections: newConnections };
        }),

      addConnection: (connection) =>
        set((state) => {
          const newConnections = new Map(state.connections);
          newConnections.set(connection.id, connection);
          console.log('Added connection:', connection.id);
          return { connections: newConnections };
        }),

      updateConnection: (id, updates) =>
        set((state) => {
          const connection = state.connections.get(id);
          if (!connection) {
            console.warn('Connection not found:', id);
            return state;
          }
          const updated = { ...connection, ...updates };
          const newConnections = new Map(state.connections);
          newConnections.set(id, updated);
          console.log('Updated connection:', id, updates);
          return { connections: newConnections };
        }),

      deleteConnection: (id) =>
        set((state) => {
          const newConnections = new Map(state.connections);
          newConnections.delete(id);
          console.log('Deleted connection:', id);
          return { connections: newConnections };
        }),

      updateDeploymentConfig: (config) =>
        set((state) => {
          const updated = { ...state.deploymentConfig, ...config };
          console.log('Updated deployment config:', updated);
          return { deploymentConfig: updated };
        }),

      clearGraph: () =>
        set(() => {
          console.log('Clearing graph');
          return {
            domains: new Map(),
            resources: new Map(),
            connections: new Map()
          };
        }),

      importGraph: (data) =>
        set(() => {
          const domains = new Map(data.domains.map(d => [d.id, d]));
          const resources = new Map(data.resources.map(r => [r.id, r]));
          const connections = new Map(data.connections.map(c => [c.id, c]));
          console.log('Imported graph:', data);
          return { domains, resources, connections };
        }),

      exportGraph: () => {
        const state = get();
        return {
          domains: Array.from(state.domains.values()),
          resources: Array.from(state.resources.values()),
          connections: Array.from(state.connections.values())
        };
      }
    }),
    {
      name: 'terramod-infra-storage',
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          const { state } = JSON.parse(str);
          return {
            state: {
              ...state,
              domains: new Map(state.domains),
              resources: new Map(state.resources),
              connections: new Map(state.connections),
              deploymentConfig: state.deploymentConfig || {
                primaryRegion: 'us-east-1',
                availabilityZones: ['us-east-1a', 'us-east-1b', 'us-east-1c']
              }
            }
          };
        },
        setItem: (name, value) => {
          const { state } = value;
          const serialized = {
            state: {
              domains: Array.from(state.domains.entries()),
              resources: Array.from(state.resources.entries()),
              connections: Array.from(state.connections.entries()),
              deploymentConfig: state.deploymentConfig
            }
          };
          localStorage.setItem(name, JSON.stringify(serialized));
        },
        removeItem: (name) => localStorage.removeItem(name)
      }
    }
  )
);