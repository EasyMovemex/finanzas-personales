import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useFinanzas } from '../../context/FinanzasContext';
import TopBar from './TopBar';
import Tabs from './Tabs';
import MesBar from './MesBar';
import AlertBanners from './AlertBanners';
import MesCerradoBanner from './MesCerradoBanner';
import ResumenTab from '../Resumen/ResumenTab';
import IngresosTab from '../Ingresos/IngresosTab';
import GastosPersonalesTab from '../GastosPersonales/GastosPersonalesTab';
import GastosEasyTab from '../GastosEasy/GastosEasyTab';
import AhorrosTab from '../Ahorros/AhorrosTab';
import DeudasTab from '../Deudas/DeudasTab';
import AnualTab from '../Anual/AnualTab';
import TarjetasTab from '../Tarjetas/TarjetasTab';
import FijosTab from '../GastosFijos/FijosTab';
import BuscadorTab from '../Buscador/BuscadorTab';
import ImportarTab from '../Importar/ImportarTab';
import SatTab from '../SAT/SatTab';
import PasswordModal from '../Modals/PasswordModal';

const TABS = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'ingresos', label: 'Ingresos' },
  { id: 'gastos-personal', label: 'Gastos Personales' },
  { id: 'gastos-easy', label: 'Gastos Easy Move' },
  { id: 'ahorros', label: 'Ahorros' },
  { id: 'deudas', label: 'Deudas' },
  { id: 'anual', label: 'Resumen Anual' },
  { id: 'tarjetas', label: '💳 Tarjetas' },
  { id: 'fijos', label: 'Gastos Fijos' },
  { id: 'buscador', label: '🔍 Buscar' },
  { id: 'importar', label: '📥 Importar' },
];

export default function AppShell() {
  const { tieneSAT, nombreNegocio } = useAuth();
  const { mesCerrado } = useFinanzas();
  const [tab, setTab] = useState('resumen');
  const [showPass, setShowPass] = useState(false);

  const tabs = tieneSAT ? [...TABS, { id: 'sat', label: '🧾 SAT' }] : TABS;

  return (
    <div className="app" style={{ display: 'block' }}>
      <TopBar onOpenPass={() => setShowPass(true)} onSearch={() => setTab('buscador')} nombreNegocio={nombreNegocio} />
      <Tabs tabs={tabs} active={tab} onChange={setTab} />
      {mesCerrado && <MesCerradoBanner />}
      <div className="main">
        <MesBar />
        <AlertBanners />
        {tab === 'resumen' && <ResumenTab />}
        {tab === 'ingresos' && <IngresosTab />}
        {tab === 'gastos-personal' && <GastosPersonalesTab />}
        {tab === 'gastos-easy' && <GastosEasyTab />}
        {tab === 'ahorros' && <AhorrosTab />}
        {tab === 'deudas' && <DeudasTab />}
        {tab === 'anual' && <AnualTab />}
        {tab === 'tarjetas' && <TarjetasTab />}
        {tab === 'fijos' && <FijosTab />}
        {tab === 'buscador' && <BuscadorTab />}
        {tab === 'importar' && <ImportarTab />}
        {tab === 'sat' && tieneSAT && <SatTab />}
      </div>
      {showPass && <PasswordModal onClose={() => setShowPass(false)} />}
    </div>
  );
}
