# PULSAR — Konum Güvenliği İçin Katmanlı Anomali Tespit Sistemi

> **P**osition **U**ncertainty **L**ayered **S**ecurity & **A**nomaly **R**ecognition

---

## 1. Problem

GNSS (GPS, Galileo, GLONASS) sinyalleri uzaydan dünyaya açık ve şifrelenmemiş olarak iletilir. Bu sinyaller üç temel saldırı vektörüne karşı savunmasızdır:

| Saldırı | Mekanizma | Etkisi |
|---|---|---|
| **Jamming** | Frekans bandını gürültüyle doldurur | Alıcı hiçbir uyduyu göremez, konum kaybı |
| **Spoofing** | Sahte uydu sinyalleri üretir | Alıcı yanlış konuma/zamana kilitlenir |
| **Meaconing** | Gerçek sinyali yakalar, geciktirip yeniden yayınlar | Alıcı eski konumu güncel sanır |

### Gerçek Dünya Sonuçları

- Bir İHA sahte sinyal ile düşman tarafından ele geçirilebilir
- Enerji şebekelerinde mikrosaniye düzeyinde zaman kayması, büyük çaplı kesintilere yol açar
- Otonom kara araçları yanlış kavşağa yönlendirilebilir
- Deniz taşımacılığında gemiler yanlış rotaya sokulabilir

### Mevcut Çözümlerin Eksikliği

Piyasadaki çözümlerin büyük çoğunluğu **tek boyutlu analiz** yapar: ya sadece sinyal gücüne (SNR) bakar ya da sadece bir ML modeli çalıştırır. Sofistike bir saldırgan bu tek katmanı aşabilir. Çok katmanlı, çapraz doğrulama yapan açık kaynaklı bir çözüm bulunmamaktadır.

---

## 2. PULSAR Yaklaşımı: Çapraz Katman Doğrulama

PULSAR, sinyalin güvenilirliğini tek bir metrikle değil, **birbirinden bağımsız birden fazla veri kaynağını çapraz karşılaştırarak** belirler.

### Temel İlke

> Bir saldırgan GNSS sinyalini kandırabilir. Ama aynı anda IMU sensörünü, baz istasyonu verisini ve uydu geometrisini de tutarlı şekilde kandırması **fiziğin yasaları gereği imkansızdır**. Katmanlar arasındaki tutarsızlık = saldırı kanıtı.

### Klasik vs PULSAR

```
Klasik:
  GNSS Sinyali → SNR Kontrolü → Alarm (tek boyut, atlatılabilir)

PULSAR:
  GNSS Sinyali ───┐
  IMU Sensörü ────┤
  Referans Zaman ─┼──→ Çapraz Tutarlılık Motoru → Güven Skoru → Karar
  Uydu Geometri ──┤
  Doppler Analiz ─┘
       ↑
  5 bağımsız kaynak, hepsini aynı anda kandırmak imkansız
```

---

## 3. Sistem Mimarisi

```
┌─────────────────────────────────────────────────────┐
│                      PULSAR                          │
│                                                      │
│  ┌────────────────┐     ┌─────────────────────────┐ │
│  │  SİMÜLASYON    │     │  ÇAPRAZ DOĞRULAMA       │ │
│  │  MOTORU         │────▶│  MOTORU (CLV Engine)     │ │
│  │                │     │                         │ │
│  │ • GNSS verisi  │     │ Aşama 1: Fizik Kuralları│ │
│  │ • IMU verisi   │     │ Aşama 2: İstatistik     │ │
│  │ • Referans     │     │ Aşama 3: ML Modeli      │ │
│  │ • Saldırılar   │     └────────────┬────────────┘ │
│  └────────────────┘                  │              │
│                                      ▼              │
│                        ┌─────────────────────────┐  │
│                        │  KARAR MOTORU            │  │
│                        │                         │  │
│                        │ • Güven Skoru (0–100)    │  │
│                        │ • Saldırı Sınıflandırma  │  │
│                        │ • Tehdit Seviyesi        │  │
│                        └────────────┬────────────┘  │
│                                     ▼               │
│                        ┌─────────────────────────┐  │
│                        │  DASHBOARD (Gerçek       │  │
│                        │  Zamanlı Görselleştirme) │  │
│                        └─────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

---

## 4. Modüller

### 4.1 Simülasyon Motoru

Gerçek donanım olmadan tam işlevsel demo sağlar. Üç bağımsız veri katmanı üretir:

| Katman | Üretilen Veri | Saldırıda Davranışı |
|---|---|---|
| **GNSS** | Konum (lat/lon), SNR, Doppler kayması, görünen uydu sayısı | Spoofing: konum kayar. Jamming: SNR düşer, uydu kaybedilir |
| **IMU** | 3 eksen ivme, 3 eksen açısal hız, yön açısı | Fiziksel sensör — saldırıdan etkilenmez |
| **Referans** | Baz istasyonu konumu, NTP zaman damgası | Bağımsız altyapı — saldırıdan etkilenmez |

Simülatör ayrıca 3 saldırı senaryosu üretir:
- **Jamming:** Giderek artan gürültü, SNR çöküşü
- **Spoofing:** Yavaşça kayan sahte konum (gelişmiş saldırı — ani sıçrama yok)
- **Meaconing:** Sabit gecikme ile tekrarlanan eski sinyal

### 4.2 Çapraz Doğrulama Motoru (CLV Engine)

Üç aşamalı, ardışık tespit mimarisi:

**Aşama 1 — Fiziksel Tutarlılık Kontrolü (< 10 ms)**
- GNSS konumu ile IMU dead-reckoning karşılaştırması
- GNSS zaman damgası ile NTP zaman farkı kontrolü
- Tek adımda konum sıçraması (> fiziksel olarak mümkün hız) kontrolü
- Görünen uydu sayısı ani değişim kontrolü

**Aşama 2 — İstatistiksel Analiz (< 100 ms)**
- Doppler kayması ile hesaplanan hız karşılaştırması
- Uydu geometri kalitesi (GDOP/PDOP) analizi
- SNR değerlerinin istatistiksel dağılım testi
- Zaman pencereli varyans analizi

**Aşama 3 — Makine Öğrenmesi (< 500 ms)**
- Isolation Forest: Tüm katmanlardan çıkarılan 15+ özellik vektörü üzerinde anomali tespiti
- Özellik vektörü: SNR ortalaması, SNR varyansı, konum sapması, IMU-GNSS farkı, Doppler tutarsızlığı, GDOP, uydu sayısı değişimi, zaman farkı vb.
- Model simülasyon verisinin "normal" kısmıyla eğitilir, anomaliyi öğrenmeden tespit eder

### 4.3 Güven Skoru ve Karar Motoru

Her aşamadan gelen çıktılar ağırlıklı olarak birleştirilir:

```
Güven Skoru = w1 × Fizik_Skoru + w2 × İstatistik_Skoru + w3 × ML_Skoru
```

| Skor | Durum | Sistem Tepkisi |
|---|---|---|
| 80 – 100 | ✅ **Güvenilir** | Normal operasyona devam |
| 50 – 79 | ⚠️ **Şüpheli** | Uyarı üret, izlemeyi sıkılaştır |
| 0 – 49 | 🚨 **Tehdit Altında** | Alarm, GNSS devre dışı bırak, yedek kaynaklara geç |

Ek olarak saldırı türü sınıflandırılır: `JAMMING`, `SPOOFING`, `MEACONING` veya `UNKNOWN`.

### 4.4 Dashboard

Gerçek zamanlı web arayüzü:

- Güven skoru göstergesi (gauge — anlık)
- SNR / konum / Doppler zaman serisi grafikleri
- Katmanlar arası tutarsızlık haritası (hangi katman uyumsuz, görsel)
- Saldırı geçmişi log tablosu
- Saldırı tetikleme butonları (demo için)

---

## 5. Teknoloji Yığını

| Katman | Teknoloji | Gerekçe |
|---|---|---|
| Simülasyon & Çekirdek | Python 3.11+ | Hızlı prototipleme, sayısal hesaplama |
| ML | scikit-learn | Isolation Forest, hafif ve hızlı |
| API | FastAPI + WebSocket | Gerçek zamanlı, düşük gecikmeli veri akışı |
| Dashboard | React (Vite) + Recharts | Canlı grafikler, modern UI |
| Veri Akışı | WebSocket | Server → Client anlık veri push |

---

## 6. Demo Senaryosu — Jüri Sunumu (~10 dk)

### Sahne 1 — Sistem Açılışı (1 dk)
Sistem başlatılır. Dashboard açılır. Tüm katmanlar tutarlı. Güven skoru **96** civarında stabil.

### Sahne 2 — Jamming Saldırısı (3 dk)
Dashboard üzerindeki "Jamming Başlat" butonuna basılır.
- SNR grafiği hızla düşer
- Uydu sayısı 12 → 3'e iner
- **Ancak IMU verisi ve referans zaman stabil kalır** → çapraz tutarsızlık
- Güven skoru: 96 → **22**'ye düşer
- Sistem otomatik alarm üretir: `🚨 JAMMING DETECTED`
- Saldırı durdurulur, skor 96'ya geri yükselir

### Sahne 3 — Sofistike Spoofing (4 dk)
"Spoofing Başlat" butonuna basılır. Bu sefer saldırı sofistike: konum **yavaşça** kayar, SNR normal kalır.
- Klasik SNR kontrolü bunu yakalayamaz (SNR düşmedi)
- **Ama GNSS konumu ile IMU dead-reckoning arasında fark açılmaya başlar**
- ML modeli zaman penceresi boyunca biriken tutarsızlığı tespit eder
- 15-20 saniye sonra güven skoru düşer: 96 → **38**
- Sistem: `🚨 SPOOFING DETECTED`
- Jüriye gösterilir: "Klasik yöntem bunu kaçırırdı, PULSAR çapraz doğrulama ile yakaladı"

### Sahne 4 — Sonuçlar (2 dk)
- Tespit doğruluğu istatistikleri gösterilir
- Klasik tek-katman vs PULSAR çok-katman karşılaştırma tablosu
- Gerçek dünya kullanım alanları

---

## 7. Proje Yapısı

```
pulsar/
├── simulation/
│   ├── gnss_sim.py            # GNSS sinyal simülasyonu
│   ├── imu_sim.py             # IMU veri simülasyonu
│   ├── reference_sim.py       # Referans kaynak simülasyonu
│   └── attack_engine.py       # Saldırı senaryoları üreteci
│
├── core/
│   ├── clv_engine.py          # Çapraz Katman Doğrulama motoru
│   ├── physics_check.py       # Aşama 1: Fiziksel tutarlılık
│   ├── stats_check.py         # Aşama 2: İstatistiksel analiz
│   ├── ml_detector.py         # Aşama 3: ML anomali tespiti
│   ├── trust_score.py         # Güven skoru hesaplayıcı
│   └── feature_extractor.py   # Özellik çıkarımı
│
├── api/
│   ├── main.py                # FastAPI uygulaması + WebSocket
│   └── schemas.py             # Veri modelleri
│
├── dashboard/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── TrustGauge.jsx       # Güven skoru göstergesi
│   │   │   ├── SignalCharts.jsx     # SNR/Doppler grafikleri
│   │   │   ├── LayerStatus.jsx      # Katman tutarlılık paneli
│   │   │   ├── AttackControls.jsx   # Demo saldırı butonları
│   │   │   └── AlertLog.jsx         # Alarm geçmişi
│   │   └── hooks/
│   │       └── useWebSocket.js      # Gerçek zamanlı bağlantı
│   └── package.json
│
├── models/
│   └── isolation_forest.pkl   # Eğitilmiş model
│
├── requirements.txt
├── README.md
└── MVP.md
```

---

## 8. 48 Saat Zaman Planı

| Saat | İş Paketi | Beklenen Çıktı |
|---|---|---|
| 0 – 6 | Simülasyon motoru: GNSS + IMU + Referans veri üretimi | 3 katmanda tutarlı veri akışı |
| 6 – 14 | CLV Engine: 3 aşamalı çapraz doğrulama + güven skoru | Saldırı tespiti çalışır |
| 14 – 20 | FastAPI + WebSocket API | Backend hazır, veri akıyor |
| 20 – 32 | Dashboard: React UI + canlı grafikler | Görsel arayüz tamamlanır |
| 32 – 40 | Demo senaryoları + uçtan uca entegrasyon | 10 dk demo kesintisiz çalışır |
| 40 – 44 | Hata düzeltme + performans iyileştirme | Stabil sistem |
| 44 – 48 | Sunum hazırlığı + son test | Jüriye hazır |

---

## 9. PULSAR'ı Farklı Kılan Ne?

| Kriter | Klasik Yaklaşımlar | PULSAR |
|---|---|---|
| Algılama boyutu | Tek katman (sadece sinyal) | 5 bağımsız kaynak çapraz doğrulama |
| Sofistike spoofing | Yakalayamaz (SNR normal) | IMU çapraz kontrolü ile yakalar |
| Donanım ihtiyacı | SDR cihazı şart | Tamamen yazılım tabanlı |
| Karar çıktısı | İkili (var/yok) | Güven skoru (0-100) + saldırı tipi |
| Açıklanabilirlik | Kara kutu | Hangi katman tutarsız, neden, ne kadar |
| Aşamalı analiz | Tek geçiş | 3 aşama: hızlıdan derinine |

---

## 10. Kapsam Dışı (Bu MVP'de Yok)

- Gerçek SDR donanım entegrasyonu
- Üretim ortamı güvenlik sertifikasyonu
- Mobil uygulama
- Dağıtık çoklu alıcı konsensüsü (gelecek sürüm adayı)
- Gerçek uydu sinyali işleme

---

## 11. Başarı Kriterleri

- [ ] 3 katmanda simülasyon verisi tutarlı şekilde üretilir
- [ ] Çapraz doğrulama motoru katmanlar arası tutarsızlıkları tespit eder
- [ ] Jamming saldırısı %95+ doğrulukla yakalanır
- [ ] Sofistike spoofing (yavaş kayma) %90+ doğrulukla yakalanır
- [ ] Dashboard gerçek zamanlı güven skoru ve grafikler gösterir
- [ ] Demo senaryosu 10 dakika kesintisiz çalışır
- [ ] Jüriye "klasik yöntem bunu kaçırır, PULSAR yakalar" farkı gösterilebilir
