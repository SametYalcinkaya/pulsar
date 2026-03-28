from typing import Optional
import yaml
import os


TRUST_CONFIG_PATH = os.path.join(os.path.dirname(__file__), "..", "config.yaml")

THREAT_LEVELS = {
    "SAFE": (80, 100),
    "WARNING": (50, 79),
    "THREAT": (20, 49),
    "CRITICAL": (0, 19),
}


def _load_weights():
    try:
        with open(TRUST_CONFIG_PATH, "r") as f:
            cfg = yaml.safe_load(f)
        det = cfg.get("detection", {})
        return (
            det.get("physics_weight", 0.40),
            det.get("stats_weight", 0.35),
            det.get("ml_weight", 0.25),
        )
    except Exception:
        return 0.40, 0.35, 0.25


class TrustScoreEngine:
    """
    TrustScore = 100 × (0.40×physics + 0.35×stats + 0.25×ml)
    Saldırı tipi sınıflandırması ve tehdit seviyesi belirleme.
    """

    def __init__(self):
        self.physics_weight, self.stats_weight, self.ml_weight = _load_weights()

    def calculate(
        self,
        physics_score: float,
        stats_score: float,
        ml_score: float,
        attack_hints: dict = None,
    ) -> dict:
        trust = 100.0 * (
            self.physics_weight * physics_score
            + self.stats_weight * stats_score
            + self.ml_weight * ml_score
        )
        trust = float(max(0.0, min(100.0, trust)))

        threat_level = self._get_threat_level(trust)
        attack_type = self._classify_attack(attack_hints or {}, trust)

        return {
            "trust_score": round(trust, 1),
            "threat_level": threat_level,
            "attack_type": attack_type,
            "physics_score": round(physics_score, 3),
            "stats_score": round(stats_score, 3),
            "ml_score": round(ml_score, 3),
        }

    def _get_threat_level(self, trust: float) -> str:
        if trust >= 80:
            return "SAFE"
        elif trust >= 50:
            return "WARNING"
        elif trust >= 20:
            return "THREAT"
        return "CRITICAL"

    def _classify_attack(self, hints: dict, trust: float) -> Optional[str]:
        if trust >= 80:
            return None

        physics_violations = hints.get("physics_violations", [])
        stats_violations = hints.get("stats_violations", [])

        v_text = " ".join(physics_violations + stats_violations).lower()

        if "hız" in v_text or "fizik dışı" in v_text:
            return "SPOOFING"
        if "uydu" in v_text or "snr" in v_text:
            return "JAMMING"
        if "zaman" in v_text or "ntp" in v_text:
            return "MEACONING"
        if len(physics_violations) > 0 and len(stats_violations) > 0:
            return "COMBINED"
        return "UNKNOWN"
