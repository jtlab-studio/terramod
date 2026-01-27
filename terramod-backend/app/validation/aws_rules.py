from typing import List
from app.core.graph import InfrastructureGraph
from app.validation.rules import ValidationRule
from app.validation.engine import ValidationMessage

class LambdaVPCRule(ValidationRule):
    """Check Lambda VPC configuration"""
    
    def validate(self, graph: InfrastructureGraph) -> List[ValidationMessage]:
        messages = []
        
        for resource_id, resource in graph.resources.items():
            if resource.type == 'aws_lambda_function':
                has_vpc = 'vpc_config' in resource.arguments
                
                if not has_vpc:
                    messages.append(ValidationMessage(
                        element_id=resource_id,
                        severity='warning',
                        message="Lambda function not configured with VPC (consider security implications)"
                    ))
        
        return messages

class RDSPrivateSubnetRule(ValidationRule):
    """Ensure RDS in private subnets"""
    
    def validate(self, graph: InfrastructureGraph) -> List[ValidationMessage]:
        messages = []
        
        for resource_id, resource in graph.resources.items():
            if resource.type == 'aws_db_instance':
                subnet_group = resource.arguments.get('db_subnet_group_name')
                publicly_accessible = resource.arguments.get('publicly_accessible', False)
                
                if publicly_accessible:
                    messages.append(ValidationMessage(
                        element_id=resource_id,
                        severity='error',
                        message="RDS instance should not be publicly accessible"
                    ))
                
                if not subnet_group:
                    messages.append(ValidationMessage(
                        element_id=resource_id,
                        severity='error',
                        message="RDS instance must specify db_subnet_group_name"
                    ))
        
        return messages

class ALBSubnetRule(ValidationRule):
    """Require ALB in ≥2 subnets across AZs"""
    
    def validate(self, graph: InfrastructureGraph) -> List[ValidationMessage]:
        messages = []
        
        for resource_id, resource in graph.resources.items():
            if resource.type == 'aws_lb' and resource.arguments.get('load_balancer_type') == 'application':
                subnets = resource.arguments.get('subnets', [])
                
                if len(subnets) < 2:
                    messages.append(ValidationMessage(
                        element_id=resource_id,
                        severity='error',
                        message="Application Load Balancer requires at least 2 subnets in different AZs"
                    ))
        
        return messages

class IAMRoleUsageRule(ValidationRule):
    """Ensure IAM roles have consumers"""
    
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
            role_arn = resource.arguments.get('role_arn') or resource.arguments.get('iam_role_arn')
            if role_arn:
                # Extract role name from ARN or reference
                referenced_roles.add(role_arn)
        
        # Check for unused roles
        for role_id, role in iam_roles.items():
            role_name = role.arguments.get('name', role.name)
            if role_name not in referenced_roles and role_id not in referenced_roles:
                messages.append(ValidationMessage(
                    element_id=role_id,
                    severity='warning',
                    message=f"IAM role '{role_name}' is not referenced by any resource"
                ))
        
        return messages
