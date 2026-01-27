from typing import List, Dict, Any

def validate_registry_structure(registry_data: Dict[str, Any]) -> List[str]:
    """Validate YAML registry structure"""
    errors = []
    
    if not isinstance(registry_data, dict):
        errors.append("Registry must be a dictionary")
        return errors
    
    if 'services' not in registry_data:
        errors.append("Registry must contain 'services' key")
        return errors
    
    services = registry_data['services']
    if not isinstance(services, list):
        errors.append("'services' must be a list")
        return errors
    
    for idx, service in enumerate(services):
        if not isinstance(service, dict):
            errors.append(f"Service {idx} must be a dictionary")
            continue
        
        for resource_type, svc_def in service.items():
            service_errors = validate_service_definition(resource_type, svc_def)
            errors.extend(service_errors)
    
    return errors

def validate_service_definition(resource_type: str, service: Dict[str, Any]) -> List[str]:
    """Validate single service definition"""
    errors = []
    
    required_fields = ['domain']
    missing = check_required_fields(service, required_fields)
    if missing:
        errors.extend([f"{resource_type}: missing field '{field}'" for field in missing])
    
    # Validate domain value
    valid_domains = [
        'networking', 'compute', 'serverless', 'data', 
        'storage', 'messaging', 'identity', 'observability', 'edge'
    ]
    if 'domain' in service and service['domain'] not in valid_domains:
        errors.append(f"{resource_type}: invalid domain '{service['domain']}'")
    
    # Validate list fields
    list_fields = ['required_inputs', 'optional_inputs', 'exports', 'allowed_consumers']
    for field in list_fields:
        if field in service and not isinstance(service[field], list):
            errors.append(f"{resource_type}: '{field}' must be a list")
    
    return errors

def check_required_fields(service: Dict[str, Any], fields: List[str]) -> List[str]:
    """Check for missing required fields"""
    return [field for field in fields if field not in service]

def validate_domain_references(registry: Dict[str, Any]) -> List[str]:
    """Validate domain consistency across services"""
    errors = []
    
    services = registry.get('services', [])
    domains_seen = set()
    
    for service in services:
        for resource_type, svc_def in service.items():
            if 'domain' in svc_def:
                domains_seen.add(svc_def['domain'])
    
    # All domains should be valid DomainType values
    valid_domains = {
        'networking', 'compute', 'serverless', 'data',
        'storage', 'messaging', 'identity', 'observability', 'edge'
    }
    
    invalid = domains_seen - valid_domains
    if invalid:
        errors.append(f"Invalid domains found: {invalid}")
    
    return errors
