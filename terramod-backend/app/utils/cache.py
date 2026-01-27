import time
from typing import Any, Optional, Dict
from dataclasses import dataclass

@dataclass
class CacheEntry:
    value: Any
    expires_at: float

class Cache:
    """In-memory TTL-based cache"""
    
    def __init__(self, max_size_mb: int = 100):
        self._cache: Dict[str, CacheEntry] = {}
        self._max_size = max_size_mb * 1024 * 1024  # Convert to bytes
    
    def get(self, key: str) -> Optional[Any]:
        """Get cached value if not expired"""
        if key not in self._cache:
            return None
        
        entry = self._cache[key]
        
        if time.time() > entry.expires_at:
            del self._cache[key]
            return None
        
        return entry.value
    
    def set(self, key: str, value: Any, ttl: int = 300) -> None:
        """Set cached value with TTL in seconds"""
        expires_at = time.time() + ttl
        self._cache[key] = CacheEntry(value=value, expires_at=expires_at)
        self.cleanup_expired()
    
    def invalidate(self, key: str) -> None:
        """Remove cached value"""
        if key in self._cache:
            del self._cache[key]
    
    def clear(self) -> None:
        """Clear all cached values"""
        self._cache.clear()
    
    def cleanup_expired(self) -> None:
        """Remove expired entries"""
        current_time = time.time()
        expired_keys = [
            key for key, entry in self._cache.items()
            if current_time > entry.expires_at
        ]
        for key in expired_keys:
            del self._cache[key]

# Global cache instance
_cache_instance = Cache()

def get_cache() -> Cache:
    """Get global cache instance"""
    return _cache_instance
