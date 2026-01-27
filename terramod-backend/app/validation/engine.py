from typing import Dict, List, Optional
from dataclasses import dataclass
from enum import Enum
from app.core.graph import InfrastructureGraph
import logging

logger = logging.getLogger(__name__)

class ValidationTier(Enum):
    """Validation rule tiers"""
    TIER_0_GRAPH_INTEGRITY = 0  # Always blocking
    TIER_1_SECURITY = 1  # Blocking, override required
    TIER_2_AWS_ARCHITECTURE = 2  # Blocking in v1
    TIER_3_BEST_PRACTICE = 3  # Non-blocking (Phase 2)

@dataclass
class ValidationMessage:
    """Validation violation message"""
    element_id: str
    severity: str  # 'error' or 'warning'
    message: str
    tier: ValidationTier
    rule_id: str
    fix_hint: Optional[str] = None
    override_allowed: bool = False

@dataclass
class ValidationResults:
    """Validation results container"""
    errors: Dict[str, List[str]]
    warnings: Dict[str, List[str]]
    blocking_errors: Dict[str, List[str]]  # Errors that block export
    
    def has_blocking_errors(self) -> bool:
        """Check if there are any blocking errors"""
        return len(self.blocking_errors) > 0
    
    def to_dict(self) -> dict:
        """Serialize to dictionary"""
        return {
            'errors': self.errors,
            'warnings': self.warnings,
            'blocking_errors': self.blocking_errors,
            'can_export': not self.has_blocking_errors()
        }

class ValidationRule:
    """Base validation rule interface"""
    tier: ValidationTier = ValidationTier.TIER_3_BEST_PRACTICE
    rule_id: str = "unknown"
    
    def validate(self, graph: InfrastructureGraph) -> List[ValidationMessage]:
        raise NotImplementedError

class ValidationEngine:
    """Validation rule execution engine with tier-based validation"""
    
    def __init__(self):
        self.rules: List[ValidationRule] = []
        self.overrides: Dict[str, List[str]] = {}  # element_id -> [rule_ids]
        self._register_default_rules()
    
    def _register_default_rules(self):
        """Register default validation rules"""
        try:
            # Tier 0 - Graph Integrity (always blocking)
            from app.validation.rules import (
                OrphanResourceRule, 
                CircularDependencyRule, 
                DuplicateNameRule,
                RequiredInputsRule,
                ReferenceIntegrityRule
            )
            
            # Tier 1 - Security & Safety (blocking, override required)
            from app.validation.security_rules import (
                IAMLeastPrivilegeRule,
                AdminPortsRule,
                LambdaVPCSecurityRule
            )
            
            # Tier 2 - AWS Architecture (blocking in v1)
            from app.validation.aws_rules import (
                LambdaVPCRule,
                EC2SubnetRule,
                LambdaIAMRoleRule,
                IAMRoleUsageRule
            )
            
            # Register Tier 0 rules
            self.register_rule(OrphanResourceRule())
            self.register_rule(CircularDependencyRule())
            self.register_rule(DuplicateNameRule())
            self.register_rule(RequiredInputsRule())
            self.register_rule(ReferenceIntegrityRule())
            
            # Register Tier 1 rules
            self.register_rule(IAMLeastPrivilegeRule())
            self.register_rule(AdminPortsRule())
            self.register_rule(LambdaVPCSecurityRule())
            
            # Register Tier 2 rules
            self.register_rule(LambdaVPCRule())
            self.register_rule(EC2SubnetRule())
            self.register_rule(LambdaIAMRoleRule())
            self.register_rule(IAMRoleUsageRule())
            
            logger.info(f"Registered {len(self.rules)} validation rules")
        except ImportError as e:
            logger.error(f"Failed to import validation rules: {e}")
    
    def register_rule(self, rule: ValidationRule) -> None:
        self.rules.append(rule)
        logger.debug(f"Registered {rule.tier.name} rule: {rule.__class__.__name__}")
    
    def add_override(self, element_id: str, rule_id: str, reason: str = "") -> None:
        """Add validation override for specific element and rule"""
        if element_id not in self.overrides:
            self.overrides[element_id] = []
        if rule_id not in self.overrides[element_id]:
            self.overrides[element_id].append(rule_id)
            logger.info(f"Added override for {element_id} on rule {rule_id}: {reason}")
    
    def is_overridden(self, element_id: str, rule_id: str) -> bool:
        """Check if a validation rule is overridden for an element"""
        return element_id in self.overrides and rule_id in self.overrides[element_id]
    
    def validate_graph(self, graph: InfrastructureGraph) -> ValidationResults:
        """Run all validation rules and return categorized results"""
        errors: Dict[str, List[str]] = {}
        warnings: Dict[str, List[str]] = {}
        blocking_errors: Dict[str, List[str]] = {}
        
        for rule in self.rules:
            try:
                messages = rule.validate(graph)
                for msg in messages:
                    # Check if overridden
                    if msg.override_allowed and self.is_overridden(msg.element_id, msg.rule_id):
                        logger.debug(f"Skipping overridden rule {msg.rule_id} for {msg.element_id}")
                        continue
                    
                    if msg.severity == 'error':
                        if msg.element_id not in errors:
                            errors[msg.element_id] = []
                        
                        error_text = msg.message
                        if msg.fix_hint:
                            error_text += f" (Fix: {msg.fix_hint})"
                        errors[msg.element_id].append(error_text)
                        
                        # Tier 0, 1, 2 errors are blocking in Phase 1
                        if msg.tier in [
                            ValidationTier.TIER_0_GRAPH_INTEGRITY, 
                            ValidationTier.TIER_1_SECURITY,
                            ValidationTier.TIER_2_AWS_ARCHITECTURE
                        ]:
                            if msg.element_id not in blocking_errors:
                                blocking_errors[msg.element_id] = []
                            blocking_errors[msg.element_id].append(error_text)
                    else:
                        if msg.element_id not in warnings:
                            warnings[msg.element_id] = []
                        warnings[msg.element_id].append(msg.message)
            except Exception as e:
                logger.error(f"Rule {rule.__class__.__name__} failed: {e}", exc_info=True)
        
        logger.info(
            f"Validation complete: {len(errors)} errors, "
            f"{len(warnings)} warnings, {len(blocking_errors)} blocking"
        )
        
        return ValidationResults(
            errors=errors, 
            warnings=warnings,
            blocking_errors=blocking_errors
        )
