"""
Deployment Alias System for Multi-AZ/Region Infrastructure

This module handles the expansion of resource deployment strategies into
concrete Terraform resources with proper for_each or count expressions.
"""

from dataclasses import dataclass
from typing import List, Dict, Any, Optional
from enum import Enum

class DeploymentStrategy(str, Enum):
    SINGLE = 'single'
    PER_AZ = 'per-az'
    MULTI_AZ = 'multi-az'
    REGIONAL = 'regional'

@dataclass
class DeploymentAlias:
    """Represents a specific instance in a deployment"""
    resource_id: str
    resource_type: str
    base_name: str
    alias_type: str  # 'region' or 'az'
    alias_value: str  # e.g., 'us-east-1a'
    alias_index: int  # 0, 1, 2, etc.
    
    def get_terraform_name(self) -> str:
        """Generate Terraform resource name"""
        if self.alias_type == 'az':
            # Extract short AZ name: us-east-1a -> 1a
            short_az = self.alias_value.split('-')[-1]
            return f"{self.base_name}_{short_az}"
        elif self.alias_type == 'region':
            return f"{self.base_name}_{self.alias_value.replace('-', '_')}"
        else:
            return self.base_name
    
    def get_for_each_key(self) -> str:
        """Generate for_each key"""
        return self.alias_value
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'resource_id': self.resource_id,
            'resource_type': self.resource_type,
            'base_name': self.base_name,
            'alias_type': self.alias_type,
            'alias_value': self.alias_value,
            'alias_index': self.alias_index,
            'terraform_name': self.get_terraform_name(),
            'for_each_key': self.get_for_each_key()
        }

@dataclass
class DeploymentConfig:
    """Global deployment configuration"""
    primary_region: str
    availability_zones: List[str]
    replica_regions: Optional[List[Dict[str, Any]]] = None

class DeploymentExpander:
    """Expands deployment strategies into concrete resource instances"""
    
    def __init__(self, config: DeploymentConfig):
        self.config = config
    
    def expand_resource(
        self, 
        resource_id: str,
        resource_type: str,
        base_name: str,
        strategy: DeploymentStrategy,
        arguments: Dict[str, Any]
    ) -> List[DeploymentAlias]:
        """
        Expand a resource based on its deployment strategy.
        
        Returns a list of DeploymentAlias objects representing each
        concrete instance that should be created.
        """
        
        if strategy == DeploymentStrategy.SINGLE:
            return [DeploymentAlias(
                resource_id=resource_id,
                resource_type=resource_type,
                base_name=base_name,
                alias_type='none',
                alias_value='',
                alias_index=0
            )]
        
        elif strategy == DeploymentStrategy.PER_AZ:
            return [
                DeploymentAlias(
                    resource_id=f"{resource_id}_{idx}",
                    resource_type=resource_type,
                    base_name=base_name,
                    alias_type='az',
                    alias_value=az,
                    alias_index=idx
                )
                for idx, az in enumerate(self.config.availability_zones)
            ]
        
        elif strategy == DeploymentStrategy.MULTI_AZ:
            # Multi-AZ resources are single but span all AZs
            return [DeploymentAlias(
                resource_id=resource_id,
                resource_type=resource_type,
                base_name=base_name,
                alias_type='multi-az',
                alias_value=','.join(self.config.availability_zones),
                alias_index=0
            )]
        
        elif strategy == DeploymentStrategy.REGIONAL:
            # Regional resources - one per region
            regions = [self.config.primary_region]
            if self.config.replica_regions:
                regions.extend([r['region'] for r in self.config.replica_regions])
            
            return [
                DeploymentAlias(
                    resource_id=f"{resource_id}_{idx}",
                    resource_type=resource_type,
                    base_name=base_name,
                    alias_type='region',
                    alias_value=region,
                    alias_index=idx
                )
                for idx, region in enumerate(regions)
            ]
        
        else:
            raise ValueError(f"Unknown deployment strategy: {strategy}")
    
    def generate_terraform_expression(
        self,
        strategy: DeploymentStrategy,
        resource_type: str,
        base_arguments: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Generate the appropriate Terraform meta-argument (for_each, count)
        for a given deployment strategy.
        """
        
        if strategy == DeploymentStrategy.SINGLE:
            return {}  # No meta-arguments needed
        
        elif strategy == DeploymentStrategy.PER_AZ:
            return {
                'for_each': 'toset(local.availability_zones)',
                'availability_zone': 'each.value',
                'tags': {
                    **base_arguments.get('tags', {}),
                    'AZ': '${each.value}'
                }
            }
        
        elif strategy == DeploymentStrategy.MULTI_AZ:
            # For resources like ALB, RDS that span AZs
            if resource_type in ['aws_lb', 'aws_alb', 'aws_nlb']:
                return {
                    'subnets': '${[for s in aws_subnet.main : s.id]}'
                }
            elif resource_type == 'aws_rds_cluster':
                return {
                    'availability_zones': 'local.availability_zones'
                }
            else:
                return {}
        
        elif strategy == DeploymentStrategy.REGIONAL:
            return {
                'for_each': 'toset(local.regions)',
                'region': 'each.value',
                'tags': {
                    **base_arguments.get('tags', {}),
                    'Region': '${each.value}'
                }
            }
        
        else:
            return {}
    
    def generate_locals_block(self) -> str:
        """Generate Terraform locals block with AZ/region configuration"""
        lines = ['locals {']
        lines.append(f'  availability_zones = {self._to_terraform_list(self.config.availability_zones)}')
        lines.append(f'  az_count = length(local.availability_zones)')
        lines.append(f'  primary_region = "{self.config.primary_region}"')
        
        if self.config.replica_regions:
            regions = [self.config.primary_region] + [r['region'] for r in self.config.replica_regions]
            lines.append(f'  regions = {self._to_terraform_list(regions)}')
        
        lines.append('}')
        return '\n'.join(lines)
    
    def _to_terraform_list(self, items: List[str]) -> str:
        """Convert Python list to Terraform list syntax"""
        quoted = [f'"{item}"' for item in items]
        return f'[{", ".join(quoted)}]'
    
    def generate_cidr_calculations(
        self,
        vpc_cidr: str,
        resource_name: str
    ) -> Dict[str, str]:
        """
        Generate CIDR calculations for per-AZ subnets.
        
        Returns a dict mapping AZ names to CIDR blocks.
        """
        # Extract base octets from VPC CIDR
        base_ip = vpc_cidr.split('/')[0]
        octets = base_ip.split('.')
        
        cidrs = {}
        for idx, az in enumerate(self.config.availability_zones):
            new_octets = octets.copy()
            new_octets[2] = str(int(octets[2]) + idx)
            cidrs[az] = f"{'.'.join(new_octets)}/24"
        
        return cidrs
    
    def generate_subnet_terraform(
        self,
        vpc_id_ref: str,
        base_name: str,
        vpc_cidr: str
    ) -> str:
        """Generate Terraform for per-AZ subnets with auto-CIDR"""
        lines = [
            f'resource "aws_subnet" "{base_name}" {{',
            f'  for_each = toset(local.availability_zones)',
            f'',
            f'  vpc_id            = {vpc_id_ref}',
            f'  availability_zone = each.value',
            f'  cidr_block        = cidrsubnet("{vpc_cidr}", 8, index(local.availability_zones, each.value))',
            f'',
            f'  tags = {{',
            f'    Name = "${{{base_name}}}-${{each.value}}"',
            f'    AZ   = each.value',
            f'  }}',
            f'}}'
        ]
        return '\n'.join(lines)

def expand_infrastructure_for_deployment(
    resources: List[Dict[str, Any]],
    deployment_config: DeploymentConfig
) -> Dict[str, Any]:
    """
    Main entry point: Expand all resources based on deployment strategies.
    
    Returns an expanded representation with:
    - expanded_resources: List of concrete resource instances
    - terraform_locals: Locals block content
    - deployment_metadata: Metadata about expansion
    """
    
    expander = DeploymentExpander(deployment_config)
    expanded_resources = []
    
    for resource in resources:
        strategy = DeploymentStrategy(resource.get('deployment', {}).get('strategy', 'single'))
        
        aliases = expander.expand_resource(
            resource_id=resource['id'],
            resource_type=resource['type'],
            base_name=resource['name'],
            strategy=strategy,
            arguments=resource.get('arguments', {})
        )
        
        for alias in aliases:
            expanded_resource = {
                **resource,
                'deployment_alias': alias.to_dict(),
                'terraform_meta': expander.generate_terraform_expression(
                    strategy,
                    resource['type'],
                    resource.get('arguments', {})
                )
            }
            expanded_resources.append(expanded_resource)
    
    return {
        'expanded_resources': expanded_resources,
        'terraform_locals': expander.generate_locals_block(),
        'deployment_metadata': {
            'primary_region': deployment_config.primary_region,
            'availability_zones': deployment_config.availability_zones,
            'total_aliases': len(expanded_resources)
        }
    }