from abc import ABC, abstractmethod

from app.models.generation import GenerationRequest, ProviderName, ProviderResult


class ProviderError(Exception):
    def __init__(self, code: str, message: str, status_code: int = 503):
        self.code = code
        self.message = message
        self.status_code = status_code
        self.provider: ProviderName | None = None
        self.fallback_available = False
        super().__init__(message)


class AIProvider(ABC):
    @property
    @abstractmethod
    def name(self) -> ProviderName:
        """Stable identifier recorded on every generated document."""

    @abstractmethod
    async def generate(self, request: GenerationRequest) -> ProviderResult:
        """Return a source-grounded Markdown draft with explicit uncertainty."""
