"""Tier 1: Security & Safety Rules (Blocking, Override Required)"""

from typing import List, Any
from app.core.graph import InfrastructureGraph
from app.validation.engine import ValidationMessage, ValidationRule, ValidationTier
import re

class IAMLeastPrivilegeRule(ValidationRule):
    """Enforce least-privilege IAM policies"""
    tier = ValidationTier.TIER_1_SECURITY
    rule_id = "security-iam-least-privilege"
    
    def validate(self, graph: InfrastructureGraph) -> List[ValidationMessage]:
        messages = []
        
        for resource_id, resource in graph.resources.items():
            if resource.type != 'aws_iam_role':
                continue
            
            # Check for wildcard actions
            assume_role_policy = resource.arguments.get('assume_role_policy', {})
            if self._has_wildcard_actions(assume_role_policy):
                messages.append(ValidationMessage(
                    element_id=resource_id,
                    severity='error',
                    message=f"IAM role '{resource.name}' has wildcard actions (*:*) - violates least privilege",
                    tier=self.tier,
                    rule_id=self.rule_id,
                    fix_hint="Scope actions to specific AWS services (e.g., 's3:GetObject')",
                    override_allowed=True
                ))
            
            # Check for wildcard resources
            if self._has_wildcard_resources(assume_role_policy):
                messages.append(ValidationMessage(
                    element_id=resource_id,
                    severity='error',
                    message=f"IAM role '{resource.name}' has wildcard resources (*) - violates least privilege",
                    tier=self.tier,
                    rule_id=self.rule_id,
                    fix_hint="Scope resources to specific ARNs",
                    override_allowed=True
                ))
            
            # Check for AdministratorAccess
            managed_policies = resource.arguments.get('managed_policy_arns', [])
            if isinstance(managed_policies, list):
                for policy in managed_policies:
                    if 'AdministratorAccess' in str(policy):
                        messages.append(ValidationMessage(
                            element_id=resource_id,
                            severity='error',
                            message=f"IAM role '{resource.name}' has AdministratorAccess - forbidden in Terramod",
                            tier=self.tier,
                            rule_id=self.rule_id,
                            fix_hint="Create custom policy with specific permissions needed",
                            override_allowed=True
                        ))
        
        return messages
    
    def _has_wildcard_actions(self, policy: Any) -> bool:
        """Check if policy contains wildcard actions"""
        if isinstance(policy, dict):
            if 'Statement' in policy:
                for statement in policy['Statement']:
                    if isinstance(statement, dict):
                        actions = statement.get('Action', [])
                        if isinstance(actions, list):
                            if '*' in actions or '*:*' in actions:
                                return True
                        elif actions in ['*', '*:*']:
                            return True
        return False
    
    def _has_wildcard_resources(self, policy: Any) -> bool:
        """Check if policy contains wildcard resources"""
        if isinstance(policy, dict):
            if 'Statement' in policy:
                for statement in policy['Statement']:
                    if isinstance(statement, dict):
                        resources = statement.get('Resource', [])
                        if isinstance(resources, list):
                            if '*' in resources:
                                return True
                        elif resources == '*':
                            return True
        return False

class AdminPortsRule(ValidationRule):
    """Prevent admin ports open to 0.0.0.0/0"""
    tier = ValidationTier.TIER_1_SECURITY
    rule_id = "security-admin-ports-open"
    
    ADMIN_PORTS = [22, 3389]  # SSH, RDP
    
    def validate(self, graph: InfrastructureGraph) -> List[ValidationMessage]:
        messages = []
        
        for resource_id, resource in graph.resources.items():
            if resource.type != 'aws_security_group':
                continue
            
            ingress_rules = resource.arguments.get('ingress', [])
            if not isinstance(ingress_rules, list):
                continue
            
            for rule in ingress_rules:
                if not isinstance(rule, dict):
                    continue
                
                from_port = rule.get('from_port')
                to_port = rule.get('to_port')
                cidr_blocks = rule.get('cidr_blocks', [])
                
                # Check if admin port is open
                for admin_port in self.ADMIN_PORTS:
                    if (from_port and to_port and 
                        from_port <= admin_port <= to_port and
                        '0.0.0.0/0' in cidr_blocks):
                        port_name = 'SSH' if admin_port == 22 else 'RDP'
                        messages.append(ValidationMessage(
                            element_id=resource_id,
                            severity='error',
                            message=f"Security group '{resource.name}' has {port_name} (port {admin_port}) open to 0.0.0.0/0",
                            tier=self.tier,
                            rule_id=self.rule_id,
                            fix_hint=f"Restrict {port_name} access to specific IP ranges",
                            override_allowed=True
                        ))
        
        return messages

class LambdaVPCSecurityRule(ValidationRule):
    """Lambda in VPC must have security group and subnets"""
    tier = ValidationTier.TIER_1_SECURITY
    rule_id = "security-lambda-vpc-config"
    
    def validate(self, graph: InfrastructureGraph) -> List[ValidationMessage]:
        messages = []
        
        for resource_id, resource in graph.resources.items():
            if resource.type != 'aws_lambda_function':
                continue
            
            vpc_config = resource.arguments.get('vpc_config')
            if not vpc_config:
                continue  # Lambda not in VPC is OK
            
            if not isinstance(vpc_config, dict):
                continue
            
            # Check for security_group_ids
            sg_ids = vpc_config.get('security_group_ids', [])
            if not sg_ids or len(sg_ids) == 0:
                messages.append(ValidationMessage(
                    element_id=resource_id,
                    severity='error',
                    message=f"Lambda '{resource.name}' in VPC must have security_group_ids",
                    tier=self.tier,
                    rule_id=self.rule_id,
                    fix_hint="Add security_group_ids to vpc_config",
                    override_allowed=False
                ))
            
            # Check for subnet_ids
            subnet_ids = vpc_config.get('subnet_ids', [])
            if not subnet_ids or len(subnet_ids) == 0:
                messages.append(ValidationMessage(
                    element_id=resource_id,
                    severity='error',
                    message=f"Lambda '{resource.name}' in VPC must have subnet_ids",
                    tier=self.tier,
                    rule_id=self.rule_id,
                    fix_hint="Add subnet_ids to vpc_config",
                    override_allowed=False
                ))
        
        return messages
