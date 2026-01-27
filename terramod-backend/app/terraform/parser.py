from typing import Dict
import hcl2
from app.core.graph import InfrastructureGraph
from app.core.domain import Domain, DomainType, Position
from app.core.resource import Resource
from app.registry.loader import ServiceRegistry
import logging

logger = logging.getLogger(__name__)

class TerraformParser:
    """Terraform HCL parser"""
    
    def __init__(self):
        self.registry = ServiceRegistry.get_instance()
    
    def parse_project(self, files: Dict[str, str]) -> InfrastructureGraph:
        """Parse Terraform files into infrastructure graph"""
        graph = InfrastructureGraph()
        
        # Parse each file
        for filename, content in files.items():
            try:
                parsed = hcl2.loads(content)
                
                # Extract resources
                if 'resource' in parsed:
                    resources = self.extract_resources(parsed['resource'], filename)
                    for resource in resources:
                        # Assign domain
                        domain_type = self.assign_domain(resource.type)
                        
                        # Create or get domain
                        domain_id = f"domain_{domain_type.value}"
                        if not graph.get_domain(domain_id):
                            domain = Domain(
                                id=domain_id,
                                name=domain_type.value,
                                type=domain_type,
                                position=Position(0, 0)
                            )
                            graph.add_domain(domain)
                        
                        # Add resource to domain
                        resource.domain_id = domain_id
                        graph.add_resource(resource)
                        
            except Exception as e:
                logger.error(f"Failed to parse {filename}: {e}")
        
        # Reconstruct connections
        self.reconstruct_connections(graph)
        
        return graph
    
    def extract_resources(self, resource_data: list, source_file: str) -> list[Resource]:
        """Extract resources from parsed HCL"""
        resources = []
        
        for resource_block in resource_data:
            for resource_type, instances in resource_block.items():
                for resource_name, config in instances.items():
                    resource_id = f"{resource_type}.{resource_name}"
                    
                    resource = Resource(
                        id=resource_id,
                        type=resource_type,
                        domain_id='',  # Will be assigned later
                        name=resource_name,
                        arguments=config,
                        position=Position(0, 0)
                    )
                    resources.append(resource)
        
        return resources
    
    def assign_domain(self, resource_type: str) -> DomainType:
        """Assign resource to domain based on type"""
        service = self.registry.get_service(resource_type)
        
        if service:
            return service.domain
        
        # Fallback mapping for unknown types
        if 'vpc' in resource_type or 'subnet' in resource_type or 'gateway' in resource_type:
            return DomainType.NETWORKING
        elif 'instance' in resource_type or 'asg' in resource_type:
            return DomainType.COMPUTE
        elif 'lambda' in resource_type:
            return DomainType.SERVERLESS
        elif 'db' in resource_type or 'dynamodb' in resource_type:
            return DomainType.DATA
        elif 's3' in resource_type:
            return DomainType.STORAGE
        elif 'sqs' in resource_type or 'sns' in resource_type:
            return DomainType.MESSAGING
        elif 'iam' in resource_type:
            return DomainType.IDENTITY
        elif 'cloudwatch' in resource_type:
            return DomainType.OBSERVABILITY
        elif 'lb' in resource_type or 'alb' in resource_type:
            return DomainType.EDGE
        else:
            return DomainType.COMPUTE  # Default
    
    def reconstruct_connections(self, graph: InfrastructureGraph) -> None:
        """Infer connections from resource references"""
        # This would analyze resource arguments for references
        # to other resources (e.g., vpc_id = aws_vpc.main.id)
        # and create Connection objects
        pass
