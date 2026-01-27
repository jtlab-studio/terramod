"""Tier 0: Graph Integrity Rules (Always Blocking)"""

from abc import ABC, abstractmethod
from typing import List
from app.core.graph import InfrastructureGraph
from app.validation.engine import ValidationMessage, ValidationRule, ValidationTier
from app.registry.loader import ServiceRegistry

class OrphanResourceRule(ValidationRule):
    """Check for resources without valid domains"""
    tier = ValidationTier.TIER_0_GRAPH_INTEGRITY
    rule_id = "graph-orphan-resource"
    
    def validate(self, graph: InfrastructureGraph) -> List[ValidationMessage]:
        messages = []
        
        for resource_id, resource in graph.resources.items():
            if resource.domain_id not in graph.domains:
                messages.append(ValidationMessage(
                    element_id=resource_id,
                    severity='error',
                    message=f"Resource '{resource.name}' belongs to non-existent domain: {resource.domain_id}",
                    tier=self.tier,
                    rule_id=self.rule_id,
                    fix_hint="Assign resource to a valid domain",
                    override_allowed=False
                ))
        
        return messages

class CircularDependencyRule(ValidationRule):
    """Check for dependency cycles"""
    tier = ValidationTier.TIER_0_GRAPH_INTEGRITY
    rule_id = "graph-circular-dependency"
    
    def validate(self, graph: InfrastructureGraph) -> List[ValidationMessage]:
        messages = []
        
        # Build adjacency list from connections
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
                        message="Circular dependency detected in infrastructure graph",
                        tier=self.tier,
                        rule_id=self.rule_id,
                        fix_hint="Remove circular references between resources",
                        override_allowed=False
                    ))
                    break  # One message is enough
        
        return messages

class DuplicateNameRule(ValidationRule):
    """Check for duplicate element names"""
    tier = ValidationTier.TIER_0_GRAPH_INTEGRITY
    rule_id = "graph-duplicate-name"
    
    def validate(self, graph: InfrastructureGraph) -> List[ValidationMessage]:
        messages = []
        
        # Check domain names
        domain_names = {}
        for domain_id, domain in graph.domains.items():
            if domain.name in domain_names:
                messages.append(ValidationMessage(
                    element_id=domain_id,
                    severity='error',
                    message=f"Duplicate domain name: '{domain.name}' (conflicts with {domain_names[domain.name]})",
                    tier=self.tier,
                    rule_id=self.rule_id,
                    fix_hint="Use unique domain names",
                    override_allowed=False
                ))
            domain_names[domain.name] = domain_id
        
        # Check resource names within each domain
        for domain in graph.domains.values():
            resource_names = {}
            for resource_id in domain.resource_ids:
                resource = graph.resources.get(resource_id)
                if resource:
                    if resource.name in resource_names:
                        messages.append(ValidationMessage(
                            element_id=resource_id,
                            severity='error',
                            message=f"Duplicate resource name in domain '{domain.name}': '{resource.name}'",
                            tier=self.tier,
                            rule_id=self.rule_id,
                            fix_hint="Use unique resource names within each domain",
                            override_allowed=False
                        ))
                    resource_names[resource.name] = resource_id
        
        return messages

class RequiredInputsRule(ValidationRule):
    """Check that all required inputs are provided"""
    tier = ValidationTier.TIER_0_GRAPH_INTEGRITY
    rule_id = "graph-required-inputs"
    
    def validate(self, graph: InfrastructureGraph) -> List[ValidationMessage]:
        messages = []
        registry = ServiceRegistry.get_instance()
        
        for resource_id, resource in graph.resources.items():
            service = registry.get_service(resource.type)
            if not service:
                continue
            
            # Check required inputs
            for required_input in service.required_inputs:
                if required_input not in resource.arguments or not resource.arguments[required_input]:
                    messages.append(ValidationMessage(
                        element_id=resource_id,
                        severity='error',
                        message=f"Missing required input '{required_input}' for {resource.type}",
                        tier=self.tier,
                        rule_id=self.rule_id,
                        fix_hint=f"Provide a value for '{required_input}'",
                        override_allowed=False
                    ))
        
        return messages

class ReferenceIntegrityRule(ValidationRule):
    """Check that all cross-domain references are valid"""
    tier = ValidationTier.TIER_0_GRAPH_INTEGRITY
    rule_id = "graph-reference-integrity"
    
    def validate(self, graph: InfrastructureGraph) -> List[ValidationMessage]:
        messages = []
        
        for conn in graph.connections.values():
            # Check source exists
            if conn.source_type == 'resource':
                if conn.source_id not in graph.resources:
                    messages.append(ValidationMessage(
                        element_id=conn.id,
                        severity='error',
                        message=f"Connection references non-existent source resource: {conn.source_id}",
                        tier=self.tier,
                        rule_id=self.rule_id,
                        fix_hint="Remove invalid connection or create referenced resource",
                        override_allowed=False
                    ))
            elif conn.source_type == 'domain':
                if conn.source_id not in graph.domains:
                    messages.append(ValidationMessage(
                        element_id=conn.id,
                        severity='error',
                        message=f"Connection references non-existent source domain: {conn.source_id}",
                        tier=self.tier,
                        rule_id=self.rule_id,
                        fix_hint="Remove invalid connection or create referenced domain",
                        override_allowed=False
                    ))
            
            # Check target exists
            if conn.target_type == 'resource':
                if conn.target_id not in graph.resources:
                    messages.append(ValidationMessage(
                        element_id=conn.id,
                        severity='error',
                        message=f"Connection references non-existent target resource: {conn.target_id}",
                        tier=self.tier,
                        rule_id=self.rule_id,
                        fix_hint="Remove invalid connection or create referenced resource",
                        override_allowed=False
                    ))
            elif conn.target_type == 'domain':
                if conn.target_id not in graph.domains:
                    messages.append(ValidationMessage(
                        element_id=conn.id,
                        severity='error',
                        message=f"Connection references non-existent target domain: {conn.target_id}",
                        tier=self.tier,
                        rule_id=self.rule_id,
                        fix_hint="Remove invalid connection or create referenced domain",
                        override_allowed=False
                    ))
        
        return messages
