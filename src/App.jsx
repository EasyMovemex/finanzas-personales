import { AuthProvider, useAuth } from './context/AuthContext';
import { FinanzasProvider } from './context/FinanzasContext';
import { ToastProvider } from './components/Common/Toast';
import AuthScreen from './components/Auth/AuthScreen';
import AppShell from './components/Layout/AppShell';

function Gate() {
  const { session, loading } = useAuth();
  if (loading) return <div className="loading-msg" style={{ paddingTop: '3rem' }}>Cargando…</div>;
  if (!session) return <AuthScreen />;
  return (
    <FinanzasProvider>
      <AppShell />
    </FinanzasProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Gate />
      </ToastProvider>
    </AuthProvider>
  );
}
