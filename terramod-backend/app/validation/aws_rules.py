"""Tier 2: AWS Architecture Rules (Blocking in v1)"""

from typing import List
from app.core.graph import InfrastructureGraph
from app.validation.engine import ValidationMessage, ValidationRule, ValidationTier

class LambdaVPCRule(ValidationRule):
    """Lambda VPC configuration validation"""
    tier = ValidationTier.TIER_2_AWS_ARCHITECTURE
    rule_id = "aws-lambda-vpc"
    
    def validate(self, graph: InfrastructureGraph) -> List[ValidationMessage]:
        messages = []
        
        for resource_id, resource in graph.resources.items():
            if resource.type == 'aws_lambda_function':
                vpc_config = resource.arguments.get('vpc_config')
                
                # If Lambda has VPC config, validate it's complete
                if vpc_config and isinstance(vpc_config, dict):
                    if not vpc_config.get('subnet_ids'):
                        messages.append(ValidationMessage(
                            element_id=resource_id,
                            severity='error',
                            message=f"Lambda '{resource.name}' VPC config missing subnet_ids",
                            tier=self.tier,
                            rule_id=self.rule_id,
                            fix_hint="Add subnet_ids to vpc_config",
                            override_allowed=False
                        ))
                    
                    if not vpc_config.get('security_group_ids'):
                        messages.append(ValidationMessage(
                            element_id=resource_id,
                            severity='error',
                            message=f"Lambda '{resource.name}' VPC config missing security_group_ids",
                            tier=self.tier,
                            rule_id=self.rule_id,
                            fix_hint="Add security_group_ids to vpc_config",
                            override_allowed=False
                        ))
        
        return messages

class EC2SubnetRule(ValidationRule):
    """EC2 instances must be in a subnet"""
    tier = ValidationTier.TIER_2_AWS_ARCHITECTURE
    rule_id = "aws-ec2-subnet"
    
    def validate(self, graph: InfrastructureGraph) -> List[ValidationMessage]:
        messages = []
        
        for resource_id, resource in graph.resources.items():
            if resource.type == 'aws_instance':
                subnet_id = resource.arguments.get('subnet_id')
                
                if not subnet_id:
                    messages.append(ValidationMessage(
                        element_id=resource_id,
                        severity='error',
                        message=f"EC2 instance '{resource.name}' must specify subnet_id",
                        tier=self.tier,
                        rule_id=self.rule_id,
                        fix_hint="Add subnet_id argument to place instance in a subnet",
                        override_allowed=False
                    ))
        
        return messages

class LambdaIAMRoleRule(ValidationRule):
    """Lambda functions must have IAM role"""
    tier = ValidationTier.TIER_2_AWS_ARCHITECTURE
    rule_id = "aws-lambda-iam-role"
    
    def validate(self, graph: InfrastructureGraph) -> List[ValidationMessage]:
        messages = []
        
        for resource_id, resource in graph.resources.items():
            if resource.type == 'aws_lambda_function':
                role = resource.arguments.get('role')
                
                if not role:
                    messages.append(ValidationMessage(
                        element_id=resource_id,
                        severity='error',
                        message=f"Lambda function '{resource.name}' must have IAM role",
                        tier=self.tier,
                        rule_id=self.rule_id,
                        fix_hint="Add 'role' argument with IAM role ARN",
                        override_allowed=False
                    ))
        
        return messages

class IAMRoleUsageRule(ValidationRule):
    """IAM roles must be referenced by at least one consumer"""
    tier = ValidationTier.TIER_2_AWS_ARCHITECTURE
    rule_id = "aws-iam-role-usage"
    
    def validate(self, graph: InfrastructureGraph) -> List[ValidationMessage]:
        messages = []
        
        # Find all IAM roles
        iam_roles = {
            rid: r for rid, r in graph.resources.items()
            if r.type == 'aws_iam_role'
        }
        
        # Find which roles are referenced
        referenced_roles = set()
        for resource in graph.resources.values():
            # Check for role references
            role_ref = resource.arguments.get('role') or resource.arguments.get('iam_role_arn')
            if role_ref:
                # Extract role name/id from ARN or reference
                if 'aws_iam_role' in str(role_ref):
                    referenced_roles.add(role_ref)
                else:
                    # Direct role name reference
                    for role_id, role in iam_roles.items():
                        if role.name in str(role_ref):
                            referenced_roles.add(role_id)
        
        # Check for unused roles
        for role_id, role in iam_roles.items():
            if role_id not in referenced_roles:
                messages.append(ValidationMessage(
                    element_id=role_id,
                    severity='warning',
                    message=f"IAM role '{role.name}' is not referenced by any resource",
                    tier=self.tier,
                    rule_id=self.rule_id,
                    fix_hint="Either use this role or remove it",
                    override_allowed=False
                ))
        
        return messages
