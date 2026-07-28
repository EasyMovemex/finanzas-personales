import { useFinanzas } from '../../context/FinanzasContext';

export default function MesCerradoBanner() {
  const { toggleMesCerrado } = useFinanzas();
  return (
    <div style={{ padding: '.5rem 1rem', background: 'var(--surface2)', borderBottom: '1px solid var(--border)' }}>
      <div className="mes-cerrado-banner">
        <div className="mes-cerrado-txt">🔒 <strong>Este mes está cerrado.</strong> No podés agregar ni editar movimientos.</div>
        <button className="btn-abrir-mes" onClick={async () => {
          if (!window.confirm('¿Reabrir el mes? Vas a poder editar los movimientos nuevamente.')) return;
          await toggleMesCerrado(false);
        }}>🔓 Reabrir mes</button>
      </div>
    </div>
  );
}
