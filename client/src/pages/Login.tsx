import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { LogIn, Wrench, User as UserIcon, Lock, AlertCircle } from 'lucide-react';

interface LocationState {
  from?: { pathname: string };
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const from = (location.state as LocationState | null)?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!username.trim() || !password) {
      setError('กรุณาระบุชื่อผู้ใช้และรหัสผ่าน');
      return;
    }
    setLoading(true);
    try {
      const user = await login(username.trim(), password);
      if (user.force_password_change) {
        navigate('/change-password', { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const message = (err as any)?.response?.data?.error || 'เข้าสู่ระบบไม่สำเร็จ';
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
      <Card style={{
        width: '100%',
        maxWidth: '420px',
        padding: '2.5rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'var(--primary-light)',
            marginBottom: '14px',
          }}>
            <Wrench size={28} color="var(--primary)" />
          </div>
          <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>ระบบบำรุงรักษา</h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            ระบบบริหารจัดการงานซ่อมบำรุง
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{
              display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem',
              fontWeight: 700, marginBottom: '6px', color: 'var(--text-main)',
            }}>
              <UserIcon size={14} /> ชื่อผู้ใช้
            </label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              autoFocus
              autoComplete="username"
            />
          </div>

          <div>
            <label style={{
              display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem',
              fontWeight: 700, marginBottom: '6px', color: 'var(--text-main)',
            }}>
              <Lock size={14} /> รหัสผ่าน
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
              autoComplete="current-password"
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

          <Button type="submit" variant="primary" loading={loading} icon={<LogIn size={16} />} style={{ width: '100%' }}>
            เข้าสู่ระบบ
          </Button>
        </form>

        <div style={{
          marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)',
          fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center',
        }}>
          ติดต่อผู้ดูแลระบบหากลืมรหัสผ่าน
        </div>
      </Card>
    </div>
  );
};

export default Login;
