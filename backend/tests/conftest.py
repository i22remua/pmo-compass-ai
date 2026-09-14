import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.config import Settings, get_settings
from app.api.routes import limiter


@pytest.fixture(autouse=True)
def config():
    app.dependency_overrides[get_settings] = lambda: Settings(_env_file=None, app_env='test', ai_provider='demo', auth_mode='demo')
    limiter.hits.clear()
    yield
    app.dependency_overrides.clear()


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def payload():
    return {
        'project': {'name': 'Atlas portal', 'sector': 'Healthcare', 'description': 'Appointment portal for 4 clinics.', 'objectives': 'Enable booking in 4 clinics.', 'startDate': '2026-09-01', 'endDate': '2026-11-30', 'status': 'at_risk', 'budget': 120000, 'stakeholders': 'Marta — Sponsor', 'notes': 'Vendor integration delayed by 5 days.\nDesign is approved.\nDiego must confirm the recovery plan.\nSponsor requested a scope change: SMS reminders.'},
        'type': 'risk_register', 'language': 'en', 'inputContext': '',
    }
