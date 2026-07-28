import { useState } from 'react';
import { fmt } from '../../utils/format';

export default function PagarFijoModal({ fijo, cuentas, tarjetas, onClose, onConfirm }) {
  const [metodo, setMetodo] = useState('efectivo');
  const [cuentaSel, setCuentaSel] = useState('');
  const [busy, setBusy] = useState(false);

  async function confirmar() {
    setBusy(true);
    let metodoFinal = metodo;
    let cuentaPago = '';
    if (metodo === 'efectivo') cuentaPago = 'Efectivo';
    else if (cuentaSel && cuentaSel.startsWith('TC:')) { metodoFinal = 'credito'; cuentaPago = cuentaSel.replace('TC:', ''); }
    else cuentaPago = cuentaSel || metodo;
    try {
      await onConfirm({ metodo: metodoFinal, cuenta: cuentaPago });
      onClose();
    } finally { setBusy(false); }
  }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box" style={{ maxWidth: 360 }}>
        <div className="modal-title">💸 Pagar: {fijo.descripcion} <button className="modal-close" onClick={onClose}>×</button></div>
        <div style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 14 }}>{fmt(fijo.monto)} — ¿Con qué pagaste?</div>
        <div className="fg">
          <label>Método de pago</label>
          <select value={metodo} onChange={(e) => setMetodo(e.target.value)}>
            <option value="efectivo">💵 Efectivo</option>
            <option value="debito">💳 Tarjeta débito</option>
            <option value="transferencia">🏦 Transferencia</option>
            <option value="credito">💳 Tarjeta crédito</option>
          </select>
        </div>
        {metodo !== 'efectivo' && (
          <div className="fg">
            <label>Cuenta / Tarjeta</label>
            <select value={cuentaSel} onChange={(e) => setCuentaSel(e.target.value)}>
              {cuentas.filter((c) => c !== 'Efectivo').map((c) => <option key={c} value={c}>{c}</option>)}
              {tarjetas.map((t) => <option key={t.id} value={'TC:' + t.id}>💳 {t.nombre}</option>)}
            </select>
          </div>
        )}
        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Cancelar</button>
          <button className="btn-save" disabled={busy} onClick={confirmar}>✅ Confirmar pago</button>
        </div>
      </div>
    </div>
  );
}
