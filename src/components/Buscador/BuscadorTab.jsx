import { useMemo, useState } from 'react';
import { useFinanzas } from '../../context/FinanzasContext';
import { fmtD } from '../../utils/format';

export default function BuscadorTab() {
  const { ingresos, gastosP, gastosE, deudas } = useFinanzas();
  const [q, setQ] = useState('');
  const [filtro, setFiltro] = useState('all');

  const resultados = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return [];
    const coincide = (item) =>
      (item.descripcion || '').toLowerCase().includes(query) ||
      (item.categoria || '').toLowerCase().includes(query) ||
      (item.fuente || '').toLowerCase().includes(query) ||
      (item.persona || '').toLowerCase().includes(query) ||
      String(item.monto).includes(query);
    let r = [];
    if (filtro === 'all' || filtro === 'ingresos') r = r.concat(ingresos.filter(coincide).map((i) => ({ ...i, _tipo: 'ingreso' })));
    if (filtro === 'all' || filtro === 'personal') r = r.concat(gastosP.filter(coincide).map((g) => ({ ...g, _tipo: 'personal' })));
    if (filtro === 'all' || filtro === 'easy') r = r.concat(gastosE.filter(coincide).map((g) => ({ ...g, _tipo: 'easy' })));
    if (filtro === 'all' || filtro === 'deudas') r = r.concat(deudas.filter(coincide).map((d) => ({ ...d, _tipo: 'deuda' })));
    r.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
    return r;
  }, [q, filtro, ingresos, gastosP, gastosE, deudas]);

  return (
    <div>
      <div className="search-wrap">
        <span className="search-icon">🔍</span>
        <input className="search-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscá por descripción, categoría o monto..." />
        {q && <button className="search-clear" style={{ display: 'block' }} onClick={() => setQ('')}>✕</button>}
      </div>
      <div className="filter-row">
        <button className={'fbtn' + (filtro === 'all' ? ' active' : '')} onClick={() => setFiltro('all')}>Todo</button>
        <button className={'fbtn' + (filtro === 'ingresos' ? ' active' : '')} onClick={() => setFiltro('ingresos')}>Ingresos</button>
        <button className={'fbtn' + (filtro === 'personal' ? ' active' : '')} onClick={() => setFiltro('personal')}>Gastos Pers.</button>
        <button className={'fbtn' + (filtro === 'easy' ? ' active' : '')} onClick={() => setFiltro('easy')}>Gastos Easy</button>
        <button className={'fbtn' + (filtro === 'deudas' ? ' active' : '')} onClick={() => setFiltro('deudas')}>Deudas</button>
      </div>
      <div className="section-title">Resultados <span>{resultados.length ? `(${resultados.length})` : ''}</span></div>
      <div className="items-list">
        {!q && <div className="empty">Escribí algo para buscar</div>}
        {q && !resultados.length && <div className="empty">Sin resultados para "{q}"</div>}
        {resultados.map((r, idx) => {
          const isIng = r._tipo === 'ingreso';
          const isDeuda = r._tipo === 'deuda';
          const color = isIng ? 'var(--green)' : isDeuda ? (r.tipo === 'me_deben' ? 'var(--green)' : 'var(--red)') : 'var(--red)';
          const ico = isIng ? '📥' : r._tipo === 'personal' ? '👤' : r._tipo === 'easy' ? '🚚' : r.tipo === 'me_deben' ? '💚' : '🔴';
          const label = isIng ? 'Ingreso' : r._tipo === 'personal' ? 'Gasto Personal' : r._tipo === 'easy' ? 'Gasto Easy Move' : (r.tipo === 'me_deben' ? 'Me deben' : 'Debo');
          const nombre = r.descripcion || r.fuente || r.persona || '';
          const signo = isIng || r.tipo === 'me_deben' ? '+' : '-';
          return (
            <div className="item" key={r._tipo + r.id + idx}>
              <div className="item-ico" style={{ background: 'var(--surface2)' }}>{ico}</div>
              <div className="item-info">
                <div className="item-name">{nombre}</div>
                <div className="item-meta">{r.fecha || ''} · <span style={{ fontWeight: 500 }}>{label}</span>{r.categoria ? ' · ' + r.categoria : ''}</div>
              </div>
              <div className="item-amt" style={{ color }}>{signo}{fmtD(r.monto)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
