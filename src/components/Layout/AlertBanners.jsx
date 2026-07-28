import { useMemo } from 'react';
import { useFinanzas } from '../../context/FinanzasContext';
import { calcularPeriodoGasto } from '../../utils/tarjetas';
import { fmt } from '../../utils/format';

export default function AlertBanners() {
  const { tarjetas, gastosTarjeta, fijos } = useFinanzas();

  const alertasTarjetas = useMemo(() => {
    if (!tarjetas.length) return { esteMes: [], proximo: [] };
    const hoyA = new Date(); hoyA.setHours(0, 0, 0, 0);
    const mesA = hoyA.getMonth(), anoA = hoyA.getFullYear();
    let mesSigA = mesA + 1, anoSigA = anoA;
    if (mesSigA > 11) { mesSigA = 0; anoSigA++; }
    const esteMes = [], proximo = [];
    tarjetas.forEach((tc) => {
      const gp = gastosTarjeta.filter((g) => g.tarjeta_id === tc.id && g.estado !== 'pagado');
      if (!gp.length) return;
      let totEM = 0, totPr = 0;
      gp.forEach((g) => {
        const p = calcularPeriodoGasto(g.fecha, tc.dia_cierre, tc.dia_limite);
        if (p.mesPago === mesA && p.anoPago === anoA) totEM += Number(g.monto);
        else if (p.mesPago === mesSigA && p.anoPago === anoSigA) totPr += Number(g.monto);
      });
      const limMayoA = new Date(anoA, mesA, tc.dia_limite);
      const diasMayo = Math.round((limMayoA - hoyA) / 86400000);
      const limSigA = new Date(anoSigA, mesSigA, tc.dia_limite);
      const diasSig = Math.round((limSigA - hoyA) / 86400000);
      if (totEM > 0) esteMes.push({ nombre: tc.nombre, total: totEM, dias: diasMayo, dia: tc.dia_limite });
      else if (totPr > 0 && diasSig <= 10) proximo.push({ nombre: tc.nombre, total: totPr, dias: diasSig, dia: tc.dia_limite });
    });
    return { esteMes, proximo };
  }, [tarjetas, gastosTarjeta]);

  const alertasFijos = useMemo(() => {
    if (!fijos.length) return [];
    const hoyF = new Date(); hoyF.setHours(0, 0, 0, 0);
    const alertas = [];
    fijos.forEach((f) => {
      if (!f.activo || !f.dia_vencimiento) return;
      const dv = f.dia_vencimiento;
      const fv = new Date(hoyF.getFullYear(), hoyF.getMonth(), dv);
      if (fv < hoyF) fv.setMonth(fv.getMonth() + 1);
      const dias = Math.round((fv - hoyF) / 86400000);
      if (dias <= 7) alertas.push({ nombre: f.descripcion, monto: f.monto, dias, dia: dv });
    });
    alertas.sort((a, b) => a.dias - b.dias);
    return alertas;
  }, [fijos]);

  const hayAlertaTC = alertasTarjetas.esteMes.length || alertasTarjetas.proximo.length;

  return (
    <>
      {hayAlertaTC && (
        <div style={{
          background: alertasTarjetas.esteMes.length ? 'rgba(244,63,94,.08)' : 'var(--amber-bg)',
          border: alertasTarjetas.esteMes.length ? '1px solid rgba(244,63,94,.5)' : '1px solid rgba(245,158,11,.4)',
          borderRadius: 'var(--r)', padding: '12px 16px', marginBottom: '1rem', fontSize: 13, color: 'var(--text)',
        }}>
          {alertasTarjetas.esteMes.length > 0 && (
            <>
              <div style={{ fontWeight: 700, marginBottom: 8, color: 'var(--red)' }}>🔥 Pagos de tarjeta este mes:</div>
              {alertasTarjetas.esteMes.map((a, i) => {
                const urg = a.dias <= 3;
                return (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid rgba(244,63,94,.15)' }}>
                    <span>{urg ? '🚨' : '⏰'} <strong>{a.nombre}</strong> — {fmt(a.total)}</span>
                    <span style={{ fontWeight: 700, color: urg ? 'var(--red)' : 'var(--amber)' }}>
                      {a.dias === 0 ? 'Vence HOY' : a.dias === 1 ? 'Mañana' : `En ${a.dias} días (día ${a.dia})`}
                    </span>
                  </div>
                );
              })}
            </>
          )}
          {alertasTarjetas.proximo.length > 0 && (
            <>
              {alertasTarjetas.esteMes.length > 0 && <div style={{ height: 6 }} />}
              <div style={{ fontWeight: 700, marginBottom: 4, color: 'var(--amber)' }}>Próximos pagos (mes que viene):</div>
              {alertasTarjetas.proximo.map((a, i) => (
                <div key={i}>- {a.nombre}: {fmt(a.total)} en {a.dias} días (día {a.dia})</div>
              ))}
            </>
          )}
        </div>
      )}

      {alertasFijos.length > 0 && (
        <div style={{ background: 'rgba(245,158,11,.07)', border: '1px solid rgba(245,158,11,.35)', borderRadius: 'var(--r)', padding: '12px 16px', marginBottom: '1rem', fontSize: 13 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 14 }}>📌</span>
            <span style={{ fontWeight: 700, color: 'var(--amber)' }}>Gastos fijos próximos</span>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text2)' }}>{alertasFijos.length} vencimiento{alertasFijos.length > 1 ? 's' : ''}</span>
          </div>
          {alertasFijos.map((a, i) => {
            const u = a.dias === 0, p = a.dias <= 2;
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0', borderBottom: '1px solid rgba(245,158,11,.15)' }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: u ? '#f43f5e' : p ? '#f59e0b' : '#6b7280', flexShrink: 0 }} />
                <span style={{ flex: 1, fontWeight: 500, color: 'var(--text)' }}>{a.nombre}</span>
                <span style={{ fontSize: 12, color: u ? 'var(--red)' : p ? 'var(--amber)' : 'var(--text2)', fontWeight: 600 }}>
                  {u ? '🚨 HOY' : a.dias === 1 ? '⚠️ Mañana' : `📅 ${a.dias} días`}
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--amber)', minWidth: 60, textAlign: 'right' }}>{fmt(a.monto)}</span>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
