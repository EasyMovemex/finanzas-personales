import { useMemo, useState } from 'react';
import { Doughnut, Bar } from 'react-chartjs-2';
import { useFinanzas } from '../../context/FinanzasContext';
import { useToast } from '../Common/Toast';
import { fmt, fmtD } from '../../utils/format';
import { CAT_ICONS_GP, CAT_COLORS, CAT_BORDER } from '../../utils/constants';
import CuentasManager from '../Cuentas/CuentasManager';
import '../../lib/chartSetup';
import { chartTickColor, chartGridColor } from '../../lib/chartSetup';

export default function ResumenTab() {
  const {
    ingresos, gastosP, gastosE, ahorros, objetivos, movsTransfer,
    saveObjetivo, calcularSaldosCuentas, getCuentasDisponibles, addTransferInterna, delTransferInterna,
  } = useFinanzas();
  const toast = useToast();

  const totIng = useMemo(() => ingresos.reduce((s, i) => s + Number(i.monto), 0), [ingresos]);
  const totGP = useMemo(() => gastosP.reduce((s, g) => s + Number(g.monto), 0), [gastosP]);
  const totGE = useMemo(() => gastosE.reduce((s, g) => s + Number(g.monto), 0), [gastosE]);
  const balance = totIng - totGP - totGE;

  // ── Objetivos ──
  const [metaIng, setMetaIng] = useState(objetivos.ing || '');
  const [metaRenta, setMetaRenta] = useState(objetivos.renta || '');
  const progIng = objetivos.ing > 0 ? Math.min(100, Math.round((totIng / objetivos.ing) * 100)) : 0;

  async function guardarObjIng() {
    const v = parseFloat(metaIng) || 0;
    await saveObjetivo({ ing: v });
    toast('✓ Meta guardada');
  }
  async function guardarObjRenta() {
    const v = parseFloat(metaRenta) || 0;
    await saveObjetivo({ renta: v });
    toast('✓ Renta guardada');
  }

  // ── Regla de reparto configurable por mes (ej. 30/10/50 comida/otros/ahorro) ──
  const [pctGastos, setPctGastos] = useState(objetivos.pct_gastos ?? 30);
  const [pctOtros, setPctOtros] = useState(objetivos.pct_fijos ?? 10);
  const [pctAhorro, setPctAhorro] = useState(objetivos.pct_ahorro ?? 50);
  const sumaPct = (Number(pctGastos) || 0) + (Number(pctOtros) || 0) + (Number(pctAhorro) || 0);
  async function guardarRegla() {
    await saveObjetivo({ pct_gastos: Number(pctGastos) || 0, pct_fijos: Number(pctOtros) || 0, pct_ahorro: Number(pctAhorro) || 0 });
    toast('✓ Regla de reparto guardada');
  }
  const [showCuentas, setShowCuentas] = useState(false);

  // ── Gráfico dona: distribución del mes ──
  const donaData = useMemo(() => {
    const labels = [], data = [], colors = [];
    if (totGP > 0) { labels.push('Gastos personales'); data.push(totGP); colors.push('#E24B4A'); }
    if (totGE > 0) { labels.push('Gastos Easy Move'); data.push(totGE); colors.push('#378ADD'); }
    const ahorroEstim = Math.max(0, balance);
    if (ahorroEstim > 0) { labels.push('Disponible / ahorro'); data.push(ahorroEstim); colors.push('#5DCAA5'); }
    if (!data.length) { labels.push('Sin movimientos'); data.push(1); colors.push('#a09c97'); }
    return { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 0 }] };
  }, [totGP, totGE, balance]);

  // ── Gráfico: ingresos por día (top 10) ──
  const ingDiaData = useMemo(() => {
    const porDia = {};
    ingresos.forEach((i) => { porDia[i.fecha] = (porDia[i.fecha] || 0) + Number(i.monto); });
    const top = Object.entries(porDia).sort((a, b) => b[1] - a[1]).slice(0, 10).sort((a, b) => a[0].localeCompare(b[0]));
    return {
      labels: top.map(([f]) => f.slice(8, 10) + '/' + f.slice(5, 7)),
      datasets: [{ label: 'Ingresos', data: top.map(([, v]) => v), backgroundColor: '#5DCAA5', borderRadius: 4 }],
    };
  }, [ingresos]);

  // ── Gastos por categoría (personales + easy juntos) ──
  const gastosPorCat = useMemo(() => {
    const map = {};
    [...gastosP, ...gastosE].forEach((g) => {
      map[g.categoria] = (map[g.categoria] || 0) + Number(g.monto);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [gastosP, gastosE]);
  const totalGastosCat = gastosPorCat.reduce((s, [, v]) => s + v, 0);

  // ── Saldo por cuenta ──
  const saldos = calcularSaldosCuentas();
  const cuentasList = Object.keys(saldos).length ? Object.entries(saldos) : [['Efectivo', 0]];

  // ── Transferencia entre cuentas ──
  const cuentasDisponibles = getCuentasDisponibles();
  const [trOrigen, setTrOrigen] = useState('Efectivo');
  const [trDestino, setTrDestino] = useState(cuentasDisponibles[1] || 'Efectivo');
  const [trMonto, setTrMonto] = useState('');
  const [trDesc, setTrDesc] = useState('');
  const [trBusy, setTrBusy] = useState(false);

  async function moverDinero() {
    const m = parseFloat(trMonto);
    if (!m || m <= 0) { toast('Ingresá un monto válido'); return; }
    if (trOrigen === trDestino) { toast('Origen y destino no pueden ser iguales'); return; }
    setTrBusy(true);
    try {
      await addTransferInterna({ origen: trOrigen, destino: trDestino, monto: m, descripcion: trDesc.trim() });
      setTrMonto(''); setTrDesc('');
      toast('✓ Transferencia registrada');
    } catch (e) { toast('Error: ' + e.message); }
    setTrBusy(false);
  }
  async function eliminarTransfer(id) {
    if (!window.confirm('¿Eliminar esta transferencia?')) return;
    await delTransferInterna(id);
    toast('Eliminado');
  }

  const donutIcon = { 'Efectivo': '💵' };

  return (
    <div>
      <div className="metrics" id="metrics-top">
        <div className="mc m-green">
          <div className="mc-lbl">📥 Ingresos totales</div>
          <div className="mc-val green">{fmt(totIng)}</div>
          <div className="mc-sub">Efectivo + transferencia</div>
        </div>
        <div className="mc m-red">
          <div className="mc-lbl">📤 Gastos personales</div>
          <div className="mc-val red">{fmt(totGP)}</div>
          <div className="mc-sub">{gastosP.length} movimientos</div>
        </div>
        <div className="mc m-blue">
          <div className="mc-lbl">🚚 Gastos Easy Move</div>
          <div className="mc-val blue">{fmt(totGE)}</div>
          <div className="mc-sub">{gastosE.length} movimientos</div>
        </div>
        <div className="mc m-amber">
          <div className="mc-lbl">⚖️ Balance neto</div>
          <div className={'mc-val ' + (balance > 0 ? 'teal' : balance < 0 ? 'red' : 'gray')}>{balance < 0 ? '-' : ''}{fmt(balance)}</div>
          <div className="mc-sub">Ingresos − gastos del mes</div>
        </div>
      </div>

      <div className="section-title">🎯 Objetivos del mes</div>
      <div className="obj-grid">
        <div className="obj-card">
          <div className="obj-lbl">Meta de ingresos</div>
          <div className="obj-row">
            <input type="number" value={metaIng} onChange={(e) => setMetaIng(e.target.value)} placeholder="Ej: 70000" onBlur={guardarObjIng} />
            <button className="obj-save" onClick={guardarObjIng}>Guardar</button>
          </div>
          <div className="progress-bar"><div className="progress-fill" style={{ background: 'var(--green-light)', width: progIng + '%' }} /></div>
          <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 4 }}>{objetivos.ing > 0 ? `${fmt(totIng)} de ${fmt(objetivos.ing)} (${progIng}%)` : 'Definí una meta para ver el avance'}</div>
        </div>
        <div className="obj-card">
          <div className="obj-lbl">Renta / Alquiler fijo</div>
          <div className="obj-row">
            <input type="number" value={metaRenta} onChange={(e) => setMetaRenta(e.target.value)} placeholder="Ej: 3750" onBlur={guardarObjRenta} />
            <button className="obj-save" onClick={guardarObjRenta}>Guardar</button>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div className="card-title">📐 Regla de reparto del mes <span style={{ fontWeight: 400, color: 'var(--text3)', fontSize: 12 }}>({sumaPct}% asignado)</span></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 10 }}>
          <div className="fgl"><label>Gastos (%)</label><input type="number" min="0" max="100" value={pctGastos} onChange={(e) => setPctGastos(e.target.value)} /></div>
          <div className="fgl"><label>Otros (%)</label><input type="number" min="0" max="100" value={pctOtros} onChange={(e) => setPctOtros(e.target.value)} /></div>
          <div className="fgl"><label>Ahorro (%)</label><input type="number" min="0" max="100" value={pctAhorro} onChange={(e) => setPctAhorro(e.target.value)} /></div>
        </div>
        {sumaPct !== 100 && <div style={{ fontSize: 12, color: 'var(--amber)', marginBottom: 8 }}>⚠️ Los tres porcentajes deberían sumar 100% (hoy suman {sumaPct}%).</div>}
        <button className="obj-save" onClick={guardarRegla}>Guardar regla</button>
        {totIng > 0 && (
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[['Gastos', pctGastos, totGP, 'var(--red)'], ['Otros', pctOtros, totGE, 'var(--blue)'], ['Ahorro', pctAhorro, Math.max(0, balance), 'var(--green-light)']].map(([lbl, pct, real, color]) => {
              const meta = totIng * ((Number(pct) || 0) / 100);
              const avance = meta > 0 ? Math.min(100, Math.round((real / meta) * 100)) : 0;
              return (
                <div key={lbl}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                    <span>{lbl} <span style={{ color: 'var(--text3)' }}>({pct}%)</span></span>
                    <span style={{ color: 'var(--text2)' }}>{fmt(real)} / {fmt(meta)}</span>
                  </div>
                  <div className="progress-bar"><div className="progress-fill" style={{ width: avance + '%', background: color }} /></div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid2">
        <div className="card">
          <div className="card-title">Distribución del mes</div>
          <div className="chart-wrap">
            <Doughnut
              data={donaData}
              options={{
                responsive: true, maintainAspectRatio: false, cutout: '65%',
                plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, boxHeight: 10, color: chartTickColor(), font: { size: 11, family: 'DM Sans' } } }, tooltip: { callbacks: { label: (ctx) => ' ' + ctx.label + ': ' + fmt(ctx.raw) } } },
              }}
            />
          </div>
        </div>
        <div className="card">
          <div className="card-title">Ingresos por día (top 10)</div>
          <div className="chart-wrap">
            <Bar
              data={ingDiaData}
              options={{
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => ' ' + fmtD(ctx.raw) } } },
                scales: { x: { grid: { display: false }, ticks: { color: chartTickColor(), font: { size: 10, family: 'DM Sans' } } }, y: { grid: { color: chartGridColor() }, ticks: { color: chartTickColor(), font: { size: 10, family: 'DM Sans' }, callback: (v) => fmt(v) } } },
              }}
            />
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div className="card-title">📊 Gastos por categoría</div>
        {!gastosPorCat.length && <div className="empty">Sin gastos este mes.</div>}
        {!!gastosPorCat.length && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {gastosPorCat.map(([cat, monto]) => {
              const pct = totalGastosCat ? Math.round((monto / totalGastosCat) * 100) : 0;
              return (
                <div key={cat}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                    <span>{CAT_ICONS_GP[cat] || '📦'} {cat}</span>
                    <span style={{ color: 'var(--text2)' }}>{fmt(monto)} · {pct}%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: pct + '%', background: (CAT_BORDER[cat] || CAT_BORDER.default).replace(',.5)', ',1)') }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ marginBottom: '1.25rem' }}>
        <div className="section-title" style={{ marginBottom: 10 }}>
          🏦 Saldo por cuenta
          <button className="btn-sm" onClick={() => setShowCuentas(true)}>⚙️ Gestionar cuentas</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
          {cuentasList.map(([cuenta, saldo]) => (
            <div className="ahorro-card" key={cuenta}>
              <div className="ahorro-lbl">{donutIcon[cuenta] || '🏦'} {cuenta}</div>
              <div className="ahorro-val" style={{ color: saldo < 0 ? 'var(--red)' : undefined }}>{saldo < 0 ? '-' : ''}{fmt(saldo)}</div>
            </div>
          ))}
        </div>
      </div>
      {showCuentas && <CuentasManager onClose={() => setShowCuentas(false)} />}

      <div style={{ marginBottom: '1.25rem' }}>
        <div className="section-title" style={{ marginBottom: 10 }}>🔄 Mover dinero entre cuentas</div>
        <div className="add-form" style={{ marginBottom: 0 }}>
          <div className="form-row" style={{ gridTemplateColumns: '1fr auto 1fr 1fr auto' }}>
            <div className="fgl">
              <label>Origen</label>
              <select value={trOrigen} onChange={(e) => setTrOrigen(e.target.value)}>
                {cuentasDisponibles.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 6, color: 'var(--text2)', fontSize: 18 }}>→</div>
            <div className="fgl">
              <label>Destino</label>
              <select value={trDestino} onChange={(e) => setTrDestino(e.target.value)}>
                {cuentasDisponibles.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="fgl"><label>Monto ($)</label><input type="number" value={trMonto} onChange={(e) => setTrMonto(e.target.value)} placeholder="0.00" min="0" step="0.01" /></div>
            <button className="btn-add" style={{ background: 'var(--teal)' }} disabled={trBusy} onClick={moverDinero}>Mover</button>
          </div>
          <div className="fgl" style={{ marginTop: 8 }}><label>Descripción (opcional)</label><input type="text" value={trDesc} onChange={(e) => setTrDesc(e.target.value)} placeholder="Ej: Gasolina devuelta..." /></div>
        </div>
        {!!movsTransfer.length && (
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>Últimos movimientos</div>
            <div className="items-list">
              {movsTransfer.slice(0, 8).map((t) => (
                <div className="item" key={t.id}>
                  <div className="item-ico" style={{ background: 'var(--blue-bg)' }}>🔄</div>
                  <div className="item-info">
                    <div className="item-name">{t.origen} → {t.destino}{t.descripcion ? ' — ' + t.descripcion : ''}</div>
                    <div className="item-meta">{t.fecha}</div>
                  </div>
                  <div className="item-amt">{fmtD(t.monto)}</div>
                  <button className="item-del" onClick={() => eliminarTransfer(t.id)}>🗑</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="section-title">💰 Ahorros acumulados este mes</div>
      <div className="ahorros-grid">
        <div className="ahorro-card">
          <div className="ahorro-lbl">🏦 Pesos</div>
          <div className="ahorro-val">{fmt(ahorros.pesos)}</div>
        </div>
        <div className="ahorro-card">
          <div className="ahorro-lbl">💵 Dólares</div>
          <div className="ahorro-val">USD {Math.round(ahorros.dolares).toLocaleString('es-MX')}</div>
        </div>
        <div className="ahorro-card">
          <div className="ahorro-lbl">💳 Tarjetas</div>
          <div className="ahorro-val">{fmt(ahorros.tarjetas)}</div>
        </div>
      </div>
    </div>
  );
}
