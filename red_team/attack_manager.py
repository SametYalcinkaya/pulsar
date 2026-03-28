import time
from typing import Optional, List
from red_team.base_attack import BaseAttack, AttackEvent
from red_team.jamming_attack import JammingAttack
from red_team.spoofing_attack import SpoofingAttack
from red_team.meaconing_attack import MeaconingAttack


ATTACK_REGISTRY = {
    "jamming": JammingAttack,
    "spoofing": SpoofingAttack,
    "meaconing": MeaconingAttack,
}


class AttackManager:
    """
    Aktif saldırıları yönetir.
    Birden fazla saldırı aynı anda aktif olabilir (combined attack).
    """

    def __init__(self):
        self._attacks: dict[str, BaseAttack] = {
            "jamming": JammingAttack(),
            "spoofing": SpoofingAttack(),
            "meaconing": MeaconingAttack(),
        }
        self.attack_log: List[AttackEvent] = []

    def activate(self, attack_name: str, params: dict = None, tick: int = 0) -> bool:
        name = attack_name.lower()
        if name not in self._attacks:
            return False
        attack = self._attacks[name]
        # Yeni instance oluştur (parametreler değişebilir)
        cls = ATTACK_REGISTRY[name]
        self._attacks[name] = cls()
        self._attacks[name].activate(tick, params or {})
        self.attack_log.append(AttackEvent(
            attack_name=name,
            started_at=time.time(),
            params=params or {},
        ))
        return True

    def deactivate(self, attack_name: str) -> bool:
        name = attack_name.lower()
        if name not in self._attacks:
            return False
        attack = self._attacks[name]
        if attack.is_active:
            attack.deactivate()
            # Son log kaydını güncelle
            for event in reversed(self.attack_log):
                if event.attack_name == name and event.stopped_at is None:
                    event.stopped_at = time.time()
                    break
        return True

    def deactivate_all(self) -> None:
        for name in self._attacks:
            self.deactivate(name)

    def apply_all(self, gnss_data: dict, tick: int) -> dict:
        """Aktif tüm saldırıları sırayla uygula."""
        data = dict(gnss_data)
        for attack in self._attacks.values():
            if attack.is_active:
                data = attack.apply(data, tick)
        return data

    def get_active_attacks(self) -> List[str]:
        return [name for name, atk in self._attacks.items() if atk.is_active]

    def get_active_label(self) -> Optional[str]:
        active = self.get_active_attacks()
        if not active:
            return None
        if len(active) == 1:
            return active[0].upper()
        return "COMBINED"

    def get_status(self) -> dict:
        return {
            name: atk.get_metadata()
            for name, atk in self._attacks.items()
        }
