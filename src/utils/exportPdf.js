import { MESES } from './constants';
import { fmt, fmtD } from './format';

// Generación de PDF vía "imprimir" del navegador — port directo del exportPDF()
// original, simplificado (sin desglose de subtotales de ingresos, que ahora vive
// en el propio dashboard). Sigue generando una ventana nueva con el resumen del
// mes para imprimir / guardar como PDF.
export function exportPDF({ ano, mes, ingresos, gastosP, gastosE, ahorros }, nombreNegocio) {
  const totIng = ingresos.reduce((s, i) => s + Number(i.monto), 0);
  const totGP = gastosP.reduce((s, g) => s + Number(g.monto), 0);
  const totGE = gastosE.reduce((s, g) => s + Number(g.monto), 0);
  const bal = totIng - totGP - totGE;

  function filaIngreso(i) {
    const color = i.tipo === 'efvo' ? '#1e6b3e' : '#1a5fa8';
    const bg = i.tipo === 'efvo' ? '#eaf5ee' : '#eaf2fd';
    return `<tr>
      <td style="padding:7px 10px;border-bottom:1px solid #f0ede8;font-size:12px;color:#6b6760">${i.fecha}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #f0ede8;font-size:12px">${i.fuente}${i.descripcion ? ' — ' + i.descripcion : ''}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #f0ede8;font-size:12px;text-align:center"><span style="background:${bg};color:${color};padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600">${i.tipo === 'efvo' ? 'Efectivo' : 'Transferencia'}</span></td>
      <td style="padding:7px 10px;border-bottom:1px solid #f0ede8;font-size:12px;text-align:right;font-weight:600;color:#1e6b3e">+${fmtD(i.monto)}</td>
    </tr>`;
  }
  function filaGasto(g, color, bg) {
    return `<tr>
      <td style="padding:7px 10px;border-bottom:1px solid #f0ede8;font-size:12px;color:#6b6760">${g.fecha}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #f0ede8;font-size:12px">${g.descripcion}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #f0ede8;font-size:12px;text-align:center"><span style="background:${bg};color:${color};padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600">${g.categoria}</span></td>
      <td style="padding:7px 10px;border-bottom:1px solid #f0ede8;font-size:12px;text-align:right;font-weight:600;color:${color}">-${fmtD(g.monto)}</td>
    </tr>`;
  }

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/>
  <title>Mis Finanzas — ${MESES[mes]} ${ano}</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@500&display=swap" rel="stylesheet">
  <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'DM Sans',sans-serif;background:#f5f4f0;color:#1a1917;padding:32px}
  @media print{body{background:#fff;padding:0}.no-print{display:none}@page{margin:20mm}}</style></head><body>
  <div style="background:#0b6350;border-radius:14px;padding:28px 32px;margin-bottom:24px;display:flex;justify-content:space-between;align-items:center">
    <div><div style="font-size:11px;color:rgba(255,255,255,.6);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Reporte mensual</div>
    <div style="font-size:28px;font-weight:700;color:#fff">${MESES[mes]} ${ano}</div>
    <div style="font-size:13px;color:rgba(255,255,255,.7);margin-top:4px">Mis Finanzas Personales</div></div>
    <div style="text-align:right"><div style="font-size:11px;color:rgba(255,255,255,.6);margin-bottom:4px">Balance neto</div>
    <div style="font-size:32px;font-weight:700;color:${bal >= 0 ? '#5DCAA5' : '#F09595'};font-family:'DM Mono',monospace">${bal >= 0 ? '+' : '-'}${fmt(bal)}</div></div>
  </div>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px">
    <div style="background:#fff;border-radius:12px;padding:16px;border:1px solid #e0dbd5;border-top:3px solid #5DCAA5">
      <div style="font-size:11px;color:#6b6760;margin-bottom:6px;font-weight:500">📥 INGRESOS TOTALES</div>
      <div style="font-size:24px;font-weight:700;color:#1e6b3e;font-family:'DM Mono',monospace">${fmt(totIng)}</div></div>
    <div style="background:#fff;border-radius:12px;padding:16px;border:1px solid #e0dbd5;border-top:3px solid #F09595">
      <div style="font-size:11px;color:#6b6760;margin-bottom:6px;font-weight:500">📤 GASTOS PERSONALES</div>
      <div style="font-size:24px;font-weight:700;color:#a8291f;font-family:'DM Mono',monospace">${fmt(totGP)}</div></div>
    <div style="background:#fff;border-radius:12px;padding:16px;border:1px solid #e0dbd5;border-top:3px solid #85B7EB">
      <div style="font-size:11px;color:#6b6760;margin-bottom:6px;font-weight:500">🚚 GASTOS ${(nombreNegocio || 'EASY MOVE').toUpperCase()}</div>
      <div style="font-size:24px;font-weight:700;color:#1a5fa8;font-family:'DM Mono',monospace">${fmt(totGE)}</div></div>
  </div>
  <div style="background:#fff;border-radius:12px;padding:20px 24px;margin-bottom:24px;border:1px solid #e0dbd5">
    <div style="font-size:13px;font-weight:700;margin-bottom:14px;color:#1a1917">📊 Ingresos</div>
    ${ingresos.length ? `<table style="width:100%;border-collapse:collapse"><thead><tr style="background:#f5f4f0">
      <th style="padding:8px 10px;text-align:left;font-size:11px;color:#6b6760;border-bottom:2px solid #e0dbd5">FECHA</th>
      <th style="padding:8px 10px;text-align:left;font-size:11px;color:#6b6760;border-bottom:2px solid #e0dbd5">DESCRIPCIÓN</th>
      <th style="padding:8px 10px;text-align:center;font-size:11px;color:#6b6760;border-bottom:2px solid #e0dbd5">TIPO</th>
      <th style="padding:8px 10px;text-align:right;font-size:11px;color:#6b6760;border-bottom:2px solid #e0dbd5">MONTO</th>
    </tr></thead><tbody>${ingresos.map(filaIngreso).join('')}</tbody></table>` : '<div style="text-align:center;padding:20px;color:#a09c97;font-size:13px">Sin ingresos este mes</div>'}
  </div>
  <div style="background:#fff;border-radius:12px;padding:20px 24px;margin-bottom:24px;border:1px solid #e0dbd5">
    <div style="font-size:13px;font-weight:700;margin-bottom:14px;color:#1a1917">📤 Gastos personales</div>
    ${gastosP.length ? `<table style="width:100%;border-collapse:collapse"><thead><tr style="background:#f5f4f0">
      <th style="padding:8px 10px;text-align:left;font-size:11px;color:#6b6760;border-bottom:2px solid #e0dbd5">FECHA</th>
      <th style="padding:8px 10px;text-align:left;font-size:11px;color:#6b6760;border-bottom:2px solid #e0dbd5">DESCRIPCIÓN</th>
      <th style="padding:8px 10px;text-align:center;font-size:11px;color:#6b6760;border-bottom:2px solid #e0dbd5">CATEGORÍA</th>
      <th style="padding:8px 10px;text-align:right;font-size:11px;color:#6b6760;border-bottom:2px solid #e0dbd5">MONTO</th>
    </tr></thead><tbody>${gastosP.map((g) => filaGasto(g, '#a8291f', '#fdf0ef')).join('')}</tbody></table>` : '<div style="text-align:center;padding:20px;color:#a09c97;font-size:13px">Sin gastos personales este mes</div>'}
  </div>
  <div style="background:#fff;border-radius:12px;padding:20px 24px;margin-bottom:24px;border:1px solid #e0dbd5">
    <div style="font-size:13px;font-weight:700;margin-bottom:14px;color:#1a1917">🚚 Gastos ${nombreNegocio || 'Easy Move'}</div>
    ${gastosE.length ? `<table style="width:100%;border-collapse:collapse"><thead><tr style="background:#f5f4f0">
      <th style="padding:8px 10px;text-align:left;font-size:11px;color:#6b6760;border-bottom:2px solid #e0dbd5">FECHA</th>
      <th style="padding:8px 10px;text-align:left;font-size:11px;color:#6b6760;border-bottom:2px solid #e0dbd5">DESCRIPCIÓN</th>
      <th style="padding:8px 10px;text-align:center;font-size:11px;color:#6b6760;border-bottom:2px solid #e0dbd5">CATEGORÍA</th>
      <th style="padding:8px 10px;text-align:right;font-size:11px;color:#6b6760;border-bottom:2px solid #e0dbd5">MONTO</th>
    </tr></thead><tbody>${gastosE.map((g) => filaGasto(g, '#1a5fa8', '#eaf2fd')).join('')}</tbody></table>` : '<div style="text-align:center;padding:20px;color:#a09c97;font-size:13px">Sin gastos este mes</div>'}
  </div>
  <div style="background:#fff;border-radius:12px;padding:20px 24px;margin-bottom:24px;border:1px solid #e0dbd5">
    <div style="font-size:13px;font-weight:700;margin-bottom:14px;color:#1a1917">💰 Ahorros del mes</div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">
      <div style="background:#f0ecff;border-radius:8px;padding:14px;text-align:center"><div style="font-size:11px;color:#5b3fa0;font-weight:600;margin-bottom:6px">🏦 PESOS</div>
      <div style="font-size:22px;font-weight:700;color:#5b3fa0;font-family:'DM Mono',monospace">${fmt(ahorros.pesos)}</div></div>
      <div style="background:#f0ecff;border-radius:8px;padding:14px;text-align:center"><div style="font-size:11px;color:#5b3fa0;font-weight:600;margin-bottom:6px">💵 DÓLARES</div>
      <div style="font-size:22px;font-weight:700;color:#5b3fa0;font-family:'DM Mono',monospace">USD ${Number(ahorros.dolares || 0).toLocaleString('es-MX')}</div></div>
      <div style="background:#f0ecff;border-radius:8px;padding:14px;text-align:center"><div style="font-size:11px;color:#5b3fa0;font-weight:600;margin-bottom:6px">💳 TARJETAS</div>
      <div style="font-size:22px;font-weight:700;color:#5b3fa0;font-family:'DM Mono',monospace">${fmt(ahorros.tarjetas)}</div></div>
    </div>
  </div>
  <div style="text-align:center;font-size:11px;color:#a09c97;margin-top:8px">Generado el ${new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })} · Mis Finanzas Personales</div>
  <div class="no-print" style="text-align:center;margin-top:24px"><button onclick="window.print()" style="background:#0b6350;color:#fff;border:none;border-radius:8px;padding:12px 28px;font-size:15px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif">🖨 Imprimir / Guardar PDF</button></div>
  </body></html>`;

  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 800);
}
