from fastapi import APIRouter, HTTPException, status
from typing import Dict
from pydantic import BaseModel
from app.core.graph import InfrastructureGraph
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

class IRExportResponse(BaseModel):
    """Canonical IR export response"""
    version: str
    resources: list
    domains: list
    connections: list

class IRImportRequest(BaseModel):
    """Canonical IR import request"""
    ir: Dict

@router.post("/export-ir", response_model=IRExportResponse)
async def export_ir(graph_data: Dict):
    """
    Export infrastructure graph as canonical IR.
    
    This is the single source of truth format that all downstream
    operations consume. It's semantic, not syntactic.
    """
    try:
        # Convert to graph object
        graph = InfrastructureGraph.from_dict(graph_data)
        
        # Export as canonical IR
        ir = graph.to_ir()
        
        logger.info(f"Exported IR: {graph.get_resource_count()} resources, "
                   f"{graph.get_domain_count()} domains, "
                   f"{graph.get_connection_count()} connections")
        
        return IRExportResponse(**ir)
    except Exception as e:
        logger.error(f"IR export failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )

@router.post("/import-ir")
async def import_ir(request: IRImportRequest):
    """
    Import infrastructure graph from canonical IR.
    
    This reconstructs the full graph from the IR format,
    preserving all semantic information.
    """
    try:
        # Import from canonical IR
        graph = InfrastructureGraph.from_ir(request.ir)
        
        logger.info(f"Imported IR: {graph.get_resource_count()} resources, "
                   f"{graph.get_domain_count()} domains")
        
        # Return in API format
        return graph.to_dict()
    except Exception as e:
        logger.error(f"IR import failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )

@router.get("/ir-schema")
async def get_ir_schema():
    """
    Get the canonical IR schema documentation.
    
    This describes the structure of the IR format that Terramod uses
    as its single source of truth.
    """
    return {
        "version": "1.0",
        "description": "Terramod Canonical Intermediate Representation (IR)",
        "schema": {
            "resources": {
                "type": "array",
                "description": "Flat list of infrastructure resources",
                "items": {
                    "id": "Unique resource identifier",
                    "type": "AWS resource type (e.g., aws_vpc)",
                    "domain": "Domain ID this resource belongs to",
                    "name": "Human-readable resource name",
                    "attributes": "Resource-specific configuration",
                    "position": "Canvas position (x, y)",
                    "depends_on": "List of resource IDs this depends on"
                }
            },
            "domains": {
                "type": "array",
                "description": "Logical groupings that map to Terraform modules",
                "items": {
                    "id": "Unique domain identifier",
                    "name": "Domain name",
                    "type": "Domain type (networking, compute, etc.)",
                    "resources": "List of resource IDs in this domain",
                    "inputs": "Module input variables",
                    "outputs": "Module output values"
                }
            },
            "connections": {
                "type": "array",
                "description": "Dependencies and data flows between elements",
                "items": {
                    "id": "Unique connection identifier",
                    "source": "Source element ID",
                    "target": "Target element ID",
                    "source_type": "resource or domain",
                    "target_type": "resource or domain",
                    "type": "data, dependency, or implicit",
                    "output_name": "Optional: specific output name",
                    "input_name": "Optional: specific input name"
                }
            }
        },
        "principles": {
            "semantic": "IR represents meaning, not syntax",
            "flat": "Resources are flat, not nested in domains",
            "canonical": "Single source of truth for all operations",
            "stateless": "No implicit state or magic",
            "deterministic": "Same IR always produces same output"
        }
    }