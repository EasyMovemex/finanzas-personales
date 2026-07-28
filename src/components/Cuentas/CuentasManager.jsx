import { useEffect, useState } from 'react';
import { useFinanzas } from '../../context/FinanzasContext';
import { useToast } from '../Common/Toast';

// Gestión de cuentas configurables (requisito nuevo): antes "cuentas" era un
// array hardcodeado en JS (`let cuentas=['Efectivo','NU','Klar',...]`). Ahora
// vive en la tabla Supabase "cuentas" (uid, nombre, activo) y se puede crear,
// renombrar y dar de baja desde acá. Si la tabla todavía no existe en el
// proyecto de Supabase (falta correr la migración), se avisa y se usa una
// lista por defecto en memoria para que la app siga funcionando.
export default function CuentasManager({ onClose }) {
  const { addCuenta, renameCuenta, deleteCuenta, listCuentasRaw, cuentasTablaDisponible } = useFinanzas();
  const [raw, setRaw] = useState([]);
  const [nuevo, setNuevo] = useState('');
  const [editId, setEditId] = useState(null);
  const [editNombre, setEditNombre] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  async function refrescar() {
    const data = await listCuentasRaw();
    setRaw(data);
  }
  useEffect(() => { refrescar(); }, []);

  async function crear() {
    if (!nuevo.trim()) return;
    setBusy(true);
    try { await addCuenta(nuevo.trim()); setNuevo(''); await refrescar(); toast('✓ Cuenta creada'); }
    catch (e) { toast('Error: ' + e.message); }
    setBusy(false);
  }
  async function guardarEdit(id) {
    if (!editNombre.trim()) return;
    try { await renameCuenta(id, editNombre.trim()); setEditId(null); await refrescar(); toast('✓ Cuenta renombrada'); }
    catch (e) { toast('Error: ' + e.message); }
  }
  async function eliminar(id) {
    if (!window.confirm('¿Dar de baja esta cuenta? (los movimientos ya cargados no se borran)')) return;
    try { await deleteCuenta(id); await refrescar(); toast('Cuenta dada de baja'); }
    catch (e) { toast('Error: ' + e.message); }
  }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box">
        <div className="modal-title">🏦 Cuentas <button className="modal-close" onClick={onClose}>×</button></div>

        {!cuentasTablaDisponible && (
          <div style={{ background: 'var(--amber-bg)', border: '1px solid rgba(245,158,11,.4)', borderRadius: 'var(--r)', padding: '10px 12px', fontSize: 12, color: 'var(--amber)', marginBottom: 12 }}>
            ⚠️ Todavía no existe la tabla <code>cuentas</code> en tu Supabase. Corré la migración
            en <code>supabase/migrations/002_cuentas.sql</code> (ver README) para poder crear/editar
            cuentas de verdad. Mientras tanto se usa una lista por defecto.
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <input type="text" value={nuevo} onChange={(e) => setNuevo(e.target.value)} placeholder="Nueva cuenta (ej: Nu, BBVA...)"
            style={{ flex: 1, height: 38, border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '0 10px', background: 'var(--surface2)', color: 'var(--text)' }} />
          <button className="btn-save" disabled={busy} onClick={crear}>+ Crear</button>
        </div>

        <div style={{ maxHeight: 320, overflowY: 'auto' }}>
          <div className="item" style={{ marginBottom: 6 }}>
            <div className="item-ico" style={{ background: 'var(--green-bg)' }}>💵</div>
            <div className="item-info"><div className="item-name">Efectivo</div><div className="item-meta">Cuenta fija del sistema</div></div>
          </div>
          {raw.filter((c) => c.activo !== false).map((c) => (
            <div className="item" key={c.id} style={{ marginBottom: 6 }}>
              <div className="item-ico" style={{ background: 'var(--surface2)' }}>🏦</div>
              <div className="item-info">
                {editId === c.id ? (
                  <input autoFocus type="text" value={editNombre} onChange={(e) => setEditNombre(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') guardarEdit(c.id); }}
                    style={{ height: 30, border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '0 8px', background: 'var(--surface2)', color: 'var(--text)', width: '100%' }} />
                ) : (
                  <div className="item-name">{c.nombre}</div>
                )}
              </div>
              {editId === c.id ? (
                <button className="item-del" style={{ color: 'var(--green)' }} onClick={() => guardarEdit(c.id)}>✓</button>
              ) : (
                <button className="item-del" style={{ color: 'var(--text3)' }} onClick={() => { setEditId(c.id); setEditNombre(c.nombre); }}>✏️</button>
              )}
              <button className="item-del" onClick={() => eliminar(c.id)}>🗑</button>
            </div>
          ))}
          {!raw.length && cuentasTablaDisponible && <div className="empty">Todavía no creaste ninguna cuenta.</div>}
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}
