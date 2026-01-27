from fastapi import APIRouter, HTTPException, status
from typing import List, Dict
from pydantic import BaseModel
from app.registry.loader import ServiceRegistry
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

class ServiceDefinitionModel(BaseModel):
    resource_type: str
    domain: str
    category: str
    required_inputs: List[str]
    optional_inputs: List[str]
    exports: List[str]
    allowed_consumers: List[str]

class ArgumentSchemaModel(BaseModel):
    name: str
    type: str
    required: bool
    default: str = None
    description: str

class OutputSchemaModel(BaseModel):
    name: str
    type: str
    description: str

class ResourceSchemaModel(BaseModel):
    resource_type: str
    inputs: Dict[str, ArgumentSchemaModel]
    outputs: Dict[str, OutputSchemaModel]

@router.get("/services", response_model=List[ServiceDefinitionModel])
async def get_services():
    """List all available AWS services"""
    try:
        registry = ServiceRegistry.get_instance()
        services = registry.get_all_services()
        
        return [
            ServiceDefinitionModel(
                resource_type=svc.resource_type,
                domain=svc.domain.value,
                category=svc.category,
                required_inputs=svc.required_inputs,
                optional_inputs=svc.optional_inputs,
                exports=svc.exports,
                allowed_consumers=svc.allowed_consumers
            )
            for svc in services
        ]
    except Exception as e:
        logger.error(f"Failed to get services: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/schema/{resource_type}", response_model=ResourceSchemaModel)
async def get_resource_schema(resource_type: str):
    """Get schema for specific resource type"""
    try:
        registry = ServiceRegistry.get_instance()
        service = registry.get_service(resource_type)
        
        if not service:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Resource type {resource_type} not found"
            )
        
        # Build schema from service definition
        inputs = {}
        for inp in service.required_inputs:
            inputs[inp] = ArgumentSchemaModel(
                name=inp,
                type="string",
                required=True,
                description=f"Required input: {inp}"
            )
        for inp in service.optional_inputs:
            inputs[inp] = ArgumentSchemaModel(
                name=inp,
                type="string",
                required=False,
                description=f"Optional input: {inp}"
            )
        
        outputs = {}
        for out in service.exports:
            outputs[out] = OutputSchemaModel(
                name=out,
                type="string",
                description=f"Output: {out}"
            )
        
        return ResourceSchemaModel(
            resource_type=resource_type,
            inputs=inputs,
            outputs=outputs
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get schema: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/services/{domain}", response_model=List[ServiceDefinitionModel])
async def get_domain_services(domain: str):
    """List services for specific domain"""
    try:
        from app.core.domain import DomainType
        domain_type = DomainType(domain)
        
        registry = ServiceRegistry.get_instance()
        services = registry.get_domain_services(domain_type)
        
        return [
            ServiceDefinitionModel(
                resource_type=svc.resource_type,
                domain=svc.domain.value,
                category=svc.category,
                required_inputs=svc.required_inputs,
                optional_inputs=svc.optional_inputs,
                exports=svc.exports,
                allowed_consumers=svc.allowed_consumers
            )
            for svc in services
        ]
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid domain: {domain}"
        )
    except Exception as e:
        logger.error(f"Failed to get domain services: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
