import { useMemo, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { useFinanzas } from '../../context/FinanzasContext';
import { useToast } from '../Common/Toast';
import { fmt, fmtD, hoy } from '../../utils/format';
import { MESES_CORTOS } from '../../utils/constants';
import '../../lib/chartSetup';
import { chartTickColor, chartGridColor } from '../../lib/chartSetup';

export default function AhorrosTab() {
  const { movsAhorro, ahorros, ano, mes, addMovAhorro, delMovAhorro } = useFinanzas();
  const toast = useToast();

  const [fecha, setFecha] = useState(hoy());
  const [tipo, setTipo] = useState('pesos');
  const [desc, setDesc] = useState('');
  const [monto, setMonto] = useState('');
  const [busy, setBusy] = useState(false);

  const totals = useMemo(() => {
    let totP = 0, totD = 0, totT = 0, cP = 0, cD = 0, cT = 0;
    movsAhorro.forEach((m) => {
      if (m.tipo === 'pesos') { totP += Number(m.monto); cP++; }
      else if (m.tipo === 'dolares') { totD += Number(m.monto); cD++; }
      else if (m.tipo === 'tarjetas') { totT += Number(m.monto); cT++; }
    });
    if (!movsAhorro.length) { totP = ahorros.pesos; totD = ahorros.dolares; totT = ahorros.tarjetas; }
    return { totP, totD, totT, cP, cD, cT };
  }, [movsAhorro, ahorros]);

  async function submit() {
    const m = parseFloat(monto);
    if (!m || m <= 0) { toast('Ingresá un monto válido'); return; }
    setBusy(true);
    try {
      await addMovAhorro({ fecha: fecha || hoy(), tipo, descripcion: desc.trim() || 'Ahorro', monto: m });
      setMonto(''); setDesc('');
      toast('✓ Ahorro registrado');
    } catch (e) { toast('Error: ' + e.message); }
    setBusy(false);
  }

  async function eliminar(id) {
    if (!window.confirm('¿Eliminar?')) return;
    await delMovAhorro(id);
    toast('Eliminado');
  }

  const meses6 = useMemo(() => {
    const arr = [];
    for (let i = 5; i >= 0; i--) {
      let m = mes - i, a = ano;
      if (m < 0) { m += 12; a--; }
      arr.push({ ano: a, mes: m, lbl: MESES_CORTOS[m] });
    }
    return arr;
  }, [ano, mes]);

  const chartData = useMemo(() => {
    const pesos = meses6.map((item) => {
      const ms = `${item.ano}-${String(item.mes + 1).padStart(2, '0')}`;
      return movsAhorro.filter((m) => m.tipo === 'pesos' && m.fecha.slice(0, 7) <= ms).reduce((s, m) => s + Number(m.monto), 0);
    });
    const dolares = meses6.map((item) => {
      const ms = `${item.ano}-${String(item.mes + 1).padStart(2, '0')}`;
      return movsAhorro.filter((m) => m.tipo === 'dolares' && m.fecha.slice(0, 7) <= ms).reduce((s, m) => s + Number(m.monto), 0);
    });
    const dataPesos = !movsAhorro.length ? meses6.map(() => ahorros.pesos) : pesos;
    const dataDolares = !movsAhorro.length ? meses6.map(() => ahorros.dolares) : dolares;
    return {
      labels: meses6.map((m) => m.lbl),
      datasets: [
        { label: 'Pesos', data: dataPesos, backgroundColor: '#5DCAA5', borderRadius: 4 },
        { label: 'USD', data: dataDolares, backgroundColor: '#b49aff', borderRadius: 4 },
      ],
    };
  }, [meses6, movsAhorro, ahorros]);

  const tIco = { pesos: '🏦', dolares: '💵', tarjetas: '💳' };
  const tBg = { pesos: 'rgba(139,92,246,.1)', dolares: 'var(--green-bg)', tarjetas: 'var(--amber-bg)' };
  const tColor = { pesos: 'var(--purple-light)', dolares: 'var(--green)', tarjetas: 'var(--amber)' };

  return (
    <div>
      <div className="add-form" style={{ marginBottom: '1.25rem' }}>
        <div className="add-form-title">💰 Registrar ahorro</div>
        <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr auto' }}>
          <div className="fgl"><label>Fecha</label><input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></div>
          <div className="fgl">
            <label>Tipo</label>
            <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="pesos">🏦 Pesos</option>
              <option value="dolares">💵 Dólares</option>
              <option value="tarjetas">💳 Tarjetas prepago</option>
            </select>
          </div>
          <div className="fgl"><label>Descripción</label><input type="text" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Ej: Ahorro mensual..." /></div>
          <div className="fgl"><label>Monto</label><input type="number" min="0" step="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="0.00" /></div>
          <button className="btn-add" style={{ background: 'var(--purple)' }} disabled={busy} onClick={submit}>+ Agregar</button>
        </div>
      </div>
      <div className="metrics" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: '1.25rem' }}>
        <div className="mc m-purple"><div className="mc-lbl">🏦 Total Pesos</div><div className="mc-val" style={{ color: 'var(--purple-light)' }}>{fmt(totals.totP)}</div><div className="mc-sub">{totals.cP} movimiento{totals.cP !== 1 ? 's' : ''}</div></div>
        <div className="mc m-green"><div className="mc-lbl">💵 Total Dólares</div><div className="mc-val green">USD {Number(totals.totD).toLocaleString('es-MX')}</div><div className="mc-sub">{totals.cD} movimiento{totals.cD !== 1 ? 's' : ''}</div></div>
        <div className="mc m-amber"><div className="mc-lbl">💳 Total Tarjetas</div><div className="mc-val amber">{fmt(totals.totT)}</div><div className="mc-sub">{totals.cT} movimiento{totals.cT !== 1 ? 's' : ''}</div></div>
      </div>
      <div className="section-title">📋 Historial <span>{movsAhorro.length ? `(${movsAhorro.length})` : ''}</span></div>
      <div className="items-list">
        {!movsAhorro.length && <div className="empty">{(totals.totP || totals.totD || totals.totT) ? 'Tus ahorros anteriores se muestran arriba. Agregá movimientos para llevar el historial.' : 'Sin movimientos. Agregá uno arriba.'}</div>}
        {movsAhorro.map((m) => (
          <div className="item" key={m.id}>
            <div className="item-ico" style={{ background: tBg[m.tipo] }}>{tIco[m.tipo]}</div>
            <div className="item-info">
              <div className="item-name">{m.descripcion}</div>
              <div className="item-meta">{m.fecha} · {m.tipo === 'pesos' ? 'Pesos' : m.tipo === 'dolares' ? 'Dólares' : 'Tarjetas'}</div>
            </div>
            <div className="item-amt" style={{ color: tColor[m.tipo] }}>+{fmtD(m.monto)}</div>
            <button className="item-del" onClick={() => eliminar(m.id)}>🗑</button>
          </div>
        ))}
      </div>
      <div className="card" style={{ marginTop: '1rem' }}>
        <div className="card-title">📊 Historial de ahorros (últimos 6 meses)</div>
        <div className="chart-wrap">
          <Bar
            data={chartData}
            options={{
              responsive: true, maintainAspectRatio: false,
              plugins: { legend: { display: true, position: 'top', labels: { boxWidth: 10, boxHeight: 10, color: chartTickColor(), font: { size: 11, family: 'DM Sans' } } }, tooltip: { callbacks: { label: (ctx) => ' ' + fmtD(ctx.raw) } } },
              scales: { x: { grid: { display: false }, ticks: { color: chartTickColor(), font: { size: 10, family: 'DM Sans' } } }, y: { grid: { color: chartGridColor() }, ticks: { color: chartTickColor(), font: { size: 10, family: 'DM Sans' }, callback: (v) => fmt(v) } } },
            }}
          />
        </div>
      </div>
    </div>
  );
}
