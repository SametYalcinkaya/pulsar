"""
PULSAR AI Asistan — Claude API entegrasyonu
Jüri sorularına cevap verir, sistem verilerine erişir, tavsiyelerde bulunur.
"""
import os
import json
import logging
from typing import Optional

logger = logging.getLogger(__name__)

try:
    from anthropic import Anthropic
    HAS_ANTHROPIC = True
except ImportError:
    HAS_ANTHROPIC = False
    logger.warning("anthropic paketi bulunamadı — chat fallback modunda çalışacak")

SYSTEM_PROMPT = """Sen PULSAR (Protective Unified Layer for Signal Assurance & Resilience) yapay zeka asistanısın.

## Görevin
- GNSS (GPS) güvenlik sistemi hakkında soruları cevapla
- Teknik olmayan kişilere (jüri üyeleri) sistemi basit ve anlaşılır şekilde açıkla
- Saldırı tespitlerini, XAI bulgularını ve kanıt paketlerini yorumla
- Sistem güvenliği için tavsiyelerde bulun

## PULSAR Sistemi Hakkında
PULSAR, GNSS sinyallerine yapılan saldırıları (jamming, spoofing, meaconing) gerçek zamanlı tespit eden bir güvenlik sistemidir.

### Tespit Katmanları
1. **Fizik Katmanı** (ağırlık %40): GNSS-IMU konum farkı, imkansız hız, zaman tutarsızlığı, uydu kaybı, barometrik uyumsuzluk kontrolü
2. **İstatistik Katmanı** (ağırlık %35): SNR z-skoru, Doppler-hız uyumsuzluğu, GDOP bozulması, pseudorange varyansı, konum kayması
3. **ML Katmanı** (ağırlık %25): Isolation Forest ile 15 özellik vektörü üzerinden anomali tespiti

### Trust Score (Güven Skoru)
- 80-100: GÜVENLİ (yeşil)
- 50-79: DİKKAT (sarı)
- 20-49: TEHDİT (turuncu)
- 0-19: KRİTİK (kırmızı)

### Saldırı Türleri
- **Jamming**: Sinyal gücünü düşürür, uyduları kaybettirir. SNR düşer, GDOP artar.
- **Spoofing**: Sahte sinyaller göndererek konumu kaydırır. IMU ile karşılaştırınca tespit edilir.
- **Meaconing**: Gerçek sinyalleri geciktirerek tekrar yayınlar. NTP zaman farkı oluşur.

### XAI (Açıklanabilir AI)
Her tespit için SHAP değerleri ve kural tabanlı Türkçe açıklamalar üretilir. Kanıt paketleri SHA-256 + RSA imza ile oluşturulur.

## Kurallar
- Türkçe cevap ver
- Kısa ve öz ol, ama gerektiğinde detay ver
- Teknik terimleri basit Türkçe ile açıkla
- Sistem verilerini yorumlarken somut örnekler ver
- "Efendim" hitabını kullan
- Tavsiyelerin güvenlik odaklı ve uygulanabilir olsun
"""


class PulsarChat:
    def __init__(self):
        self.client = None
        self.conversation_history = []

        if HAS_ANTHROPIC:
            api_key = os.environ.get("ANTHROPIC_API_KEY")
            if api_key:
                self.client = Anthropic(api_key=api_key)
                logger.info("Claude API bağlantısı kuruldu")
            else:
                logger.warning("ANTHROPIC_API_KEY bulunamadı — fallback modunda")

    def _build_context(self, system_data: Optional[dict] = None) -> str:
        """Mevcut sistem durumunu context olarak hazırla"""
        if not system_data:
            return ""

        parts = ["\n## Mevcut Sistem Durumu"]

        if "trust_score" in system_data:
            parts.append(f"- Trust Score: {system_data['trust_score']}")
        if "threat_level" in system_data:
            parts.append(f"- Tehdit Seviyesi: {system_data['threat_level']}")
        if "active_attack" in system_data:
            parts.append(f"- Aktif Saldırı: {system_data['active_attack'] or 'Yok'}")
        if "satellite_count" in system_data:
            parts.append(f"- Uydu Sayısı: {system_data['satellite_count']}")
        if "snr_mean" in system_data:
            parts.append(f"- Ortalama SNR: {system_data['snr_mean']:.1f} dB")
        if "gdop" in system_data:
            parts.append(f"- GDOP: {system_data['gdop']:.1f}")
        if "position_drift_m" in system_data:
            parts.append(f"- Konum Sapması: {system_data['position_drift_m']:.1f}m")
        if "physics_score" in system_data:
            parts.append(f"- Fizik Skoru: {system_data['physics_score']:.2f}")
        if "stats_score" in system_data:
            parts.append(f"- İstatistik Skoru: {system_data['stats_score']:.2f}")
        if "ml_anomaly" in system_data:
            parts.append(f"- ML Anomali: {'Evet' if system_data['ml_anomaly'] else 'Hayır'}")

        if "violations" in system_data and system_data["violations"]:
            parts.append(f"- Aktif İhlaller: {', '.join(system_data['violations'])}")

        if "xai_summary" in system_data and system_data["xai_summary"]:
            parts.append(f"- XAI Açıklaması: {system_data['xai_summary']}")

        if "total_evidence" in system_data:
            parts.append(f"- Toplam Kanıt Paketi: {system_data['total_evidence']}")

        return "\n".join(parts)

    async def chat(self, user_message: str, system_data: Optional[dict] = None) -> str:
        """Kullanıcı mesajına cevap üret"""
        context = self._build_context(system_data)
        full_system = SYSTEM_PROMPT + context

        self.conversation_history.append({
            "role": "user",
            "content": user_message
        })

        # Son 10 mesajı tut
        if len(self.conversation_history) > 20:
            self.conversation_history = self.conversation_history[-20:]

        if self.client:
            try:
                response = self.client.messages.create(
                    model="claude-sonnet-4-20250514",
                    max_tokens=1024,
                    system=full_system,
                    messages=self.conversation_history,
                )
                assistant_text = response.content[0].text
            except Exception as e:
                logger.error(f"Claude API hatası: {e}")
                assistant_text = self._fallback_response(user_message, system_data)
        else:
            assistant_text = self._fallback_response(user_message, system_data)

        self.conversation_history.append({
            "role": "assistant",
            "content": assistant_text
        })

        return assistant_text

    def _fallback_response(self, message: str, system_data: Optional[dict] = None) -> str:
        """API yoksa basit kural tabanlı yanıt"""
        msg = message.lower()
        ts = system_data.get("trust_score", 96) if system_data else 96
        threat = system_data.get("threat_level", "SAFE") if system_data else "SAFE"
        attack = system_data.get("active_attack") if system_data else None

        if any(w in msg for w in ["merhaba", "selam", "hoş geldin"]):
            return f"Merhaba efendim. PULSAR sistemleri çalışır durumda. Güven skoru {ts}. Size nasıl yardımcı olabilirim?"

        if any(w in msg for w in ["durum", "nasıl", "nedir"]):
            status = "stabil" if threat == "SAFE" else "dikkat gerektirir" if threat == "WARNING" else "tehdit altında"
            return f"Sistem durumu {status}, efendim. Güven skoru {ts}. {'Aktif saldırı: ' + attack if attack else 'Aktif saldırı bulunmuyor.'}"

        if any(w in msg for w in ["saldırı", "jamming", "spoofing", "meaconing"]):
            if attack:
                return f"Şu anda {attack} saldırısı aktif, efendim. Güven skoru {ts}'e düştü. Sistem saldırıyı tespit etti ve önlemleri devreye aldı."
            return "Şu anda aktif bir saldırı yok, efendim. Sistem güvenli durumda."

        if any(w in msg for w in ["xai", "açıkla", "neden", "nasıl tespit"]):
            return "PULSAR, 3 katmanlı tespit kullanır: Fizik kuralları, istatistik testler ve makine öğrenmesi. Her tespit için SHAP değerleri ve kural tabanlı açıklamalar üretilir, efendim."

        if any(w in msg for w in ["tavsiye", "önlem", "ne yapmalı"]):
            if threat in ["THREAT", "CRITICAL"]:
                return "Efendim, acil durum protokolü öneriyorum: 1) Alternatif navigasyon kaynaklarına geçin (IMU dead-reckoning). 2) Kanıt paketini kaydedin. 3) Saldırı kaynağını izole etmek için frekans analizi yapın."
            return "Sistem güvenli durumda, efendim. Rutin öneriler: Düzenli kalibrasyon, çoklu sensör doğrulaması, ve periyodik red-team testleri."

        if any(w in msg for w in ["kanıt", "delil", "evidence"]):
            total = system_data.get("total_evidence", 0) if system_data else 0
            return f"Şu ana kadar {total} kanıt paketi oluşturuldu, efendim. Her paket SHA-256 hash ve RSA dijital imza ile korunmaktadır."

        return f"Anlıyorum efendim. Güven skoru şu anda {ts}. Daha spesifik bir soru sorarsanız detaylı bilgi verebilirim."

    def reset(self):
        self.conversation_history = []
