import numpy as np
from typing import Optional

from core.xai.shap_explainer import SHAPExplainer
from core.xai.rule_explainer import RuleExplainer
from evidence.evidence_builder import EvidenceBuilder


class XAICoordinator:
    """
    XAI pipeline koordinatörü.
    CLV Engine sonuçlarını alır, SHAP + kural açıklamaları üretir,
    alarm varsa delil paketi oluşturur.
    Endpoint: /api/explain/{evidence_id}
    """

    def __init__(self, ml_detector=None):
        self._shap = SHAPExplainer(ml_detector)
        self._rule = RuleExplainer()
        self._evidence = EvidenceBuilder()
        self._attack_start_time: Optional[float] = None

    def update_ml_detector(self, ml_detector) -> None:
        self._shap = SHAPExplainer(ml_detector)

    def explain(
        self,
        features: np.ndarray,
        snapshot: dict,
        physics_result,
        stats_result,
        trust_data: dict,
    ) -> dict:
        # 1. SHAP açıklaması
        shap_result = self._shap.explain(features)

        # 2. Kural açıklaması
        rule_result = self._rule.explain(
            physics_violations=physics_result.violations if hasattr(physics_result, "violations") else physics_result.get("violations", []),
            stats_violations=stats_result.violations if hasattr(stats_result, "violations") else stats_result.get("violations", []),
            snapshot=snapshot,
            trust_data=trust_data,
        )

        # 3. İnsan okunur özet
        shap_report = self._shap.get_human_readable_report(shap_result["top_features"])
        summary_lines = [e["text"] for e in rule_result["explanations"][:3]]
        summary = " | ".join(summary_lines)

        combined = {
            "shap": shap_result,
            "rules": rule_result,
            "summary": summary,
            "shap_report": shap_report,
            "evidence_id": None,
        }

        # 4. Delil paketi (alarm varsa)
        if trust_data.get("threat_level") in ("THREAT", "CRITICAL", "WARNING"):
            import time
            if self._attack_start_time is None:
                self._attack_start_time = time.time()

            ph = physics_result if isinstance(physics_result, dict) else {
                "passed": physics_result.passed,
                "score": physics_result.score,
                "violations": physics_result.violations,
            }
            st = stats_result if isinstance(stats_result, dict) else {
                "passed": stats_result.passed,
                "score": stats_result.score,
                "violations": stats_result.violations,
            }

            evidence = self._evidence.build(
                snapshot=snapshot,
                trust_data=trust_data,
                physics_result=ph,
                stats_result=st,
                ml_result={},
                xai_data=combined,
                attack_started_at=self._attack_start_time,
            )
            combined["evidence_id"] = evidence["evidence_id"]
        else:
            self._attack_start_time = None
            self._evidence.update_last_trust(trust_data.get("trust_score", 100.0))

        return combined

    def get_evidence_builder(self) -> EvidenceBuilder:
        return self._evidence
