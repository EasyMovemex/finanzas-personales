import { useEffect, useMemo, useState } from 'react';
import { useFinanzas } from '../../context/FinanzasContext';
import { useToast } from '../Common/Toast';
import { fmt, fmtD, hoy } from '../../utils/format';

export default function DeudasTab() {
  const { deudas, cargarDeudas, addDeuda, saldarDeuda, delDeuda } = useFinanzas();
  const toast = useToast();

  useEffect(() => { cargarDeudas(); }, [cargarDeudas]);

  const [deudaTipo, setDeudaTipo] = useState('me_deben');
  const [persona, setPersona] = useState('');
  const [desc, setDesc] = useState('');
  const [fecha, setFecha] = useState(hoy());
  const [monto, setMonto] = useState('');
  const [filtro, setFiltro] = useState('all');
  const [busy, setBusy] = useState(false);

  async function submit() {
    const m = parseFloat(monto);
    if (!persona.trim() || !m || m <= 0) { toast('Completá persona y monto'); return; }
    setBusy(true);
    try {
      await addDeuda({ tipo: deudaTipo, persona: persona.trim(), descripcion: desc.trim(), monto: m, fecha: fecha || hoy() });
      setPersona(''); setDesc(''); setMonto('');
      toast('✓ Deuda registrada');
    } catch (e) { toast('Error: ' + e.message); }
    setBusy(false);
  }

  const meDeben = deudas.filter((d) => d.tipo === 'me_deben' && d.estado === 'pendiente').reduce((s, d) => s + Number(d.monto), 0);
  const debo = deudas.filter((d) => d.tipo === 'debo' && d.estado === 'pendiente').reduce((s, d) => s + Number(d.monto), 0);
  const nMeDeben = deudas.filter((d) => d.tipo === 'me_deben' && d.estado === 'pendiente').length;
  const nDebo = deudas.filter((d) => d.tipo === 'debo' && d.estado === 'pendiente').length;

  let filtradas = deudas;
  if (filtro === 'me_deben') filtradas = deudas.filter((d) => d.tipo === 'me_deben');
  else if (filtro === 'debo') filtradas = deudas.filter((d) => d.tipo === 'debo');
  else if (filtro === 'pendiente') filtradas = deudas.filter((d) => d.estado === 'pendiente');
  else if (filtro === 'pagada') filtradas = deudas.filter((d) => d.estado === 'pagada');

  return (
    <div>
      <div className="add-form">
        <div className="add-form-title">+ Registrar deuda</div>
        <div className="tipo-toggle" style={{ marginBottom: 12 }}>
          <button className={'tipo-btn' + (deudaTipo === 'me_deben' ? ' a-efvo' : '')} onClick={() => setDeudaTipo('me_deben')}>💚 Me deben</button>
          <button className={'tipo-btn' + (deudaTipo === 'debo' ? ' a-ex' : '')} onClick={() => setDeudaTipo('debo')}>🔴 Debo</button>
        </div>
        <div className="form-row cols5">
          <div className="fgl"><label>Persona</label><input type="text" value={persona} onChange={(e) => setPersona(e.target.value)} placeholder="Nombre..." /></div>
          <div className="fgl"><label>Descripción</label><input type="text" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="¿Por qué?" /></div>
          <div className="fgl"><label>Fecha</label><input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></div>
          <div className="fgl"><label>Monto ($)</label><input type="number" min="0" step="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="0.00" /></div>
          <button className="btn-add" style={{ background: deudaTipo === 'me_deben' ? 'var(--green)' : 'var(--red)' }} disabled={busy} onClick={submit}>+ Agregar</button>
        </div>
      </div>
      <div className="metrics" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: '1.25rem' }}>
        <div className="mc m-green"><div className="mc-lbl">💚 Total que me deben</div><div className="mc-val green">{fmt(meDeben)}</div><div className="mc-sub">{nMeDeben} pendiente{nMeDeben !== 1 ? 's' : ''}</div></div>
        <div className="mc m-red"><div className="mc-lbl">🔴 Total que debo</div><div className="mc-val red">{fmt(debo)}</div><div className="mc-sub">{nDebo} pendiente{nDebo !== 1 ? 's' : ''}</div></div>
      </div>
      <div className="section-title">Deudas <span>{deudas.length ? `(${deudas.length})` : ''}</span></div>
      <div className="filter-row">
        <button className={'fbtn' + (filtro === 'all' ? ' active' : '')} onClick={() => setFiltro('all')}>Todas</button>
        <button className={'fbtn' + (filtro === 'me_deben' ? ' active' : '')} onClick={() => setFiltro('me_deben')}>💚 Me deben</button>
        <button className={'fbtn' + (filtro === 'debo' ? ' active' : '')} onClick={() => setFiltro('debo')}>🔴 Debo</button>
        <button className={'fbtn' + (filtro === 'pendiente' ? ' active' : '')} onClick={() => setFiltro('pendiente')}>⏳ Pendientes</button>
        <button className={'fbtn' + (filtro === 'pagada' ? ' active' : '')} onClick={() => setFiltro('pagada')}>✅ Saldadas</button>
      </div>
      <div className="items-list">
        {!filtradas.length && <div className="empty">No hay deudas registradas.</div>}
        {filtradas.map((d) => {
          const esMeDeben = d.tipo === 'me_deben';
          const pagada = d.estado === 'pagada';
          return (
            <div className="item" key={d.id} style={{ opacity: pagada ? 0.6 : 1 }}>
              <div className="item-ico" style={{ background: esMeDeben ? 'var(--green-bg)' : 'var(--red-bg)' }}>{esMeDeben ? '💚' : '🔴'}</div>
              <div className="item-info">
                <div className="item-name">{d.persona}{d.descripcion ? ' — ' + d.descripcion : ''}</div>
                <div className="item-meta">{d.fecha} · {esMeDeben ? 'Me deben' : 'Debo'} · <span style={{ color: pagada ? 'var(--green)' : 'var(--amber)', fontWeight: 600 }}>{pagada ? '✅ Saldada' : '⏳ Pendiente'}</span></div>
              </div>
              <div className="item-amt" style={{ color: esMeDeben ? 'var(--green)' : 'var(--red)' }}>{esMeDeben ? '+' : '-'}{fmtD(d.monto)}</div>
              {!pagada && <button className="item-del" style={{ color: 'var(--green)' }} title="Marcar como saldada" onClick={() => saldarDeuda(d.id)}>✅</button>}
              <button className="item-del" onClick={async () => { if (window.confirm('¿Eliminar esta deuda?')) { await delDeuda(d.id); toast('Eliminada'); } }}>🗑</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
