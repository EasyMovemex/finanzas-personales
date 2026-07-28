import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useFinanzas } from '../../context/FinanzasContext';
import { sb } from '../../lib/supabaseClient';
import { useToast } from '../Common/Toast';
import { fmt, fmtD, hoy } from '../../utils/format';
import { getTasaISR } from '../../utils/constants';

export default function SatTab() {
  const { uid } = useAuth();
  const { ano, mes, gastosP, gastosE, cargarTodo } = useFinanzas();
  const toast = useToast();

  const [factEmitidas, setFactEmitidas] = useState([]);
  const factGastos = useMemo(() => [...gastosP, ...gastosE].filter((g) => g.facturado), [gastosP, gastosE]);

  const [fecha, setFecha] = useState(hoy());
  const [desc, setDesc] = useState('');
  const [metodo, setMetodo] = useState('mercadopago');
  const [montoSinIVA, setMontoSinIVA] = useState('');

  async function cargar() {
    if (!uid) return;
    const { data } = await sb.from('sat_facturas').select('*').eq('uid', uid).eq('ano', ano).eq('mes', mes).order('fecha', { ascending: false });
    setFactEmitidas(data || []);
  }
  useEffect(() => { cargar(); }, [uid, ano, mes]);

  async function addFactura() {
    const m = parseFloat(montoSinIVA);
    if (!desc.trim() || !m || m <= 0) { toast('Completá todos los campos'); return; }
    const iva = Math.round(m * 0.16 * 100) / 100;
    const total = Math.round((m + iva) * 100) / 100;
    const { data, error } = await sb.from('sat_facturas').insert({ uid, ano, mes, fecha: fecha || hoy(), descripcion: desc.trim(), metodo, monto_sin_iva: m, iva, total, tipo: 'emitida' }).select().single();
    if (error) { toast('Error: ' + error.message); return; }
    setFactEmitidas((prev) => [data, ...prev]);
    setDesc(''); setMontoSinIVA('');
    toast('✓ Factura registrada — IVA: ' + fmt(iva));
  }
  async function eliminar(id) {
    if (!window.confirm('¿Eliminar?')) return;
    await sb.from('sat_facturas').delete().eq('id', id);
    setFactEmitidas((prev) => prev.filter((f) => f.id !== id));
    toast('Eliminado');
  }

  const totalIng = factEmitidas.reduce((s, f) => s + Number(f.monto_sin_iva), 0);
  const ivaCobrado = factEmitidas.reduce((s, f) => s + Number(f.iva), 0);
  const ivaPagado = factGastos.reduce((s, f) => s + Number(f.monto) * 0.16, 0);
  const ivaNeto = Math.max(0, ivaCobrado - ivaPagado);
  const tasa = getTasaISR(totalIng);
  const isr = Math.round(totalIng * tasa * 100) / 100;
  const totalDeclarar = Math.round((ivaNeto + isr) * 100) / 100;
  const mesDecl = mes + 1 > 11 ? 0 : mes + 1;
  const anoDecl = mes + 1 > 11 ? ano + 1 : ano;
  const diasDecl = Math.round((new Date(anoDecl, mesDecl, 17) - new Date()) / 86400000);
  const ml = { mercadopago: '💳 MP', transferencia: '🏦 Transf.', efectivo: '💵 Efectivo' };
  const previewIVA = parseFloat(montoSinIVA) > 0 ? parseFloat(montoSinIVA) * 0.16 : 0;

  return (
    <div>
      <div className="add-form" style={{ marginBottom: '1.25rem' }}>
        <div className="add-form-title">📄 Registrar ingreso facturado</div>
        <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr auto' }}>
          <div className="fgl"><label>Fecha</label><input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></div>
          <div className="fgl"><label>Descripción / Cliente</label><input type="text" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Ej: Manicure..." /></div>
          <div className="fgl">
            <label>Método cobro</label>
            <select value={metodo} onChange={(e) => setMetodo(e.target.value)}>
              <option value="mercadopago">💳 Mercado Pago</option>
              <option value="transferencia">🏦 Transferencia</option>
              <option value="efectivo">💵 Efectivo</option>
            </select>
          </div>
          <div className="fgl"><label>Monto sin IVA ($)</label><input type="number" min="0" step="0.01" value={montoSinIVA} onChange={(e) => setMontoSinIVA(e.target.value)} placeholder="0.00" /></div>
          <button className="btn-add" style={{ background: 'linear-gradient(135deg,#b45309,var(--amber))' }} onClick={addFactura}>+ Registrar</button>
        </div>
        {previewIVA > 0 && (
          <div style={{ marginTop: 8, padding: '8px 12px', background: 'var(--surface2)', borderRadius: 'var(--r)', fontSize: 13, color: 'var(--text2)' }}>
            Sin IVA: <strong>{fmt(parseFloat(montoSinIVA))}</strong> + IVA 16%: <strong style={{ color: 'var(--amber)' }}>{fmt(previewIVA)}</strong> = Total: <strong style={{ color: 'var(--green)' }}>{fmt(parseFloat(montoSinIVA) + previewIVA)}</strong>
          </div>
        )}
      </div>

      <div className="metrics" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: '1.25rem' }}>
        <div className="mc m-green"><div className="mc-lbl">📥 Ingresos facturados</div><div className="mc-val green">{fmt(totalIng)}</div><div className="mc-sub">{factEmitidas.length} factura{factEmitidas.length !== 1 ? 's' : ''}</div></div>
        <div className="mc m-amber"><div className="mc-lbl">🧾 IVA cobrado (16%)</div><div className="mc-val amber">{fmt(ivaCobrado)}</div><div className="mc-sub">De tus ingresos</div></div>
        <div className="mc m-purple"><div className="mc-lbl">🧾 IVA pagado</div><div className="mc-val" style={{ color: 'var(--purple-light)' }}>{fmt(ivaPagado)}</div><div className="mc-sub">Gastos facturados</div></div>
        <div className="mc m-red"><div className="mc-lbl">⚠️ IVA neto a pagar</div><div className="mc-val red">{fmt(ivaNeto)}</div><div className="mc-sub">{diasDecl > 0 ? `Vence en ${diasDecl} días` : '¡Vence hoy!'}</div></div>
      </div>

      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div className="card-title">📊 ISR estimado (RESICO)</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>INGRESOS DEL MES</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--green)' }}>{fmt(totalIng)}</div>
          </div>
          <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>TASA ISR RESICO</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--amber)' }}>{Math.round(tasa * 100)}%</div>
          </div>
          <div style={{ background: 'rgba(244,63,94,.08)', border: '1px solid rgba(244,63,94,.3)', borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--red)', marginBottom: 4 }}>ISR A PAGAR</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--red)' }}>{fmt(isr)}</div>
          </div>
        </div>
        <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(244,63,94,.08)', borderRadius: 'var(--r)', fontSize: 13 }}>
          ⚠️ <strong>Total a declarar este mes:</strong> <strong style={{ color: 'var(--red)' }}>{fmt(totalDeclarar)}</strong> — antes del día 17
        </div>
      </div>

      <div className="section-title">📄 Facturas emitidas <span>{factEmitidas.length ? `(${factEmitidas.length})` : ''}</span></div>
      <div className="items-list">
        {!factEmitidas.length && <div className="empty">Sin facturas emitidas este mes</div>}
        {factEmitidas.map((f) => (
          <div className="item" key={f.id}>
            <div className="item-ico" style={{ background: 'var(--amber-bg)' }}>📄</div>
            <div className="item-info">
              <div className="item-name">{f.descripcion}</div>
              <div className="item-meta">{f.fecha} · {ml[f.metodo] || f.metodo} · IVA: {fmt(f.iva)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="item-amt" style={{ color: 'var(--green)' }}>+{fmtD(f.monto_sin_iva)}</div>
              <div style={{ fontSize: 10, color: 'var(--amber)' }}>c/IVA: {fmtD(f.total)}</div>
            </div>
            <button className="item-del" onClick={() => eliminar(f.id)}>🗑</button>
          </div>
        ))}
      </div>

      <div className="section-title" style={{ marginTop: '1rem' }}>🧾 Gastos facturados (IVA acreditable) <span>{factGastos.length ? `(${factGastos.length})` : ''}</span></div>
      <div className="items-list">
        {!factGastos.length && <div className="empty">Sin gastos facturados — marcalos al cargarlos</div>}
        {factGastos.map((g) => (
          <div className="item" key={g.id}>
            <div className="item-ico" style={{ background: 'rgba(139,92,246,.1)' }}>🧾</div>
            <div className="item-info">
              <div className="item-name">{g.descripcion}</div>
              <div className="item-meta">{g.fecha} · {g.categoria}{g.rfc ? ' · RFC:' + g.rfc : ''}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="item-amt" style={{ color: 'var(--red)' }}>-{fmtD(g.monto)}</div>
              <div style={{ fontSize: 10, color: 'rgba(139,92,246,.8)' }}>IVA acred.: {fmtD(g.monto * 0.16)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
