from fastapi import APIRouter, HTTPException, status
from typing import Dict, List
from pydantic import BaseModel
from app.core.graph import InfrastructureGraph
from app.core.domain import Domain
from app.core.resource import Resource
from app.core.connection import Connection
from app.validation.engine import ValidationEngine
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

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
        # Convert to graph object
        graph = InfrastructureGraph.from_dict(graph_data.dict())
        
        # Run validation
        validation_engine = ValidationEngine()
        results = validation_engine.validate_graph(graph)
        
        return ValidationResultsModel(
            errors=results.errors,
            warnings=results.warnings
        )
    except Exception as e:
        logger.error(f"Validation failed: {e}")
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
        
        return {"status": "success", "message": f"Connection {connection_id} updated"}
    except Exception as e:
        logger.error(f"Connection update failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )
