"""
Updated Terraform Generator with Multi-AZ/Region Support

This generator uses the deployment alias system to properly expand
resources across availability zones and regions.
"""

from typing import Dict, List
from dataclasses import dataclass
from jinja2 import Environment, FileSystemLoader, select_autoescape
from pathlib import Path
from app.core.graph import InfrastructureGraph
from app.core.domain import Domain, DomainOutput
from app.core.resource import Resource
from app.registry.loader import ServiceRegistry
from app.deployment import (
    DeploymentConfig,
    DeploymentStrategy,
    expand_infrastructure_for_deployment
)
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

class TerraformGeneratorWithDeployment:
    """Enhanced Terraform generator with deployment alias support"""
    
    def __init__(self):
        template_dir = Path(__file__).parent / 'templates'
        self.template_env = Environment(
            loader=FileSystemLoader(str(template_dir)),
            autoescape=select_autoescape(),
            trim_blocks=True,
            lstrip_blocks=True
        )
        
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
    
    def generate_project(
        self, 
        graph: InfrastructureGraph,
        deployment_config: Dict[str, any]
    ) -> TerraformProject:
        """Generate complete Terraform project with deployment expansion"""
        
        # Create DeploymentConfig from dict
        config = DeploymentConfig(
            primary_region=deployment_config.get('primaryRegion', 'us-east-1'),
            availability_zones=deployment_config.get('availabilityZones', ['us-east-1a', 'us-east-1b', 'us-east-1c']),
            replica_regions=deployment_config.get('replicaRegions')
        )
        
        modules = {}
        
        # Generate module for each domain with deployment expansion
        for domain in graph.domains.values():
            domain_resources = [
                graph.resources[rid] for rid in domain.resource_ids
                if rid in graph.resources
            ]
            
            if domain_resources:
                module = self.generate_module_with_deployment(
                    domain, 
                    domain_resources,
                    config
                )
                modules[domain.name] = module
        
        # Generate root files
        root_main = self.generate_root_main(list(graph.domains.values()), config)
        providers = self.generate_providers(config)
        terraform_config = self.generate_terraform_config()
        
        return TerraformProject(
            modules=modules,
            root_main=root_main,
            providers=providers,
            terraform_config=terraform_config
        )
    
    def generate_module_with_deployment(
        self, 
        domain: Domain, 
        resources: List[Resource],
        config: DeploymentConfig
    ) -> TerraformModule:
        """Generate Terraform module with deployment expansion"""
        
        # Convert resources to dict format for expansion
        resource_dicts = [
            {
                'id': r.id,
                'type': r.type,
                'name': r.name,
                'arguments': r.arguments,
                'deployment': r.deployment if hasattr(r, 'deployment') else {'strategy': 'single'}
            }
            for r in resources
        ]
        
        # Expand resources based on deployment strategies
        expansion = expand_infrastructure_for_deployment(resource_dicts, config)
        expanded_resources = expansion['expanded_resources']
        terraform_locals = expansion['terraform_locals']
        
        # Generate main.tf with expansion
        main_lines = [terraform_locals, '']
        
        for exp_resource in expanded_resources:
            resource_tf = self._generate_resource_block(exp_resource)
            main_lines.append(resource_tf)
            main_lines.append('')
        
        main_tf = '\n'.join(main_lines)
        
        # Generate variables.tf
        variables_template = self.template_env.get_template('variables.tf.j2')
        variables_tf = variables_template.render(inputs=domain.inputs)
        
        # Infer outputs
        outputs = self.infer_outputs_with_deployment(domain, expanded_resources)
        
        # Generate outputs.tf
        outputs_template = self.template_env.get_template('outputs.tf.j2')
        outputs_tf = outputs_template.render(outputs=outputs)
        
        return TerraformModule(
            name=domain.name,
            main_tf=main_tf,
            variables_tf=variables_tf,
            outputs_tf=outputs_tf
        )
    
    def _generate_resource_block(self, expanded_resource: Dict) -> str:
        """Generate Terraform resource block with meta-arguments"""
        
        resource_type = expanded_resource['type']
        alias = expanded_resource.get('deployment_alias', {})
        terraform_name = alias.get('terraform_name', expanded_resource['name'])
        arguments = expanded_resource.get('arguments', {})
        terraform_meta = expanded_resource.get('terraform_meta', {})
        
        lines = [f'resource "{resource_type}" "{terraform_name}" {{']
        
        # Add meta-arguments first (for_each, count, etc.)
        for key, value in terraform_meta.items():
            if key in ['for_each', 'count']:
                lines.append(f'  {key} = {value}')
        
        lines.append('')
        
        # Add regular arguments
        merged_args = {**arguments, **{k: v for k, v in terraform_meta.items() if k not in ['for_each', 'count']}}
        
        for arg_name, arg_value in merged_args.items():
            if arg_name.startswith('$'):
                # Expression - don't quote
                lines.append(f'  {arg_name[1:]} = {arg_value}')
            else:
                lines.append(f'  {arg_name} = {self._to_hcl_value(arg_value)}')
        
        lines.append('}')
        
        return '\n'.join(lines)
    
    def infer_outputs_with_deployment(
        self, 
        domain: Domain, 
        expanded_resources: List[Dict]
    ) -> List[DomainOutput]:
        """Infer module outputs considering deployment expansion"""
        
        outputs = list(domain.outputs)
        registry = ServiceRegistry.get_instance()
        
        # Group by base resource
        base_resources = {}
        for exp_resource in expanded_resources:
            base_name = exp_resource['name']
            if base_name not in base_resources:
                base_resources[base_name] = []
            base_resources[base_name].append(exp_resource)
        
        # Generate outputs for each base resource
        for base_name, instances in base_resources.items():
            first_instance = instances[0]
            service = registry.get_service(first_instance['type'])
            
            if service:
                for export in service.exports:
                    if len(instances) > 1:
                        # Multiple instances - output as list or map
                        alias_type = instances[0].get('deployment_alias', {}).get('alias_type')
                        
                        if alias_type == 'az':
                            output_name = f"{base_name}_{export}_by_az"
                            description = f"{export} from {base_name} mapped by AZ"
                        else:
                            output_name = f"{base_name}_{export}_list"
                            description = f"List of {export} from {base_name} instances"
                    else:
                        # Single instance
                        output_name = f"{base_name}_{export}"
                        description = f"{export} from {base_name}"
                    
                    if not any(o.name == output_name for o in outputs):
                        outputs.append(DomainOutput(
                            name=output_name,
                            type='string',
                            description=description
                        ))
        
        return outputs
    
    def generate_root_main(
        self, 
        domains: List[Domain],
        config: DeploymentConfig
    ) -> str:
        """Generate root main.tf with deployment configuration"""
        
        lines = [
            '# Root module - wires all domains together',
            '',
            '# Deployment Configuration',
            'locals {',
            f'  primary_region = "{config.primary_region}"',
            f'  availability_zones = {self._to_hcl_value(config.availability_zones)}',
            '}',
            ''
        ]
        
        for domain in domains:
            lines.append(f'module "{domain.name}" {{')
            lines.append(f'  source = "./modules/{domain.name}"')
            lines.append('')
            
            # Pass deployment config to modules
            lines.append('  # Deployment configuration')
            lines.append('  primary_region = local.primary_region')
            lines.append('  availability_zones = local.availability_zones')
            lines.append('')
            
            # Add input variables
            for inp in domain.inputs:
                lines.append(f'  {inp.name} = var.{inp.name}')
            
            lines.append('}')
            lines.append('')
        
        return '\n'.join(lines)
    
    def generate_providers(self, config: DeploymentConfig) -> str:
        """Generate providers.tf with region configuration"""
        
        return f'''terraform {{
  required_providers {{
    aws = {{
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }}
  }}
}}

provider "aws" {{
  region = var.aws_region
}}

variable "aws_region" {{
  type        = string
  description = "AWS region"
  default     = "{config.primary_region}"
}}
'''
    
    def generate_terraform_config(self) -> str:
        """Generate terraform.tf"""
        return '''terraform {
  required_version = ">= 1.5.0"
}
'''