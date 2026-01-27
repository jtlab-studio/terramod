from dataclasses import dataclass
from typing import List, Dict, Any, Optional
from enum import Enum
from app.core.domain import DomainType

@dataclass
class ServiceDefinition:
    """Complete service metadata"""
    resource_type: str
    domain: DomainType
    category: str
    required_inputs: List[str]
    optional_inputs: List[str]
    exports: List[str]
    allowed_consumers: List[str]

@dataclass
class ArgumentSchema:
    """Terraform argument definition"""
    name: str
    type: str
    required: bool
    default: Optional[Any] = None
    description: str = ""

@dataclass
class OutputSchema:
    """Terraform output definition"""
    name: str
    type: str
    description: str = ""

@dataclass
class ValidationRule:
    """Validation rule definition"""
    name: str
    description: str
    severity: str  # 'error' or 'warning'

@dataclass
class ResourceSchema:
    """Detailed resource schema"""
    resource_type: str
    inputs: Dict[str, ArgumentSchema]
    outputs: Dict[str, OutputSchema]
    validation_rules: List[ValidationRule]
