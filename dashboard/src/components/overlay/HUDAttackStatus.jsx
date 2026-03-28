import { motion, AnimatePresence } from 'framer-motion';

const ATTACK_LABELS = {
  JAMMING: { text: 'JAMMING SALDIRISI AKTİF', color: '#ef4444', desc: 'Sinyal gücü düşürülüyor, uydular kaybediliyor' },
  SPOOFING: { text: 'SPOOFING SALDIRISI AKTİF', color: '#f97316', desc: 'Sahte sinyaller gönderiliyor, konum kaydırılıyor' },
  MEACONING: { text: 'MEACONING SALDIRISI AKTİF', color: '#f59e0b', desc: 'Sinyaller geciktirilerek tekrar yayınlanıyor' },
  COMBINED: { text: 'ÇOKLU SALDIRI AKTİF', color: '#7c3aed', desc: 'Birden fazla saldırı türü eşzamanlı çalışıyor' },
};

export default function HUDAttackStatus({ attackType }) {
  return (
    <AnimatePresence>
      {attackType && ATTACK_LABELS[attackType.toUpperCase()] && (
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 30 }}
          transition={{ duration: 0.3 }}
          style={{
            padding: '10px 18px',
            background: 'rgba(0,0,0,0.8)',
            borderRadius: 12,
            border: `1px solid ${ATTACK_LABELS[attackType.toUpperCase()].color}`,
            boxShadow: `0 0 20px ${ATTACK_LABELS[attackType.toUpperCase()].color}30`,
            backdropFilter: 'blur(10px)',
          }}
        >
          <motion.div
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            style={{
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: 2,
              color: ATTACK_LABELS[attackType.toUpperCase()].color,
              marginBottom: 4,
            }}
          >
            ⚠ {ATTACK_LABELS[attackType.toUpperCase()].text}
          </motion.div>
          <div style={{
            fontSize: 10,
            color: 'var(--text-muted)',
            maxWidth: 240,
          }}>
            {ATTACK_LABELS[attackType.toUpperCase()].desc}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
