export function fmt(n) {
  return '$' + Math.abs(Math.round(n || 0)).toLocaleString('es-MX');
}
export function fmtD(n) {
  return '$' + Math.abs(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
export function hoy() {
  return new Date().toISOString().split('T')[0];
}
