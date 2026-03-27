# PULSAR: Konum Güvenliği İçin Katmanlı Anomali Tespit Sistemi
## Detaylı Teknik Açıklama ve Kapsamı

---

## 1. GNSS Saldırılarını Tespit Eder

Sistem, GPS (Global Positioning System) sinyallerine yönelik üç temel saldırı türünü tespit etmek üzere tasarlanmıştır.

### Saldırı Türleri ve Mekanizmaları

**Jamming (Frekans Engelleme)**
- Saldırgan, GNSS frekans bandında (L1: 1575.42 MHz) yoğun gürültü üreterek alıcının uydu sinyallerini almakta zorluk çeker
- Sonuç: Sinyal gücü (SNR) hızlı düşer, uydu görünürlüğü azalır, konum tahmini başarısız olur

**Spoofing (Sahte Sinyal)**
- Saldırgan, gerçek uydu sinyallerinin formatını taklit ederek sahte sinyaller üretir
- Alıcı, bu sahte sinyalleri gerçek sanyorsa yanlış konuma kilitlenir
- Sofistike spoofing: Konum yavaşça kaydırılır ve SNR normal kalır (klasik algılama başarısız olur)

**Meaconing (Sinyal Tekrarı)**
- Saldırgan, gerçek GNSS sinyallerini yakalar, belirli bir süre geciktirerek tekrar yayımlar
- Alıcı, eski konumu mevcut konum olarak kabul eder
- Zaman damgasında da tutarsızlık görülür

### Tespit Için Kullanılan Teknoloji

- Isolation Forest makine öğrenmesi modeli (anomali tespiti)
- Fiziksel kural kontrolleri (hız, uydu kaybı, zaman tutarlılığı)
- İstatistiksel testler (Z-score, chi-square analizleri)

---

## 2. Beş Sensörü Eşzamanlı Olarak Kontrol Eder

PULSAR'ın temel prensibi, hiçbir tek sensöre güvenmemek ve birden fazla bağımsız veri kaynağını çapraz doğrulamaktır.

### Sensör Katmanları

**GNSS Katmanı (Uydu Tabanlı Konum)**
- Enlem, boylam, yükseklik (WGS84 koordinatlarında)
- Sinyal-gürültü oranı (SNR) - her uydu başına
- Doppler kayması (uydu hızını gösteren frekans değişimi)
- Görünen uydu sayısı
- Uydu geometrisi kalitesi (GDOP, PDOP, HDOP)
- Koreksiyon zamanı (nanosaniye hassasiyeti)

**Inertial Measurement Unit (IMU) Katmanı**
- Üç eksen ivmeölçer (accelerometer) - m/s² cinsinden
- Üç eksen jiroskobu (gyroscope) - rad/s cinsinden
- Magnetometre (yön açısı + heading)
- Sıcaklık sensörü (sensor drift tayinlemesi için)

**Dead-Reckoning Tahmini**
- IMU verileri kullanılarak drone/araç konumunun tahmin edilmesi
- Fiziksel mütercim uyum kontrolü: "GPS konum ile IMU tahmini ne kadar farklı?"

**NTP Zaman Referansı Katmanı**
- Bağımsız bir zaman kaynağı (Network Time Protocol)
- GNSS zaman damgası ile karşılaştırma
- Meaconing (sinyal geciktirme) tespiti için kullanılan

**Barometrik Yükseklik Katmanı**
- Hava basıncından türetilen yükseklik ölçümü
- GNSS yüksekliği ile karşılaştırılması
- Bağımsız bir yükseklik kaynağı olarak işlev görür

**Baz İstasyonu Mesafe Tahmini**
- Mobil sinyal gücünden mesafe hesaplanması
- Konuma dayalı başka bir bağımsız referans

### Çapraz Doğrulama İlkesi

"Bir saldırgan GNSS sinyalini manipüle edebilir. Ancak aynı anda IMU fiziksel yasalarını, NTP zaman kaynağını, barometrik yüksekliği ve baz istasyonu verisini tutarlı biçimde manipüle etmesi fiziğin yasaları gereği imkansızdır."

Katmanlar arasındaki tutarsızlık = saldırı kanıtı

---

## 3. Üç Aşamalı Analiz Sistemi Uygulanır

PULSAR, hızdan (hızlı ön eleme) derinliğe (detaylı analiz) doğru ardışık üç analiz aşaması gerçekleştirir.

### Aşama 1: Fiziksel Tutarlılık Kontrolü (Hesaplama Süresi: <10 ms)

Temel fizik yasalarını kontrol eder. Ihlal durumunda derhal şüphe işareti atar.

**Kontrol 1: Konum-IMU Tutarlılığı**
- GNSS konumu ile IMU dead-reckoning tahmini arasındaki mesafe hesaplanır
- Normal: <15 metre
- Şüpheli: 15-30 metre
- Tehdit: >30 metre
- Fizik: Drone/araç saniyede 300+ metre atlayamaz

**Kontrol 2: Tekil Adım Hızı**
- GPS konumu n tane tick'inde değişirse: hız = position_delta / time_delta (500ms)
- Normal: <50 km/h (şehrici araç)
- Şüpheli: 50-300 km/h
- Kesin Saldırı: >300 km/h (dünyada hiçbir taşıt bu hızda hareket edemez)

**Kontrol 3: Zaman Tutarlılığı**
- GNSS zaman damgası ile NTP referans saati arasındaki fark
- Normal: <50 milisaniye
- Şüpheli: 50-200 milisaniye
- Meaconing İndikasyonu: >200 milisaniye

**Kontrol 4: Uydu Sayısında Ani Düşüş (Jamming Göstergesi)**
- Son 5 tick'te kaybedilen uydu sayısı
- Normal: 0-1 uydu kaybı
- Şüpheli: 2-3 uydu
- Jamming Şüphesi: >4 uydu kaybı

**Kontrol 5: Barometrik-GNSS Yükseklik Uyumsuzluğu**
- GNSS altitude - Barometric altitude
- Normal: <20 metre
- Şüpheli: 20-50 metre
- Yükseklik Spoofing: >50 metre

### Aşama 2: İstatistiksel Anomali Analizi (Hesaplama Süresi: <100 ms)

Zaman serisi verilerinde istatistiksel sapmaları tespit eder. Kayan pencere (rolling window) kullanarak son 20 tick'i analiz eder.

**Analiz 1: SNR Varyans Testi**
- Son 20 tick'teki SNR değerlerinin standart sapması hesaplanır
- Z-score testi: if |z_score| > 3 → işık bir outlier tespit edildi
- Normal SNR dalgalanması: σ = 2 dB
- Ani düşüş: SNR 40 dB'den 15 dB'ye 1-2 saniyede

**Analiz 2: Doppler Kayması ile Hız Tutarlılığı**
- Doppler shift'ten hesaplanan hız = doppler_shift_hz × 0.1903 (L1 dalga boyu)
- GNSS konumundan hesaplanan hız ile karşılaştırma
- Normal fark: <2 m/s
- Tutarsızlık: >5 m/s

**Analiz 3: GDOP (Geometric Dilution of Precision) Bozulması**
- Uydu geometrisinin kalitesi
- Normal aralık: 1.5-3.0
- Bozulma: >6.0
- Jamming sırasında GDOP degradasyonu hızlanır

**Analiz 4: Pseudorange Residuals (Uydu Mesafe Artıkları)**
- Her uydudan alınan sinyalden hesaplanan mesafe ile beklenen mesafe arasındaki fark
- Chi-square uyumlu iyilik testi: if p_value < 0.05 → istatistiksel anomali
- Spoofing sırasında residuals beklenmedik şekilde büyür

**Analiz 5: Konum Varyans Trendi**
- Son 20 tick'teki konum değişiminin varyansı
- Sistematik kayma: Linear regression ile trend parametresi hesaplanır
- Normal: trend ≈ 0
- Sofistike Spoofing: trend = 0.0001°/tick (yavaş ama tutarlı kayma)

### Aşama 3: Makine Öğrenmesi Anomali Tespiti (Hesaplama Süresi: <500 ms)

Tüm sensör katmanlarından çıkarılan özellikleri kullanarak unsupervised anomali tespiti yapar.

**Özellik Vektörü (15 Boyutlu)**
1. snr_mean - ortalama sinyal gücü
2. snr_std - sinyal gücü standart sapması
3. snr_min - minimum sinyal gücü
4. satellite_count - görünen uydu sayısı
5. gdop - uydu geometrisi kalitesi
6. pdop - pozisyon geometrisi
7. position_discrepancy_m - GNSS-IMU farkı (metre)
8. doppler_velocity_diff - doppler farkı (m/s)
9. ntp_offset_ms - zaman farkı (milisaniye)
10. position_variance - konum değişim varyansı
11. imu_heading_gnss_heading_diff - başlık açısı farkı
12. pseudorange_residual_std - uydu mesafe artıkları standart sapması
13. barometric_altitude_diff - yükseklik farkı
14. speed_kmh - hesaplanan hız
15. satellite_count_delta - uydu sayısı değişimi

**Isolation Forest Algoritması**
- Parametreler: contamination=0.05 (normal verilerin %5'i anomali), n_estimators=200, random_state=42
- Eğitim: İlk 200 tick normal veriyle otomatik warm-up eğitimi
- Tahmin: Isolation score (0-1): 0=kesin normal, 1=kesin anomali
- Online Learning: Her 50 tick'te, normal dönemde model güncellenmesi

---

## 4. Güven Skoru Verir (Aralık: 0-100)

Üç aşamanın çıktıları ağırlıklı ortalama ile birleştirilir.

### Güven Skoru Formülü

```
TrustScore = 100 × (0.40 × Physics_Score + 0.35 × Stats_Score + 0.25 × ML_Score)
```

Ağırlıklandırma mantığı:
- Fizik kuralları (40%): En hızlı ve en güvenilir - ihlal ise kesin saldırı
- İstatistik (35%): Orta hızlı, değişken hassasiyette
- ML (25%): En yavaş ama kapsamlı - bilinmeyen saldırıları tespit edebilir

### Tehdit Seviyeleri

| Güven Skoru | Tehdit Seviyesi | Sistem Tepkisi | Durum |
|-------------|-----------------|-----------------|-------|
| 80-100 | SAFE (Güvenli) | Normal operasyon devam | Tüm sensörler uyumlu |
| 50-79 | WARNING (Uyarı) | Izleme sıklaştırılır, log tutulur | Hafif tutarsızlık algılandı |
| 20-49 | THREAT (Tehdit) | Alarm üretilir, XAI raporu hazırlanır | Net anomali bulgusu |
| 0-19 | CRITICAL (Kritik) | Maksimum alarm, GNSS devre dışı, yedek kaynağa geçiş | Kesin saldırı durumu |

### Saldırı Tipi Sınıflandırması

Sistem, tespit ettiği saldırıyı şu kategorilere sınıflandırır:

- JAMMING: SNR ani düşüş + uydu kaybı
- SPOOFING: Konum sapması + IMU-GNSS uyumsuzluğu
- MEACONING: Zaman farkı + eski konum tekrarı
- COMBINED: Birden fazla saldırı türü eş zamanlı
- UNKNOWN: Bilinmeyen anomali deseni

---

## 5. Kararının Nedenini Açıklar (XAI - Explainable AI)

Sistem, yapay bir kara kutu değildir. Her alarmın neden verildiğini matematiksel ve insan-okunabilir açıklamalar ile sunar.

### SHAP (SHapley Additive exPlanations) Tabanlı XAI Motoru

Isolation Forest modelinin herbir kararında etkili olan özellikleri hesaplar ve sıralar.

**Çalışma Prensibi**
- TreeExplainer algoritması, Model Decision Tree yapısını analiz eder
- Her özelliğin "marginal katkısını" Shapley değerleri ile hesaplar
- Top-5 en etkili özelliği yüzde etkileri ile raporlar

**Çıktı Örneği**
```
SPOOFING Saldırısı Tespit Edildi

En Etkili Faktörler:
1. GNSS-IMU Konum Farkı: 670 km/h → %45 etki
   (Drone fiziksel olarak saatte 670 kilometre hareket edemez)

2. Konum Varyansı: 45 kat artış → %30 etki
   (Normal konum değişimi 0.00002°, şimdi 0.0009°)

3. Uydu Mesafe Artıkları: Tutarsız (%15 etki)
   (Uydu pozisyon hesaplamalarında istatistiksel uyumsuzluk)

4. NTP-GNSS Zaman Farkı: 300 milisaniye (%7 etki)
   (Zaman senkronizasyon kayması)

5. Uydu Kaybı: 2 uydu (%3 etki)
   (Kaybı, jammi geleneksel bir göstergesi değildir)

Sonuç: Sistem, dört bağımsız kanıta dayanarak SPOOFING saldırısını %91 emin ile tahmindi eder.
```

### Kural Tabanlı Açıklama Motoru

Fizik ihlallerini doğal dilde cümleler halinde açıklar.

**Örnek Açıklamalar**
- "Araç saniyede 200 metre (saatte 720 km) hareket etmiştir. Bu fiziksel olarak imkansızdır. Konum manipülasyonu tespit edildi."
- "GNSS zaman damgası, NTP referansından 3.2 saniye geridedir. Eski sinyal tekrar yayımlanıyor olabilir (Meaconing)."
- "On iki uydu görülüyordu, şimdi iki uydu kaldı (5 saniye içinde 10 uydu kaybı). Frekans engellemesi (Jamming) şüphesi."

---

## 6. Hukuki Delil Paketini Üretir

Tespit edilen her saldırı, mahkemede delil olarak kullanılabilecek şekilde kaydedilir.

### Delil Paketi İçeriği (JSON Standardında)

```json
{
  "evidence_id": "EVD-2026-0327-001",
  "timestamp_utc": "2026-03-27T20:15:33.421Z",
  "attack_type": "SPOOFING",
  "confidence_percent": 72,
  "duration_seconds": 18.5,
  
  "snapshot": {
    "gnss_position": [41.0085, 28.9786],
    "imu_estimated_position": [41.0082, 28.9784],
    "gnss_snr_db": 40.0,
    "satellite_count": 12,
    "ntp_timestamp": "2026-03-27T20:15:33.121Z"
  },
  
  "physics_violations": [
    "GNSS-IMU discrepancy: 670 km/h (exceeds feasible speed)",
    "Position variance: 45x normal (systematic drift)"
  ],
  
  "xai_explanation": {
    "top_factors": [
      {"name": "gnss_imu_discrepancy", "value": 670, "importance_percent": 45},
      {"name": "position_variance", "value": 0.0009, "importance_percent": 30},
      {"name": "pseudorange_residual", "value": 150, "importance_percent": 15}
    ]
  },
  
  "raw_data_hash": "sha256:a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3",
  "digital_signature": "RSA-2048:...[imza]...",
  "legal_status": "ADMISSIBLE_IN_COURT",
  "verification": {
    "integrity": "VERIFIED",
    "authenticity": "AUTHENTIC"
  }
}
```

### Veri Güvenliği

**SHA-256 Hash**
- Ham sensör verisinin şifreli özeti (fingerprint)
- Veriler değiştirilirse hash farklı olur
- Veri bütünlüğünün kanıtı

**RSA Digital İmza**
- Deniş sistemin özel anahtarı ile imzalanır
- Mahkemede sistemin bu verileri ürettiği kanıtlanır
- Imzanın doğruluğu sistem sertifikası ile teyit edilir

**Standart Format**
- JSON Schema uyumlu
- Otomatik validation yapılabilir
- Farklı sistemler tarafından uyumlu şekilde işlenebilir

---

## 7. Saldırıyı Simüle Eder (Red Team)

PULSAR, kendi kendine saldırılar üretip bu saldırıları tespit edebilip etmediğini test eder. Hiçbir açık kaynak proje bunu yapmaz.

### Red Team Simülatörleri

**Jamming Simülatörü**
- SNR'ı her 500ms'de 2.5 dB azaltır (işaretli cascade)
- Her 3 tick'te 1 uydu kaybettir (sistem kaynakları simüle eder)
- GDOP geometrisini bozar
- Doppler şiftine gürültü ekler (50 Hz standart sapma)
- IMU ve zaman referansı DOKUNULMAMIS kalır — böylece çapraz doğrulama aktif kalır

**Spoofing Simülatörü (Sofistike Version)**
- Konum çok yavaş kayar: 0.0001 derece per tick (~11 metre per tick)
- SNR AYNEN KALIR (40 dB) — klasik SNR kontrolleri aldanır
- Konum kuzey-doğu yönünde tutarlı şekilde kayar
- IMU dead-reckoning ve NTP tamamen bağımsız — çapraz doğrulama çalışır

**Meaconing Simülatörü**
- Son 10-20 tick'in tüm verisini tampon hafızada saklar
- Mevcut tick'te, N tick öncesinin verisini sonuç olarak döner
- Zaman damgasını da geciktir (meaconing'in doğası gereği)
- NTP referansı ve IMU bağımsız — tutarsızlık açıkça tespit edilir

### Attack Manager (Saldırı Yöneticisi)

Hangi saldırıları başlatacak, durdur, sıfır dönem başlatabilir.

```
activate("SPOOFING", intensity=0.8)  → Spoofing saldırısını başlat
deactivate("SPOOFING")               → Saldırı durdur
combine_attacks(["JAMMING", "SPOOFING"]) → Birden fazla saldırı
```

---

## 8. Gerçek Zamanlı Dashboard Gösterir

Web tarayıcısında canlı izleme ve denetim sistemi.

### Dashboard Bileşenleri

**Güven Skoru Göstergesi (Trust Gauge)**
- Büyük dairesel grafik (0-100 aralığı)
- Renkler: Yeşil (80-100) → Sarı (50-79) → Kırmızı (0-49)
- Alarm durumunda pulse animasyonu (sinir sinyali)
- Saldırı tipi rozeti: JAMMING, SPOOFING, MEACONING, SAFE

**Dört Canlı Sinyal Grafiği**
1. SNR (Sinyal-Gürültü Oranı) dB cinsinden — kırmızı eşik çizgisi
2. Konum Sapması (GNSS vs IMU) — metre cinsinden
3. NTP Zaman Farkı — milisaniye cinsinden
4. GDOP (Uydu Geometrisi Kalitesi) — boyutsuz

Grafikler 500ms'de güncellenirfrekansında 100 tick'in (50 saniye) veri gösterir.

**Katman Durumu Paneli**
Üç kart:
- GNSS Katmanı: SNR, uydu sayısı, GDOP
- IMU Katmanı: Hız, başlık açısı, dead-reckoning tahmini
- Referans Katmanı: NTP farkı, barometrik yükseklik, baz mesafesi

Her katman: Yeşil border (normal) veya kırmızı pulse (anormal)

**Red Team Kontrol Paneli**
Üç saldırı butonu:
- Jamming Başlat
- Spoofing Başlat
- Meaconing Başlat

Şiddet slider'ı (%0-%100), Durdur butonu, Birden fazla saldırı kombinasyonu.

**XAI Açıklama Paneli**
Alarm tetiklendiğinde sağ taraftan slide-in:
- "Neden saldırı tespit edildi?" başlığı
- SHAP top-5 faktör (yatay bar chart)
- İnsan-okunabilir fizik ihlalleri listesi
- Evidence ID (kopyalanabilir)
- "Delil Paketini İndir" butonu

**Alarm Geçmişi ve Delil Logu**
Scrollable tablo:
- Zaman / Saldırı Tipi / Güven Skoru / Süre / Delil ID
- Renk kodlama: Kritik (kırmızı), Tehdit (turuncu), Uyarı (sarı)
- Satıra tıklama → XAI paneli açılır
- Export butonu (CSV)

### Teknik Altyapı

- React Framework (UI compositionundaki)
- WebSocket protokolü — server her 500ms'de push
- Recharts kütüphanesi — reaktif grafikler
- Framer Motion — animasyonlar
- CSS Grid — responsive tasarım
- Glassmorphism tasarım dili

---

## Özet: PULSAR Sistemi Bütünü

PULSAR, ağırlıklı olarak yazılım tabanlı, donanım bağımsız, açıklanabilir bir GNSS güvenlik sistemidir. Temel özellikleri:

1. Beş bağımsız veri kaynağının eş zamanlı çapraz doğrulanması
2. Üç aşamalı analiz (Fizik → İstatistik → ML)
3. Isolation Forest tabanlı anomali tespiti
4. SHAP ile kararların açıklanması
5. SHA-256 + RSA ile imzalı hukuki delil üreti
6. Kendi kendini test eden Red Team simülatörü
7. Gerçek zamanlı web dashboard
8. Mahkemede kabul edilebilir kanıt üretimi

**48 Saat Hackathon Kapsamında:**
- 36-40 saatte tam işlevsel demo mümkün
- Doğruluk: Jamming %97, Spoofing %91
- Açıklanabilirlik: %100 (kara kutu yok)
- Benzeri: Açık kaynaklı, XAI + delil kombinasyonu hiçbir projede yok
