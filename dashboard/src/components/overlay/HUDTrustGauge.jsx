import { motion, AnimatePresence } from 'framer-motion';

const THREAT_COLORS = {
  SAFE: '#22c55e',
  WARNING: '#f59e0b',
  THREAT: '#ef4444',
  CRITICAL: '#dc2626',
};

const THREAT_LABELS = {
  SAFE: 'GÜVENLİ',
  WARNING: 'DİKKAT',
  THREAT: 'TEHDİT',
  CRITICAL: 'KRİTİK',
};

export default function HUDTrustGauge({ trustScore, threatLevel }) {
  const color = THREAT_COLORS[threatLevel] || THREAT_COLORS.SAFE;
  const label = THREAT_LABELS[threatLevel] || 'GÜVENLİ';
  const isAlert = threatLevel !== 'SAFE';

  const circumference = 2 * Math.PI * 52;
  const strokeDashoffset = circumference - (trustScore / 100) * circumference;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 4,
    }}>
      <div style={{ position: 'relative', width: 120, height: 120 }}>
        <svg width="120" height="120" viewBox="0 0 120 120">
          {/* Background circle */}
          <circle
            cx="60" cy="60" r="52"
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="6"
          />
          {/* Score arc */}
          <motion.circle
            cx="60" cy="60" r="52"
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            transform="rotate(-90 60 60)"
            style={{
              filter: `drop-shadow(0 0 8px ${color})`,
            }}
          />
        </svg>
        {/* Score number */}
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <motion.span
            style={{
              fontSize: 32,
              fontWeight: 800,
              fontFamily: 'var(--mono)',
              color,
              textShadow: `0 0 20px ${color}`,
            }}
            animate={{ scale: isAlert ? [1, 1.05, 1] : 1 }}
            transition={{ duration: 1, repeat: isAlert ? Infinity : 0 }}
          >
            {Math.round(trustScore)}
          </motion.span>
          <span style={{
            fontSize: 8,
            color: 'var(--text-muted)',
            letterSpacing: 2,
            textTransform: 'uppercase',
          }}>
            TRUST
          </span>
        </div>
      </div>

      {/* Threat badge */}
      <AnimatePresence>
        <motion.div
          key={threatLevel}
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 5 }}
          style={{
            padding: '3px 12px',
            borderRadius: 999,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 2,
            color: '#fff',
            background: color,
            boxShadow: isAlert ? `0 0 15px ${color}` : 'none',
          }}
        >
          {label}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
