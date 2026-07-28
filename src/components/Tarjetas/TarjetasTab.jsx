import { useMemo, useState } from 'react';
import { useFinanzas } from '../../context/FinanzasContext';
import { useToast } from '../Common/Toast';
import { fmt, fmtD, hoy } from '../../utils/format';
import { calcularPeriodoGasto } from '../../utils/tarjetas';
import { CATS_TC, MESES } from '../../utils/constants';
import PagoTarjetaModal from '../Modals/PagoTarjetaModal';
import EditGastoTarjetaModal from '../Modals/EditGastoTarjetaModal';

const MESES_N = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

export default function TarjetasTab() {
  const fin = useFinanzas();
  const { tarjetas, gastosTarjeta, ano, mes, addTarjeta, delTarjeta, delGastoTC, updateGastoTC, addGastoTarjetaConCuotas, confirmarPagoTarjeta } = fin;
  const toast = useToast();

  const [nombre, setNombre] = useState('');
  const [banco, setBanco] = useState('');
  const [cierre, setCierre] = useState('');
  const [limite, setLimite] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [gFecha, setGFecha] = useState(hoy());
  const [gTarjeta, setGTarjeta] = useState(tarjetas[0]?.id || '');
  const [gDesc, setGDesc] = useState('');
  const [gCat, setGCat] = useState(CATS_TC[0]);
  const [gMonto, setGMonto] = useState('');
  const [gTipo, setGTipo] = useState('personal');
  const [esCuotas, setEsCuotas] = useState(false);
  const [nCuotas, setNCuotas] = useState('');
  const [desdeCuota, setDesdeCuota] = useState('1');

  const [filtro, setFiltro] = useState('all');
  const [pagoModal, setPagoModal] = useState(null); // { tc, gastos }
  const [editGasto, setEditGasto] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submitTarjeta() {
    const c = parseInt(cierre), l = parseInt(limite);
    if (!nombre.trim() || !c || !l) { toast('Completá nombre, día de cierre y día límite'); return; }
    try {
      await addTarjeta({ nombre: nombre.trim(), banco: banco.trim(), dia_cierre: c, dia_limite: l });
      setNombre(''); setBanco(''); setCierre(''); setLimite('');
      toast('✓ Tarjeta configurada');
    } catch (e) { toast('Error: ' + e.message); }
  }

  async function submitGasto() {
    const montoTotal = parseFloat(gMonto);
    const n = esCuotas ? parseInt(nCuotas) || 0 : 1;
    if (!gTarjeta || !gDesc.trim() || !montoTotal || montoTotal <= 0) { toast('Completá todos los campos'); return; }
    if (esCuotas && n < 2) { toast('Ingresá al menos 2 cuotas'); return; }
    const desde = esCuotas ? Math.max(1, parseInt(desdeCuota) || 1) : 1;
    if (esCuotas && desde > n) { toast('La cuota de inicio no puede ser mayor al total de cuotas'); return; }
    setBusy(true);
    try {
      const tc = tarjetas.find((t) => t.id === gTarjeta);
      const { periodo, montoCuota } = await addGastoTarjetaConCuotas({
        tarjetaId: gTarjeta, descripcion: gDesc.trim(), categoria: gCat, montoTotal,
        esCuotas, nCuotas: n, desdeCuota: desde, fechaCompra: gFecha || hoy(), tipoGasto: gTipo,
      });
      setGDesc(''); setGMonto(''); setEsCuotas(false); setNCuotas(''); setDesdeCuota('1');
      const periodoLabel = MESES[periodo.mesPago] + ' ' + periodo.anoPago;
      toast(esCuotas ? `✓ ${n} cuotas de ${fmtD(montoCuota)} en ${tc?.nombre} — 1ra cuota en ${periodoLabel}` : `✓ Gasto en ${tc?.nombre} asignado al período de ${periodoLabel}`);
    } catch (e) { toast('Error: ' + e.message); }
    setBusy(false);
  }

  async function eliminarTarjeta(id) {
    const tc = tarjetas.find((t) => t.id === id);
    if (!window.confirm(`¿Eliminar tarjeta ${tc?.nombre || ''} y todos sus gastos?`)) return;
    await delTarjeta(id);
    toast('Tarjeta eliminada');
  }
  async function eliminarGasto(id) {
    if (!window.confirm('¿Eliminar este gasto?')) return;
    await delGastoTC(id);
    toast('Eliminado');
  }

  const cuentaMetrics = useMemo(() => {
    let totalPend = 0, totalPronto = 0, totalPag = 0, totalEsteMes = 0, nPend = 0, nPronto = 0, nPag = 0, nEsteMes = 0;
    let mesSig = mes + 1, anoSig = ano;
    if (mesSig > 11) { mesSig = 0; anoSig++; }
    tarjetas.forEach((tc) => {
      const gastosPend = gastosTarjeta.filter((g) => g.tarjeta_id === tc.id && g.estado !== 'pagado');
      let totalPendTc = 0, totalProntoTc = 0, totalEsteMesTc = 0;
      gastosPend.forEach((g) => {
        const monto = Number(g.monto);
        const p = calcularPeriodoGasto(g.fecha, tc.dia_cierre, tc.dia_limite);
        totalPendTc += monto;
        if (p.mesPago === mes && p.anoPago === ano) totalEsteMesTc += monto;
        if (p.mesPago === mesSig && p.anoPago === anoSig) totalProntoTc += monto;
      });
      if (totalPendTc > 0) { totalPend += totalPendTc; nPend++; }
      if (totalProntoTc > 0) { totalPronto += totalProntoTc; nPronto++; }
      if (totalEsteMesTc > 0) { totalEsteMes += totalEsteMesTc; nEsteMes++; }
    });
    return { totalPend, totalPronto, totalPag, totalEsteMes, nPend, nPronto, nPag, nEsteMes };
  }, [tarjetas, gastosTarjeta, ano, mes]);

  let tcFiltradas = tarjetas;
  if (filtro === 'pendiente') tcFiltradas = tarjetas.filter((tc) => gastosTarjeta.some((g) => g.tarjeta_id === tc.id && g.estado !== 'pagado'));
  else if (filtro === 'este_mes') tcFiltradas = tarjetas.filter((tc) => gastosTarjeta.filter((g) => g.tarjeta_id === tc.id && g.estado !== 'pagado').some((g) => { const p = calcularPeriodoGasto(g.fecha, tc.dia_cierre, tc.dia_limite); return p.mesPago === mes && p.anoPago === ano; }));
  else if (filtro === 'proximo_mes') {
    let mesSig = mes + 1, anoSig = ano; if (mesSig > 11) { mesSig = 0; anoSig++; }
    tcFiltradas = tarjetas.filter((tc) => gastosTarjeta.filter((g) => g.tarjeta_id === tc.id && g.estado !== 'pagado').some((g) => { const p = calcularPeriodoGasto(g.fecha, tc.dia_cierre, tc.dia_limite); return p.mesPago === mesSig && p.anoPago === anoSig; }));
  }

  return (
    <div>
      <div className="add-form">
        <div className="add-form-title">💳 Configurar tarjeta</div>
        <div className="form-row cols5">
          <div className="fgl"><label>Nombre</label><input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Nu, Klar, BBVA..." /></div>
          <div className="fgl"><label>Banco / Emisor</label><input type="text" value={banco} onChange={(e) => setBanco(e.target.value)} placeholder="Ej: Nu Bank..." /></div>
          <div className="fgl"><label>Día de cierre</label><input type="number" min="1" max="31" value={cierre} onChange={(e) => setCierre(e.target.value)} placeholder="Ej: 15" /></div>
          <div className="fgl"><label>Día límite pago</label><input type="number" min="1" max="31" value={limite} onChange={(e) => setLimite(e.target.value)} placeholder="Ej: 5" /></div>
          <button className="btn-add" style={{ background: 'var(--purple)' }} onClick={submitTarjeta}>+ Guardar</button>
        </div>
      </div>

      <div className="metrics" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: '1.25rem' }}>
        <div className="mc m-red"><div className="mc-lbl">💳 Total acumulado</div><div className="mc-val red">{fmt(cuentaMetrics.totalPend)}</div><div className="mc-sub">{cuentaMetrics.nPend} tarjeta{cuentaMetrics.nPend !== 1 ? 's' : ''} con gastos</div></div>
        <div className="mc m-red"><div className="mc-lbl">🔥 Vence este mes</div><div className="mc-val red">{fmt(cuentaMetrics.totalEsteMes)}</div><div className="mc-sub">{cuentaMetrics.nEsteMes} tarjeta{cuentaMetrics.nEsteMes !== 1 ? 's' : ''}</div></div>
        <div className="mc m-amber"><div className="mc-lbl">📅 Mes que viene</div><div className="mc-val amber">{fmt(cuentaMetrics.totalPronto)}</div><div className="mc-sub">{cuentaMetrics.nPronto} tarjeta{cuentaMetrics.nPronto !== 1 ? 's' : ''}</div></div>
        <div className="mc m-green"><div className="mc-lbl">✅ Ya pagadas</div><div className="mc-val green">{fmt(cuentaMetrics.totalPag)}</div><div className="mc-sub">{cuentaMetrics.nPag} tarjeta{cuentaMetrics.nPag !== 1 ? 's' : ''}</div></div>
      </div>

      <div className="section-title">Mis tarjetas <span>{tarjetas.length ? `(${tarjetas.length})` : ''}</span>
        <button className="btn-sm" style={{ fontSize: 12 }} onClick={() => setShowForm((v) => !v)}>+ Cargar gasto con tarjeta</button>
      </div>

      {showForm && (
        <div className="add-form" style={{ border: '1px solid var(--purple)', marginBottom: '1rem' }}>
          <div className="add-form-title" style={{ color: 'var(--purple)' }}>💸 Cargar gasto realizado con tarjeta</div>
          <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr auto' }}>
            <div className="fgl"><label>Fecha del cargo</label><input type="date" value={gFecha} onChange={(e) => setGFecha(e.target.value)} /></div>
            <div className="fgl">
              <label>Tarjeta</label>
              <select value={gTarjeta} onChange={(e) => setGTarjeta(e.target.value)}>
                {tarjetas.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
              </select>
            </div>
            <div className="fgl"><label>Descripción</label><input type="text" value={gDesc} onChange={(e) => setGDesc(e.target.value)} placeholder="Ej: Supermercado..." /></div>
            <div className="fgl">
              <label>Categoría</label>
              <select value={gCat} onChange={(e) => setGCat(e.target.value)}>
                {CATS_TC.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="fgl"><label>Monto total ($)</label><input type="number" min="0" step="0.01" value={gMonto} onChange={(e) => setGMonto(e.target.value)} placeholder="0.00" /></div>
            <div className="fgl">
              <label>¿Es gasto de...?</label>
              <select value={gTipo} onChange={(e) => setGTipo(e.target.value)}>
                <option value="personal">👤 Personal</option>
                <option value="negocio">🏢 Negocio</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
              <input type="checkbox" checked={esCuotas} onChange={(e) => setEsCuotas(e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--purple)' }} />
              <span style={{ color: 'var(--text2)' }}>💳 Es una compra en cuotas</span>
            </label>
            {esCuotas && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12, color: 'var(--text2)' }}>Total cuotas:</span>
                  <input type="number" min="2" max="48" value={nCuotas} onChange={(e) => setNCuotas(e.target.value)} placeholder="Ej: 3" style={{ height: 32, width: 70, border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '0 8px', background: 'var(--surface2)', color: 'var(--text)', fontSize: 13 }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12, color: 'var(--text2)' }}>Desde cuota N°:</span>
                  <input type="number" min="1" max="48" value={desdeCuota} onChange={(e) => setDesdeCuota(e.target.value)} style={{ height: 32, width: 70, border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '0 8px', background: 'var(--surface2)', color: 'var(--text)', fontSize: 13 }} />
                </div>
                {gMonto && nCuotas && parseInt(nCuotas) >= 2 && (
                  <div style={{ fontSize: 13, color: 'var(--purple)', fontWeight: 600 }}>
                    Cuota {desdeCuota}/{nCuotas} — {fmtD(parseFloat(gMonto) / parseInt(nCuotas))}/mes ({parseInt(nCuotas) - parseInt(desdeCuota) + 1} cuotas pendientes)
                  </div>
                )}
              </>
            )}
          </div>
          <div style={{ marginTop: 10 }}>
            <button className="btn-add" style={{ background: 'var(--purple)' }} disabled={busy} onClick={submitGasto}>+ Cargar</button>
          </div>
        </div>
      )}

      <div className="filter-row">
        <button className={'fbtn' + (filtro === 'all' ? ' active' : '')} onClick={() => setFiltro('all')}>Todas</button>
        <button className={'fbtn' + (filtro === 'pendiente' ? ' active' : '')} onClick={() => setFiltro('pendiente')}>⏳ Pendientes</button>
        <button className={'fbtn' + (filtro === 'este_mes' ? ' active' : '')} onClick={() => setFiltro('este_mes')}>🔥 Vence este mes</button>
        <button className={'fbtn' + (filtro === 'proximo_mes' ? ' active' : '')} onClick={() => setFiltro('proximo_mes')}>📅 Mes que viene</button>
      </div>

      <div className="tc-grid">
        {!tarjetas.length && <div style={{ gridColumn: '1/-1' }} className="tc-empty">No tenés tarjetas configuradas. Agregá una arriba.</div>}
        {tarjetas.length > 0 && !tcFiltradas.length && <div style={{ gridColumn: '1/-1' }} className="tc-empty">No hay tarjetas que mostrar.</div>}
        {tcFiltradas.map((tc) => {
          const hoyStr = hoy();
          const periodoVigente = calcularPeriodoGasto(hoyStr, tc.dia_cierre, tc.dia_limite);
          const todosLosPend = gastosTarjeta.filter((g) => g.tarjeta_id === tc.id && g.estado !== 'pagado');
          const gastosPend = [];
          const gastosAtrasados = [];
          todosLosPend.forEach((g) => {
            const p = calcularPeriodoGasto(g.fecha, tc.dia_cierre, tc.dia_limite);
            if (p.mesPago === mes && p.anoPago === ano) gastosPend.push(g);
            else {
              const fechaLimAtras = new Date(p.anoPago, p.mesPago, tc.dia_limite);
              if (fechaLimAtras < new Date(ano, mes, 1)) gastosAtrasados.push(g);
            }
          });
          const total = gastosPend.reduce((s, g) => s + Number(g.monto), 0);
          const totalAtrasado = gastosAtrasados.reduce((s, g) => s + Number(g.monto), 0);
          const dias = periodoVigente.diasRestantes;
          const urgente = total > 0 && dias <= 7;
          const claseCard = urgente ? 'vence-pronto' : 'ok';
          const limMes = MESES_N[periodoVigente.mesPago];
          let venceLabel = `📅 Período ${limMes} ${periodoVigente.anoPago} — límite: día ${tc.dia_limite} (en ${dias} días)`;
          if (dias === 0) venceLabel = '🚨 Límite de pago HOY';
          else if (dias < 0) venceLabel = '⚠️ Límite vencido';
          else if (dias <= 3) venceLabel = `🚨 Límite en ${dias} día${dias !== 1 ? 's' : ''} (día ${tc.dia_limite})`;
          else if (dias <= 7) venceLabel = `⚠️ Límite en ${dias} días (día ${tc.dia_limite})`;
          const bgLimite = urgente ? 'var(--red-bg)' : 'var(--surface2)';
          const colorLimite = urgente ? 'var(--red)' : 'var(--text2)';
          const colorValLimite = urgente ? 'var(--red)' : 'var(--text)';

          const renderFila = (g) => (
            <div key={g.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid var(--border)' }}>
              <div><div style={{ fontSize: 12, fontWeight: 500 }}>{g.descripcion}</div><div style={{ fontSize: 10, color: 'var(--text2)' }}>{g.categoria} · {g.fecha}</div></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--red)' }}>-{fmtD(g.monto)}</span>
                <button className="item-del" onClick={() => setEditGasto(g)}>✏️</button>
                <button className="item-del" onClick={() => eliminarGasto(g.id)}>🗑</button>
              </div>
            </div>
          );

          return (
            <div className={'tc-card ' + claseCard} key={tc.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <div><div className="tc-nombre">{tc.nombre}</div><div className="tc-banco">{tc.banco || ''}</div></div>
                <button className="item-del" style={{ color: 'var(--text3)' }} onClick={() => eliminarTarjeta(tc.id)}>🗑</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                <div style={{ background: 'var(--surface2)', borderRadius: 6, padding: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: 'var(--text2)', marginBottom: 2 }}>CIERRE</div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>Día {tc.dia_cierre}</div>
                </div>
                <div style={{ background: bgLimite, borderRadius: 6, padding: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: colorLimite, marginBottom: 2 }}>LÍMITE PAGO</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: colorValLimite }}>Día {tc.dia_limite}</div>
                </div>
              </div>
              <div className={'tc-vence' + (urgente ? ' urgente' : '')} style={{ marginBottom: 8 }}>{venceLabel}</div>

              {(gastosPend.length > 0 || gastosAtrasados.length > 0) ? (
                <div style={{ marginBottom: 8 }}>
                  {gastosAtrasados.length > 0 && (
                    <div style={{ background: 'rgba(244,63,94,.08)', borderRadius: 6, padding: '6px 8px', marginBottom: 8 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--red)', marginBottom: 4 }}>⚠️ PAGOS ATRASADOS</div>
                      {gastosAtrasados.map(renderFila)}
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', marginTop: 2 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--red)' }}>SUBTOTAL ATRASADO</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--red)' }}>{fmt(totalAtrasado)}</span>
                      </div>
                    </div>
                  )}
                  {gastosPend.length > 0 && (
                    <>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>GASTOS PENDIENTES</div>
                      {gastosPend.map(renderFila)}
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', marginTop: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 700 }}>TOTAL A PAGAR</span>
                        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--red)', fontFamily: 'DM Mono,monospace' }}>{fmt(total)}</span>
                      </div>
                      <button
                        style={{ width: '100%', height: 36, borderRadius: 'var(--r)', border: 'none', background: 'var(--green)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                        onClick={() => setPagoModal({ tc, gastos: [...gastosPend, ...gastosAtrasados] })}
                      >
                        ✅ Registrar pago de {fmt(total + totalAtrasado)}
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 10, color: 'var(--text3)', fontSize: 12 }}>Sin gastos cargados este mes</div>
              )}
            </div>
          );
        })}
      </div>

      {pagoModal && (
        <PagoTarjetaModal
          tc={pagoModal.tc}
          gastos={pagoModal.gastos}
          onClose={() => setPagoModal(null)}
          onConfirm={async () => {
            await confirmarPagoTarjeta(pagoModal.tc.id, pagoModal.gastos);
            toast('✓ Pago registrado');
          }}
        />
      )}
      {editGasto && (
        <EditGastoTarjetaModal
          gasto={editGasto}
          onClose={() => setEditGasto(null)}
          onSave={async (updates) => { await updateGastoTC(editGasto.id, updates); toast('✓ Gasto actualizado'); }}
        />
      )}
    </div>
  );
}
