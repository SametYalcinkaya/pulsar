import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const API = 'http://localhost:8000';

const ATTACKS = [
  { name: 'jamming',   label: '🔴 Jamming',   color: '#ef4444', desc: 'SNR düşürme, uydu kaybı' },
  { name: 'spoofing',  label: '🟠 Spoofing',  color: '#f97316', desc: 'Konum manipülasyonu' },
  { name: 'meaconing', label: '🟡 Meaconing', color: '#f59e0b', desc: 'Sinyal geciktirme' },
];

export default function AttackControls({ activeAttack }) {
  const [intensity, setIntensity] = useState(80);
  const [loading, setLoading] = useState(null);

  const start = async (name) => {
    setLoading(name);
    try {
      await axios.post(`${API}/api/attack/start`, {
        attack_name: name,
        params: { intensity: intensity / 100, mode: name === 'spoofing' ? 'sophisticated' : undefined },
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(null);
    }
  };

  const stop = async (name) => {
    setLoading('stop_' + name);
    try {
      await axios.post(`${API}/api/attack/stop`, { attack_name: name });
    } catch (e) { console.error(e); }
    finally { setLoading(null); }
  };

  const stopAll = async () => {
    for (const a of ATTACKS) await stop(a.name);
  };

  const startCombined = async () => {
    for (const a of ATTACKS.slice(0, 2)) await start(a.name);
  };

  return (
    <div className="card">
      <h3 style={{ color: 'var(--text-muted)', fontSize: 12, letterSpacing: 2, margin: '0 0 12px' }}>
        KIRIMIZI TAKIM
      </h3>

      <AnimatePresence>
        {activeAttack && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              background: 'rgba(239,68,68,0.12)',
              border: '1px solid #ef4444',
              borderRadius: 8, padding: '8px 12px',
              marginBottom: 12, fontSize: 12,
              color: '#ef4444', fontWeight: 600,
            }}
          >
            ⚠️ RED TEAM SALDIRI AKTİF: {activeAttack}
          </motion.div>
        )}
      </AnimatePresence>

      {ATTACKS.map(atk => {
        const isActive = activeAttack?.toLowerCase().includes(atk.name);
        return (
          <motion.button
            key={atk.name}
            onClick={() => isActive ? stop(atk.name) : start(atk.name)}
            disabled={loading === atk.name}
            animate={isActive ? {
              boxShadow: [`0 0 0px ${atk.color}`, `0 0 12px ${atk.color}`, `0 0 0px ${atk.color}`],
            } : { boxShadow: 'none' }}
            transition={{ duration: 1, repeat: Infinity }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{
              width: '100%', marginBottom: 8, padding: '10px 16px',
              background: isActive ? `${atk.color}22` : 'var(--bg-secondary)',
              border: `1px solid ${isActive ? atk.color : 'var(--border)'}`,
              borderRadius: 10, color: atk.color,
              cursor: 'pointer', textAlign: 'left',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{atk.label}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{atk.desc}</div>
            </div>
            <span style={{ fontSize: 11, opacity: 0.7 }}>
              {isActive ? '⏹ Durdur' : '▶ Başlat'}
            </span>
          </motion.button>
        );
      })}

      {/* Şiddet slider */}
      <div style={{ margin: '12px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Şiddet</span>
          <span style={{ fontSize: 11, color: 'var(--accent)' }}>{intensity}%</span>
        </div>
        <input
          type="range" min={10} max={100} value={intensity}
          onChange={e => setIntensity(+e.target.value)}
          style={{ width: '100%', accentColor: 'var(--accent)' }}
        />
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={startCombined}
          style={{
            flex: 1, padding: '8px', borderRadius: 8,
            background: 'rgba(124,58,237,0.15)',
            border: '1px solid #7c3aed', color: '#7c3aed',
            cursor: 'pointer', fontSize: 12, fontWeight: 600,
          }}
        >
          ⚡ Kombine
        </button>
        <button
          onClick={stopAll}
          style={{
            flex: 1, padding: '8px', borderRadius: 8,
            background: 'rgba(100,116,139,0.15)',
            border: '1px solid var(--border)', color: 'var(--text-muted)',
            cursor: 'pointer', fontSize: 12, fontWeight: 600,
          }}
        >
          ⏹ Tümünü Durdur
        </button>
      </div>
    </div>
  );
}
