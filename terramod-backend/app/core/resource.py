from dataclasses import dataclass, field
from typing import Any, Dict, Optional
from app.core.domain import Position

@dataclass
class Resource:
    id: str
    type: str
    domain_id: str
    name: str
    arguments: Dict[str, Any] = field(default_factory=dict)
    position: Position = field(default_factory=lambda: Position(0, 0))
    
    def set_argument(self, name: str, value: Any) -> None:
        """Set Terraform argument"""
        self.arguments[name] = value
    
    def get_argument(self, name: str) -> Optional[Any]:
        """Get Terraform argument"""
        return self.arguments.get(name)
    
    def to_dict(self) -> dict:
        """Serialize resource"""
        return {
            'id': self.id,
            'type': self.type,
            'domain_id': self.domain_id,
            'name': self.name,
            'arguments': self.arguments,
            'position': {'x': self.position.x, 'y': self.position.y}
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> 'Resource':
        """Deserialize resource"""
        return cls(
            id=data['id'],
            type=data['type'],
            domain_id=data['domain_id'],
            name=data['name'],
            arguments=data.get('arguments', {}),
            position=Position(**data.get('position', {'x': 0, 'y': 0}))
        )
