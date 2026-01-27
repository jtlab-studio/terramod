from typing import Dict, List
from dataclasses import dataclass
from app.core.graph import InfrastructureGraph
from app.validation.rules import ValidationRule, OrphanResourceRule, CircularDependencyRule, DuplicateNameRule
from app.validation.aws_rules import LambdaVPCRule, RDSPrivateSubnetRule, ALBSubnetRule, IAMRoleUsageRule
import logging

logger = logging.getLogger(__name__)

@dataclass
class ValidationMessage:
    """Validation violation message"""
    element_id: str
    severity: str  # 'error' or 'warning'
    message: str

@dataclass
class ValidationResults:
    """Validation results container"""
    errors: Dict[str, List[str]]
    warnings: Dict[str, List[str]]

class ValidationEngine:
    """Validation rule execution engine"""
    
    def __init__(self):
        self.rules: List[ValidationRule] = []
        self._register_default_rules()
    
    def _register_default_rules(self):
        """Register default validation rules"""
        # Generic rules
        self.register_rule(OrphanResourceRule())
        self.register_rule(CircularDependencyRule())
        self.register_rule(DuplicateNameRule())
        
        # AWS-specific rules
        self.register_rule(LambdaVPCRule())
        self.register_rule(RDSPrivateSubnetRule())
        self.register_rule(ALBSubnetRule())
        self.register_rule(IAMRoleUsageRule())
    
    def register_rule(self, rule: ValidationRule) -> None:
        """Register validation rule"""
        self.rules.append(rule)
        logger.debug(f"Registered rule: {rule.__class__.__name__}")
    
    def validate_graph(self, graph: InfrastructureGraph) -> ValidationResults:
        """Validate infrastructure graph"""
        errors: Dict[str, List[str]] = {}
        warnings: Dict[str, List[str]] = {}
        
        for rule in self.rules:
            try:
                messages = self.execute_rule(rule, graph)
                
                for msg in messages:
                    if msg.severity == 'error':
                        if msg.element_id not in errors:
                            errors[msg.element_id] = []
                        errors[msg.element_id].append(msg.message)
                    else:
                        if msg.element_id not in warnings:
                            warnings[msg.element_id] = []
                        warnings[msg.element_id].append(msg.message)
            except Exception as e:
                logger.error(f"Rule {rule.__class__.__name__} failed: {e}")
        
        return ValidationResults(errors=errors, warnings=warnings)
    
    def execute_rule(self, rule: ValidationRule, graph: InfrastructureGraph) -> List[ValidationMessage]:
        """Execute single validation rule"""
        return rule.validate(graph)
