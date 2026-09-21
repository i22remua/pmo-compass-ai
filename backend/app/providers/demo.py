"""Compatibility import for existing scripts; new drafts use OfflinePMOProvider."""
from app.providers.offline import OfflinePMOProvider


class DemoAIProvider(OfflinePMOProvider):
    name = "offline"
