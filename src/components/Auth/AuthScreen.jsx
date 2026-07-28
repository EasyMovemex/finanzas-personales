import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function AuthScreen() {
  const { signIn, signUp, resetPasswordForEmail } = useAuth();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMsg, setForgotMsg] = useState({ text: '', type: '' });

  async function doAuth() {
    if (!email.trim() || !pass) {
      setMsg({ text: 'Completá email y contraseña.', type: 'err' });
      return;
    }
    setBusy(true);
    setMsg({ text: '', type: '' });
    try {
      const r = mode === 'login' ? await signIn(email.trim(), pass) : await signUp(email.trim(), pass);
      if (r.error) {
        setMsg({ text: r.error.message.includes('Invalid') ? 'Email o contraseña incorrectos.' : r.error.message, type: 'err' });
      } else if (mode === 'register' && !r.data.session) {
        setMsg({ text: '✓ Revisá tu email para confirmar.', type: 'ok' });
      }
    } catch {
      setMsg({ text: 'Error de conexión.', type: 'err' });
    }
    setBusy(false);
  }

  async function doForgot() {
    if (!forgotEmail.trim()) {
      setForgotMsg({ text: 'Ingresá tu email.', type: 'err' });
      return;
    }
    setForgotMsg({ text: 'Enviando...', type: '' });
    const { error } = await resetPasswordForEmail(forgotEmail.trim());
    if (error) setForgotMsg({ text: 'Error: ' + error.message, type: 'err' });
    else setForgotMsg({ text: '✓ Revisá tu email, te mandamos el link.', type: 'ok' });
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo"><img src="/icon-192.png" style={{ width: 36, height: 36, objectFit: 'contain' }} alt="" /></div>
        <div className="auth-title">Mis Finanzas</div>
        <div className="auth-sub">Control personal de ingresos y gastos</div>
        <div className="auth-tabs">
          <button className={'auth-tab' + (mode === 'login' ? ' active' : '')} onClick={() => { setMode('login'); setMsg({ text: '', type: '' }); }}>Iniciar sesión</button>
          <button className={'auth-tab' + (mode === 'register' ? ' active' : '')} onClick={() => { setMode('register'); setMsg({ text: '', type: '' }); }}>Registrarme</button>
        </div>
        <div className="fg"><label>Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" /></div>
        <div className="fg">
          <label>Contraseña</label>
          <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="••••••••"
            onKeyDown={(e) => { if (e.key === 'Enter') doAuth(); }} />
        </div>
        <button className="btn-main" disabled={busy} onClick={doAuth}>{busy ? 'Cargando...' : (mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta')}</button>
        <div className={'auth-msg' + (msg.type ? ' ' + msg.type : '')}>{msg.text}</div>
        {!showForgot && <button className="auth-link" onClick={() => setShowForgot(true)}>¿Olvidaste tu contraseña?</button>}
        {showForgot && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: 13, color: 'var(--text2)', textAlign: 'center', marginBottom: 10 }}>
              Ingresá tu email y te enviamos un link para resetear tu contraseña.
            </div>
            <div className="fg"><label>Email</label><input type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} placeholder="tu@email.com" /></div>
            <button className="btn-main" style={{ background: 'var(--purple)' }} onClick={doForgot}>Enviar link de recuperación</button>
            <div className={'auth-msg' + (forgotMsg.type ? ' ' + forgotMsg.type : '')}>{forgotMsg.text}</div>
            <button className="auth-link" onClick={() => setShowForgot(false)}>← Volver al login</button>
          </div>
        )}
      </div>
    </div>
  );
}
