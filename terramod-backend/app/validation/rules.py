from abc import ABC, abstractmethod
from typing import List
from app.core.graph import InfrastructureGraph
from app.validation.engine import ValidationMessage

class ValidationRule(ABC):
    """Base validation rule interface"""
    
    @abstractmethod
    def validate(self, graph: InfrastructureGraph) -> List[ValidationMessage]:
        """Validate graph and return violations"""
        pass

class OrphanResourceRule(ValidationRule):
    """Check for resources without domains"""
    
    def validate(self, graph: InfrastructureGraph) -> List[ValidationMessage]:
        messages = []
        
        for resource_id, resource in graph.resources.items():
            if resource.domain_id not in graph.domains:
                messages.append(ValidationMessage(
                    element_id=resource_id,
                    severity='error',
                    message=f"Resource belongs to non-existent domain: {resource.domain_id}"
                ))
        
        return messages

class CircularDependencyRule(ValidationRule):
    """Check for dependency cycles"""
    
    def validate(self, graph: InfrastructureGraph) -> List[ValidationMessage]:
        messages = []
        
        # Build adjacency list
        adjacency = {}
        for conn in graph.connections.values():
            if conn.source_id not in adjacency:
                adjacency[conn.source_id] = []
            adjacency[conn.source_id].append(conn.target_id)
        
        # DFS to detect cycles
        def has_cycle(node, visited, rec_stack):
            visited.add(node)
            rec_stack.add(node)
            
            for neighbor in adjacency.get(node, []):
                if neighbor not in visited:
                    if has_cycle(neighbor, visited, rec_stack):
                        return True
                elif neighbor in rec_stack:
                    return True
            
            rec_stack.remove(node)
            return False
        
        visited = set()
        for node in adjacency.keys():
            if node not in visited:
                if has_cycle(node, visited, set()):
                    messages.append(ValidationMessage(
                        element_id=node,
                        severity='error',
                        message="Circular dependency detected"
                    ))
        
        return messages

class DuplicateNameRule(ValidationRule):
    """Check for duplicate element names"""
    
    def validate(self, graph: InfrastructureGraph) -> List[ValidationMessage]:
        messages = []
        
        # Check domain names
        domain_names = {}
        for domain_id, domain in graph.domains.items():
            if domain.name in domain_names:
                messages.append(ValidationMessage(
                    element_id=domain_id,
                    severity='warning',
                    message=f"Duplicate domain name: {domain.name}"
                ))
            domain_names[domain.name] = domain_id
        
        # Check resource names
        resource_names = {}
        for resource_id, resource in graph.resources.items():
            if resource.name in resource_names:
                messages.append(ValidationMessage(
                    element_id=resource_id,
                    severity='warning',
                    message=f"Duplicate resource name: {resource.name}"
                ))
            resource_names[resource.name] = resource_id
        
        return messages
