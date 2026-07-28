// Lógica de tarjetas de crédito — PORTADA TAL CUAL del index.html original.
// No modificar el criterio de negocio sin entender bien el impacto en los resúmenes
// mensuales ya guardados en Supabase (gastos_tarjeta.ano / .mes).

// Dado un gasto (fecha) y una tarjeta (dia_cierre, dia_limite),
// calcula a qué período de cobro pertenece el gasto.
// Retorna { mesPago, anoPago, fechaLimite, diasRestantes }
export function calcularPeriodoGasto(fechaGastoStr, diaCierre, diaLimite) {
  const fechaGasto = new Date(fechaGastoStr + 'T12:00:00');
  const diaGasto = fechaGasto.getDate();
  const mesGasto = fechaGasto.getMonth();
  const anoGasto = fechaGasto.getFullYear();

  // Si el gasto cae DESPUÉS del cierre → pertenece al período siguiente
  // Si el gasto cae EN o ANTES del cierre → pertenece al período actual
  let mesPago, anoPago;
  if (diaGasto > diaCierre) {
    mesPago = mesGasto + 1;
    anoPago = anoGasto;
    if (mesPago > 11) { mesPago = 0; anoPago++; }
  } else {
    mesPago = mesGasto;
    anoPago = anoGasto;
  }

  const fechaLimite = new Date(anoPago, mesPago, diaLimite);
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const diasRestantes = Math.round((fechaLimite - hoy) / (1000 * 60 * 60 * 24));

  return { mesPago, anoPago, fechaLimite, diasRestantes };
}

// Para mostrar días hasta el límite del período vigente de una tarjeta
export function diasParaLimite(diaLimite) {
  const hoyD = new Date(); hoyD.setHours(0, 0, 0, 0);
  const limite = new Date(hoyD.getFullYear(), hoyD.getMonth(), diaLimite);
  if (limite <= hoyD) limite.setMonth(limite.getMonth() + 1);
  return Math.round((limite - hoyD) / (1000 * 60 * 60 * 24));
}
