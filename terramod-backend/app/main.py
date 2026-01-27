from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
import os

# Import routes - these import the router objects
from app.api.routes import graph, terraform, registry

# Import other dependencies
from app.registry.loader import ServiceRegistry
from app.utils.logger import setup_logging

# Setup logging
setup_logging(os.getenv('LOG_LEVEL', 'INFO'))
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Terramod API",
    description="AWS-only Terraform visual authoring platform API",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup event - load service registry
@app.on_event("startup")
async def startup_event():
    try:
        registry_path = os.getenv('REGISTRY_PATH', './registry/aws_services.yaml')
        service_registry = ServiceRegistry.get_instance()
        service_registry.load_registry(registry_path)
        logger.info(f"Service registry loaded: {len(service_registry.get_all_services())} services")
    except Exception as e:
        logger.error(f"Failed to load service registry: {e}")
        raise

# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Application shutting down")

# Include routers - CRITICAL: graph, terraform, registry must have .router attribute
app.include_router(graph.router, prefix="/api/v1/graph", tags=["graph"])
app.include_router(terraform.router, prefix="/api/v1/terraform", tags=["terraform"])
app.include_router(registry.router, prefix="/api/v1/registry", tags=["registry"])

# Optional: Try to load IR routes if they exist
try:
    from app.api.routes import ir_routes
    app.include_router(ir_routes.router, prefix="/api/v1/ir", tags=["ir"])
    logger.info("IR routes loaded successfully")
except ImportError:
    logger.info("IR routes not found (optional, skipping)")
except Exception as e:
    logger.warning(f"Could not load IR routes: {e}")

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "Terramod API",
        "version": "1.0.0",
        "docs": "/docs"
    }