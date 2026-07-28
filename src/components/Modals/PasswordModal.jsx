import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function PasswordModal({ onClose }) {
  const { updatePassword } = useAuth();
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [busy, setBusy] = useState(false);

  async function save() {
    if (p1.length < 6) { setMsg({ text: 'La contraseña debe tener al menos 6 caracteres.', type: 'err' }); return; }
    if (p1 !== p2) { setMsg({ text: 'Las contraseñas no coinciden.', type: 'err' }); return; }
    setBusy(true);
    setMsg({ text: 'Guardando...', type: '' });
    const { error } = await updatePassword(p1);
    setBusy(false);
    if (error) setMsg({ text: 'Error: ' + error.message, type: 'err' });
    else { setMsg({ text: '✓ Contraseña actualizada.', type: 'ok' }); setTimeout(onClose, 1200); }
  }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box">
        <div className="modal-title">🔑 Cambiar contraseña <button className="modal-close" onClick={onClose}>×</button></div>
        <div className="fg"><label>Nueva contraseña</label><input type="password" value={p1} onChange={(e) => setP1(e.target.value)} placeholder="Mínimo 6 caracteres" /></div>
        <div className="fg"><label>Confirmar contraseña</label><input type="password" value={p2} onChange={(e) => setP2(e.target.value)} placeholder="Repetí la contraseña" /></div>
        <div className={'auth-msg' + (msg.type ? ' ' + msg.type : '')}>{msg.text}</div>
        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Cancelar</button>
          <button className="btn-save" disabled={busy} onClick={save}>Guardar contraseña</button>
        </div>
      </div>
    </div>
  );
}
