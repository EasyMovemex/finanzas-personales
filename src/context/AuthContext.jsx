import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { sb } from '../lib/supabaseClient';
import { UIDS_SAT } from '../utils/constants';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    sb.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = useCallback((email, password) => sb.auth.signInWithPassword({ email, password }), []);
  const signUp = useCallback((email, password) => sb.auth.signUp({ email, password }), []);
  const signOut = useCallback(() => sb.auth.signOut(), []);
  const resetPasswordForEmail = useCallback(
    (email) => sb.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + window.location.pathname }),
    []
  );
  const updatePassword = useCallback((password) => sb.auth.updateUser({ password }), []);

  const uid = session?.user?.id || null;
  const tieneSAT = uid ? UIDS_SAT.includes(uid) : false;
  const nombreNegocio = uid === '48a815a8-60c7-4299-bc3a-029966704e9d' ? 'Aesthetic Nails' : 'Easy Move';
  const fuenteIngresoNegocio = uid === '48a815a8-60c7-4299-bc3a-029966704e9d' ? 'Aesthetic Nails' : 'Easy Move';

  const value = useMemo(() => ({
    session, loading, uid, email: session?.user?.email || '',
    tieneSAT, nombreNegocio, fuenteIngresoNegocio,
    signIn, signUp, signOut, resetPasswordForEmail, updatePassword,
  }), [session, loading, uid, tieneSAT, nombreNegocio, fuenteIngresoNegocio, signIn, signUp, signOut, resetPasswordForEmail, updatePassword]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
