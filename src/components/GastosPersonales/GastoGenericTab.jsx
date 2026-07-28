import { useMemo, useState } from 'react';
import { useFinanzas } from '../../context/FinanzasContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../Common/Toast';
import { fmt, fmtD, hoy } from '../../utils/format';
import { calcularPeriodoGasto } from '../../utils/tarjetas';
import { CAT_ICONS_GP, CAT_ICONS_GE, CAT_COLORS, CAT_BORDER, MESES } from '../../utils/constants';
import EditItemModal from '../Modals/EditItemModal';

// Componente genérico compartido por "Gastos Personales" y "Gastos Easy Move" —
// en el archivo original eran dos bloques de código casi idénticos copiados y
// pegados (ese era justamente uno de los problemas señalados: duplicación).
// Acá se unifican en un solo componente parametrizado.
export default function GastoGenericTab({ tipo, categorias, colorBtn, colorAmt, nombreSeccion }) {
  const fin = useFinanzas();
  const { tieneSAT } = useAuth();
  const toast = useToast();
  const isPersonal = tipo === 'personal';
  const items = isPersonal ? fin.gastosP : fin.gastosE;
  const addFn = isPersonal ? fin.addGastoPersonal : fin.addGastoEasy;
  const updateFn = isPersonal ? fin.updateGastoP : fin.updateGastoE;
  const delFn = isPersonal ? fin.delGastoP : fin.delGastoE;
  const CAT_ICONS = isPersonal ? CAT_ICONS_GP : CAT_ICONS_GE;

  const [fecha, setFecha] = useState(hoy());
  const [desc, setDesc] = useState('');
  const [cat, setCat] = useState(categorias[0]);
  const [monto, setMonto] = useState('');
  const [metodo, setMetodo] = useState('efectivo');
  const [cuenta, setCuenta] = useState('');
  const [tarjetaId, setTarjetaId] = useState(fin.tarjetas[0]?.id || '');
  const [facturado, setFacturado] = useState(false);
  const [rfc, setRfc] = useState('');
  const [filtro, setFiltro] = useState('all');
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);

  const necesitaCuenta = metodo === 'transferencia' || metodo === 'debito';
  const necesitaTarjeta = metodo === 'credito';

  async function submit() {
    if (fin.mesCerrado) { toast('Este mes está cerrado. Reabrilo para editar.'); return; }
    const m = parseFloat(monto);
    if (!desc.trim() || !m || m <= 0) { toast('Completá descripción y monto'); return; }

    // Alerta de duplicado con gasto fijo (igual que el original)
    const similar = fin.fijos.find((f) => f.tipo === tipo && f.activo && (
      f.descripcion.toLowerCase().includes(desc.toLowerCase()) || desc.toLowerCase().includes(f.descripcion.toLowerCase())
    ));
    if (similar && !window.confirm(`⚠️ Ya tenés "${similar.descripcion}" como gasto fijo mensual ($${fmt(similar.monto)})\n\n¿Querés cargarlo igual como gasto adicional?`)) return;

    setBusy(true);
    try {
      if (metodo === 'credito') {
        const tc = fin.tarjetas.find((t) => t.id === tarjetaId);
        if (!tc) { toast('Seleccioná una tarjeta válida'); setBusy(false); return; }
        const diaGasto = new Date(fecha + 'T12:00:00').getDate();
        if (diaGasto >= tc.dia_cierre) {
          const { periodo } = await fin.addGastoConTarjeta({ tarjetaId, descripcion: desc.trim(), categoria: cat, monto: m, fecha, tipoGasto: isPersonal ? 'personal' : 'negocio' });
          toast('✓ Gasto con tarjeta registrado en ' + tc.nombre + ' — período ' + MESES[periodo.mesPago].slice(0, 3) + ' ' + periodo.anoPago);
        } else {
          await addFn({ descripcion: desc.trim(), categoria: cat, monto: m, fecha, metodo: 'tarjeta', cuenta: 'Tarjeta ' + tc.nombre });
          toast('✓ Gasto con tarjeta ' + tc.nombre + ' registrado directamente');
        }
      } else {
        let cuentaPago = 'Efectivo';
        if (metodo === 'transferencia' || metodo === 'debito') cuentaPago = cuenta || (metodo === 'debito' ? 'Débito' : 'Transferencia');
        const extra = tieneSAT ? { facturado, rfc: facturado ? (rfc.trim() || null) : null } : {};
        await addFn({ descripcion: desc.trim(), categoria: cat, monto: m, fecha, metodo, cuenta: cuentaPago, ...extra });
        toast('✓ ' + nombreSeccion + ' guardado');
      }
      setDesc(''); setMonto(''); setFacturado(false); setRfc('');
    } catch (e) {
      toast('Error: ' + e.message);
    }
    setBusy(false);
  }

  async function eliminar(id) {
    if (fin.mesCerrado) { toast('Este mes está cerrado. Reabrilo para editar.'); return; }
    if (!window.confirm('¿Eliminar?')) return;
    await delFn(id);
    toast('Eliminado');
  }

  const cats = useMemo(() => [...new Set(items.map((g) => g.categoria))], [items]);
  const filtrados = filtro === 'all' ? items : items.filter((g) => g.categoria === filtro);
  const total = items.reduce((s, g) => s + Number(g.monto), 0);

  return (
    <div>
      <div className="add-form">
        <div className="add-form-title">+ Agregar {nombreSeccion.toLowerCase()}</div>
        <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr auto' }}>
          <div className="fgl"><label>Fecha</label><input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></div>
          <div className="fgl"><label>Descripción</label><input type="text" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Ej: Supermercado..." /></div>
          <div className="fgl">
            <label>Categoría</label>
            <select value={cat} onChange={(e) => setCat(e.target.value)}>
              {categorias.map((c) => <option key={c} value={c}>{CAT_ICONS[c] || '📦'} {c}</option>)}
            </select>
          </div>
          <div className="fgl"><label>Monto ($)</label><input type="number" min="0" step="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="0.00" /></div>
          <div className="fgl">
            <label>Método</label>
            <select value={metodo} onChange={(e) => setMetodo(e.target.value)}>
              <option value="efectivo">💵 Efectivo</option>
              <option value="debito">💳 Tarjeta débito</option>
              <option value="credito">💳 Tarjeta crédito</option>
              <option value="transferencia">🏦 Transferencia</option>
            </select>
          </div>
          {necesitaCuenta && (
            <div className="fgl">
              <label>Cuenta</label>
              <select value={cuenta} onChange={(e) => setCuenta(e.target.value)}>
                <option value="">-- Seleccionar --</option>
                {fin.cuentas.filter((c) => c !== 'Efectivo').map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}
          {necesitaTarjeta && (
            <div className="fgl">
              <label>¿Cuál tarjeta?</label>
              <select value={tarjetaId} onChange={(e) => setTarjetaId(e.target.value)}>
                {!fin.tarjetas.length && <option value="">Sin tarjetas configuradas</option>}
                {fin.tarjetas.map((t) => <option key={t.id} value={t.id}>💳 {t.nombre}</option>)}
              </select>
            </div>
          )}
          <button className={'btn-add ' + colorBtn} disabled={busy || fin.mesCerrado} onClick={submit}>+ Agregar</button>
        </div>
        {tieneSAT && (
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
              <input type="checkbox" checked={facturado} onChange={(e) => setFacturado(e.target.checked)} style={{ width: 15, height: 15, accentColor: 'var(--amber)' }} />
              <span style={{ color: 'var(--amber)' }}>🧾 Gasto facturado (acredita IVA)</span>
            </label>
            {facturado && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--text2)' }}>RFC:</span>
                <input type="text" value={rfc} onChange={(e) => setRfc(e.target.value)} placeholder="XAXX010101000" style={{ height: 30, width: 160, border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '0 8px', background: 'var(--surface2)', color: 'var(--text)', fontSize: 12 }} />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="section-title">{nombreSeccion} <span>{items.length ? `(${items.length}) · Total ${fmt(total)}` : ''}</span></div>
      <div className="filter-row">
        <button className={'fbtn' + (filtro === 'all' ? ' active' : '')} onClick={() => setFiltro('all')}>Todos</button>
        {cats.map((c) => (
          <button key={c} className={'fbtn' + (filtro === c ? ' active' : '')} onClick={() => setFiltro(c)}>{CAT_ICONS[c] || '📦'} {c}</button>
        ))}
      </div>
      <div className="items-list">
        {!filtrados.length && <div className="empty">No hay {nombreSeccion.toLowerCase()} este mes.</div>}
        {filtrados.map((g) => {
          const bg = CAT_COLORS[g.categoria] || CAT_COLORS.default;
          const br = CAT_BORDER[g.categoria] || CAT_BORDER.default;
          const metLabel = g.metodo && g.metodo !== 'efectivo' ? (g.metodo === 'debito' ? '💳Déb' : g.metodo === 'credito' || g.metodo === 'tarjeta' ? '💳Créd' : g.metodo === 'transferencia' ? '🏦Transf' : '') : '';
          return (
            <div className="item" key={g.id} style={{ borderLeft: `3px solid ${br}` }}>
              <div className="item-ico" style={{ background: bg }}>{CAT_ICONS[g.categoria] || '📦'}</div>
              <div className="item-info">
                <div className="item-name">{g.descripcion}{metLabel && <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 4, border: `1px solid ${br}`, marginLeft: 4, background: bg }}>{metLabel}</span>}</div>
                <div className="item-meta">{g.categoria} · {g.fecha}{g.cuenta && g.cuenta !== 'Efectivo' ? ' · ' + g.cuenta : ''}</div>
              </div>
              <div className="item-amt" style={{ color: colorAmt }}>-{fmtD(g.monto)}</div>
              <button className="item-del" style={{ color: 'var(--text3)' }} disabled={fin.mesCerrado} onClick={() => setEditing(g)}>✏️</button>
              <button className="item-del" disabled={fin.mesCerrado} onClick={() => eliminar(g.id)}>🗑</button>
            </div>
          );
        })}
      </div>

      {editing && (
        <EditItemModal
          tipo="gasto"
          item={editing}
          categorias={categorias}
          onClose={() => setEditing(null)}
          onSave={async (updates) => { await updateFn(editing.id, updates); toast('✓ Guardado'); }}
        />
      )}
    </div>
  );
}
