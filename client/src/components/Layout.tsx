import React, { useState, useEffect, createContext, useContext } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ClipboardList, 
  PlusCircle, 
  Wrench, 
  History, 
  CheckCircle2, 
  AlertCircle, 
  Info,
  X
} from 'lucide-react';
import { repairApi } from '../api';

// Notification Context
type NotificationType = 'success' | 'error' | 'info';
interface Notification {
  id: string;
  message: string;
  type: NotificationType;
}

interface NotificationContextType {
  notify: (message: string, type?: NotificationType) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotification must be used within NotificationProvider');
  return context;
};

const Layout: React.FC = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const notify = (message: string, type: NotificationType = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const prevUnreadCount = React.useRef(0);

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const { count } = await repairApi.getUnreadCount();
        
        // If unread count increased, notify user
        if (count > prevUnreadCount.current && prevUnreadCount.current !== 0) {
          console.log('New ticket detected, triggering notification...');
          notify(`มีงานแจ้งซ่อมใหม่เข้ามา ${count - prevUnreadCount.current} รายการ`, 'info');
        }
        
        prevUnreadCount.current = count;
        setUnreadCount(count);
      } catch (err) {
        console.error('Failed to fetch unread count:', err);
      }
    };
    
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <NotificationContext.Provider value={{ notify }}>
      <div className="app-container">
        {/* Toast Notifications */}
        <div className="toast-container">
          {notifications.map(n => (
            <div key={n.id} className={`toast toast-${n.type}`}>
              {n.type === 'success' && <CheckCircle2 size={20} color="var(--success)" />}
              {n.type === 'error' && <AlertCircle size={20} color="var(--danger)" />}
              {n.type === 'info' && <Info size={20} color="var(--primary)" />}
              <span style={{ fontSize: '0.9rem', fontWeight: 500, flexGrow: 1 }}>{n.message}</span>
              <button 
                onClick={() => removeNotification(n.id)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>

        <aside className="sidebar">
          <div className="sidebar-logo">
            <div style={{ background: 'var(--primary-light)', padding: '8px', borderRadius: '12px', display: 'flex' }}>
              <Wrench size={24} />
            </div>
            <h1>RepairSystem</h1>
          </div>
          
          <nav>
            <NavLink to="/" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
              <LayoutDashboard size={18} /> แผงควบคุม
            </NavLink>
            <NavLink to="/repairs" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
              <ClipboardList size={18} /> ติดตามสถานะ
              {unreadCount > 0 && <span className="badge" style={{ marginLeft: 'auto', backgroundColor: '#ef4444', color: 'white', fontSize: '0.7rem' }}>{unreadCount}</span>}
            </NavLink>
            <NavLink to="/new" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
              <PlusCircle size={18} /> แจ้งซ่อมใหม่
            </NavLink>
            <NavLink to="/claim" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
              <PlusCircle size={18} /> แจ้งเคลมอุปกรณ์
            </NavLink>
            <NavLink to="/claim-history" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
              <History size={18} /> ประวัติการส่งเคลม
            </NavLink>
          </nav>
        </aside>

        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </NotificationContext.Provider>
  );
};

export default Layout;
