import { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { sb } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';
import { hoy } from '../utils/format';
import { calcularPeriodoGasto } from '../utils/tarjetas';
import { DEFAULT_CUENTAS } from '../utils/constants';

const FinanzasContext = createContext(null);

export function FinanzasProvider({ children }) {
  const { uid } = useAuth();
  const now = new Date();
  const [ano, setAno] = useState(now.getFullYear());
  const [mes, setMes] = useState(now.getMonth());

  const [loading, setLoading] = useState(false);
  const [ingresos, setIngresos] = useState([]);
  const [gastosP, setGastosP] = useState([]);
  const [gastosE, setGastosE] = useState([]);
  const [ahorros, setAhorros] = useState({ pesos: 0, dolares: 0, tarjetas: 0 });
  const [movsAhorro, setMovsAhorro] = useState([]);
  const [movsTransfer, setMovsTransfer] = useState([]);
  const [fijos, setFijos] = useState([]);
  const [fijosPagadosMes, setFijosPagadosMes] = useState({});
  const [objetivos, setObjetivos] = useState({ ing: 0, renta: 0, pct_ahorro: null, pct_gastos: null, pct_fijos: null });
  const [tarjetas, setTarjetas] = useState([]);
  const [gastosTarjeta, setGastosTarjeta] = useState([]);
  const [deudas, setDeudas] = useState([]);
  const [mesCerrado, setMesCerrado] = useState(false);
  const [cuentas, setCuentas] = useState(DEFAULT_CUENTAS);
  const [cuentasTablaDisponible, setCuentasTablaDisponible] = useState(true);

  const cambiarMes = useCallback((d) => {
    setMes((prevMes) => {
      let m = prevMes + d;
      let a = ano;
      if (m > 11) { m = 0; a++; }
      if (m < 0) { m = 11; a--; }
      setAno(a);
      return m;
    });
  }, [ano]);

  // ── CUENTAS (requisito nuevo: entidad configurable, no array hardcodeado) ──
  const cargarCuentas = useCallback(async () => {
    if (!uid) return;
    const { data, error } = await sb.from('cuentas').select('*').eq('uid', uid).eq('activo', true).order('nombre', { ascending: true });
    if (error) {
      // Tabla "cuentas" todavía no existe en este proyecto Supabase -> fallback a la
      // lista por defecto para que la app siga siendo usable hasta correr la migración
      // (ver supabase/migrations en la raíz del proyecto).
      setCuentasTablaDisponible(false);
      setCuentas(DEFAULT_CUENTAS);
      return;
    }
    setCuentasTablaDisponible(true);
    const nombres = (data || []).map((c) => c.nombre);
    setCuentas(nombres.length ? Array.from(new Set(['Efectivo', ...nombres])) : DEFAULT_CUENTAS);
  }, [uid]);

  const addCuenta = useCallback(async (nombre) => {
    if (!uid || !nombre.trim()) return;
    const { error } = await sb.from('cuentas').insert({ uid, nombre: nombre.trim(), activo: true });
    if (error) throw error;
    await cargarCuentas();
  }, [uid, cargarCuentas]);

  const renameCuenta = useCallback(async (id, nombre) => {
    const { error } = await sb.from('cuentas').update({ nombre }).eq('id', id);
    if (error) throw error;
    await cargarCuentas();
  }, [cargarCuentas]);

  const deleteCuenta = useCallback(async (id) => {
    const { error } = await sb.from('cuentas').update({ activo: false }).eq('id', id);
    if (error) throw error;
    await cargarCuentas();
  }, [cargarCuentas]);

  const listCuentasRaw = useCallback(async () => {
    if (!uid) return [];
    const { data, error } = await sb.from('cuentas').select('*').eq('uid', uid).order('nombre', { ascending: true });
    if (error) return [];
    return data || [];
  }, [uid]);

  // ── CARGA PRINCIPAL (equivalente a cargarTodo()) ──
  const cargarTodo = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    try {
      const [d1, d2, d3, d4, dMov, dTr, d5] = await Promise.all([
        sb.from('ingresos_personal').select('*').eq('uid', uid).eq('ano', ano).eq('mes', mes).order('fecha', { ascending: true }),
        sb.from('gastos_personal').select('*').eq('uid', uid).eq('ano', ano).eq('mes', mes).order('created_at', { ascending: false }),
        sb.from('gastos_easy').select('*').eq('uid', uid).eq('ano', ano).eq('mes', mes).order('created_at', { ascending: false }),
        sb.from('ahorros_personal').select('*').eq('uid', uid).eq('ano', ano).eq('mes', mes).maybeSingle(),
        sb.from('movimientos_ahorro').select('*').eq('uid', uid).order('fecha', { ascending: false }),
        sb.from('transferencias_internas').select('*').eq('uid', uid).order('fecha', { ascending: false }),
        sb.from('objetivos_personal').select('*').eq('uid', uid).eq('ano', ano).eq('mes', mes).maybeSingle(),
      ]);
      setIngresos(d1.data || []);
      setGastosP(d2.data || []);
      setGastosE(d3.data || []);

      let ah = d4.data
        ? { pesos: Number(d4.data.pesos) || 0, dolares: Number(d4.data.dolares) || 0, tarjetas: Number(d4.data.tarjetas) || 0 }
        : { pesos: 0, dolares: 0, tarjetas: 0 };
      if (!ah.pesos && !ah.dolares && !ah.tarjetas) {
        const { data: d4b } = await sb.from('ahorros_personal').select('*').eq('uid', uid)
          .order('ano', { ascending: false }).order('mes', { ascending: false }).limit(1).maybeSingle();
        if (d4b) ah = { pesos: Number(d4b.pesos) || 0, dolares: Number(d4b.dolares) || 0, tarjetas: Number(d4b.tarjetas) || 0 };
      }
      setAhorros(ah);
      setMovsAhorro(dMov.data || []);
      setMovsTransfer(dTr.data || []);
      setObjetivos(d5.data ? {
        ing: Number(d5.data.ing) || 0,
        renta: Number(d5.data.renta) || 0,
        pct_ahorro: d5.data.pct_ahorro ?? null,
        pct_gastos: d5.data.pct_gastos ?? null,
        pct_fijos: d5.data.pct_fijos ?? null,
      } : { ing: 0, renta: 0, pct_ahorro: null, pct_gastos: null, pct_fijos: null });

      try {
        const { data: dFijos } = await sb.from('gastos_fijos').select('*').eq('uid', uid).eq('activo', true).order('created_at', { ascending: false });
        setFijos(dFijos || []);
        const { data: dApl } = await sb.from('fijos_aplicados').select('fijo_id,pagado,metodo_pago').eq('uid', uid).eq('ano', ano).eq('mes', mes);
        const map = {};
        (dApl || []).forEach((r) => { if (r.pagado) map[r.fijo_id] = { pagado: true, metodo: r.metodo_pago || '' }; });
        setFijosPagadosMes(map);
      } catch (e) { /* tabla de fijos no disponible aún */ }

      try {
        const [r1, r2] = await Promise.all([
          sb.from('tarjetas_credito').select('*').eq('uid', uid).order('dia_limite', { ascending: true }),
          sb.from('gastos_tarjeta').select('*').eq('uid', uid).eq('estado', 'pendiente'),
        ]);
        setTarjetas(r1.data || []);
        setGastosTarjeta(r2.data || []);
      } catch (e) { setTarjetas([]); setGastosTarjeta([]); }

      try {
        const { data } = await sb.from('meses_cerrados').select('id').eq('uid', uid).eq('ano', ano).eq('mes', mes).maybeSingle();
        setMesCerrado(!!data);
      } catch (e) { setMesCerrado(false); }

      await cargarCuentas();
    } finally {
      setLoading(false);
    }
  }, [uid, ano, mes, cargarCuentas]);

  useEffect(() => { cargarTodo(); }, [cargarTodo]);

  // Cargar deudas (independiente del mes, como en el original)
  const cargarDeudas = useCallback(async () => {
    if (!uid) return;
    try {
      const { data } = await sb.from('deudas_personal').select('*').eq('uid', uid).order('fecha', { ascending: false });
      setDeudas(data || []);
    } catch (e) { setDeudas([]); }
  }, [uid]);

  // ── Gastos fijos: aplicar automáticamente al mes (cargarFijos + aplicarFijosDelMes) ──
  const aplicarFijosDelMes = useCallback(async () => {
    if (!uid || !fijos.length) return;
    try {
      const { data: yaAplicados, error: errAplicados } = await sb.from('fijos_aplicados').select('fijo_id').eq('uid', uid).eq('ano', ano).eq('mes', mes);
      if (errAplicados) return;
      const idsAplicados = new Set((yaAplicados || []).map((r) => r.fijo_id));
      const pendientes = fijos.filter((f) => !idsAplicados.has(f.id));
      if (!pendientes.length) return;
      const descExistentesP = new Set(gastosP.map((g) => g.descripcion));
      const descExistentesE = new Set(gastosE.map((g) => g.descripcion));
      const realmentePendientes = pendientes.filter((f) => {
        const descFijo = f.descripcion + ' 📌';
        return f.tipo === 'personal' ? !descExistentesP.has(descFijo) : !descExistentesE.has(descFijo);
      });
      if (!realmentePendientes.length) return;
      let aplicados = 0;
      for (const f of realmentePendientes) {
        const fecha = new Date(ano, mes, 1).toISOString().split('T')[0];
        const tabla = f.tipo === 'personal' ? 'gastos_personal' : 'gastos_easy';
        const { data: gasto, error: errGasto } = await sb.from(tabla).insert({ uid, ano, mes, descripcion: f.descripcion + ' 📌', categoria: f.categoria, monto: f.monto, fecha }).select().single();
        if (gasto && !errGasto) {
          await sb.from('fijos_aplicados').insert({ uid, fijo_id: f.id, ano, mes });
          if (f.tipo === 'personal') setGastosP((prev) => [...prev, gasto]);
          else setGastosE((prev) => [...prev, gasto]);
          aplicados++;
        }
      }
      return aplicados;
    } catch (e) { /* noop */ }
  }, [uid, ano, mes, fijos, gastosP, gastosE]);

  const appliedRef = useRef('');
  useEffect(() => {
    const key = `${ano}-${mes}`;
    if (fijos.length && appliedRef.current !== key) {
      appliedRef.current = key;
      aplicarFijosDelMes();
    }
  }, [fijos, ano, mes, aplicarFijosDelMes]);

  // ── INGRESOS ──
  const addIngreso = useCallback(async ({ fecha, fuente, tipo, descripcion, monto, cuenta }) => {
    const { data, error } = await sb.from('ingresos_personal').insert({ uid, ano, mes, fecha: fecha || hoy(), fuente, tipo, descripcion, monto, cuenta: cuenta || 'Efectivo' }).select().single();
    if (error) throw error;
    setIngresos((prev) => [...prev, data].sort((a, b) => a.fecha.localeCompare(b.fecha)));
    return data;
  }, [uid, ano, mes]);
  const updateIngreso = useCallback(async (id, updates) => {
    const { error } = await sb.from('ingresos_personal').update(updates).eq('id', id);
    if (error) throw error;
    setIngresos((prev) => prev.map((i) => (i.id === id ? { ...i, ...updates } : i)).sort((a, b) => a.fecha.localeCompare(b.fecha)));
  }, []);
  const delIngreso = useCallback(async (id) => {
    await sb.from('ingresos_personal').delete().eq('id', id);
    setIngresos((prev) => prev.filter((i) => i.id !== id));
  }, []);

  // ── GASTOS PERSONALES ──
  const addGastoPersonal = useCallback(async (payload) => {
    const { data, error } = await sb.from('gastos_personal').insert({ uid, ano, mes, ...payload }).select().single();
    if (error) throw error;
    setGastosP((prev) => [data, ...prev]);
    return data;
  }, [uid, ano, mes]);
  const updateGastoP = useCallback(async (id, updates) => {
    const { error } = await sb.from('gastos_personal').update(updates).eq('id', id);
    if (error) throw error;
    setGastosP((prev) => prev.map((g) => (g.id === id ? { ...g, ...updates } : g)));
  }, []);
  const delGastoP = useCallback(async (id) => {
    await sb.from('gastos_personal').delete().eq('id', id);
    setGastosP((prev) => prev.filter((g) => g.id !== id));
  }, []);

  // ── GASTOS EASY MOVE / NEGOCIO ──
  const addGastoEasy = useCallback(async (payload) => {
    const { data, error } = await sb.from('gastos_easy').insert({ uid, ano, mes, ...payload }).select().single();
    if (error) throw error;
    setGastosE((prev) => [data, ...prev]);
    return data;
  }, [uid, ano, mes]);
  const updateGastoE = useCallback(async (id, updates) => {
    const { error } = await sb.from('gastos_easy').update(updates).eq('id', id);
    if (error) throw error;
    setGastosE((prev) => prev.map((g) => (g.id === id ? { ...g, ...updates } : g)));
  }, []);
  const delGastoE = useCallback(async (id) => {
    await sb.from('gastos_easy').delete().eq('id', id);
    setGastosE((prev) => prev.filter((g) => g.id !== id));
  }, []);

  // ── GASTOS CON TARJETA (compras / cuotas) ──
  const addGastoConTarjeta = useCallback(async ({ tarjetaId, descripcion, categoria, monto, fecha, tipoGasto }) => {
    const tc = tarjetas.find((t) => t.id === tarjetaId);
    if (!tc) throw new Error('Tarjeta no encontrada');
    const periodo = calcularPeriodoGasto(fecha, tc.dia_cierre, tc.dia_limite);
    const { data, error } = await sb.from('gastos_tarjeta').insert({
      uid, tarjeta_id: tarjetaId, tarjeta_nombre: tc.nombre,
      descripcion, categoria, monto, fecha,
      ano: periodo.anoPago, mes: periodo.mesPago,
      estado: 'pendiente', tipo_gasto: tipoGasto || 'personal',
    }).select().single();
    if (error) throw error;
    setGastosTarjeta((prev) => [...prev, data]);
    return { data, periodo };
  }, [uid, tarjetas]);

  // Compra en cuotas (o gasto único) con tarjeta — port fiel de addGastoTarjeta()
  // del index.html original: registra 1 fila en gastos_tarjeta por cuota, cada
  // una con su propio período de cobro calculado según el día de cierre.
  const addGastoTarjetaConCuotas = useCallback(async ({ tarjetaId, descripcion, categoria, montoTotal, esCuotas, nCuotas, desdeCuota, fechaCompra, tipoGasto }) => {
    const tc = tarjetas.find((t) => t.id === tarjetaId);
    if (!tc) throw new Error('Tarjeta no encontrada');
    const n = esCuotas ? Math.max(2, nCuotas || 1) : 1;
    const desde = esCuotas ? Math.max(1, desdeCuota || 1) : 1;
    const montoCuota = esCuotas ? Math.round((montoTotal / n) * 100) / 100 : montoTotal;

    const periodo0 = calcularPeriodoGasto(fechaCompra, tc.dia_cierre, tc.dia_limite);
    const fechaCompraObj = new Date(fechaCompra + 'T12:00:00');
    const mesCompraOrig = fechaCompraObj.getMonth();
    const anoCompraOrig = fechaCompraObj.getFullYear();
    const diaCompraOrig = fechaCompraObj.getDate();

    const inserts = [];
    for (let i = desde - 1; i < n; i++) {
      let mesFechaC = mesCompraOrig + i;
      let anoFechaC = anoCompraOrig;
      while (mesFechaC > 11) { mesFechaC -= 12; anoFechaC++; }
      const diasEnMesC = new Date(anoFechaC, mesFechaC + 1, 0).getDate();
      const diaFinal = Math.min(diaCompraOrig, diasEnMesC);
      const fechaC = `${anoFechaC}-${String(mesFechaC + 1).padStart(2, '0')}-${String(diaFinal).padStart(2, '0')}`;
      const periodoC = calcularPeriodoGasto(fechaC, tc.dia_cierre, tc.dia_limite);
      inserts.push({
        uid, tarjeta_id: tarjetaId, tarjeta_nombre: tc.nombre,
        descripcion: esCuotas ? `${descripcion} (cuota ${i + 1}/${n})` : descripcion,
        categoria, monto: montoCuota, fecha: fechaC,
        ano: periodoC.anoPago, mes: periodoC.mesPago, estado: 'pendiente',
        tipo_gasto: tipoGasto || 'personal',
      });
    }
    const { data, error } = await sb.from('gastos_tarjeta').insert(inserts).select();
    if (error) throw error;
    setGastosTarjeta((prev) => [...prev, ...data.filter((d) => d.ano === ano && d.mes === mes)]);
    return { data, periodo: periodo0, montoCuota };
  }, [uid, ano, mes, tarjetas]);

  // ── AHORROS ──
  const addMovAhorro = useCallback(async ({ fecha, tipo, descripcion, monto }) => {
    const { data, error } = await sb.from('movimientos_ahorro').insert({ uid, fecha: fecha || hoy(), tipo, descripcion: descripcion || 'Ahorro', monto }).select().single();
    if (error) throw error;
    setMovsAhorro((prev) => [data, ...prev]);
    return data;
  }, [uid]);
  const delMovAhorro = useCallback(async (id) => {
    await sb.from('movimientos_ahorro').delete().eq('id', id);
    setMovsAhorro((prev) => prev.filter((m) => m.id !== id));
  }, []);

  // ── OBJETIVOS ──
  const saveObjetivo = useCallback(async (partial) => {
    const nuevo = { ...objetivos, ...partial };
    await sb.from('objetivos_personal').upsert({ uid, ano, mes, ...nuevo }, { onConflict: 'uid,ano,mes' });
    setObjetivos(nuevo);
  }, [uid, ano, mes, objetivos]);

  // ── DEUDAS ──
  const addDeuda = useCallback(async (payload) => {
    const { data, error } = await sb.from('deudas_personal').insert({ uid, estado: 'pendiente', ...payload }).select().single();
    if (error) throw error;
    setDeudas((prev) => [data, ...prev]);
    return data;
  }, [uid]);
  const saldarDeuda = useCallback(async (id) => {
    await sb.from('deudas_personal').update({ estado: 'pagada' }).eq('id', id);
    setDeudas((prev) => prev.map((d) => (d.id === id ? { ...d, estado: 'pagada' } : d)));
  }, []);
  const delDeuda = useCallback(async (id) => {
    await sb.from('deudas_personal').delete().eq('id', id);
    setDeudas((prev) => prev.filter((d) => d.id !== id));
  }, []);

  // ── TARJETAS ──
  const addTarjeta = useCallback(async ({ nombre, banco, dia_cierre, dia_limite }) => {
    const { data, error } = await sb.from('tarjetas_credito').insert({ uid, nombre, banco: banco || nombre, dia_cierre, dia_limite }).select().single();
    if (error) throw error;
    setTarjetas((prev) => [...prev, data]);
    return data;
  }, [uid]);
  const delTarjeta = useCallback(async (id) => {
    await sb.from('gastos_tarjeta').delete().eq('tarjeta_id', id);
    await sb.from('tarjetas_credito').delete().eq('id', id);
    setTarjetas((prev) => prev.filter((t) => t.id !== id));
    setGastosTarjeta((prev) => prev.filter((g) => g.tarjeta_id !== id));
  }, []);
  const delGastoTC = useCallback(async (id) => {
    await sb.from('gastos_tarjeta').delete().eq('id', id);
    setGastosTarjeta((prev) => prev.filter((g) => g.id !== id));
  }, []);
  const updateGastoTC = useCallback(async (id, updates) => {
    const gasto = gastosTarjeta.find((g) => g.id === id);
    const tc = gasto ? tarjetas.find((t) => t.id === gasto.tarjeta_id) : null;
    let finalUpdates = { ...updates };
    if (tc && updates.fecha) {
      const p = calcularPeriodoGasto(updates.fecha, tc.dia_cierre, tc.dia_limite);
      finalUpdates.ano = p.anoPago;
      finalUpdates.mes = p.mesPago;
    }
    const { error } = await sb.from('gastos_tarjeta').update(finalUpdates).eq('id', id);
    if (error) throw error;
    setGastosTarjeta((prev) => prev.map((g) => (g.id === id ? { ...g, ...finalUpdates } : g)));
  }, [gastosTarjeta, tarjetas]);

  const confirmarPagoTarjeta = useCallback(async (tcId, gastosAPagar) => {
    const tc = tarjetas.find((t) => t.id === tcId);
    if (!tc) return;
    const gastosPersonal = gastosAPagar.filter((g) => (g.tipo_gasto || 'personal') === 'personal');
    const gastosNegocio = gastosAPagar.filter((g) => g.tipo_gasto === 'negocio');
    const fechaHoy = hoy();
    for (const g of gastosPersonal) {
      await sb.from('gastos_personal').insert({ uid, ano, mes, descripcion: g.descripcion + ' [' + tc.nombre + ']', categoria: g.categoria, monto: Number(g.monto), fecha: fechaHoy, metodo: 'tarjeta', cuenta: 'Tarjeta ' + tc.nombre });
    }
    for (const g of gastosNegocio) {
      await sb.from('gastos_easy').insert({ uid, ano, mes, descripcion: g.descripcion + ' [' + tc.nombre + ']', categoria: g.categoria, monto: Number(g.monto), fecha: fechaHoy, metodo: 'tarjeta', cuenta: 'Tarjeta ' + tc.nombre });
    }
    const ids = gastosAPagar.map((g) => g.id);
    await sb.from('gastos_tarjeta').update({ estado: 'pagado' }).in('id', ids);
    await cargarTodo();
  }, [uid, ano, mes, tarjetas, cargarTodo]);

  // ── GASTOS FIJOS ──
  const addFijo = useCallback(async (payload) => {
    const { data, error } = await sb.from('gastos_fijos').insert({ uid, activo: true, ...payload }).select().single();
    if (error) throw error;
    setFijos((prev) => [data, ...prev]);
    return data;
  }, [uid]);
  const toggleFijo = useCallback(async (id, activo) => {
    await sb.from('gastos_fijos').update({ activo: !activo }).eq('id', id);
    setFijos((prev) => prev.map((f) => (f.id === id ? { ...f, activo: !activo } : f)));
  }, []);
  const delFijo = useCallback(async (id) => {
    await sb.from('gastos_fijos').delete().eq('id', id);
    setFijos((prev) => prev.filter((f) => f.id !== id));
  }, []);
  const confirmarPagoFijo = useCallback(async ({ id, desc, monto, tipo, metodo, cuenta }) => {
    const tabla = tipo === 'personal' ? 'gastos_personal' : 'gastos_easy';
    const { error } = await sb.from(tabla).insert({ uid, ano, mes, descripcion: desc + ' (fijo)', categoria: 'Servicios', monto: Number(monto), fecha: hoy(), metodo, cuenta });
    if (error) throw error;
    await sb.from('fijos_aplicados').upsert({ uid, ano, mes, fijo_id: id, pagado: true, metodo_pago: metodo }, { onConflict: 'uid,ano,mes,fijo_id' });
    setFijosPagadosMes((prev) => ({ ...prev, [id]: { pagado: true, metodo } }));
    await cargarTodo();
  }, [uid, ano, mes, cargarTodo]);

  // ── TRANSFERENCIAS INTERNAS ──
  const addTransferInterna = useCallback(async ({ origen, destino, monto, descripcion }) => {
    const { data, error } = await sb.from('transferencias_internas').insert({ uid, fecha: hoy(), origen, destino, monto, descripcion: descripcion || `${origen} → ${destino}` }).select().single();
    if (error) throw error;
    setMovsTransfer((prev) => [data, ...prev]);
    return data;
  }, [uid]);
  const delTransferInterna = useCallback(async (id) => {
    await sb.from('transferencias_internas').delete().eq('id', id);
    setMovsTransfer((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ── MES CERRADO ──
  const toggleMesCerrado = useCallback(async (cerrar) => {
    if (!uid) return;
    if (cerrar) {
      const { error } = await sb.from('meses_cerrados').insert({ uid, ano, mes });
      if (error && !String(error.message).includes('duplicate')) throw error;
      setMesCerrado(true);
    } else {
      await sb.from('meses_cerrados').delete().eq('uid', uid).eq('ano', ano).eq('mes', mes);
      setMesCerrado(false);
    }
  }, [uid, ano, mes]);

  // ── SALDO POR CUENTA (calculado a partir de todos los movimientos del mes) ──
  const calcularSaldosCuentas = useCallback(() => {
    const saldos = {};
    ingresos.forEach((i) => {
      const cuenta = i.tipo === 'efvo' ? 'Efectivo' : (i.cuenta || 'Transferencia');
      saldos[cuenta] = (saldos[cuenta] || 0) + Number(i.monto);
    });
    const restarGasto = (g) => {
      const m = g.metodo || 'efectivo';
      let cuenta;
      if (m === 'efectivo') cuenta = 'Efectivo';
      else if (m === 'debito' || m === 'transferencia') cuenta = g.cuenta || m;
      else if (m === 'credito' || m === 'tarjeta') cuenta = g.cuenta || 'Tarjeta';
      else cuenta = 'Efectivo';
      saldos[cuenta] = (saldos[cuenta] || 0) - Number(g.monto);
    };
    gastosP.forEach(restarGasto);
    gastosE.forEach(restarGasto);
    movsTransfer.forEach((t) => {
      if (t.origen) saldos[t.origen] = (saldos[t.origen] || 0) - Number(t.monto);
      if (t.destino) saldos[t.destino] = (saldos[t.destino] || 0) + Number(t.monto);
    });
    return saldos;
  }, [ingresos, gastosP, gastosE, movsTransfer]);

  const getCuentasDisponibles = useCallback(() => {
    const set = new Set(['Efectivo']);
    ingresos.forEach((i) => { if (i.cuenta && i.cuenta !== 'Efectivo') set.add(i.cuenta); });
    gastosP.forEach((g) => { if (g.cuenta && g.cuenta !== 'Efectivo') set.add(g.cuenta); });
    gastosE.forEach((g) => { if (g.cuenta && g.cuenta !== 'Efectivo') set.add(g.cuenta); });
    movsTransfer.forEach((t) => { if (t.origen) set.add(t.origen); if (t.destino) set.add(t.destino); });
    cuentas.forEach((c) => set.add(c));
    return Array.from(set);
  }, [ingresos, gastosP, gastosE, movsTransfer, cuentas]);

  const value = useMemo(() => ({
    ano, mes, setAno, setMes, cambiarMes,
    loading, cargarTodo,
    ingresos, gastosP, gastosE, ahorros, movsAhorro, movsTransfer,
    fijos, fijosPagadosMes, objetivos, tarjetas, gastosTarjeta, deudas,
    mesCerrado, cuentas, cuentasTablaDisponible,
    addIngreso, updateIngreso, delIngreso,
    addGastoPersonal, updateGastoP, delGastoP,
    addGastoEasy, updateGastoE, delGastoE,
    addGastoConTarjeta, addGastoTarjetaConCuotas,
    addMovAhorro, delMovAhorro,
    saveObjetivo,
    cargarDeudas, addDeuda, saldarDeuda, delDeuda,
    addTarjeta, delTarjeta, delGastoTC, updateGastoTC, confirmarPagoTarjeta,
    addFijo, toggleFijo, delFijo, confirmarPagoFijo,
    addTransferInterna, delTransferInterna,
    toggleMesCerrado,
    calcularSaldosCuentas, getCuentasDisponibles,
    addCuenta, renameCuenta, deleteCuenta, listCuentasRaw,
  }), [
    ano, mes, cambiarMes, loading, cargarTodo,
    ingresos, gastosP, gastosE, ahorros, movsAhorro, movsTransfer,
    fijos, fijosPagadosMes, objetivos, tarjetas, gastosTarjeta, deudas,
    mesCerrado, cuentas, cuentasTablaDisponible,
    addIngreso, updateIngreso, delIngreso,
    addGastoPersonal, updateGastoP, delGastoP,
    addGastoEasy, updateGastoE, delGastoE,
    addGastoConTarjeta, addGastoTarjetaConCuotas, addMovAhorro, delMovAhorro, saveObjetivo,
    cargarDeudas, addDeuda, saldarDeuda, delDeuda,
    addTarjeta, delTarjeta, delGastoTC, updateGastoTC, confirmarPagoTarjeta,
    addFijo, toggleFijo, delFijo, confirmarPagoFijo,
    addTransferInterna, delTransferInterna, toggleMesCerrado,
    calcularSaldosCuentas, getCuentasDisponibles,
    addCuenta, renameCuenta, deleteCuenta, listCuentasRaw,
  ]);

  return <FinanzasContext.Provider value={value}>{children}</FinanzasContext.Provider>;
}

export function useFinanzas() {
  const ctx = useContext(FinanzasContext);
  if (!ctx) throw new Error('useFinanzas debe usarse dentro de <FinanzasProvider>');
  return ctx;
}
