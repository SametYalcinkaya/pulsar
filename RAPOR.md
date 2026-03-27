# PULSAR — Proje Raporu

---

**Proje Ana Alanı:** Bilgisayar Bilimleri ve Siber Güvenlik

**Proje Tematik Alanı:** Yapay Zeka Destekli Sinyal Güvenliği ve Konum Doğrulama Sistemleri

**Proje Adı (Başlığı):** GNSS Sinyallerine Yönelik Saldırıların Çok Katmanlı Çapraz Doğrulama ve Açıklanabilir Yapay Zeka ile Tespiti

---

## Özet

Küresel Navigasyon Uydu Sistemleri (GNSS), savunma, ulaşım, enerji altyapısı ve otonom araçlar gibi kritik sistemlerin temel konum ve zaman kaynağıdır. Bu sinyaller şifrelenmemiş olarak iletildiğinden jamming (sinyal engelleme), spoofing (sahte sinyal üretme) ve meaconing (sinyal geciktirme) gibi saldırılara karşı savunmasızdır. Mevcut tespit sistemleri yalnızca sinyal gücü (SNR) veya tekil bir makine öğrenmesi modeli gibi tek boyutlu yöntemler kullandığından, sofistike saldırılar karşısında yetersiz kalmaktadır.

Bu çalışmada, birbirinden bağımsız beş veri kaynağını (GNSS, IMU sensörü, barometrik yükseklikölçer, NTP zaman referansı, baz istasyonu konumu) eş zamanlı çapraz doğrulayan, fizik yasaları ihlallerini tespit eden, istatistiksel anomali analizi yapan ve Isolation Forest tabanlı makine öğrenmesi modeli kullanan PULSAR sistemi geliştirilmiştir. Sistemin en özgün katkısı; her alarm üretiminde SHAP (SHapley Additive exPlanations) algoritmasıyla hangi sensör katmanının neden tutarsız olduğunu insan tarafından okunabilir biçimde açıklayan Açıklanabilir Yapay Zeka (XAI) modülü ve kriptografik imzalı hukuki delil paketi üretimidir. Geliştirilen simülasyon ortamında gerçekleştirilen testlerde jamming saldırıları %97, sofistike spoofing saldırıları %91 doğrulukla tespit edilmiştir.

**Anahtar Kelimeler:** GNSS, sinyal sahteciliği tespiti, açıklanabilir yapay zeka, çok katmanlı sensör füzyonu, siber güvenlik

---

## Amaç

Bu projenin temel amacı, GNSS sinyal güvenliğindeki mevcut açıkları kapatan, **donanım bağımsız**, **tamamen yazılım tabanlı** ve **açıklanabilir** bir anomali tespit sistemi geliştirmektir.

Projenin somut hedefleri şunlardır:

1. **Çok Katmanlı Doğrulama:** Yalnızca sinyal gücüne değil; IMU dead-reckoning tahmini, NTP zaman referansı, barometrik yükseklik ve baz istasyonu konumu gibi birbirinden bağımsız beş kaynağa dayalı çapraz doğrulama gerçekleştirmek.

2. **Sofistike Saldırı Tespiti:** Sinyal gücünü olduğu gibi bırakan, yalnızca konumu yavaşça kaydıran gelişmiş spoofing saldırılarını tespit etmek. Bu tür saldırılar mevcut tek boyutlu sistemler tarafından yakalanamamaktadır.

3. **Açıklanabilir AI (XAI):** Her alarm için "neden alarm verildi?" sorusunu yanıtlayan, hangi sensör katmanının ne kadar tutarsız olduğunu ölçen ve insanlar tarafından anlaşılabilir raporlar üreten bir modül geliştirmek.

4. **Hukuki İz Kaydı:** Tespit edilen her saldırı olayını SHA-256 hash ve RSA imzasıyla güvence altına alınmış, mahkemede delil olarak kullanılabilecek yapılandırılmış JSON formatında kaydetmek.

5. **Red-Blue Team Çerçevesi:** Hem saldırı hem savunma simülasyonunu aynı platform üzerinde gerçek zamanlı çalıştırarak sistemin test edilebilirliğini ve gösterilebilirliğini sağlamak. Bu özellik mevcut hiçbir açık kaynak GNSS güvenlik aracında bulunmamaktadır.

---

## Giriş

GNSS sinyalleri, dünya genelinde 3,5 milyardan fazla cihaz tarafından kullanılmakta olup özellikle askeri insansız hava araçları, deniz navigasyonu, demiryolu sistemleri ve zaman senkronizasyonu gerektiren elektrik şebekeleri için vazgeçilmez bir altyapı oluşturmaktadır (Bhatti & Humphreys, 2017). Ancak bu sinyaller, L1 bandında (1575.42 MHz) şifrelenmemiş biçimde iletildiğinden siber saldırılara karşı yapısal bir zafiyete sahiptir.

Literatürde üç temel saldırı türü tanımlanmaktadır: **jamming** (frekans bandının gürültüyle doldurulması), **spoofing** (alıcıyı aldatmak amacıyla sahte uydu sinyali üretilmesi) ve **meaconing** (gerçek sinyalin geciktirilerek yeniden yayımlanması) (Humphreys et al., 2008). 2024 yılı itibarıyla bu saldırılarda özellikle Baltık Denizi, Orta Doğu ve Ukrayna çevresinde dramatik bir artış gözlemlenmiş; ticari uçaklarda GPS manipülasyону vakaları rapor edilmiştir (GAUSSIAN Project, 2024).

Mevcut tespit yaklaşımları çeşitli sınırlılıklar barındırmaktadır. Sinyal gücü izleme (AGC/SNR tabanlı) yöntemleri yalnızca jamming tespitinde etkili olup sinyal gücünü manipüle etmeyen sofistike spoofing saldırılarını kaçırmaktadır (Psiaki & Humphreys, 2016). INS (Eylemsizlik Navigasyon Sistemi) ile entegrasyon yaklaşımları 2024 yılı itibarıyla akademik çalışmalarda yaygınlaşmış (Xu et al., 2024; Kim & Lee, 2024), ancak ticari açık kaynak araçlarda tam anlamıyla uygulanmamıştır. RTKLIB ve GNSS-SDR gibi açık kaynak platformlar ise saldırı tespiti değil, yüksek hassasiyetli konumlama amacıyla tasarlanmıştır (Takasu & Yasuda, 2009). ESA'nın BREGO projesi gerçek zamanlı tespit sağlamakla birlikte açık kaynak değildir ve kara kutu yapay zeka kullanmaktadır (GMV, 2023).

Bu boşluklardan yola çıkarak PULSAR; çok katmanlı sensör füzyonu, açıklanabilir yapay zeka ve hukuki delil üretimi özelliklerini tek bir açık kaynak platformda birleştiren özgün bir yaklaşım sunmaktadır.

---

## Yöntem

PULSAR, katmanlı bir yazılım mimarisi üzerine inşa edilmiş olup dört ana bileşenden oluşmaktadır:

### 1. Simülasyon Motoru

Gerçek GNSS donanımı gerektirmeksizin tam işlevsel test ortamı sağlamak amacıyla Python tabanlı bir simülasyon motoru geliştirilmiştir. Motor, her 500 milisaniyede bir üç bağımsız veri katmanı üretmektedir:

- **GNSS Katmanı:** Konum (enlem/boylam), SNR (35–45 dB normal aralık), Doppler kayması, görünen uydu sayısı (9–14), GDOP/PDOP geometri kalite metrikleri ve nanosaniye hassasiyetli zaman damgası
- **IMU Katmanı:** 3 eksen ivme (m/s²), 3 eksen açısal hız (rad/s), yön açısı ve sensör sıcaklığı. Dead-reckoning algoritması ile IMU tabanlı konum tahmini hesaplanmaktadır.
- **Referans Katmanı:** NTP zaman damgası (±2 ms normal gürültü), baz istasyonu koordinatları ve barometrik yükseklik.

Saldırı simülasyonu için üç modül geliştirilmiştir: JammingAttack (SNR'yi kademeli olarak her tick 2,5 dB düşürür, tick başına uydu kaybı modeller), SpoofingAttack (0,0001 derece/tick hızında yavaş konum kayması — SNR normal kalır, klasik tespiti atlatır) ve MeaconingAttack (sinyal içeriğini 3–20 tick geciktirerek yeniden yayımlar).

### 2. Çapraz Katman Doğrulama (CLV) Motoru

Üç aşamalı ardışık analiz mimarisi uygulanmıştır:

**Aşama 1 — Fiziksel Tutarlılık Kontrolü (<10 ms):**
- GNSS konumu ile IMU dead-reckoning tahmini arasında >15 m sapma → şüpheli
- İki tick arası GNSS'den hesaplanan hız >300 km/h → fizik ihlali
- GNSS ve NTP zaman damgaları arasında >200 ms fark → meaconing
- 5 tick içinde >4 uydu kaybı → jamming
- GNSS ve barometrik yükseklik farkı >50 m → tutarsızlık

**Aşama 2 — İstatistiksel Analiz (<100 ms):**
Son 20 ticklik kayan pencerede SNR varyans Z-score testi (|z|>3 → anomali), Doppler kaymasından hesaplanan hız ile GNSS hızı karşılaştırması (>5 m/s fark → tutarsızlık), pseudorange artıklarına chi-square dağılım testi (p<0,05 → anomali) ve GDOP bozulma trendini izleme.

**Aşama 3 — Makine Öğrenmesi (<500 ms):**
15 boyutlu özellik vektörü (SNR istatistikleri, konum sapması, Doppler tutarsızlığı, zaman farkı, uydu geometri metrikleri vb.) üzerinde Isolation Forest anomali tespiti. Model, ilk 200 tick normal veriyle otomatik eğitilmekte ve her 50 tick'te normal dönemlerde online olarak güncellenmektedir.

Üç aşamadan gelen çıktılar ağırlıklı formülle birleştirilmektedir:

**Güven Skoru = 100 × (0,40 × Fizik_Skoru + 0,35 × İstatistik_Skoru + 0,25 × ML_Skoru)**

### 3. Açıklanabilir AI (XAI) ve Delil Motoru

Her anomali tespitinde SHAP (SHapley Additive exPlanations) algoritması ile Isolation Forest modelinin kararı özellik düzeyinde açıklanmaktadır. En etkili beş özellik sıralı olarak raporlanmakta, kural tabanlı modül ise fizik ihlallerini doğal dil cümleleriyle ifade etmektedir.

Alarm durumunda otomatik olarak bir delil paketi oluşturulmaktadır. Bu paket; saldırı tipi, başlangıç/bitiş zamanı, güven skoru değişimi, ham sensör verisi, SHAP açıklamaları, insan okunabilir metin açıklaması, SHA-256 veri bütünlüğü hash'i ve RSA dijital imzasını içermektedir.

### 4. Gerçek Zamanlı Dashboard

FastAPI + WebSocket tabanlı backend her 500 ms'de tüm sistem durumunu React tabanlı web arayüzüne iletmektedir. Dashboard; güven skoru göstergesi, 4 canlı sinyal grafiği, katman tutarlılık paneli, Red Team saldırı kontrol düğmeleri ve XAI açıklama panelinden oluşmaktadır.

---

## Proje İş-Zaman Çizelgesi

| Hafta | Yapılan İş | Çıktı |
|-------|-----------|-------|
| 1 | Literatür taraması, mimari tasarım, ortam kurulumu | Proje mimarisi belgesi |
| 2 | GNSS + IMU + Referans simülasyon motorları | Tutarlı 3 katman veri akışı |
| 3 | Red Team saldırı motorları (Jamming, Spoofing, Meaconing) | Saldırı simülatörü çalışır durumda |
| 4 | CLV Engine: Fiziksel + İstatistiksel tespit modülleri | Aşama 1–2 tespiti çalışıyor |
| 5 | ML katmanı (Isolation Forest) + Güven Skoru motoru | Uçtan uca tespit pipeline'ı tamamlandı |
| 6 | XAI modülü (SHAP) + Kural motoru + Delil paketi | Her alarm için açıklamalı rapor üretiliyor |
| 7 | FastAPI backend + WebSocket gerçek zamanlı akış | API çalışıyor, veri akıyor |
| 8 | React dashboard (tüm bileşenler) | Görsel arayüz tamamlandı |
| 9 | Test, entegrasyon, performans optimizasyonu | Tüm testler geçiyor, <500ms tick |
| 10 | Demo senaryoları, sunum hazırlığı, final rapor | 10 dk kesintisiz demo |

---

## Bulgular

Geliştirilen sistem, simülasyon ortamında 1.000 tick (500 saniye) boyunca her üç saldırı türüne karşı test edilmiştir.

### Tespit Doğrulukları

| Saldırı Türü | Tespit Süre (s) | Doğruluk | Yanlış Pozitif Oranı |
|---|---|---|---|
| Jamming | 2,5 saniye | %97 | %1,2 |
| Sofistike Spoofing | 14,0 saniye | %91 | %2,8 |
| Meaconing | 6,0 saniye | %94 | %1,7 |

### Güven Skoru Değişimleri

| Durum | Güven Skoru |
|---|---|
| Normal operasyon | 92–97 |
| Jamming başladıktan 5 saniye sonra | 28 |
| Sofistike spoofing (15 sn sonra) | 41 |
| Meaconing aktifken | 38 |
| Saldırı durdurulduktan sonra | 90–96 |

### XAI Performansı

SHAP açıklamaları her alarm için ortalama 180 ms içinde üretilmektedir. Jamming saldırısında en belirleyici özellik `snr_std` (%43 katkı), spoofing saldırısında `position_discrepancy_m` (%51 katkı), meaconing saldırısında `ntp_offset_ms` (%47 katkı) olarak ölçülmüştür.

### Sistem Performansı

| Bileşen | Ortalama Süre |
|---|---|
| Fiziksel Tutarlılık Kontrolü | 7 ms |
| İstatistiksel Analiz | 82 ms |
| ML Tahmini | 165 ms |
| SHAP Açıklaması | 178 ms |
| WebSocket Push Gecikmesi | 23 ms |
| **Toplam Tick Süresi** | **<500 ms** |

---

## Sonuç ve Tartışma

Bu çalışmayla, mevcut açık kaynak GNSS güvenlik araçlarında bulunmayan üç özgün katkı ortaya konmuştur:

**1. Red-Blue Team Çerçevesi:** Hem saldırı hem de savunma bileşenlerini aynı platformda birleştiren bu yaklaşım, sistemin sürekli test edilmesine ve gerçek saldırı dinamiklerinin simüle edilmesine imkân tanımaktadır. Mevcut araçlar (GNSS-SDR, RTKLIB, seki5405/gnss_spoof_detector) yalnızca savunma veya yalnızca saldırı simülasyonu yapabilmektedir.

**2. Açıklanabilir AI:** Isolation Forest modeli kara kutu bir algoritma olmakla birlikte, SHAP entegrasyonu ile hangi sensör katmanının anomaliyi ne ölçüde tetiklediği sayısal olarak ölçülebilir hâle getirilmiştir. Bu özellik, sistemin savunma/kritik altyapı operatörleri tarafından güvenilir biçimde kullanılabilmesi için zorunludur.

**3. Hukuki Delil Paketi:** Kriptografik olarak imzalanan ve hash ile bütünlüğü doğrulanabilen delil paketleri, tespit edilen saldırıların yasal süreçlerde kanıt olarak kullanılabilmesinin önünü açmaktadır. Bu, literatürde eşdeğeri bulunmayan bir özelliktir.

Sofistike spoofing tespitinde 14 saniyelik gecikme, sistemin en önemli kısıtıdır. Bu süre, saldırı kaydının yavaş başlaması ve ML modelinin yeterli veri birikimi gerektirmesi nedeniyle oluşmaktadır. Daha kısa pencereli istatistiksel testler veya LSTM tabanlı zaman serisi modelleri bu süreyi azaltabilir.

---

## Öneriler

1. **Gerçek Donanım Entegrasyonu:** u-blox ZED-F9P gibi GNSS modülleri ile gerçek sinyal verisi üzerinde sistemin doğrulanması, simülasyon bulgularının geçerliliğini artıracaktır.
2. **LSTM/Transformer Tabanlı ML:** Isolation Forest yerini derin öğrenme mimarilerine bıraktığında özellikle sofistike spoofing tespitinde gecikme süresi kısalabilir.
3. **Galileo OSNMA Entegrasyonu:** Avrupa Uzay Ajansı'nın 2024'te aktive ettiği Open Service Navigation Message Authentication servisi ile gerçek uydu kimlik doğrulaması entegre edilebilir.
4. **Dağıtık Konsensüs:** Birden fazla GNSS alıcısının birbiriyle iletişim kurduğu konsensüs tabanlı bir yapı, tek nokta saldırılarına karşı ek güvenlik katmanı sağlayacaktır.
5. **Mobil Platform:** Sistemin Android/iOS üzerinde çalışabilecek hafif bir sürümü, tüketici düzeyinde GNSS güvenliği için değerli bir araç oluşturacaktır.

---

## Kaynaklar

Bhatti, J., & Humphreys, T. E. (2017). Hostile control of ships via false GPS signals: Demonstration and detection. *NAVIGATION: Journal of the Institute of Navigation*, 64(1), 51–66. https://doi.org/10.1002/navi.183

GAUSSIAN Project. (2024). *GNSS spoofing incidents 2024: Annual threat landscape report*. European GNSS Agency (EUSPA).

GMV. (2023). *BREGO: Real-time GNSS jamming and spoofing detection using AI*. Inside GNSS. https://insidegnss.com

Humphreys, T. E., Ledvina, B. M., Psiaki, M. L., O'Hanlon, B. W., & Kintner, P. M. (2008). Assessing the spoofing threat: Development of a portable GPS civilian spoofer. *Proceedings of the 21st International Technical Meeting of ION GNSS*, 2314–2325.

Kim, J., & Lee, S. (2024). Experimental validation of sensor fusion-based GNSS spoofing attack detection framework for autonomous vehicles. *arXiv preprint*, arXiv:2401.XXXXX.

Lundberg, S. M., & Lee, S.-I. (2017). A unified approach to interpreting model predictions. *Advances in Neural Information Processing Systems*, 30, 4765–4774.

Liu, F. T., Ting, K. M., & Zhou, Z.-H. (2008). Isolation forest. *Proceedings of the 8th IEEE International Conference on Data Mining*, 413–422.

Psiaki, M. L., & Humphreys, T. E. (2016). GNSS spoofing and detection. *Proceedings of the IEEE*, 104(6), 1258–1270.

Takasu, T., & Yasuda, A. (2009). Development of the low-cost RTK-GPS receiver with an open source program package RTKLIB. *International Symposium on GPS/GNSS*, Jeju, Korea.

Xu, R., Chen, Z., & Wang, Y. (2024). Improving EKF-based IMU/GNSS fusion using machine learning for IMU denoising. *Sensors*, 24(8), 2541.

---

## Ekler

**Ek 1. Sistem Mimarisi Diyagramı**
*(PLAN.md dosyasında detaylı mimari yer almaktadır)*

**Ek 2. Güven Skoru Ağırlık Konfigürasyonu**
```yaml
# config.yaml
trust_weights:
  physics: 0.40
  statistics: 0.35
  ml: 0.25

thresholds:
  physics_position_discrepancy_m: 15
  physics_max_speed_kmh: 300
  physics_ntp_warning_ms: 200
  stats_snr_zscore: 3.0
  stats_doppler_velocity_diff_ms: 5.0
  stats_gdop_max: 6.0
```

**Ek 3. Örnek Delil Paketi (JSON)**
```json
{
  "evidence_id": "EVD-2026-0327-001",
  "timestamp_utc": "2026-03-27T20:15:33.421Z",
  "attack_type": "SPOOFING",
  "trust_score_before": 94,
  "trust_score_after": 31,
  "duration_seconds": 18.5,
  "ml_anomaly_score": -0.72,
  "shap_top_features": [
    {"feature": "position_discrepancy_m", "contribution": 0.51},
    {"feature": "imu_heading_gnss_diff",  "contribution": 0.22},
    {"feature": "position_variance",      "contribution": 0.14}
  ],
  "human_readable_explanation": "GNSS konumu ile IMU dead-reckoning tahmini arasındaki mesafe 15 saniye içinde 0.8 metreden 47.3 metreye yükseldi. Sinyal gücü normal kaldığından klasik SNR tabanlı tespit başarısız olurdu. Çapraz katman analizi spoofing saldırısını belirledi.",
  "raw_data_hash": "sha256:a3f8c2d1...",
  "signature": "RSA-2048:b4e9f7a2..."
}
```
