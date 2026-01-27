import hashlib
import json
from typing import Any, Dict
from app.core.graph import InfrastructureGraph

def normalize_graph(graph: InfrastructureGraph) -> Dict[str, Any]:
    """Normalize graph structure for consistent hashing"""
    
    def sort_dict(d: dict) -> dict:
        """Recursively sort dictionary keys"""
        if not isinstance(d, dict):
            return d
        return {k: sort_dict(v) if isinstance(v, dict) else v 
                for k, v in sorted(d.items())}
    
    graph_dict = graph.to_dict()
    
    # Sort all lists and dicts for consistent ordering
    normalized = {
        'domains': sorted([sort_dict(d) for d in graph_dict['domains']], 
                         key=lambda x: x['id']),
        'resources': sorted([sort_dict(r) for r in graph_dict['resources']], 
                           key=lambda x: x['id']),
        'connections': sorted([sort_dict(c) for c in graph_dict['connections']], 
                             key=lambda x: x['id'])
    }
    
    return normalized

def hash_graph(graph: InfrastructureGraph) -> str:
    """Compute stable SHA256 hash of infrastructure graph"""
    normalized = normalize_graph(graph)
    
    # Convert to JSON string with sorted keys
    json_str = json.dumps(normalized, sort_keys=True, separators=(',', ':'))
    
    # Compute SHA256 hash
    hash_obj = hashlib.sha256(json_str.encode('utf-8'))
    
    return hash_obj.hexdigest()
