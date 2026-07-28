import { useAuth } from '../../context/AuthContext';
import GastoGenericTab from '../GastosPersonales/GastoGenericTab';
import { CATS_GE } from '../../utils/constants';

export default function GastosEasyTab() {
  const { nombreNegocio } = useAuth();
  return (
    <GastoGenericTab
      tipo="easy"
      categorias={CATS_GE}
      colorBtn="blue"
      colorAmt="var(--blue)"
      nombreSeccion={'Gastos ' + nombreNegocio}
    />
  );
}
