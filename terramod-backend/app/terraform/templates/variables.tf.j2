from typing import Dict, List, Any
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
    """Terraform HCL code generator with fixes for duplicate resources and proper HCL rendering"""
    
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
    
    def _to_hcl_value(self, value, indent_level: int = 0) -> str:
        """
        Convert Python value to HCL representation with proper nested structure handling.
        
        ✅ FIX #7: This now properly handles nested structures like CloudFront origin blocks
        """
        indent = "  " * indent_level
        next_indent = "  " * (indent_level + 1)
        
        if isinstance(value, str):
            # Check if it's a Terraform interpolation
            if value.startswith('${') and value.endswith('}'):
                return value  # Don't quote interpolations
            return f'"{value}"'
        
        elif isinstance(value, bool):
            return 'true' if value else 'false'
        
        elif isinstance(value, (int, float)):
            return str(value)
        
        elif isinstance(value, list):
            if not value:
                return '[]'
            
            # ✅ FIX #7: Check if list contains dict objects (HCL blocks)
            if value and isinstance(value[0], dict):
                # This is a list of blocks - render each as a separate block
                blocks = []
                for item in value:
                    block_lines = ['{']
                    for k, v in item.items():
                        hcl_val = self._to_hcl_value(v, indent_level + 1)
                        block_lines.append(f'{next_indent}{k} = {hcl_val}')
                    block_lines.append(f'{indent}}}')
                    blocks.append('\n'.join(block_lines))
                return '\n'.join(blocks)
            else:
                # Simple list - render inline
                items = ', '.join(self._to_hcl_value(v, indent_level) for v in value)
                return f'[{items}]'
        
        elif isinstance(value, dict):
            if not value:
                return '{}'
            
            # ✅ Render as HCL block with proper nesting
            lines = ['{']
            for k, v in value.items():
                hcl_val = self._to_hcl_value(v, indent_level + 1)
                lines.append(f'{next_indent}{k} = {hcl_val}')
            lines.append(f'{indent}}}')
            return '\n'.join(lines)
        
        elif value is None:
            return 'null'
        
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
        """
        Generate Terraform module for domain
        
        ✅ FIX #3: Deduplicates resources by ID before rendering
        """
        
        # ✅ FIX #3: Deduplicate resources by ID
        unique_resources = {r.id: r for r in resources}.values()
        unique_resources_list = list(unique_resources)
        
        logger.info(f"Generating module for domain '{domain.name}': "
                   f"{len(resources)} resources provided, "
                   f"{len(unique_resources_list)} unique resources after deduplication")
        
        # Generate main.tf
        main_template = self.template_env.get_template('module.tf.j2')
        main_tf = main_template.render(
            domain=domain, 
            resources=unique_resources_list  # Use deduplicated list
        )
        
        # Generate variables.tf with DB passwords if needed
        variables_tf = self._generate_variables(domain, unique_resources_list)
        
        # Infer outputs from resources
        outputs = self.infer_outputs(domain, unique_resources_list)
        
        # Generate outputs.tf
        outputs_template = self.template_env.get_template('outputs.tf.j2')
        outputs_tf = outputs_template.render(outputs=outputs)
        
        return TerraformModule(
            name=domain.name,
            main_tf=main_tf,
            variables_tf=variables_tf,
            outputs_tf=outputs_tf
        )
    
    def _generate_variables(self, domain: Domain, resources: List[Resource]) -> str:
        """
        Generate variables.tf with database passwords for RDS instances
        
        ✅ FIX #5: Adds required DB password variables
        """
        variables = list(domain.inputs)
        
        # ✅ FIX #5: Add DB password variables for RDS instances
        db_password_envs = set()
        for resource in resources:
            if resource.type == 'aws_db_instance':
                # Extract environment from resource name (assumes naming like 'rds-dev', 'rds-staging', 'rds-prod')
                name_parts = resource.name.split('-')
                if len(name_parts) >= 2:
                    env = name_parts[-1]
                    if env in ['dev', 'staging', 'prod']:
                        db_password_envs.add(env)
        
        # Add password variables for each environment
        for env in sorted(db_password_envs):
            var_name = f'db_password_{env}'
            if not any(v.name == var_name for v in variables):
                variables.append(DomainOutput(  # Using DomainOutput as it has name/type/description
                    name=var_name,
                    type='string',
                    description=f'Database password for {env} environment (sensitive)'
                ))
        
        # Render template
        variables_template = self.template_env.get_template('variables.tf.j2')
        
        # Convert DomainOutput objects to dicts for template
        variables_dicts = []
        for v in variables:
            is_password = 'password' in v.name.lower()
            var_dict = {
                'name': v.name,
                'type': v.type,
                'required': True if is_password else getattr(v, 'required', False),
                'description': v.description if v.description else v.name,
                'sensitive': True if is_password else False  # Boolean, not string expression
            }
            variables_dicts.append(var_dict)
        
        return variables_template.render(inputs=variables_dicts)
    
    def infer_outputs(self, domain: Domain, resources: List[Resource]) -> List[DomainOutput]:
        """
        Infer module outputs from resources
        
        ✅ FIX #4: Generates standard outputs per domain type for cross-module references
        """
        outputs = list(domain.outputs)
        
        # ✅ FIX #4: Add standard outputs based on domain type
        if domain.type.value == 'networking':
            # Add standard networking outputs
            standard_outputs = [
                ('vpc_id', 'string', 'VPC ID'),
                ('public_subnet_ids', 'list(string)', 'Public subnet IDs'),
                ('private_subnet_ids', 'list(string)', 'Private subnet IDs'),
                ('security_group_web_id', 'string', 'Web security group ID'),
                ('security_group_db_id', 'string', 'Database security group ID'),
            ]
            for out_name, out_type, out_desc in standard_outputs:
                if not any(o.name == out_name for o in outputs):
                    outputs.append(DomainOutput(
                        name=out_name,
                        type=out_type,
                        description=out_desc
                    ))
        
        elif domain.type.value == 'compute':
            standard_outputs = [
                ('asg_name', 'string', 'Auto Scaling Group name'),
                ('launch_template_id', 'string', 'Launch Template ID'),
            ]
            for out_name, out_type, out_desc in standard_outputs:
                if not any(o.name == out_name for o in outputs):
                    outputs.append(DomainOutput(
                        name=out_name,
                        type=out_type,
                        description=out_desc
                    ))
        
        elif domain.type.value == 'data':
            standard_outputs = [
                ('db_endpoint', 'string', 'Database endpoint'),
                ('db_name', 'string', 'Database name'),
                ('db_port', 'number', 'Database port'),
            ]
            for out_name, out_type, out_desc in standard_outputs:
                if not any(o.name == out_name for o in outputs):
                    outputs.append(DomainOutput(
                        name=out_name,
                        type=out_type,
                        description=out_desc
                    ))
        
        # Add service-specific outputs from registry
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
        """
        Generate root main.tf that wires modules together
        
        ✅ FIX #4: Properly passes outputs between modules for cross-module references
        """
        lines = ['# Root module - wires all domains together\n']
        
        # Generate modules in dependency order (networking first)
        domain_order = ['networking', 'compute', 'data', 'storage', 'edge', 'identity', 'observability']
        sorted_domains = sorted(domains, key=lambda d: domain_order.index(d.type.value) if d.type.value in domain_order else 999)
        
        for domain in sorted_domains:
            lines.append(f'\nmodule "{domain.name}" {{')
            lines.append(f'  source = "./modules/{domain.name}"')
            
            # ✅ FIX #4: Pass outputs from other modules as inputs
            if domain.type.value == 'compute':
                # Compute module needs networking outputs
                lines.append('  # Networking outputs')
                lines.append('  vpc_id = module.networking.vpc_id')
                lines.append('  private_subnet_ids = module.networking.private_subnet_ids')
                lines.append('  security_group_web_id = module.networking.security_group_web_id')
            
            elif domain.type.value == 'data':
                # Data module needs networking outputs
                lines.append('  # Networking outputs')
                lines.append('  vpc_id = module.networking.vpc_id')
                lines.append('  private_subnet_ids = module.networking.private_subnet_ids')
                lines.append('  security_group_db_id = module.networking.security_group_db_id')
            
            elif domain.type.value == 'edge':
                # Edge module needs compute outputs
                lines.append('  # Compute outputs')
                lines.append('  asg_name = module.compute.asg_name')
            
            # Add user-defined input variables
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