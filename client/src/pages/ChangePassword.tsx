import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi, tokenStorage } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { KeyRound, Lock, Check, AlertCircle } from 'lucide-react';

const ChangePassword: React.FC = () => {
  const navigate = useNavigate();
  const { user, refreshUser, logout } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isFirstLogin = user?.force_password_change;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 6) {
      setError('รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }
    setLoading(true);
    try {
      const { token } = await authApi.changePassword(currentPassword, newPassword);
      tokenStorage.set(token);
      await refreshUser();
      navigate('/', { replace: true });
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const message = (err as any)?.response?.data?.error || 'ไม่สามารถเปลี่ยนรหัสผ่านได้';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      <Card style={{ width: '100%', maxWidth: '440px', padding: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '60px', height: '60px', borderRadius: '50%',
            background: 'var(--primary-light)', marginBottom: '12px',
          }}>
            <KeyRound size={26} color="var(--primary)" />
          </div>
          <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800 }}>
            {isFirstLogin ? 'กรุณาตั้งรหัสผ่านใหม่' : 'เปลี่ยนรหัสผ่าน'}
          </h2>
          {isFirstLogin && (
            <p style={{ margin: '6px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              นี่คือการเข้าสู่ระบบครั้งแรก กรุณาเปลี่ยนรหัสผ่านเริ่มต้น
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>
              <Lock size={14} /> รหัสผ่านปัจจุบัน
            </label>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>
              <Lock size={14} /> รหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)
            </label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>
              <Lock size={14} /> ยืนยันรหัสผ่านใหม่
            </label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>

          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 12px', background: 'var(--danger-light)',
              border: '1px solid var(--danger)', borderRadius: '8px',
              color: 'var(--danger)', fontSize: '0.85rem', fontWeight: 600,
            }}>
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            {!isFirstLogin && (
              <Button type="button" variant="outline" onClick={() => navigate(-1)} style={{ flex: 1 }} disabled={loading}>
                ยกเลิก
              </Button>
            )}
            <Button type="submit" variant="primary" loading={loading} icon={<Check size={16} />} style={{ flex: 1 }}>
              บันทึกรหัสผ่านใหม่
            </Button>
          </div>

          {isFirstLogin && (
            <button
              type="button"
              onClick={logout}
              style={{
                background: 'transparent', border: 'none', color: 'var(--text-muted)',
                fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline',
                marginTop: '8px',
              }}
            >
              ออกจากระบบ
            </button>
          )}
        </form>
      </Card>
    </div>
  );
};

export default ChangePassword;
