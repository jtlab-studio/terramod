from typing import Dict, List
from dataclasses import dataclass
from jinja2 import Environment, FileSystemLoader, select_autoescape
from pathlib import Path
from app.core.graph import InfrastructureGraph
from app.core.domain import Domain, DomainOutput
from app.core.resource import Resource
from app.registry.loader import ServiceRegistry
import logging

logger = logging.getLogger(__name__)

@dataclass
class TerraformModule:
    name: str
    main_tf: str
    variables_tf: str
    outputs_tf: str

@dataclass
class TerraformProject:
    modules: Dict[str, TerraformModule]
    root_main: str
    providers: str
    terraform_config: str

class TerraformGenerator:
    """Terraform HCL code generator"""
    
    def __init__(self):
        template_dir = Path(__file__).parent / 'templates'
        self.template_env = Environment(
            loader=FileSystemLoader(str(template_dir)),
            autoescape=select_autoescape(),
            trim_blocks=True,
            lstrip_blocks=True
        )
        
        # Add custom filters
        self.template_env.filters['to_hcl'] = self._to_hcl_value
    
    def _to_hcl_value(self, value) -> str:
        """Convert Python value to HCL representation"""
        if isinstance(value, str):
            return f'"{value}"'
        elif isinstance(value, bool):
            return 'true' if value else 'false'
        elif isinstance(value, (int, float)):
            return str(value)
        elif isinstance(value, list):
            items = ', '.join(self._to_hcl_value(v) for v in value)
            return f'[{items}]'
        elif isinstance(value, dict):
            items = ', '.join(f'{k} = {self._to_hcl_value(v)}' for k, v in value.items())
            return f'{{{items}}}'
        else:
            return str(value)
    
    def generate_project(self, graph: InfrastructureGraph) -> TerraformProject:
        """Generate complete Terraform project"""
        modules = {}
        
        # Generate module for each domain
        for domain in graph.domains.values():
            domain_resources = [
                graph.resources[rid] for rid in domain.resource_ids
                if rid in graph.resources
            ]
            
            if domain_resources:
                module = self.generate_module(domain, domain_resources)
                modules[domain.name] = module
        
        # Generate root files
        root_main = self.generate_root_main(list(graph.domains.values()))
        providers = self.generate_providers()
        terraform_config = self.generate_terraform_config()
        
        return TerraformProject(
            modules=modules,
            root_main=root_main,
            providers=providers,
            terraform_config=terraform_config
        )
    
    def generate_module(self, domain: Domain, resources: List[Resource]) -> TerraformModule:
        """Generate Terraform module for domain"""
        
        # Generate main.tf
        main_template = self.template_env.get_template('module.tf.j2')
        main_tf = main_template.render(domain=domain, resources=resources)
        
        # Generate variables.tf
        variables_template = self.template_env.get_template('variables.tf.j2')
        variables_tf = variables_template.render(inputs=domain.inputs)
        
        # Infer outputs from resources
        outputs = self.infer_outputs(domain, resources)
        
        # Generate outputs.tf
        outputs_template = self.template_env.get_template('outputs.tf.j2')
        outputs_tf = outputs_template.render(outputs=outputs)
        
        return TerraformModule(
            name=domain.name,
            main_tf=main_tf,
            variables_tf=variables_tf,
            outputs_tf=outputs_tf
        )
    
    def infer_outputs(self, domain: Domain, resources: List[Resource]) -> List[DomainOutput]:
        """Infer module outputs from resources"""
        outputs = list(domain.outputs)
        
        # Add common outputs for well-known resource types
        registry = ServiceRegistry.get_instance()
        for resource in resources:
            service = registry.get_service(resource.type)
            if service:
                for export in service.exports:
                    output_name = f"{resource.name}_{export}"
                    if not any(o.name == output_name for o in outputs):
                        outputs.append(DomainOutput(
                            name=output_name,
                            type='string',
                            description=f"{export} from {resource.name}"
                        ))
        
        return outputs
    
    def generate_root_main(self, domains: List[Domain]) -> str:
        """Generate root main.tf that wires modules together"""
        lines = ['# Root module - wires all domains together\n']
        
        for domain in domains:
            lines.append(f'\nmodule "{domain.name}" {{')
            lines.append(f'  source = "./modules/{domain.name}"')
            
            # Add input variables
            for inp in domain.inputs:
                lines.append(f'  {inp.name} = var.{inp.name}')
            
            lines.append('}')
        
        return '\n'.join(lines)
    
    def generate_providers(self) -> str:
        """Generate providers.tf"""
        return '''terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  type        = string
  description = "AWS region"
  default     = "us-east-1"
}
'''
    
    def generate_terraform_config(self) -> str:
        """Generate terraform.tf"""
        return '''terraform {
  required_version = ">= 1.5.0"
}
'''
