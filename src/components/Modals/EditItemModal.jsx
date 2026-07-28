import { useState } from 'react';

// Modal genérico de edición para ingresos / gastos personales / gastos Easy Move.
// tipo: 'ingreso' | 'gasto'
export default function EditItemModal({ tipo, item, categorias, onClose, onSave }) {
  const [desc, setDesc] = useState(item.descripcion || '');
  const [monto, setMonto] = useState(item.monto);
  const [fecha, setFecha] = useState(item.fecha);
  const [cat, setCat] = useState(item.categoria || (categorias ? categorias[0] : ''));
  const [ingTipo, setIngTipo] = useState(item.tipo || 'efvo');
  const [fuente, setFuente] = useState(item.fuente || '');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function save() {
    if (!desc.trim() || !monto || Number(monto) <= 0) { setMsg('Completá descripción y monto.'); return; }
    setBusy(true);
    const updates = { descripcion: desc.trim(), monto: Number(monto), fecha };
    if (tipo === 'ingreso') { updates.tipo = ingTipo; updates.fuente = fuente; }
    else { updates.categoria = cat; }
    try {
      await onSave(updates);
      onClose();
    } catch (e) {
      setMsg('Error: ' + e.message);
    }
    setBusy(false);
  }

  const title = tipo === 'ingreso' ? 'Editar ingreso' : 'Editar gasto';

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box">
        <div className="modal-title">✏️ {title} <button className="modal-close" onClick={onClose}>×</button></div>
        <div className="fg"><label>Descripción</label><input type="text" value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
        {categorias && (
          <div className="fg">
            <label>Categoría</label>
            <select value={cat} onChange={(e) => setCat(e.target.value)}>
              {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}
        <div className="fg"><label>Fecha</label><input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></div>
        {tipo === 'ingreso' && (
          <div className="fg">
            <label>Tipo</label>
            <select value={ingTipo} onChange={(e) => setIngTipo(e.target.value)}>
              <option value="efvo">💵 Efectivo</option>
              <option value="tranf">🏦 Transferencia</option>
              <option value="term">💳 Terminal</option>
            </select>
          </div>
        )}
        {tipo === 'ingreso' && (
          <div className="fg"><label>Fuente</label><input type="text" value={fuente} onChange={(e) => setFuente(e.target.value)} /></div>
        )}
        <div className="fg"><label>Monto ($)</label><input type="number" min="0" step="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} /></div>
        <div className="auth-msg err">{msg}</div>
        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Cancelar</button>
          <button className="btn-save" disabled={busy} onClick={save}>Guardar cambios</button>
        </div>
      </div>
    </div>
  );
}
