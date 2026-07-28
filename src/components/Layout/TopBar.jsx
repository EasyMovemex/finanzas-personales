import { useAuth } from '../../context/AuthContext';
import { useFinanzas } from '../../context/FinanzasContext';
import { exportPDF } from '../../utils/exportPdf';

export default function TopBar({ onOpenPass, onSearch, nombreNegocio }) {
  const { email, signOut } = useAuth();
  const data = useFinanzas();
  const { mesCerrado, toggleMesCerrado } = data;

  return (
    <div className="topbar">
      <div className="brand">
        <div className="brand-dot"><img src="/icon-192.png" style={{ width: 22, height: 22, objectFit: 'contain' }} alt="" /></div>
        Mis Finanzas
      </div>
      <div className="topbar-r">
        <span className="user-pill">{email}</span>
        <button className="btn-sm" title="Búsqueda rápida" onClick={onSearch}>🔍</button>
        <button className="btn-sm" onClick={() => exportPDF(data, nombreNegocio)}>⬇ PDF</button>
        <button
          id="btn-cerrar-mes-top"
          className="btn-sm"
          style={{ color: mesCerrado ? 'var(--green)' : 'var(--red)' }}
          onClick={async () => {
            const confirmMsg = mesCerrado ? '¿Reabrir el mes? Vas a poder editar los movimientos nuevamente.' : '¿Cerrar el mes? No vas a poder agregar ni editar movimientos hasta que lo reabras.';
            if (!window.confirm(confirmMsg)) return;
            await toggleMesCerrado(!mesCerrado);
          }}
        >
          {mesCerrado ? '🔓 Reabrir mes' : '🔒 Cerrar mes'}
        </button>
        <button className="btn-sm" onClick={onOpenPass}>🔑 Contraseña</button>
        <button className="btn-sm" onClick={() => signOut()}>Salir</button>
      </div>
    </div>
  );
}
