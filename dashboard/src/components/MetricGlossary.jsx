const METRICS = [
    {
        key: 'SNR',
        title: 'SNR (Signal to Noise)',
        desc: 'Sinyal gucu. Jamming saldirisinda hizla duser.',
    },
    {
        key: 'Uydu',
        title: 'Uydu Sayisi',
        desc: 'Konum icin minimum 4 uydu gerekir. Dusus jamming belirtisi.',
    },
    {
        key: 'GDOP',
        title: 'GDOP',
        desc: 'Uydu geometrisinin kalitesi. Yuksek deger konum hatasi demek.',
    },
    {
        key: 'IMU',
        title: 'IMU Dead-Reckoning',
        desc: 'GPS yokken cihazin kendi hareketinden hesaplanan konum.',
    },
    {
        key: 'NTP',
        title: 'NTP Offset',
        desc: 'GNSS zamani ile ag zamani farki. Meaconingde artar.',
    },
    {
        key: 'Trust',
        title: 'Guven Skoru',
        desc: '0-100. Dusus saldiri riskini gosterir.',
    },
];

export default function MetricGlossary() {
    return (
        <div className="card" style={{ textAlign: 'left' }}>
            <h3 style={{ color: 'var(--text-muted)', fontSize: 12, letterSpacing: 2, margin: '0 0 12px' }}>
                KAVRAM KARTI
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {METRICS.map((m) => (
                    <div
                        key={m.key}
                        style={{
                            borderRadius: 10,
                            padding: 10,
                            border: '1px solid rgba(148,163,184,0.2)',
                            background: 'rgba(15,23,42,0.5)',
                        }}
                    >
                        <div style={{ fontSize: 11, fontWeight: 700 }}>{m.title}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-faint)', lineHeight: 1.4 }}>{m.desc}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}
