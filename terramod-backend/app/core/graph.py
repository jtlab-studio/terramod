from typing import Dict, List, Optional
from app.core.domain import Domain
from app.core.resource import Resource
from app.core.connection import Connection

class InfrastructureGraph:
    """Infrastructure graph business logic"""
    
    def __init__(self):
        self.domains: Dict[str, Domain] = {}
        self.resources: Dict[str, Resource] = {}
        self.connections: Dict[str, Connection] = {}
    
    def add_domain(self, domain: Domain) -> None:
        """Add domain to graph"""
        if domain.id in self.domains:
            raise ValueError(f"Domain {domain.id} already exists")
        self.domains[domain.id] = domain
    
    def get_domain(self, domain_id: str) -> Optional[Domain]:
        """Get domain by ID"""
        return self.domains.get(domain_id)
    
    def update_domain(self, domain_id: str, updates: dict) -> None:
        """Update domain fields"""
        if domain_id not in self.domains:
            raise ValueError(f"Domain {domain_id} not found")
        domain = self.domains[domain_id]
        for key, value in updates.items():
            if hasattr(domain, key):
                setattr(domain, key, value)
    
    def delete_domain(self, domain_id: str) -> None:
        """Remove domain and its resources"""
        if domain_id in self.domains:
            domain = self.domains[domain_id]
            # Delete associated resources
            for resource_id in domain.resource_ids[:]:
                self.delete_resource(resource_id)
            del self.domains[domain_id]
    
    def add_resource(self, resource: Resource) -> None:
        """Add resource to graph"""
        if resource.id in self.resources:
            raise ValueError(f"Resource {resource.id} already exists")
        if resource.domain_id not in self.domains:
            raise ValueError(f"Domain {resource.domain_id} not found")
        self.resources[resource.id] = resource
        # Add to domain's resource list
        self.domains[resource.domain_id].resource_ids.append(resource.id)
    
    def get_resource(self, resource_id: str) -> Optional[Resource]:
        """Get resource by ID"""
        return self.resources.get(resource_id)
    
    def update_resource(self, resource_id: str, updates: dict) -> None:
        """Update resource fields"""
        if resource_id not in self.resources:
            raise ValueError(f"Resource {resource_id} not found")
        resource = self.resources[resource_id]
        for key, value in updates.items():
            if hasattr(resource, key):
                setattr(resource, key, value)
    
    def delete_resource(self, resource_id: str) -> None:
        """Remove resource"""
        if resource_id in self.resources:
            resource = self.resources[resource_id]
            # Remove from domain's resource list
            if resource.domain_id in self.domains:
                domain = self.domains[resource.domain_id]
                if resource_id in domain.resource_ids:
                    domain.resource_ids.remove(resource_id)
            del self.resources[resource_id]
    
    def add_connection(self, connection: Connection) -> None:
        """Add connection to graph"""
        if connection.id in self.connections:
            raise ValueError(f"Connection {connection.id} already exists")
        self.connections[connection.id] = connection
    
    def update_connection(self, connection_id: str, updates: dict) -> None:
        """Update connection fields"""
        if connection_id not in self.connections:
            raise ValueError(f"Connection {connection_id} not found")
        connection = self.connections[connection_id]
        for key, value in updates.items():
            if hasattr(connection, key):
                setattr(connection, key, value)
    
    def delete_connection(self, connection_id: str) -> None:
        """Remove connection"""
        if connection_id in self.connections:
            del self.connections[connection_id]
    
    def to_dict(self) -> dict:
        """Serialize graph to dictionary"""
        return {
            'domains': [d.to_dict() for d in self.domains.values()],
            'resources': [r.to_dict() for r in self.resources.values()],
            'connections': [c.to_dict() for c in self.connections.values()]
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> 'InfrastructureGraph':
        """Deserialize graph from dictionary"""
        graph = cls()
        for domain_data in data.get('domains', []):
            graph.add_domain(Domain.from_dict(domain_data))
        for resource_data in data.get('resources', []):
            graph.add_resource(Resource.from_dict(resource_data))
        for connection_data in data.get('connections', []):
            graph.add_connection(Connection.from_dict(connection_data))
        return graph
