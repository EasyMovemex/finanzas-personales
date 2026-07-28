import { useState } from 'react';
import { fmt, fmtD } from '../../utils/format';

export default function PagoTarjetaModal({ tc, gastos, onClose, onConfirm }) {
  const [busy, setBusy] = useState(false);
  const total = gastos.reduce((s, g) => s + Number(g.monto), 0);
  const gastosP = gastos.filter((g) => (g.tipo_gasto || 'personal') === 'personal');
  const gastosN = gastos.filter((g) => g.tipo_gasto === 'negocio');

  async function confirmar() {
    setBusy(true);
    try { await onConfirm(); } finally { setBusy(false); onClose(); }
  }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box" style={{ maxWidth: 480 }}>
        <div className="modal-title">💳 Detalle del pago — {tc.nombre} <button className="modal-close" onClick={onClose}>×</button></div>
        <div style={{ marginBottom: '1rem', maxHeight: 300, overflowY: 'auto' }}>
          {gastosP.length > 0 && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', marginBottom: 6 }}>GASTOS PERSONALES</div>
              {gastosP.map((g) => (
                <div key={g.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                  <span>{g.descripcion}<span style={{ color: 'var(--text3)', fontSize: 11 }}> · {g.fecha}</span></span>
                  <span style={{ color: 'var(--red)', fontWeight: 600 }}>-{fmtD(g.monto)}</span>
                </div>
              ))}
            </>
          )}
          {gastosN.length > 0 && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', marginTop: 10, marginBottom: 6 }}>GASTOS NEGOCIO</div>
              {gastosN.map((g) => (
                <div key={g.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                  <span>{g.descripcion}<span style={{ color: 'var(--text3)', fontSize: 11 }}> · {g.fecha}</span></span>
                  <span style={{ color: 'var(--red)', fontWeight: 600 }}>-{fmtD(g.monto)}</span>
                </div>
              ))}
            </>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderTop: '1px solid var(--border)', marginBottom: '1rem' }}>
          <span style={{ fontWeight: 700 }}>TOTAL A PAGAR</span>
          <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--red)', fontFamily: 'DM Mono,monospace' }}>{fmt(total)}</span>
        </div>
        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Cancelar</button>
          <button className="btn-save" disabled={busy} onClick={confirmar}>✅ Confirmar pago</button>
        </div>
      </div>
    </div>
  );
}
