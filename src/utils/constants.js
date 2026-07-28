export const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
export const MESES_CORTOS = MESES.map(m => m.slice(0,3));

export const CAT_ICONS_GP = {'Comida y bebida':'🍴','Supermercado':'🛒','Transporte':'🚗','Alquiler / Renta':'🏡','Servicios':'⚡','Salud':'❤️','Entretenimiento':'🎬','Ropa':'👕','Tarjetas':'💳','Transferencias':'💸','Suscripciones':'🔄','Varios':'📦'};
export const CAT_COLORS = {'Comida y bebida':'rgba(239,68,68,.12)','Supermercado':'rgba(34,197,94,.12)','Transporte':'rgba(59,130,246,.12)','Alquiler / Renta':'rgba(168,85,247,.12)','Servicios':'rgba(245,158,11,.12)','Salud':'rgba(236,72,153,.12)','Entretenimiento':'rgba(99,102,241,.12)','Ropa':'rgba(20,184,166,.12)','Tarjetas':'rgba(139,92,246,.12)','Transferencias':'rgba(14,165,233,.12)','Suscripciones':'rgba(249,115,22,.12)','Varios':'rgba(107,114,128,.12)','default':'rgba(107,114,128,.12)'};
export const CAT_BORDER = {'Comida y bebida':'rgba(239,68,68,.5)','Supermercado':'rgba(34,197,94,.5)','Transporte':'rgba(59,130,246,.5)','Alquiler / Renta':'rgba(168,85,247,.5)','Servicios':'rgba(245,158,11,.5)','Salud':'rgba(236,72,153,.5)','Entretenimiento':'rgba(99,102,241,.5)','Ropa':'rgba(20,184,166,.5)','Tarjetas':'rgba(139,92,246,.5)','Transferencias':'rgba(14,165,233,.5)','Suscripciones':'rgba(249,115,22,.5)','Varios':'rgba(107,114,128,.5)','default':'rgba(107,114,128,.5)'};
export const CAT_ICONS_GE = {'Cuota camión':'🚚','Gasolina':'⛽','Mecánico / Repuestos':'🔧','Publicidad':'📣','Línea telefónica':'📱','Pago empleados':'👷','Alquiler local':'🏢','Transferencias':'💸','Tarjetas':'💳','Varios Easy Move':'📦'};

// NOTE (categorías configurables — requisito secundario):
// TODO: estas categorías siguen siendo listas fijas en JS, igual que en la app original.
// Convertirlas en una tabla Supabase configurable (ej. "categorias") quedó fuera del
// alcance de esta primera reescritura porque el requisito de "cuentas" configurables
// tenía prioridad. La estructura de componentes (CategorySelect) ya está aislada
// para que sea fácil migrarlas a datos remotos más adelante sin tocar el resto de la UI.
export const CATS_GP = ['Comida y bebida','Supermercado','Transporte','Alquiler / Renta','Servicios','Salud','Entretenimiento','Ropa','Tarjetas','Transferencias','Suscripciones','Varios'];
export const CATS_GE = ['Cuota camión','Gasolina','Mecánico / Repuestos','Publicidad','Línea telefónica','Pago empleados','Alquiler local','Transferencias','Tarjetas','Varios Easy Move'];
export const CATS_TC = ['Comida y bebida','Supermercado','Ropa','Salud','Entretenimiento','Suscripciones','Servicios','Transporte','Varios'];

export const UIDS_SAT = ['48a815a8-60c7-4299-bc3a-029966704e9d'];

export const DEFAULT_CUENTAS = ['Efectivo','NU','Klar','Mercado Pago','BBVA','Santander','Banamex','Otro'];

export const TASAS_RESICO = [
  {limite:8952.49,tasa:0.01},{limite:15158.82,tasa:0.02},{limite:26449.34,tasa:0.03},
  {limite:30817.91,tasa:0.04},{limite:32736.83,tasa:0.05},{limite:42280.22,tasa:0.06},
  {limite:50000,tasa:0.07},{limite:78750.59,tasa:0.08},{limite:Infinity,tasa:0.09}
];
export function getTasaISR(ing) {
  for (const t of TASAS_RESICO) { if (ing <= t.limite) return t.tasa; }
  return 0.09;
}
