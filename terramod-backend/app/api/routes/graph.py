from fastapi import APIRouter, HTTPException, status
from typing import Dict, List, Any
from pydantic import BaseModel, field_validator
from app.core.graph import InfrastructureGraph
from app.core.domain import Domain
from app.core.resource import Resource
from app.core.connection import Connection
from app.validation.engine import ValidationEngine
import logging
import re

logger = logging.getLogger(__name__)
router = APIRouter()

def camel_to_snake(name: str) -> str:
    """Convert camelCase to snake_case"""
    name = re.sub('(.)([A-Z][a-z]+)', r'\1_\2', name)
    return re.sub('([a-z0-9])([A-Z])', r'\1_\2', name).lower()

def convert_keys_to_snake(data: Any) -> Any:
    """Recursively convert dict keys from camelCase to snake_case"""
    if isinstance(data, dict):
        return {camel_to_snake(k): convert_keys_to_snake(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [convert_keys_to_snake(item) for item in data]
    else:
        return data

# Pydantic models for validation
class InfrastructureGraphModel(BaseModel):
    domains: List[Dict]
    resources: List[Dict]
    connections: List[Dict]

class ValidationResultsModel(BaseModel):
    errors: Dict[str, List[str]]
    warnings: Dict[str, List[str]]

class ElementUpdateModel(BaseModel):
    updates: Dict

@router.post("/validate", response_model=ValidationResultsModel)
async def validate_graph(graph_data: InfrastructureGraphModel):
    """Validate infrastructure graph"""
    try:
        # Convert camelCase keys to snake_case for backend compatibility
        graph_dict = graph_data.dict()
        graph_dict_snake = convert_keys_to_snake(graph_dict)
        
        logger.info(f"Validating graph: {len(graph_dict_snake['domains'])} domains, "
                   f"{len(graph_dict_snake['resources'])} resources")
        
        # Convert to graph object
        graph = InfrastructureGraph.from_dict(graph_dict_snake)
        
        # Run validation
        validation_engine = ValidationEngine()
        results = validation_engine.validate_graph(graph)
        
        logger.info(f"Validation complete: {len(results.errors)} errors, {len(results.warnings)} warnings")
        
        return ValidationResultsModel(
            errors=results.errors,
            warnings=results.warnings
        )
    except Exception as e:
        logger.error(f"Validation failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )

@router.post("/domain/{domain_id}")
async def update_domain(domain_id: str, update: ElementUpdateModel):
    """Update domain element"""
    try:
        # In production, this would work with persistent storage
        # For now, validate the update structure
        if not update.updates:
            raise ValueError("No updates provided")
        
        # Convert camelCase to snake_case
        updates_snake = convert_keys_to_snake(update.updates)
        
        return {"status": "success", "message": f"Domain {domain_id} updated"}
    except Exception as e:
        logger.error(f"Domain update failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )

@router.post("/resource/{resource_id}")
async def update_resource(resource_id: str, update: ElementUpdateModel):
    """Update resource element"""
    try:
        if not update.updates:
            raise ValueError("No updates provided")
        
        # Convert camelCase to snake_case
        updates_snake = convert_keys_to_snake(update.updates)
        
        return {"status": "success", "message": f"Resource {resource_id} updated"}
    except Exception as e:
        logger.error(f"Resource update failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )

@router.post("/connection/{connection_id}")
async def update_connection(connection_id: str, update: ElementUpdateModel):
    """Update connection element"""
    try:
        if not update.updates:
            raise ValueError("No updates provided")
        
        # Convert camelCase to snake_case
        updates_snake = convert_keys_to_snake(update.updates)
        
        return {"status": "success", "message": f"Connection {connection_id} updated"}
    except Exception as e:
        logger.error(f"Connection update failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )