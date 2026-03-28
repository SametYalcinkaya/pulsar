import time
import logging
from dataclasses import dataclass, field
from typing import Optional, List

from core.detection.physics_check import PhysicsChecker, PhysicsResult
from core.detection.stats_check import StatisticsChecker, StatsResult
from core.detection.feature_extractor import FeatureExtractor
from core.detection.ml_detector import MLDetector
from core.trust_score import TrustScoreEngine

logger = logging.getLogger(__name__)


@dataclass
class AnalysisResult:
    tick: int
    trust_score: float
    threat_level: str
    attack_type: Optional[str]
    physics_result: dict
    stats_result: dict
    ml_result: dict
    xai_result: Optional[dict]
    timings_ms: dict = field(default_factory=dict)


class CLVEngine:
    """
    Ana tespit koordinatörü.
    Her tick için fizik → istatistik → ML → güven skoru → XAI pipeline'ı çalıştırır.
    """

    def __init__(self, xai_coordinator=None):
        self._physics = PhysicsChecker()
        self._stats = StatisticsChecker()
        self._features = FeatureExtractor()
        self._ml = MLDetector()
        self._trust = TrustScoreEngine()
        self._xai = xai_coordinator  # Sonradan enjekte edilir

    def set_xai_coordinator(self, xai_coordinator) -> None:
        self._xai = xai_coordinator

    def analyze(self, snapshot: dict) -> AnalysisResult:
        tick = snapshot["tick"]
        timings = {}

        # 1. PhysicsChecker
        t0 = time.perf_counter()
        physics_result: PhysicsResult = self._physics.check_all(snapshot)
        timings["physics_ms"] = round((time.perf_counter() - t0) * 1000, 2)

        # 2. StatisticsChecker
        t0 = time.perf_counter()
        stats_result: StatsResult = self._stats.check_all(snapshot)
        timings["stats_ms"] = round((time.perf_counter() - t0) * 1000, 2)

        # 3. Feature extraction
        t0 = time.perf_counter()
        features = self._features.extract(snapshot)
        timings["feature_ms"] = round((time.perf_counter() - t0) * 1000, 2)

        # 4. ML prediction
        t0 = time.perf_counter()
        is_anomaly, anomaly_score = self._ml.predict(features)
        timings["ml_ms"] = round((time.perf_counter() - t0) * 1000, 2)

        # ML skoru: negatif (anormal) → 0 doğru, sıfıra yakın → 0.5, pozitif → 1.0
        ml_score = float(min(1.0, max(0.0, (anomaly_score + 0.5) / 0.5))) if is_anomaly else 1.0

        # 5. Güven skoru
        attack_hints = {
            "physics_violations": physics_result.violations,
            "stats_violations": stats_result.violations,
        }
        trust_data = self._trust.calculate(
            physics_result.score,
            stats_result.score,
            ml_score,
            attack_hints,
        )

        # 6. XAI (sadece alarm varsa)
        xai_result = None
        if self._xai and trust_data["threat_level"] != "SAFE":
            t0 = time.perf_counter()
            try:
                xai_result = self._xai.explain(
                    features=features,
                    snapshot=snapshot,
                    physics_result=physics_result,
                    stats_result=stats_result,
                    trust_data=trust_data,
                )
            except Exception as e:
                logger.warning(f"XAI hatası: {e}")
            timings["xai_ms"] = round((time.perf_counter() - t0) * 1000, 2)

        return AnalysisResult(
            tick=tick,
            trust_score=trust_data["trust_score"],
            threat_level=trust_data["threat_level"],
            attack_type=trust_data["attack_type"],
            physics_result={
                "passed": physics_result.passed,
                "score": physics_result.score,
                "violations": physics_result.violations,
            },
            stats_result={
                "passed": stats_result.passed,
                "score": stats_result.score,
                "violations": stats_result.violations,
            },
            ml_result={
                "is_anomaly": is_anomaly,
                "anomaly_score": round(anomaly_score, 4),
                "ml_score": round(ml_score, 3),
            },
            xai_result=xai_result,
            timings_ms=timings,
        )
