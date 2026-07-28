import { useState } from 'react';
import { CATS_TC } from '../../utils/constants';

export default function EditGastoTarjetaModal({ gasto, onClose, onSave }) {
  const [desc, setDesc] = useState(gasto.descripcion || '');
  const [cat, setCat] = useState(gasto.categoria || CATS_TC[0]);
  const [monto, setMonto] = useState(gasto.monto);
  const [fecha, setFecha] = useState(gasto.fecha);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function save() {
    if (!desc.trim() || !monto || Number(monto) <= 0 || !fecha) { setMsg('Completá todos los campos'); return; }
    setBusy(true);
    try {
      await onSave({ descripcion: desc.trim(), categoria: cat, monto: Number(monto), fecha });
      onClose();
    } catch (e) { setMsg('Error: ' + e.message); }
    setBusy(false);
  }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box">
        <div className="modal-title">✏️ Editar gasto de tarjeta <button className="modal-close" onClick={onClose}>×</button></div>
        <div className="fg"><label>Descripción</label><input type="text" value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
        <div className="fg">
          <label>Categoría</label>
          <select value={cat} onChange={(e) => setCat(e.target.value)}>
            {CATS_TC.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="fg"><label>Monto ($)</label><input type="number" min="0" step="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} /></div>
        <div className="fg"><label>Fecha</label><input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></div>
        <div className="auth-msg err">{msg}</div>
        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Cancelar</button>
          <button className="btn-save" disabled={busy} onClick={save}>Guardar cambios</button>
        </div>
      </div>
    </div>
  );
}
