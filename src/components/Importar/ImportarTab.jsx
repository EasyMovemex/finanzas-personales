import { useState } from 'react';
import { sb } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { useFinanzas } from '../../context/FinanzasContext';
import { useToast } from '../Common/Toast';
import { hoy } from '../../utils/format';

function parsearFecha(str) {
  if (!str) return hoy();
  str = str.trim();
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
    const p = str.split('/');
    return `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  return hoy();
}
function parseLineaCSV(line) {
  const result = []; let current = ''; let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') inQuotes = !inQuotes;
    else if (c === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
    else current += c;
  }
  result.push(current.trim());
  return result;
}

export default function ImportarTab() {
  const { uid } = useAuth();
  const { cargarTodo, mesCerrado } = useFinanzas();
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [errores, setErrores] = useState([]);
  const [resultado, setResultado] = useState(null);
  const [busy, setBusy] = useState(false);

  function descargarPlantilla() {
    const data = [
      ['Tipo', 'Fecha', 'Descripcion', 'Categoria', 'Monto', 'Forma de pago'],
      ['Ingreso', '15/05/2026', 'Flete Polanco', 'Fletes', '3500', 'Efectivo'],
      ['Ingreso', '16/05/2026', 'Flete CDMX', 'Fletes', '5000', 'Transferencia'],
      ['Gasto Personal', '17/05/2026', 'Supermercado', 'Supermercado', '1200', ''],
      ['Gasto Personal', '18/05/2026', 'Gasolina auto', 'Transporte', '800', ''],
      ['Gasto Easy Move', '01/05/2026', 'Gasolina camion', 'Gasolina', '2500', ''],
      ['Gasto Easy Move', '05/05/2026', 'Cuota camion', 'Cuota camion', '8000', ''],
    ];
    const csv = data.map((r) => r.map((c) => `"${c}"`).join(',')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }));
    a.download = 'plantilla-finanzas.csv';
    a.click();
    toast('Plantilla descargada');
  }

  function onFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) { toast('El archivo está vacío o no tiene datos'); return; }
      const errs = [];
      const parsed = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = parseLineaCSV(lines[i]);
        if (cols.length < 5) { errs.push(`Fila ${i + 1}: faltan columnas`); continue; }
        const tipoRaw = (cols[0] || '').replace(/"/g, '').trim().toLowerCase();
        const fecha = parsearFecha((cols[1] || '').replace(/"/g, ''));
        const desc = (cols[2] || '').replace(/"/g, '').trim();
        const cat = (cols[3] || '').replace(/"/g, '').trim();
        const monto = parseFloat((cols[4] || '').replace(/"/g, '').replace(',', '.'));
        const forma = (cols[5] || '').replace(/"/g, '').trim().toLowerCase();
        if (!desc) { errs.push(`Fila ${i + 1}: sin descripción`); continue; }
        if (isNaN(monto) || monto <= 0) { errs.push(`Fila ${i + 1}: monto inválido`); continue; }
        let tipoFinal = '';
        if (tipoRaw.includes('ingreso')) tipoFinal = 'ingreso';
        else if (tipoRaw.includes('personal')) tipoFinal = 'personal';
        else if (tipoRaw.includes('easy')) tipoFinal = 'easy';
        else { errs.push(`Fila ${i + 1}: tipo inválido "${cols[0]}"`); continue; }
        const fechaObj = new Date(fecha + 'T12:00:00');
        parsed.push({ tipo: tipoFinal, fecha, desc, cat: cat || 'Varios', monto, forma, ano: fechaObj.getFullYear(), mes: fechaObj.getMonth() });
      }
      setRows(parsed);
      setErrores(errs);
      setResultado(null);
    };
    reader.readAsText(file, 'UTF-8');
  }

  async function importar() {
    if (!rows.length) { toast('No hay datos para importar'); return; }
    if (mesCerrado) { toast('Este mes está cerrado. Reabrilo para editar.'); return; }
    setBusy(true);
    const ingresosBulk = [], gpBulk = [], geBulk = [];
    rows.forEach((r) => {
      if (r.tipo === 'ingreso') ingresosBulk.push({ uid, ano: r.ano, mes: r.mes, fecha: r.fecha, fuente: r.cat.toLowerCase().includes('flete') ? 'Fletes' : 'Otros', tipo: r.forma.includes('transf') ? 'tranf' : 'efvo', descripcion: r.desc, monto: r.monto });
      else if (r.tipo === 'personal') gpBulk.push({ uid, ano: r.ano, mes: r.mes, fecha: r.fecha, descripcion: r.desc, categoria: r.cat, monto: r.monto });
      else if (r.tipo === 'easy') geBulk.push({ uid, ano: r.ano, mes: r.mes, fecha: r.fecha, descripcion: r.desc, categoria: r.cat, monto: r.monto });
    });
    let ok = 0, err = 0;
    if (ingresosBulk.length) { const { error } = await sb.from('ingresos_personal').insert(ingresosBulk); if (error) err += ingresosBulk.length; else ok += ingresosBulk.length; }
    if (gpBulk.length) { const { error } = await sb.from('gastos_personal').insert(gpBulk); if (error) err += gpBulk.length; else ok += gpBulk.length; }
    if (geBulk.length) { const { error } = await sb.from('gastos_easy').insert(geBulk); if (error) err += geBulk.length; else ok += geBulk.length; }
    setBusy(false);
    setResultado({ ok, err });
    await cargarTodo();
    setRows([]);
    toast(`Importación completada: ${ok} movimientos`);
  }

  return (
    <div>
      <div className="add-form" style={{ marginBottom: '1.25rem' }}>
        <div className="add-form-title">📥 Importar desde Excel / CSV</div>
        <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: '1rem', lineHeight: 1.6 }}>
          Guardá tu planilla de Excel como <strong>CSV</strong> y subila acá. Columnas requeridas:<br />
          <code style={{ background: 'var(--surface2)', padding: '2px 8px', borderRadius: 4, fontSize: 12, display: 'inline-block', marginTop: 4 }}>Tipo | Fecha | Descripcion | Categoria | Monto | Forma de pago</code>
        </div>
        <div style={{ background: 'var(--surface2)', borderRadius: 'var(--r)', padding: 10, marginBottom: '1rem', fontSize: 12, color: 'var(--text2)' }}>
          <strong>Tipo:</strong> Ingreso, Gasto Personal, Gasto Easy Move &nbsp;·&nbsp;
          <strong>Fecha:</strong> DD/MM/YYYY &nbsp;·&nbsp;
          <strong>Forma de pago:</strong> Efectivo o Transferencia (solo para ingresos)
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--teal)', color: '#fff', padding: '8px 16px', borderRadius: 'var(--r)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            📂 Seleccionar CSV
            <input type="file" accept=".csv,.txt" style={{ display: 'none' }} onChange={onFile} />
          </label>
          <button className="btn-add" style={{ background: 'var(--surface2)', color: 'var(--text2)', border: '1px solid var(--border)' }} onClick={descargarPlantilla}>⬇ Plantilla de ejemplo</button>
        </div>
      </div>

      {rows.length > 0 && (
        <div>
          <div className="section-title" style={{ marginBottom: 10 }}>
            Vista previa <span>({rows.length} filas válidas{errores.length ? ` - ${errores.length} errores` : ''})</span>
            <button className="btn-add" style={{ background: 'var(--green)' }} disabled={busy} onClick={importar}>✓ Importar todo</button>
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--rl)', overflow: 'hidden', marginBottom: '1rem', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr style={{ background: 'var(--surface2)' }}>
                {['Tipo', 'Fecha', 'Descripcion', 'Categoria', 'Monto', 'Forma'].map((h) => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 11, color: 'var(--text2)', fontWeight: 600, borderBottom: '2px solid var(--border)' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {rows.map((r, i) => {
                  const colores = { ingreso: 'var(--green)', personal: 'var(--red)', easy: 'var(--blue)' };
                  const iconos = { ingreso: 'Ingreso', personal: 'Gasto Personal', easy: 'Gasto Easy Move' };
                  return (
                    <tr key={i}>
                      <td style={{ padding: '7px 10px', borderBottom: '1px solid var(--border)', fontSize: 12, color: colores[r.tipo] }}>{iconos[r.tipo]}</td>
                      <td style={{ padding: '7px 10px', borderBottom: '1px solid var(--border)', fontSize: 12 }}>{r.fecha}</td>
                      <td style={{ padding: '7px 10px', borderBottom: '1px solid var(--border)', fontSize: 12 }}>{r.desc}</td>
                      <td style={{ padding: '7px 10px', borderBottom: '1px solid var(--border)', fontSize: 12 }}>{r.cat}</td>
                      <td style={{ padding: '7px 10px', borderBottom: '1px solid var(--border)', fontSize: 12, fontWeight: 600, color: colores[r.tipo] }}>${r.monto.toLocaleString('es-MX')}</td>
                      <td style={{ padding: '7px 10px', borderBottom: '1px solid var(--border)', fontSize: 12, color: 'var(--text2)' }}>{r.forma.includes('transf') ? 'Transferencia' : (r.tipo === 'ingreso' ? 'Efectivo' : '-')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {errores.length > 0 && (
            <div style={{ background: 'var(--red-bg)', border: '1px solid var(--red)', borderRadius: 'var(--r)', padding: '10px 14px', fontSize: 12, color: 'var(--red)', marginBottom: '1rem' }}>
              <strong>Filas con errores (no se importarán):</strong><br />{errores.join('. ')}
            </div>
          )}
          {resultado && (
            <div style={{ background: 'var(--green-bg)', border: '1px solid var(--green)', borderRadius: 'var(--r)', padding: '12px 16px', fontSize: 13, color: 'var(--green)' }}>
              <strong>{resultado.ok} movimientos importados</strong>{resultado.err ? ` - ${resultado.err} con error` : ''}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
