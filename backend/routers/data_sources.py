"""Data Sources and Earth Observation Status Endpoints."""

from fastapi import APIRouter
from backend.models.schemas import DataSourceItem
from backend.services.providers import ProviderService

router = APIRouter(prefix="/api/data-sources", tags=["Data Sources & Remote Sensing"])


@router.get("/status", response_model=list[DataSourceItem])
def get_data_sources_status():
    """Retrieve operational integration readiness for all 7 satellite and geotechnical data layers."""
    return ProviderService.get_data_sources_status()

