export default function SimulationPanel({ data }) {
    const gnss = data?.gnss;
    const ref = data?.reference;
    const imu = data?.imu;

    return (
        <div className="card" style={{ textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
                <div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', letterSpacing: 2 }}>
                        CANLI SIMULASYON
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
                        Drone / Arac / Telefon
                    </div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>
                    Kaynak: Sentetik GNSS
                </div>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 12,
                marginBottom: 12,
            }}>
                <div style={{
                    background: 'rgba(56,189,248,0.08)',
                    border: '1px solid rgba(56,189,248,0.3)',
                    borderRadius: 12,
                    padding: 12,
                }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Uydu Sayisi</div>
                    <div style={{ fontSize: 22, fontWeight: 700 }}>{gnss?.satellite_count ?? '--'}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>Minimum 4 uydu gerekir</div>
                </div>
                <div style={{
                    background: 'rgba(251,146,60,0.08)',
                    border: '1px solid rgba(251,146,60,0.3)',
                    borderRadius: 12,
                    padding: 12,
                }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>SNR Ortalama</div>
                    <div style={{ fontSize: 22, fontWeight: 700 }}>{gnss?.snr_mean?.toFixed(1) ?? '--'} dB</div>
                    <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>Dusuk deger jamming belirtisi</div>
                </div>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <div style={{
                    flex: '1 1 140px',
                    background: 'rgba(34,197,94,0.08)',
                    border: '1px solid rgba(34,197,94,0.3)',
                    borderRadius: 10,
                    padding: 10,
                }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Konum (GNSS)</div>
                    <div style={{ fontSize: 11, fontFamily: 'var(--mono)' }}>
                        {gnss?.latitude?.toFixed(5) ?? '--'}, {gnss?.longitude?.toFixed(5) ?? '--'}
                    </div>
                </div>
                <div style={{
                    flex: '1 1 140px',
                    background: 'rgba(99,102,241,0.08)',
                    border: '1px solid rgba(99,102,241,0.3)',
                    borderRadius: 10,
                    padding: 10,
                }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>IMU Hizi</div>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{imu?.speed_kmh?.toFixed(1) ?? '--'} km/s</div>
                </div>
                <div style={{
                    flex: '1 1 140px',
                    background: 'rgba(45,212,191,0.08)',
                    border: '1px solid rgba(45,212,191,0.3)',
                    borderRadius: 10,
                    padding: 10,
                }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>NTP Farki</div>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{ref?.ntp_offset_ms?.toFixed(1) ?? '--'} ms</div>
                </div>
            </div>

            <div style={{
                marginTop: 12,
                padding: 10,
                borderRadius: 10,
                border: '1px dashed rgba(148,163,184,0.4)',
                color: 'var(--text-faint)',
                fontSize: 11,
                lineHeight: 1.5,
            }}>
                Her 500ms bir tick uretilir. GNSS, IMU ve referans katmanlari senkron uretilir.
                Saldiri baslarsa bu verilerde tutarsizlik olusur.
            </div>
        </div>
    );
}
