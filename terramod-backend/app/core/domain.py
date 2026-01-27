from dataclasses import dataclass, field
from typing import List, Optional
from enum import Enum

class DomainType(str, Enum):
    NETWORKING = 'networking'
    COMPUTE = 'compute'
    SERVERLESS = 'serverless'
    DATA = 'data'
    STORAGE = 'storage'
    MESSAGING = 'messaging'
    IDENTITY = 'identity'
    OBSERVABILITY = 'observability'
    EDGE = 'edge'

@dataclass
class Position:
    x: int
    y: int

@dataclass
class DomainInput:
    name: str
    type: str
    required: bool
    description: Optional[str] = None

@dataclass
class DomainOutput:
    name: str
    type: str
    description: Optional[str] = None

@dataclass
class Domain:
    id: str
    name: str
    type: DomainType
    resource_ids: List[str] = field(default_factory=list)
    inputs: List[DomainInput] = field(default_factory=list)
    outputs: List[DomainOutput] = field(default_factory=list)
    position: Position = field(default_factory=lambda: Position(0, 0))
    width: int = 200
    height: int = 150
    
    def add_input(self, input: DomainInput) -> None:
        """Add input definition"""
        self.inputs.append(input)
    
    def remove_input(self, name: str) -> None:
        """Remove input by name"""
        self.inputs = [i for i in self.inputs if i.name != name]
    
    def add_output(self, output: DomainOutput) -> None:
        """Add output definition"""
        self.outputs.append(output)
    
    def remove_output(self, name: str) -> None:
        """Remove output by name"""
        self.outputs = [o for o in self.outputs if o.name != name]
    
    def to_dict(self) -> dict:
        """Serialize domain"""
        return {
            'id': self.id,
            'name': self.name,
            'type': self.type.value,
            'resource_ids': self.resource_ids,
            'inputs': [{'name': i.name, 'type': i.type, 'required': i.required, 'description': i.description} for i in self.inputs],
            'outputs': [{'name': o.name, 'type': o.type, 'description': o.description} for o in self.outputs],
            'position': {'x': self.position.x, 'y': self.position.y},
            'width': self.width,
            'height': self.height
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> 'Domain':
        """Deserialize domain"""
        return cls(
            id=data['id'],
            name=data['name'],
            type=DomainType(data['type']),
            resource_ids=data.get('resource_ids', []),
            inputs=[DomainInput(**i) for i in data.get('inputs', [])],
            outputs=[DomainOutput(**o) for o in data.get('outputs', [])],
            position=Position(**data.get('position', {'x': 0, 'y': 0})),
            width=data.get('width', 200),
            height=data.get('height', 150)
        )
