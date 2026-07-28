import { useState } from 'react';
import { useFinanzas } from '../../context/FinanzasContext';
import { useToast } from '../Common/Toast';
import { fmt, fmtD } from '../../utils/format';
import { CATS_GP, CATS_GE } from '../../utils/constants';
import PagarFijoModal from '../Modals/PagarFijoModal';

export default function FijosTab() {
  const { fijos, fijosPagadosMes, tarjetas, getCuentasDisponibles, addFijo, toggleFijo, delFijo, confirmarPagoFijo } = useFinanzas();
  const toast = useToast();

  const [desc, setDesc] = useState('');
  const [tipo, setTipo] = useState('personal');
  const [cat, setCat] = useState(CATS_GP[0]);
  const [monto, setMonto] = useState('');
  const [diaVenc, setDiaVenc] = useState('');
  const [pagando, setPagando] = useState(null);

  const categoriasDisponibles = tipo === 'personal' ? CATS_GP : CATS_GE;

  async function submit() {
    const m = parseFloat(monto);
    if (!desc.trim() || !m || m <= 0) { toast('Completá descripción y monto'); return; }
    const dv = parseInt(diaVenc) || null;
    try {
      await addFijo({ descripcion: desc.trim(), tipo, categoria: cat, monto: m, dia_vencimiento: dv });
      setDesc(''); setMonto(''); setDiaVenc('');
      toast('✓ Gasto fijo guardado');
    } catch (e) { toast('Error: ' + e.message); }
  }

  const hoyRF = new Date(); hoyRF.setHours(0, 0, 0, 0);

  return (
    <div>
      <div className="add-form">
        <div className="add-form-title">📌 Agregar gasto fijo mensual</div>
        <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr auto' }}>
          <div className="fgl"><label>Descripción</label><input type="text" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Ej: Renta, Netflix..." /></div>
          <div className="fgl">
            <label>Tipo</label>
            <select value={tipo} onChange={(e) => { setTipo(e.target.value); setCat(e.target.value === 'personal' ? CATS_GP[0] : CATS_GE[0]); }}>
              <option value="personal">👤 Personal</option>
              <option value="easy">🚚 Easy Move</option>
            </select>
          </div>
          <div className="fgl">
            <label>Categoría</label>
            <select value={cat} onChange={(e) => setCat(e.target.value)}>
              {categoriasDisponibles.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="fgl"><label>Monto ($)</label><input type="number" min="0" step="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="0.00" /></div>
          <div className="fgl"><label>Día vencimiento</label><input type="number" min="1" max="31" value={diaVenc} onChange={(e) => setDiaVenc(e.target.value)} placeholder="Ej: 5" /></div>
          <button className="btn-add amber" onClick={submit}>+ Agregar</button>
        </div>
      </div>
      <div style={{ background: 'var(--amber-bg)', border: '1px solid var(--amber)', borderRadius: 'var(--r)', padding: '10px 14px', marginBottom: '1rem', fontSize: 13, color: 'var(--amber)' }}>
        💡 Los gastos fijos se agregan automáticamente al inicio de cada mes cuando abrís la app.
      </div>
      <div className="section-title">Gastos fijos activos <span>{fijos.length ? `(${fijos.length})` : ''}</span></div>
      <div className="items-list">
        {!fijos.length && <div className="empty">No tenés gastos fijos. Agregá uno arriba.</div>}
        {fijos.map((f) => {
          let vb = null;
          if (f.dia_vencimiento && f.activo) {
            const dv = f.dia_vencimiento;
            const fv = new Date(hoyRF.getFullYear(), hoyRF.getMonth(), dv);
            if (fv < hoyRF) fv.setMonth(fv.getMonth() + 1);
            const dias = Math.round((fv - hoyRF) / 86400000);
            const cv = dias <= 3 ? 'var(--red)' : dias <= 7 ? 'var(--amber)' : 'var(--text2)';
            vb = <span style={{ fontSize: 10, color: cv, marginLeft: 6, fontWeight: 600 }}>{dias === 0 ? '🚨 HOY' : dias === 1 ? '⚠️ Mañana' : `📅 Día ${dv} (en ${dias}d)`}</span>;
          }
          const pi = fijosPagadosMes[f.id];
          const yp = pi && pi.pagado, mp = pi ? pi.metodo : '';
          return (
            <div className="item" key={f.id} style={{ opacity: f.activo ? 1 : 0.5, ...(yp ? { background: 'rgba(93,202,165,.08)', border: '1px solid rgba(93,202,165,.25)' } : {}) }}>
              <div className="item-ico" style={{ background: yp ? 'rgba(93,202,165,.15)' : 'var(--amber-bg)' }}>{yp ? '✅' : '📌'}</div>
              <div className="item-info">
                <div className="item-name">{f.descripcion} <span className="fijo-badge">{f.tipo === 'personal' ? 'Personal' : 'Negocio'}</span>{vb}</div>
                <div className="item-meta">{f.categoria} · {yp ? <span style={{ color: 'var(--green)' }}>✓ Pagado{mp ? ' · ' + mp : ''}</span> : (f.activo ? 'Pendiente' : 'Pausado')}{f.dia_vencimiento ? ' · Vence día ' + f.dia_vencimiento : ''}</div>
              </div>
              <div className="item-amt" style={{ color: yp ? 'var(--green)' : 'var(--amber)' }}>-{fmtD(f.monto)}/mes</div>
              {f.activo && !yp && <button className="item-del" style={{ color: 'var(--green)', fontSize: 11 }} onClick={() => setPagando(f)}>💸 Pagar</button>}
              <button className="item-del" onClick={async () => { await toggleFijo(f.id, f.activo); toast(f.activo ? 'Gasto fijo pausado' : 'Gasto fijo reactivado'); }}>{f.activo ? '⏸' : '▶️'}</button>
              <button className="item-del" onClick={async () => { if (window.confirm('¿Eliminar este gasto fijo?')) { await delFijo(f.id); toast('Eliminado'); } }}>🗑</button>
            </div>
          );
        })}
      </div>

      {pagando && (
        <PagarFijoModal
          fijo={pagando}
          cuentas={getCuentasDisponibles()}
          tarjetas={tarjetas}
          onClose={() => setPagando(null)}
          onConfirm={async ({ metodo, cuenta }) => {
            await confirmarPagoFijo({ id: pagando.id, desc: pagando.descripcion, monto: pagando.monto, tipo: pagando.tipo, metodo, cuenta });
            toast('✓ ' + pagando.descripcion + ' pagado con ' + metodo);
          }}
        />
      )}
    </div>
  );
}
