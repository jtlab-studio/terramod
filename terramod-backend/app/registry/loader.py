import yaml
from typing import Dict, List, Optional
from pathlib import Path
from app.registry.service import ServiceDefinition
from app.registry.validator import validate_registry_structure
from app.core.domain import DomainType
import logging

logger = logging.getLogger(__name__)

class ServiceRegistry:
    """Service registry singleton"""
    
    _instance: Optional['ServiceRegistry'] = None
    
    def __init__(self):
        self.services: Dict[str, ServiceDefinition] = {}
        self.domains: Dict[DomainType, List[str]] = {}
    
    @classmethod
    def get_instance(cls) -> 'ServiceRegistry':
        """Get singleton instance"""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
    
    def load_registry(self, path: str) -> None:
        """Load YAML registry"""
        registry_path = Path(path)
        
        if not registry_path.exists():
            raise FileNotFoundError(f"Registry file not found: {path}")
        
        with open(registry_path, 'r') as f:
            registry_data = yaml.safe_load(f)
        
        # Validate structure
        errors = validate_registry_structure(registry_data)
        if errors:
            raise ValueError(f"Invalid registry structure: {', '.join(errors)}")
        
        # Load services
        for service_data in registry_data.get('services', []):
            for resource_type, svc_def in service_data.items():
                service = ServiceDefinition(
                    resource_type=resource_type,
                    domain=DomainType(svc_def['domain']),
                    category=svc_def.get('category', 'core'),
                    required_inputs=svc_def.get('required_inputs', []),
                    optional_inputs=svc_def.get('optional_inputs', []),
                    exports=svc_def.get('exports', []),
                    allowed_consumers=svc_def.get('allowed_consumers', [])
                )
                self.services[resource_type] = service
                
                # Index by domain
                if service.domain not in self.domains:
                    self.domains[service.domain] = []
                self.domains[service.domain].append(resource_type)
        
        logger.info(f"Loaded {len(self.services)} services from registry")
    
    def get_service(self, resource_type: str) -> Optional[ServiceDefinition]:
        """Get service definition by resource type"""
        return self.services.get(resource_type)
    
    def get_all_services(self) -> List[ServiceDefinition]:
        """List all services"""
        return list(self.services.values())
    
    def get_domain_services(self, domain: DomainType) -> List[ServiceDefinition]:
        """List services for specific domain"""
        resource_types = self.domains.get(domain, [])
        return [self.services[rt] for rt in resource_types if rt in self.services]
    
    def validate_registry(self) -> None:
        """Validate registry structure"""
        if not self.services:
            raise ValueError("Registry is empty")
