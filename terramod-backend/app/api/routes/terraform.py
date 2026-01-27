from fastapi import APIRouter, HTTPException, UploadFile, File, status
from fastapi.responses import FileResponse, StreamingResponse
from typing import List, Dict
from pydantic import BaseModel
import logging
import io
import zipfile
from app.core.graph import InfrastructureGraph
from app.terraform.generator import TerraformGenerator
from app.terraform.parser import TerraformParser

logger = logging.getLogger(__name__)
router = APIRouter()

class TerraformModuleModel(BaseModel):
    name: str
    main_tf: str
    variables_tf: str
    outputs_tf: str

class TerraformProjectModel(BaseModel):
    modules: Dict[str, TerraformModuleModel]
    root_main: str
    providers: str
    terraform_config: str

class InfrastructureGraphModel(BaseModel):
    domains: List[Dict]
    resources: List[Dict]
    connections: List[Dict]

class ExportRequestModel(BaseModel):
    graph: InfrastructureGraphModel
    format: str  # 'zip' or 'directory'

@router.post("/generate", response_model=TerraformProjectModel)
async def generate_terraform(graph_data: InfrastructureGraphModel):
    """Generate Terraform code from infrastructure graph"""
    try:
        # Convert to graph object
        graph = InfrastructureGraph.from_dict(graph_data.dict())
        
        # Generate Terraform
        generator = TerraformGenerator()
        terraform_project = generator.generate_project(graph)
        
        return TerraformProjectModel(
            modules={
                name: TerraformModuleModel(
                    name=module.name,
                    main_tf=module.main_tf,
                    variables_tf=module.variables_tf,
                    outputs_tf=module.outputs_tf
                )
                for name, module in terraform_project.modules.items()
            },
            root_main=terraform_project.root_main,
            providers=terraform_project.providers,
            terraform_config=terraform_project.terraform_config
        )
    except Exception as e:
        logger.error(f"Terraform generation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )

@router.post("/import", response_model=InfrastructureGraphModel)
async def import_terraform(files: List[UploadFile] = File(...)):
    """Import existing Terraform project"""
    try:
        # Read uploaded files
        file_contents = {}
        for file in files:
            content = await file.read()
            file_contents[file.filename] = content.decode('utf-8')
        
        # Parse Terraform
        parser = TerraformParser()
        graph = parser.parse_project(file_contents)
        
        graph_dict = graph.to_dict()
        return InfrastructureGraphModel(**graph_dict)
    except Exception as e:
        logger.error(f"Terraform import failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )

@router.post("/export")
async def export_project(request: ExportRequestModel):
    """Export Terraform project as ZIP or directory"""
    try:
        # Convert to graph
        graph = InfrastructureGraph.from_dict(request.graph.dict())
        
        # Generate Terraform
        generator = TerraformGenerator()
        terraform_project = generator.generate_project(graph)
        
        if request.format == 'zip':
            # Create ZIP file in memory
            zip_buffer = io.BytesIO()
            with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
                # Add modules
                for module_name, module in terraform_project.modules.items():
                    zip_file.writestr(f"modules/{module_name}/main.tf", module.main_tf)
                    zip_file.writestr(f"modules/{module_name}/variables.tf", module.variables_tf)
                    zip_file.writestr(f"modules/{module_name}/outputs.tf", module.outputs_tf)
                
                # Add root files
                zip_file.writestr("main.tf", terraform_project.root_main)
                zip_file.writestr("providers.tf", terraform_project.providers)
                zip_file.writestr("terraform.tf", terraform_project.terraform_config)
            
            zip_buffer.seek(0)
            return StreamingResponse(
                zip_buffer,
                media_type="application/zip",
                headers={"Content-Disposition": "attachment; filename=terraform-project.zip"}
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only 'zip' format is supported"
            )
    except Exception as e:
        logger.error(f"Export failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
