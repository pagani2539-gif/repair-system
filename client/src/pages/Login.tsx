import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
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
      background: 'var(--bg-app)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background Animated Blobs */}
      <style>{`
        @keyframes float-blob-1 {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(50px, -70px) scale(1.15); }
          66% { transform: translate(-30px, 30px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes float-blob-2 {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(-40px, 50px) scale(0.9); }
          66% { transform: translate(60px, -40px) scale(1.1); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes float-blob-3 {
          0% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(30px, 30px) scale(1.05); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes login-fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-logo {
          0%, 100% { box-shadow: 0 0 0 0 rgba(41, 182, 246, 0.25); }
          50% { box-shadow: 0 0 0 10px rgba(41, 182, 246, 0); }
        }
        .login-card-container {
          animation: login-fade-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .bg-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(120px);
          pointer-events: none;
          z-index: 0;
        }
        .bg-blob-1 {
          top: 15%;
          left: 10%;
          width: 320px;
          height: 320px;
          background: #29b6f6;
          opacity: 0.14;
          animation: float-blob-1 12s infinite ease-in-out;
        }
        .bg-blob-2 {
          bottom: 10%;
          right: 15%;
          width: 380px;
          height: 380px;
          background: #0ea5e9;
          opacity: 0.12;
          animation: float-blob-2 15s infinite ease-in-out;
        }
        .bg-blob-3 {
          bottom: 25%;
          left: 35%;
          width: 280px;
          height: 280px;
          background: #3b82f6;
          opacity: 0.08;
          animation: float-blob-3 10s infinite ease-in-out;
        }
        [data-theme='dark'] .bg-blob-1 {
          background: #0284c7;
          opacity: 0.08;
        }
        [data-theme='dark'] .bg-blob-2 {
          background: #0369a1;
          opacity: 0.08;
        }
        [data-theme='dark'] .bg-blob-3 {
          background: #1e3a8a;
          opacity: 0.05;
        }
      `}</style>

      {/* Floating Blobs */}
      <div className="bg-blob bg-blob-1" />
      <div className="bg-blob bg-blob-2" />
      <div className="bg-blob bg-blob-3" />

      {/* Main Glassmorphic Form Card */}
      <div 
        className="login-card-container"
        style={{
          width: '100%',
          maxWidth: '430px',
          padding: '2.75rem 2.5rem',
          background: 'var(--glass-bg)',
          backdropFilter: 'var(--glass-blur)',
          WebkitBackdropFilter: 'var(--glass-blur)',
          border: '1px solid var(--glass-border)',
          borderRadius: '24px',
          boxShadow: 'var(--glass-shadow)',
          zIndex: 1,
          boxSizing: 'border-box',
          position: 'relative',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2.25rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'var(--primary-light)',
            marginBottom: '16px',
            animation: 'pulse-logo 2.5s infinite',
            border: '1px solid rgba(41, 182, 246, 0.15)',
          }}>
            <Wrench size={26} color="var(--primary)" />
          </div>
          <h1 style={{ 
            margin: 0, 
            fontSize: '1.45rem', 
            fontWeight: 800, 
            color: 'var(--text-main)',
            letterSpacing: '-0.02em',
            fontFamily: '"Outfit", "Sarabun", sans-serif'
          }}>
            ระบบซ่อมบำรุงและคลังพัสดุ
          </h1>
          <p style={{ 
            margin: '6px 0 0', 
            fontSize: '0.8rem', 
            color: 'var(--text-muted)',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            fontFamily: '"Outfit", "Sarabun", sans-serif'
          }}>
            Repair & Inventory Management
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              fontSize: '0.82rem',
              fontWeight: 700, 
              marginBottom: '6px', 
              color: 'var(--text-main)',
            }}>
              <UserIcon size={14} color="var(--primary)" /> 
              <span>ชื่อผู้ใช้</span>
            </label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="กรอกชื่อผู้ใช้ของคุณ"
              autoFocus
              autoComplete="username"
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              fontSize: '0.82rem',
              fontWeight: 700, 
              marginBottom: '6px', 
              color: 'var(--text-main)',
            }}>
              <Lock size={14} color="var(--primary)" /> 
              <span>รหัสผ่าน</span>
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="กรอกรหัสผ่านของคุณ"
              autoComplete="current-password"
              style={{ width: '100%' }}
            />
          </div>

          {error && (
            <div style={{
              display: 'flex', 
              alignItems: 'flex-start', 
              gap: '8px',
              padding: '10px 14px', 
              background: 'var(--danger-light)',
              border: '1px solid var(--danger-border)', 
              borderRadius: '12px',
              color: 'var(--danger)', 
              fontSize: '0.82rem', 
              fontWeight: 600,
              lineHeight: '1.4',
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} /> 
              <span>{error}</span>
            </div>
          )}

          <Button 
            type="submit" 
            variant="primary" 
            loading={loading} 
            icon={<LogIn size={16} />} 
            style={{ 
              width: '100%', 
              padding: '12px 24px', 
              borderRadius: '14px',
              fontSize: '0.95rem',
              marginTop: '0.5rem',
            }}
          >
            เข้าสู่ระบบ
          </Button>
        </form>

        <div style={{
          marginTop: '2rem', 
          paddingTop: '1.25rem', 
          borderTop: '1px solid var(--border)',
          fontSize: '0.72rem', 
          color: 'var(--text-muted)', 
          textAlign: 'center',
          fontWeight: 500,
        }}>
          ใช้สำหรับบุคลากรภายในองค์กรเท่านั้น | ลืมรหัสผ่านติดต่อแอดมิน
        </div>
      </div>
    </div>
  );
};

export default Login;
