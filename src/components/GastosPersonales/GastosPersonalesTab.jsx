import GastoGenericTab from './GastoGenericTab';
import { CATS_GP } from '../../utils/constants';

export default function GastosPersonalesTab() {
  return (
    <GastoGenericTab
      tipo="personal"
      categorias={CATS_GP}
      colorBtn="red"
      colorAmt="var(--red)"
      nombreSeccion="Gastos personales"
    />
  );
}
