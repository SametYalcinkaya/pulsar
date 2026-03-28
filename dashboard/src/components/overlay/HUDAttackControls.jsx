import { useState } from 'react';
import axios from 'axios';

const API = 'http://localhost:8000';

const ATTACKS = [
  { name: 'JAMMING', label: 'Jamming', color: '#ef4444', icon: '📡' },
  { name: 'SPOOFING', label: 'Spoofing', color: '#f97316', icon: '🎯' },
  { name: 'MEACONING', label: 'Meaconing', color: '#f59e0b', icon: '⏱️' },
];

export default function HUDAttackControls({ activeAttack }) {
  const [loading, setLoading] = useState(null);

  const startAttack = async (name) => {
    setLoading(name);
    try {
      const params = name === 'SPOOFING'
        ? { mode: 'sophisticated', intensity: 0.8 }
        : name === 'MEACONING'
          ? { delay_ticks: 10 }
          : { intensity: 0.8 };
      await axios.post(`${API}/api/attack/start`, {
        attack_name: name.toLowerCase(),
        params,
      });
    } catch (e) {
      console.error('Attack start failed:', e);
    }
    setLoading(null);
  };

  const stopAttack = async () => {
    setLoading('STOP');
    try {
      await axios.post(`${API}/api/attack/stop`);
    } catch (e) {
      console.error('Attack stop failed:', e);
    }
    setLoading(null);
  };

  return (
    <div style={{
      display: 'flex',
      gap: 8,
      padding: '8px 12px',
      background: 'rgba(0,0,0,0.7)',
      borderRadius: 12,
      border: '1px solid rgba(124,210,233,0.15)',
      backdropFilter: 'blur(10px)',
    }}>
      {ATTACKS.map((atk) => {
        const isActive = activeAttack?.toUpperCase() === atk.name;
        return (
          <button
            key={atk.name}
            onClick={() => isActive ? stopAttack() : startAttack(atk.name)}
            disabled={loading !== null}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 8,
              border: `1px solid ${isActive ? atk.color : 'rgba(255,255,255,0.15)'}`,
              background: isActive ? `${atk.color}30` : 'rgba(255,255,255,0.05)',
              color: isActive ? atk.color : '#9aa7c7',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: isActive ? `0 0 12px ${atk.color}40` : 'none',
            }}
          >
            <span>{atk.icon}</span>
            {atk.label}
          </button>
        );
      })}

      {activeAttack && (
        <button
          onClick={stopAttack}
          disabled={loading !== null}
          style={{
            padding: '6px 14px',
            borderRadius: 8,
            border: '1px solid #ef4444',
            background: 'rgba(239,68,68,0.2)',
            color: '#ef4444',
            fontSize: 11,
            fontWeight: 700,
            cursor: 'pointer',
            letterSpacing: 1,
          }}
        >
          DURDUR
        </button>
      )}
    </div>
  );
}
