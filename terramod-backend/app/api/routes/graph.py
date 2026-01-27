from typing import Dict, List, Optional
from app.core.domain import Domain
from app.core.resource import Resource
from app.core.connection import Connection

class InfrastructureGraph:
    """
    Infrastructure graph business logic
    
    This is the canonical Intermediate Representation (IR) for Terramod.
    All validation, transformation, and rendering operates on this model.
    
    **Never** becomes HCL until final rendering step.
    """
    
    def __init__(self):
        self.domains: Dict[str, Domain] = {}
        self.resources: Dict[str, Resource] = {}
        self.connections: Dict[str, Connection] = {}
    
    # ========== Domain Operations ==========
    
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
    
    # ========== Resource Operations ==========
    
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
    
    # ========== Connection Operations ==========
    
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
    
    # ========== Dependency Analysis ==========
    
    def get_dependencies(self, resource_id: str) -> List[str]:
        """Get all resources that this resource depends on"""
        dependencies = []
        for conn in self.connections.values():
            if conn.target_id == resource_id and conn.source_type == 'resource':
                dependencies.append(conn.source_id)
        return dependencies
    
    def get_dependents(self, resource_id: str) -> List[str]:
        """Get all resources that depend on this resource"""
        dependents = []
        for conn in self.connections.values():
            if conn.source_id == resource_id and conn.target_type == 'resource':
                dependents.append(conn.target_id)
        return dependents
    
    # ========== IR Export/Import (Canonical Representation) ==========
    
    def to_ir(self) -> dict:
        """
        Export canonical intermediate representation (IR).
        
        This is the single source of truth for the infrastructure model.
        All downstream operations (validation, Terraform generation, etc.)
        consume this format.
        
        Returns:
            dict: Canonical IR with resources, domains, connections
        """
        return {
            "version": "1.0",
            "resources": [
                {
                    "id": r.id,
                    "type": r.type,
                    "domain": r.domain_id,
                    "name": r.name,
                    "attributes": r.arguments,
                    "position": {"x": r.position.x, "y": r.position.y},
                    "depends_on": self.get_dependencies(r.id)
                }
                for r in self.resources.values()
            ],
            "domains": [
                {
                    "id": d.id,
                    "name": d.name,
                    "type": d.type.value,
                    "resources": d.resource_ids,
                    "inputs": [{"name": i.name, "type": i.type, "required": i.required} for i in d.inputs],
                    "outputs": [{"name": o.name, "type": o.type} for o in d.outputs]
                }
                for d in self.domains.values()
            ],
            "connections": [
                {
                    "id": c.id,
                    "source": c.source_id,
                    "target": c.target_id,
                    "source_type": c.source_type.value,
                    "target_type": c.target_type.value,
                    "type": c.connection_type.value,
                    "output_name": c.output_name,
                    "input_name": c.input_name
                }
                for c in self.connections.values()
            ]
        }
    
    @classmethod
    def from_ir(cls, ir: dict) -> 'InfrastructureGraph':
        """
        Import from canonical IR format.
        
        This is the inverse of to_ir() and allows round-tripping through
        the IR without loss of information.
        
        Args:
            ir: Canonical IR dictionary
            
        Returns:
            InfrastructureGraph: Reconstructed graph
        """
        graph = cls()
        
        # Import domains first
        for domain_data in ir.get('domains', []):
            from app.core.domain import DomainType, DomainInput, DomainOutput, Position
            domain = Domain(
                id=domain_data['id'],
                name=domain_data['name'],
                type=DomainType(domain_data['type']),
                resource_ids=[],  # Will be populated by resources
                inputs=[DomainInput(**inp) for inp in domain_data.get('inputs', [])],
                outputs=[DomainOutput(**out) for out in domain_data.get('outputs', [])],
                position=Position(0, 0),
                width=0,
                height=0
            )
            graph.add_domain(domain)
        
        # Import resources
        for resource_data in ir.get('resources', []):
            from app.core.domain import Position
            resource = Resource(
                id=resource_data['id'],
                type=resource_data['type'],
                domain_id=resource_data['domain'],
                name=resource_data['name'],
                arguments=resource_data.get('attributes', {}),
                position=Position(**resource_data.get('position', {'x': 0, 'y': 0}))
            )
            graph.add_resource(resource)
        
        # Import connections
        for conn_data in ir.get('connections', []):
            from app.core.connection import NodeType, ConnectionType
            connection = Connection(
                id=conn_data['id'],
                source_id=conn_data['source'],
                target_id=conn_data['target'],
                source_type=NodeType(conn_data['source_type']),
                target_type=NodeType(conn_data['target_type']),
                connection_type=ConnectionType(conn_data['type']),
                output_name=conn_data.get('output_name'),
                input_name=conn_data.get('input_name')
            )
            graph.add_connection(connection)
        
        return graph
    
    # ========== Legacy Serialization (Backward Compatibility) ==========
    
    def to_dict(self) -> dict:
        """
        Serialize graph to dictionary (legacy format for API compatibility).
        
        Note: New code should use to_ir() instead.
        """
        return {
            'domains': [d.to_dict() for d in self.domains.values()],
            'resources': [r.to_dict() for r in self.resources.values()],
            'connections': [c.to_dict() for c in self.connections.values()]
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> 'InfrastructureGraph':
        """
        Deserialize graph from dictionary (legacy format for API compatibility).
        
        Note: New code should use from_ir() instead.
        """
        graph = cls()
        for domain_data in data.get('domains', []):
            graph.add_domain(Domain.from_dict(domain_data))
        for resource_data in data.get('resources', []):
            graph.add_resource(Resource.from_dict(resource_data))
        for connection_data in data.get('connections', []):
            graph.add_connection(Connection.from_dict(connection_data))
        return graph
    
    # ========== Utility Methods ==========
    
    def get_resources_by_domain(self, domain_id: str) -> List[Resource]:
        """Get all resources in a domain"""
        domain = self.domains.get(domain_id)
        if not domain:
            return []
        return [self.resources[rid] for rid in domain.resource_ids if rid in self.resources]
    
    def get_resource_count(self) -> int:
        """Get total resource count"""
        return len(self.resources)
    
    def get_domain_count(self) -> int:
        """Get total domain count"""
        return len(self.domains)
    
    def get_connection_count(self) -> int:
        """Get total connection count"""
        return len(self.connections)
    
    def is_empty(self) -> bool:
        """Check if graph is empty"""
        return len(self.resources) == 0 and len(self.domains) == 0