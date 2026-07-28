import { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { useAuth } from '../../context/AuthContext';
import { useFinanzas } from '../../context/FinanzasContext';
import { sb } from '../../lib/supabaseClient';
import { fmt, fmtD } from '../../utils/format';
import { MESES, MESES_CORTOS } from '../../utils/constants';
import '../../lib/chartSetup';
import { chartTickColor, chartGridColor } from '../../lib/chartSetup';

export default function AnualTab() {
  const { uid } = useAuth();
  const { ano } = useFinanzas();
  const [ingPorMes, setIngPorMes] = useState(Array(12).fill(0));
  const [gasPorMes, setGasPorMes] = useState(Array(12).fill(0));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    let active = true;
    setLoading(true);
    (async () => {
      const [r1, r2, r3] = await Promise.all([
        sb.from('ingresos_personal').select('mes,monto').eq('uid', uid).eq('ano', ano),
        sb.from('gastos_personal').select('mes,monto').eq('uid', uid).eq('ano', ano),
        sb.from('gastos_easy').select('mes,monto').eq('uid', uid).eq('ano', ano),
      ]);
      if (!active) return;
      const ing = Array(12).fill(0), gas = Array(12).fill(0);
      (r1.data || []).forEach((i) => { if (i.mes >= 0 && i.mes < 12) ing[i.mes] += Number(i.monto); });
      (r2.data || []).forEach((g) => { if (g.mes >= 0 && g.mes < 12) gas[g.mes] += Number(g.monto); });
      (r3.data || []).forEach((g) => { if (g.mes >= 0 && g.mes < 12) gas[g.mes] += Number(g.monto); });
      setIngPorMes(ing); setGasPorMes(gas);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [uid, ano]);

  const totIng = ingPorMes.reduce((s, v) => s + v, 0);
  const totGas = gasPorMes.reduce((s, v) => s + v, 0);
  const totBal = totIng - totGas;

  const chartData = {
    labels: MESES_CORTOS,
    datasets: [
      { label: 'Ingresos', data: ingPorMes, backgroundColor: '#5DCAA5', borderRadius: 4 },
      { label: 'Gastos', data: gasPorMes, backgroundColor: '#F09595', borderRadius: 4 },
    ],
  };

  const filas = MESES.map((m, i) => ({ m, ing: ingPorMes[i], gas: gasPorMes[i], bal: ingPorMes[i] - gasPorMes[i] })).filter((r) => r.ing || r.gas);

  return (
    <div>
      <div className="section-title" style={{ marginBottom: '1rem' }}>📅 Resumen <span>{ano}</span></div>
      <div className="metrics" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: '1.25rem' }}>
        <div className="mc m-green"><div className="mc-lbl">📥 Ingresos del año</div><div className="mc-val green">{loading ? '...' : fmt(totIng)}</div></div>
        <div className="mc m-red"><div className="mc-lbl">📤 Gastos del año</div><div className="mc-val red">{loading ? '...' : fmt(totGas)}</div></div>
        <div className="mc m-amber"><div className="mc-lbl">⚖️ Balance del año</div><div className={'mc-val ' + (totBal > 0 ? 'teal' : totBal < 0 ? 'red' : 'gray')}>{loading ? '...' : (totBal < 0 ? '-' : '') + fmt(totBal)}</div></div>
      </div>
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div className="card-title">Ingresos vs Gastos por mes</div>
        <div className="chart-wrap" style={{ height: 260 }}>
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
      <div className="card">
        <div className="card-title">Detalle por mes</div>
        {!filas.length && <div className="empty">Sin datos este año.</div>}
        {filas.length > 0 && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr 1fr', gap: 8, padding: '8px 0', borderBottom: '2px solid var(--border)' }}>
              <div style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600 }}>MES</div>
              <div style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600 }}>INGRESOS</div>
              <div style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600 }}>GASTOS</div>
              <div style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600 }}>BALANCE</div>
            </div>
            {filas.map((r) => (
              <div key={r.m} className="anual-row" style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr 1fr', gap: 8, padding: '10px 0', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{r.m}</div>
                <div style={{ fontSize: 13, color: 'var(--green)', fontFamily: "'DM Mono',monospace" }}>+{fmt(r.ing)}</div>
                <div style={{ fontSize: 13, color: 'var(--red)', fontFamily: "'DM Mono',monospace" }}>-{fmt(r.gas)}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: r.bal >= 0 ? 'var(--teal)' : 'var(--red)', fontFamily: "'DM Mono',monospace" }}>{r.bal >= 0 ? '+' : '-'}{fmt(r.bal)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
