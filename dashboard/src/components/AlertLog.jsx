import { useState, useEffect } from 'react';
import axios from 'axios';

const API = 'http://localhost:8000';

const LEVEL_COLORS = {
  CRITICAL: '#dc2626',
  THREAT: '#ef4444',
  WARNING: '#f59e0b',
  SAFE: '#10b981',
};

export default function AlertLog({ onSelectEvidence, selectedEvidenceId }) {
  const [items, setItems] = useState([]);

  const load = async () => {
    try {
      const { data } = await axios.get(`${API}/api/evidence`);
      setItems((data.items || []).reverse());
    } catch (_) { }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 3000);
    return () => clearInterval(id);
  }, []);

  const exportCsv = () => {
    const headers = ['evidence_id', 'timestamp_utc', 'attack_type', 'trust_score_after', 'duration_seconds'];
    const rows = items.map(i => headers.map(h => i[h] ?? '').join(','));
    const blob = new Blob([headers.join(',') + '\n' + rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'pulsar_alerts.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', maxHeight: 340 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <h3 style={{ color: 'var(--text-muted)', fontSize: 12, letterSpacing: 2, margin: 0 }}>
          ALARM GEÇMİŞİ
        </h3>
        <button
          onClick={exportCsv}
          style={{
            padding: '3px 10px', borderRadius: 6, fontSize: 11,
            background: 'rgba(59,130,246,0.1)', border: '1px solid var(--border)',
            color: 'var(--accent)', cursor: 'pointer',
          }}
        >
          CSV İndir
        </button>
      </div>

      <div style={{ overflowY: 'auto', flex: 1 }}>
        {items.length === 0 && (
          <p style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', marginTop: 20 }}>
            Henüz alarm yok
          </p>
        )}
        {items.map((item) => {
          const color = LEVEL_COLORS[
            item.trust_score_after < 20 ? 'CRITICAL'
              : item.trust_score_after < 50 ? 'THREAT'
                : 'WARNING'
          ];
          const isSelected = selectedEvidenceId === item.evidence_id;
          return (
            <div
              key={item.evidence_id}
              onClick={() => onSelectEvidence?.(item.evidence_id)}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto auto auto',
                gap: 8,
                padding: '8px 10px',
                marginBottom: 4,
                borderRadius: 8,
                background: isSelected ? `${color}22` : `${color}11`,
                border: isSelected ? `1px solid ${color}` : `1px solid ${color}33`,
                cursor: 'pointer',
                fontSize: 11,
              }}
            >
              <div>
                <div style={{ color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: 10 }}>
                  {item.evidence_id}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: 10 }}>
                  {new Date(item.timestamp_utc).toLocaleTimeString('tr-TR')}
                </div>
              </div>
              <span style={{ color, fontWeight: 600, alignSelf: 'center' }}>
                {item.attack_type}
              </span>
              <span style={{ color, alignSelf: 'center' }}>
                {item.trust_score_after?.toFixed(0)}
              </span>
              <span style={{ color: 'var(--text-muted)', alignSelf: 'center' }}>
                {item.duration_seconds?.toFixed(1)}s
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
