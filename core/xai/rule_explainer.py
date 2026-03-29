from typing import List


THREAT_COLORS = {
    "SAFE": "#10b981",
    "WARNING": "#f59e0b",
    "THREAT": "#ef4444",
    "CRITICAL": "#dc2626",
}


class RuleExplainer:
    """Fiziksel ihlalleri ve istatistiksel anomalileri doğal dille açıklar."""

    def explain(
        self,
        physics_violations: List[str],
        stats_violations: List[str],
        snapshot: dict,
        trust_data: dict,
    ) -> dict:
        explanations = []
        threat_level = trust_data.get("threat_level", "SAFE")
        attack_type = trust_data.get("attack_type")

        # Fiziksel ihlalleri doğal dile çevir
        for v in physics_violations:
            explanation = self._translate_physics(v, snapshot)
            if explanation:
                explanations.append(explanation)

        # İstatistiksel ihlalleri doğal dile çevir
        for v in stats_violations:
            explanation = self._translate_stats(v, snapshot)
            if explanation:
                explanations.append(explanation)

        # Genel saldırı açıklaması
        attack_explanation = self._get_attack_explanation(attack_type, trust_data)
        if attack_explanation:
            explanations.insert(0, attack_explanation)

        if not explanations:
            explanations = [{"text": "Tüm sensör verileri normal aralıkta. Sistem güvende.", "confidence_percent": 100, "category": "info", "raw": ""}]

        return {
            "explanations": explanations,
            "threat_level": threat_level,
            "attack_type": attack_type,
            "color": THREAT_COLORS.get(threat_level, "#10b981"),
            "confidence_percent": round(100 - trust_data.get("trust_score", 100), 1),
        }

    def _translate_physics(self, violation: str, snapshot: dict) -> dict:
        v = violation.lower()

        if "fizik dışı hız" in v or "km/s" in v:
            return {
                "text": (
                    f"Araç fizik dışı bir hızda hareket etmiş görünüyor. "
                    f"Bu durum konum manipülasyonuna (Spoofing) işaret eder."
                ),
                "confidence_percent": 92,
                "category": "physics",
                "raw": violation,
            }

        if "konum-imu farkı" in v:
            m_val = violation.split("farkı")[-1].split("(")[0].strip()
            return {
                "text": (
                    f"GNSS konumu ile IMU'dan hesaplanan konum arasında {m_val} fark var. "
                    f"IMU saldırıdan etkilenmez, bu fark GNSS manipülasyonuna işaret eder."
                ),
                "confidence_percent": 85,
                "category": "physics",
                "raw": violation,
            }

        if "zaman farkı" in v or "ntp" in v.lower():
            return {
                "text": (
                    "GNSS zaman damgası ile NTP referans saati arasında büyük fark tespit edildi. "
                    "Eski sinyal tekrar yayınlanıyor olabilir (Meaconing saldırısı)."
                ),
                "confidence_percent": 78,
                "category": "timing",
                "raw": violation,
            }

        if "uydu sayısı" in v:
            return {
                "text": (
                    "Kısa sürede çok sayıda uydu kaybedildi. "
                    "Bu durum Jamming saldırısının tipik belirtisidir."
                ),
                "confidence_percent": 88,
                "category": "satellite",
                "raw": violation,
            }

        if "barometrik" in v:
            return {
                "text": (
                    "GNSS yüksekliği ile barometre okuması uyuşmuyor. "
                    "GNSS yükseklik verisi manipüle edilmiş olabilir."
                ),
                "confidence_percent": 70,
                "category": "altitude",
                "raw": violation,
            }

        return {"text": violation, "confidence_percent": 60, "category": "unknown", "raw": violation}

    def _translate_stats(self, violation: str, snapshot: dict) -> dict:
        v = violation.lower()

        if "snr z-score" in v:
            return {
                "text": "Sinyal gücü istatistiksel olarak anormal. Jamming saldırısı sinyali baskılıyor olabilir.",
                "confidence_percent": 80,
                "category": "signal",
                "raw": violation,
            }

        if "doppler" in v:
            return {
                "text": "Doppler kaymasından hesaplanan hız ile IMU hızı tutarsız. Sinyal kaynağı değişmiş olabilir.",
                "confidence_percent": 75,
                "category": "doppler",
                "raw": violation,
            }

        if "gdop" in v:
            return {
                "text": "Uydu geometrisi bozulmuş (yüksek GDOP). Konum hesaplaması güvenilmez.",
                "confidence_percent": 72,
                "category": "geometry",
                "raw": violation,
            }

        if "pseudorange" in v:
            return {
                "text": "Uydu mesafe ölçümlerindeki varyans yüksek. Sinyal bütünlüğü bozulmuş olabilir.",
                "confidence_percent": 68,
                "category": "pseudorange",
                "raw": violation,
            }

        if "konum kayması" in v:
            return {
                "text": "Konum sürekli aynı yönde kayıyor — Sofistike Spoofing saldırısının tipik belirtisi. Klasik SNR tespiti bunu kaçırabilir.",
                "confidence_percent": 90,
                "category": "drift",
                "raw": violation,
            }

        return {"text": violation, "confidence_percent": 60, "category": "unknown", "raw": violation}

    def _get_attack_explanation(self, attack_type: str, trust_data: dict) -> dict:
        if not attack_type or attack_type == "UNKNOWN":
            return None

        templates = {
            "JAMMING": {
                "text": "JAMMING saldırısı tespit edildi: Sinyal bozucu uydu alımını engelliyor.",
                "confidence_percent": 88,
            },
            "SPOOFING": {
                "text": "SPOOFING saldırısı tespit edildi: Sahte GNSS sinyali konumu manipüle ediyor.",
                "confidence_percent": 91,
            },
            "MEACONING": {
                "text": "MEACONING saldırısı tespit edildi: Eski sinyaller geciktirilerek tekrar yayınlanıyor.",
                "confidence_percent": 83,
            },
            "COMBINED": {
                "text": "BİRLEŞİK saldırı tespit edildi: Birden fazla saldırı tekniği aynı anda kullanılıyor.",
                "confidence_percent": 95,
            },
        }

        t = templates.get(attack_type)
        if t:
            return {**t, "category": "attack_type", "raw": attack_type}
        return None
