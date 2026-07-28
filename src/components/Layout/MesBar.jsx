import { useFinanzas } from '../../context/FinanzasContext';
import { MESES } from '../../utils/constants';

export default function MesBar() {
  const { ano, mes, cambiarMes } = useFinanzas();
  const label = `${MESES[mes]} ${ano}`;
  return (
    <div className="mes-bar">
      <h2>{label}</h2>
      <div className="mes-btns">
        <button className="mes-btn" onClick={() => cambiarMes(-1)}>‹</button>
        <span className="mes-lbl">{label}</span>
        <button className="mes-btn" onClick={() => cambiarMes(1)}>›</button>
      </div>
    </div>
  );
}
