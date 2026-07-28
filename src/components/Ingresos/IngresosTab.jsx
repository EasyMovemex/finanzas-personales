import { useState } from 'react';
import { useFinanzas } from '../../context/FinanzasContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../Common/Toast';
import { fmt, fmtD, hoy } from '../../utils/format';
import EditItemModal from '../Modals/EditItemModal';

export default function IngresosTab() {
  const { ingresos, addIngreso, updateIngreso, delIngreso, cuentas, mesCerrado } = useFinanzas();
  const { fuenteIngresoNegocio } = useAuth();
  const toast = useToast();

  const [ingTipo, setIngTipo] = useState('efvo');
  const [fecha, setFecha] = useState(hoy());
  const [fuente, setFuente] = useState('Personal');
  const [desc, setDesc] = useState('');
  const [monto, setMonto] = useState('');
  const [cuenta, setCuenta] = useState(cuentas.find((c) => c !== 'Efectivo') || 'NU');
  const [filtro, setFiltro] = useState('all');
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    const m = parseFloat(monto);
    if (!m || m <= 0) { toast('Ingresá un monto válido'); return; }
    let cuentaFinal = 'Efectivo';
    if (ingTipo === 'tranf') cuentaFinal = cuenta || 'Transferencia';
    else if (ingTipo === 'term') cuentaFinal = 'Terminal';
    setBusy(true);
    try {
      await addIngreso({ fecha: fecha || hoy(), fuente, tipo: ingTipo, descripcion: desc.trim(), monto: m, cuenta: cuentaFinal });
      setDesc(''); setMonto('');
      toast('✓ Ingreso guardado');
    } catch (e) { toast('Error: ' + e.message); }
    setBusy(false);
  }

  async function eliminar(id) {
    if (!window.confirm('¿Eliminar?')) return;
    await delIngreso(id);
    toast('Eliminado');
  }

  let filtrados = ingresos;
  if (filtro === 'Personal' || filtro === 'Negocio') filtrados = ingresos.filter((i) => i.fuente === filtro);
  else if (filtro === 'efvo') filtrados = ingresos.filter((i) => i.tipo === 'efvo');
  else if (filtro === 'tranf') filtrados = ingresos.filter((i) => i.tipo === 'tranf');

  const totIng = ingresos.reduce((s, i) => s + Number(i.monto), 0);

  return (
    <div>
      <div className="add-form">
        <div className="add-form-title">+ Agregar ingreso</div>
        <div className="tipo-toggle">
          <button className={'tipo-btn' + (ingTipo === 'efvo' ? ' a-efvo' : '')} onClick={() => setIngTipo('efvo')}>💵 Efectivo</button>
          <button className={'tipo-btn' + (ingTipo === 'tranf' ? ' a-tranf' : '')} onClick={() => setIngTipo('tranf')}>🏦 Transferencia</button>
          <button className={'tipo-btn' + (ingTipo === 'term' ? ' a-tranf' : '')} onClick={() => setIngTipo('term')}>💳 Terminal</button>
        </div>
        <div className="form-row cols5">
          <div className="fgl"><label>Fecha</label><input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></div>
          <div className="fgl">
            <label>Fuente</label>
            <select value={fuente} onChange={(e) => setFuente(e.target.value)}>
              <option value="Personal">👤 Personal</option>
              <option value={fuenteIngresoNegocio}>🚚 {fuenteIngresoNegocio}</option>
              <option value="Otros">📦 Otros</option>
            </select>
          </div>
          <div className="fgl"><label>Descripción</label><input type="text" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Opcional" /></div>
          <div className="fgl"><label>Monto ($)</label><input type="number" min="0" step="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="0.00" /></div>
          {ingTipo === 'tranf' && (
            <div className="fgl">
              <label>A qué cuenta</label>
              <select value={cuenta} onChange={(e) => setCuenta(e.target.value)}>
                {cuentas.filter((c) => c !== 'Efectivo').map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}
          <button className="btn-add" disabled={busy || mesCerrado} onClick={submit}>+ Agregar</button>
        </div>
      </div>

      <div className="section-title">Todos los ingresos <span>{ingresos.length ? `(${ingresos.length}) · Total ${fmt(totIng)}` : ''}</span></div>
      <div className="filter-row">
        <button className={'fbtn' + (filtro === 'all' ? ' active' : '')} onClick={() => setFiltro('all')}>Todos</button>
        <button className={'fbtn' + (filtro === 'Personal' ? ' active' : '')} onClick={() => setFiltro('Personal')}>👤 Personal</button>
        <button className={'fbtn' + (filtro === fuenteIngresoNegocio ? ' active' : '')} onClick={() => setFiltro(fuenteIngresoNegocio)}>🚚 {fuenteIngresoNegocio}</button>
        <button className={'fbtn' + (filtro === 'efvo' ? ' active' : '')} onClick={() => setFiltro('efvo')}>💵 Efectivo</button>
        <button className={'fbtn' + (filtro === 'tranf' ? ' active' : '')} onClick={() => setFiltro('tranf')}>🏦 Transf.</button>
      </div>
      <div className="items-list">
        {!filtrados.length && <div className="empty">No hay ingresos. Agregá uno arriba.</div>}
        {filtrados.map((i) => (
          <div className="item" key={i.id}>
            <div className="item-ico" style={{ background: i.tipo === 'efvo' ? 'var(--green-bg)' : 'var(--blue-bg)' }}>{i.fuente === 'Personal' ? '👤' : '🚚'}</div>
            <div className="item-info">
              <div className="item-name">{i.fuente}{i.descripcion ? ' — ' + i.descripcion : ''}</div>
              <div className="item-meta">{i.fecha} · {i.tipo === 'efvo' ? '💵 Efectivo' : i.tipo === 'term' ? '💳 Terminal' : '🏦 ' + (i.cuenta || 'Transferencia')}</div>
            </div>
            <div className="item-amt" style={{ color: 'var(--green)' }}>+{fmtD(i.monto)}</div>
            <button className="item-del" style={{ color: 'var(--text3)' }} disabled={mesCerrado} onClick={() => setEditing(i)}>✏️</button>
            <button className="item-del" disabled={mesCerrado} onClick={() => eliminar(i.id)}>🗑</button>
          </div>
        ))}
      </div>

      {editing && (
        <EditItemModal
          tipo="ingreso"
          item={editing}
          onClose={() => setEditing(null)}
          onSave={async (updates) => { await updateIngreso(editing.id, updates); toast('✓ Guardado'); }}
        />
      )}
    </div>
  );
}
