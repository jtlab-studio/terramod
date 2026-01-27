from dataclasses import dataclass
from typing import Optional
from enum import Enum

class NodeType(str, Enum):
    RESOURCE = 'resource'
    DOMAIN = 'domain'

class ConnectionType(str, Enum):
    DATA = 'data'
    DEPENDENCY = 'dependency'
    IMPLICIT = 'implicit'

@dataclass
class Connection:
    id: str
    source_id: str
    target_id: str
    source_type: NodeType
    target_type: NodeType
    connection_type: ConnectionType
    output_name: Optional[str] = None
    input_name: Optional[str] = None
    
    def to_dict(self) -> dict:
        """Serialize connection"""
        return {
            'id': self.id,
            'source_id': self.source_id,
            'target_id': self.target_id,
            'source_type': self.source_type.value,
            'target_type': self.target_type.value,
            'connection_type': self.connection_type.value,
            'output_name': self.output_name,
            'input_name': self.input_name
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> 'Connection':
        """Deserialize connection"""
        return cls(
            id=data['id'],
            source_id=data['source_id'],
            target_id=data['target_id'],
            source_type=NodeType(data['source_type']),
            target_type=NodeType(data['target_type']),
            connection_type=ConnectionType(data['connection_type']),
            output_name=data.get('output_name'),
            input_name=data.get('input_name')
        )
