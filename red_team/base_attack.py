from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional
import time


@dataclass
class AttackEvent:
    attack_name: str
    started_at: float
    stopped_at: Optional[float] = None
    params: dict = field(default_factory=dict)


class BaseAttack(ABC):
    name: str = "base"
    severity: str = "UNKNOWN"

    def __init__(self):
        self.is_active: bool = False
        self.start_tick: int = 0
        self._started_at: float = 0.0

    def activate(self, tick: int, params: dict = None) -> None:
        self.is_active = True
        self.start_tick = tick
        self._started_at = time.time()
        self._on_activate(params or {})

    def deactivate(self) -> None:
        self.is_active = False
        self._on_deactivate()

    def _on_activate(self, params: dict) -> None:
        pass

    def _on_deactivate(self) -> None:
        pass

    @abstractmethod
    def apply(self, gnss_data: dict, tick: int) -> dict:
        """GNSS verisine saldırıyı uygula ve değiştirilmiş veriyi döndür."""

    @abstractmethod
    def get_metadata(self) -> dict:
        """Saldırı meta bilgilerini döndür."""
