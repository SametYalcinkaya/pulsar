export default function EvidenceReportModal({ open, onClose, pdfUrl, evidenceId }) {
    if (!open) return null;

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(2, 6, 23, 0.75)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 50,
                padding: 24,
            }}
        >
            <div
                style={{
                    width: 'min(960px, 90vw)',
                    height: 'min(720px, 90vh)',
                    background: 'var(--bg-card-strong)',
                    borderRadius: 16,
                    border: '1px solid var(--border)',
                    boxShadow: 'var(--shadow-1)',
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        borderBottom: '1px solid rgba(148,163,184,0.2)',
                    }}
                >
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        Rapor Onizleme
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-faint)', fontFamily: 'var(--mono)' }}>
                        {evidenceId}
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: '1px solid rgba(148,163,184,0.3)',
                            color: 'var(--text-muted)',
                            borderRadius: 8,
                            padding: '4px 10px',
                            cursor: 'pointer',
                        }}
                    >
                        Kapat
                    </button>
                </div>
                <div style={{ flex: 1 }}>
                    {pdfUrl ? (
                        <iframe
                            title="Evidence Report"
                            src={pdfUrl}
                            style={{ width: '100%', height: '100%', border: 'none' }}
                        />
                    ) : (
                        <div style={{ padding: 24, color: 'var(--text-muted)' }}>
                            PDF hazirlaniyor...
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
