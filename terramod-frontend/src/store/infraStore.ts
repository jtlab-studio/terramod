import { create } from 'zustand';
import { Domain } from '../types/domain';
import { Resource } from '../types/resource';
import { Connection } from '../types/connection';

interface InfraState {
  domains: Map<string, Domain>;
  resources: Map<string, Resource>;
  connections: Map<string, Connection>;
  addDomain: (domain: Domain) => void;
  updateDomain: (id: string, updates: Partial<Domain>) => void;
  deleteDomain: (id: string) => void;
  addResource: (resource: Resource) => void;
  updateResource: (id: string, updates: Partial<Resource>) => void;
  deleteResource: (id: string) => void;
  addConnection: (connection: Connection) => void;
  updateConnection: (id: string, updates: Partial<Connection>) => void;
  deleteConnection: (id: string) => void;
  clearGraph: () => void;
}

export const useInfraStore = create<InfraState>((set) => ({
  domains: new Map(),
  resources: new Map(),
  connections: new Map(),

  addDomain: (domain) =>
    set((state) => ({
      domains: new Map(state.domains).set(domain.id, domain),
    })),

  updateDomain: (id, updates) =>
    set((state) => {
      const domain = state.domains.get(id);
      if (!domain) return state;
      const updated = { ...domain, ...updates };
      return {
        domains: new Map(state.domains).set(id, updated),
      };
    }),

  deleteDomain: (id) =>
    set((state) => {
      const newDomains = new Map(state.domains);
      newDomains.delete(id);
      const domain = state.domains.get(id);
      const newResources = new Map(state.resources);
      domain?.resourceIds.forEach((rid) => newResources.delete(rid));
      return { domains: newDomains, resources: newResources };
    }),

  addResource: (resource) =>
    set((state) => ({
      resources: new Map(state.resources).set(resource.id, resource),
    })),

  updateResource: (id, updates) =>
    set((state) => {
      const resource = state.resources.get(id);
      if (!resource) return state;
      const updated = { ...resource, ...updates };
      return {
        resources: new Map(state.resources).set(id, updated),
      };
    }),

  deleteResource: (id) =>
    set((state) => {
      const newResources = new Map(state.resources);
      newResources.delete(id);
      return { resources: newResources };
    }),

  addConnection: (connection) =>
    set((state) => ({
      connections: new Map(state.connections).set(connection.id, connection),
    })),

  updateConnection: (id, updates) =>
    set((state) => {
      const connection = state.connections.get(id);
      if (!connection) return state;
      const updated = { ...connection, ...updates };
      return {
        connections: new Map(state.connections).set(id, updated),
      };
    }),

  deleteConnection: (id) =>
    set((state) => {
      const newConnections = new Map(state.connections);
      newConnections.delete(id);
      return { connections: newConnections };
    }),

  clearGraph: () =>
    set({
      domains: new Map(),
      resources: new Map(),
      connections: new Map(),
    }),
}));
