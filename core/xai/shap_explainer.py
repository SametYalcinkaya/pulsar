import numpy as np
from typing import List, Tuple, Optional

from core.detection.feature_extractor import FEATURE_NAMES

FEATURE_DESCRIPTIONS_TR = {
    "snr_mean":                    "Ortalama sinyal gücü (SNR) — düşük değer sinyal bozulmasına işaret eder",
    "snr_std":                     "Sinyal gücü varyansı — ani değişim saldırı belirtisi",
    "snr_min":                     "En düşük uydu sinyal gücü",
    "satellite_count":             "Görünen uydu sayısı — ani düşüş jamming göstergesi",
    "gdop":                        "Geometrik hassasiyet düşürme faktörü — yüksek değer kötü geometri",
    "pdop":                        "Konum hassasiyet düşürme faktörü",
    "position_discrepancy_m":      "GNSS konumu ile IMU tahmini arasındaki mesafe farkı",
    "doppler_velocity_diff":       "Doppler kayması ile IMU hızı arasındaki tutarsızlık",
    "ntp_offset_ms":               "GNSS ile NTP referans zamanı arasındaki fark — büyük değer meaconing",
    "position_variance":           "Konum varyansı — sistematik kayma spoofing işareti",
    "imu_heading_gnss_heading_diff": "IMU yön açısı ile GNSS yön açısı farkı",
    "pseudorange_residual_std":    "Pseudorange artık standart sapması — yüksek değer sinyal bozulması",
    "barometric_altitude_diff":    "GNSS yüksekliği ile barometre okuması farkı",
    "speed_kmh":                   "IMU'dan hesaplanan araç hızı",
    "satellite_count_delta":       "Uydu sayısı değişimi — hızlı düşüş jamming belirtisi",
}


class SHAPExplainer:
    """
    SHAP tabanlı açıklama motoru.
    Model eğitilmemişse basit özellik sıralaması kullanır.
    """

    def __init__(self, ml_detector=None):
        self._ml_detector = ml_detector
        self._explainer = None

    def _try_init_explainer(self) -> bool:
        if self._explainer is not None:
            return True
        if self._ml_detector is None or not self._ml_detector._is_trained:
            return False
        try:
            import shap
            self._explainer = shap.TreeExplainer(self._ml_detector._model)
            return True
        except Exception:
            return False

    def explain(self, feature_vector: np.ndarray) -> dict:
        """
        Returns: {
            "shap_values": list,
            "top_features": [(name, shap_val, description), ...],  # top 5
            "method": "shap" | "magnitude"
        }
        """
        if self._try_init_explainer():
            try:
                import shap
                shap_vals = self._explainer.shap_values(feature_vector.reshape(1, -1))
                if isinstance(shap_vals, list):
                    values = shap_vals[0][0]
                else:
                    values = shap_vals[0]
                method = "shap"
            except Exception:
                values = feature_vector
                method = "magnitude"
        else:
            # SHAP yoksa özellik büyüklüğüne göre sırala
            values = feature_vector
            method = "magnitude"

        # Top 5 özellik
        top_indices = np.argsort(np.abs(values))[::-1][:5]
        top_features = []
        for idx in top_indices:
            name = FEATURE_NAMES[idx]
            top_features.append({
                "name": name,
                "value": round(float(values[idx]), 4),
                "description": FEATURE_DESCRIPTIONS_TR.get(name, name),
            })

        return {
            "shap_values": [round(float(v), 4) for v in values],
            "top_features": top_features,
            "method": method,
        }

    def get_human_readable_report(self, top_features: list) -> str:
        lines = ["En etkili anomali faktörleri:"]
        for i, f in enumerate(top_features, 1):
            lines.append(f"  {i}. {f['description']} (etki: {f['value']:.3f})")
        return "\n".join(lines)
