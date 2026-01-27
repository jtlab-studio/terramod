import logging
import json
from datetime import datetime

def setup_logging(level: str = 'INFO'):
    """Configure structured logging"""
    
    log_level = getattr(logging, level.upper(), logging.INFO)
    
    class JSONFormatter(logging.Formatter):
        """Format logs as JSON"""
        
        def format(self, record: logging.LogRecord) -> str:
            log_data = {
                'timestamp': datetime.utcnow().isoformat(),
                'level': record.levelname,
                'logger': record.name,
                'message': record.getMessage(),
            }
            
            if record.exc_info:
                log_data['exception'] = self.formatException(record.exc_info)
            
            return json.dumps(log_data)
    
    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    
    # Remove existing handlers
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
    
    # Add console handler with JSON formatter
    console_handler = logging.StreamHandler()
    console_handler.setLevel(log_level)
    console_handler.setFormatter(JSONFormatter())
    root_logger.addHandler(console_handler)
