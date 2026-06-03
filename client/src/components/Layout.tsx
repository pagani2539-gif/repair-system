import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { 
  LayoutGrid,
  Wrench, 
  PlusCircle, 
  ShieldPlus,
  ShieldCheck,
  ShieldAlert, 
  Check, 
  Info,
  X,
  Boxes,
  ArrowUpRight,
  ClipboardList,
  Activity,
  ShoppingBag,
  PieChart,
  Search,
  PanelLeftClose,
  PanelLeft,
  Menu
} from 'lucide-react';
import { repairApi, transactionApi, searchApi } from '../api';
import type { GlobalSearchResults } from '../types';
import ErrorBoundary from './ErrorBoundary';


// Notification Context
type NotificationType = 'success' | 'error' | 'info';
type NotificationCategory = 'inventory' | 'repair' | 'claim' | 'system';

interface Notification {
  id: string;
  message: string;
  type: NotificationType;
  title: string;
  category: NotificationCategory;
  link?: string;
  timestamp: string;
}

interface NotificationContextType {
  notify: (
    message: string, 
    type?: NotificationType, 
    title?: string, 
    category?: NotificationCategory,
    link?: string
  ) => void;
  refreshUnreadCounts: () => Promise<void>;
  playNotificationSound: () => void;
  unreadRepairCount: number;
  unreadClaimCount: number;
  lowStockCount: number;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotification must be used within NotificationProvider');
  return context;
};

const Layout: React.FC = () => {
  const navigate = useNavigate();
  const [unreadRepairCount, setUnreadRepairCount] = useState(0);
  const [unreadClaimCount, setUnreadClaimCount] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebarCollapsed') === 'true';
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  useEffect(() => {
    const updateMobileView = () => {
      setIsMobileView(window.innerWidth <= 1024);
    };

    updateMobileView();
    window.addEventListener('resize', updateMobileView);
    return () => window.removeEventListener('resize', updateMobileView);
  }, []);

  // Handle link click on mobile
  const handleNavLinkClick = () => {
    // Only auto-close if it's NOT a submenu trigger (future proofing)
    // For now, all NavLinks in this app are leaf nodes.
    setIsMobileMenuOpen(false);
  };

  // Search Command Palette States
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GlobalSearchResults | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const notify = (
    message: string, 
    type: NotificationType = 'success',
    title?: string,
    category?: NotificationCategory,
    link?: string
  ) => {
    const id = Math.random().toString(36).substring(2, 9);
    const resolvedTitle = title || (type === 'success' ? 'ทำรายการสำเร็จ' : type === 'error' ? 'ข้อผิดพลาด' : 'แจ้งเตือนระบบ');
    const resolvedCategory = category || 'system';
    const timestamp = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    
    setNotifications(prev => [...prev, { 
      id, 
      message, 
      type, 
      title: resolvedTitle, 
      category: resolvedCategory, 
      link, 
      timestamp 
    }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 6000);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const prevUnreadRepairCount = React.useRef(0);
  const prevUnreadClaimCount = React.useRef(0);
  const prevLatestTransactionId = React.useRef<number | null>(null);

  const playNotificationSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5 note

      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (err) {
      console.error('Failed to play notification sound:', err);
    }
  };

  const refreshUnreadCounts = useCallback(async () => {
    try {
      const data = await repairApi.getUnreadCount();
      const { repair, claim, lowStock } = data;

      // If unread repair count increased, notify user
      if (repair > prevUnreadRepairCount.current && prevUnreadRepairCount.current !== 0) {
        console.log('New repair ticket detected, triggering notification...');
        notify(`มีงานแจ้งซ่อมใหม่เข้ามา ${repair - prevUnreadRepairCount.current} รายการ`, 'info', 'งานแจ้งซ่อมใหม่', 'repair', '/repairs');
        playNotificationSound();
      }

      // If unread claim count increased, notify user
      if (claim > prevUnreadClaimCount.current && prevUnreadClaimCount.current !== 0) {
        console.log('New claim ticket detected, triggering notification...');
        notify(`มีงานแจ้งเคลมใหม่เข้ามา ${claim - prevUnreadClaimCount.current} รายการ`, 'info', 'งานแจ้งเคลมใหม่', 'claim', '/repairs');
        playNotificationSound();
      }

      prevUnreadRepairCount.current = repair;
      prevUnreadClaimCount.current = claim;
      setUnreadRepairCount(repair);
      setUnreadClaimCount(claim);
      setLowStockCount(lowStock);
    } catch (err) {
      console.error('Failed to fetch unread count:', err);
    }
  }, []);

  useEffect(() => {
    const pollTransactions = async () => {
      try {
        const latestTx = await transactionApi.getLatest();
        if (latestTx) {
          if (prevLatestTransactionId.current !== null && latestTx.id > prevLatestTransactionId.current) {
            console.log('New inventory transaction detected, triggering notification...');
            let message = '';
            const { transaction_type, product_name, quantity_added, quantity_withdrawn, quantity_borrowed, quantity_returned, user_name } = latestTx;
            const byUserStr = user_name ? ` โดย ${user_name}` : '';

            if (transaction_type === 'ADD_STOCK') {
              message = `นำเข้าอุปกรณ์ใหม่ในคลัง: ${product_name} (+${quantity_added} ชิ้น)${byUserStr}`;
            } else if (transaction_type === 'WITHDRAW') {
              message = `มีการเบิกอุปกรณ์จากคลัง: ${product_name} (-${quantity_withdrawn} ชิ้น)${byUserStr}`;
            } else if (transaction_type === 'BORROW') {
              message = `มีการยืมอุปกรณ์จากคลัง: ${product_name} (-${quantity_borrowed} ชิ้น)${byUserStr}`;
            } else if (transaction_type === 'RETURN') {
              message = `มีการคืนอุปกรณ์เข้าคลัง: ${product_name} (+${quantity_returned} ชิ้น)${byUserStr}`;
            } else {
              message = `มีการอัปเดตข้อมูลในคลังอุปกรณ์: ${product_name}`;
            }
            
            notify(message, 'info', 'ความเคลื่อนไหวคลัง', 'inventory', '/inventory');
            playNotificationSound();
          }
          prevLatestTransactionId.current = latestTx.id;
        }
      } catch (err) {
        console.error('Failed to fetch latest transaction:', err);
      }
    };

    const pollAll = () => {
      refreshUnreadCounts();
      pollTransactions();
    };
    
    pollAll();
    const interval = setInterval(pollAll, 5000);
    return () => clearInterval(interval);
  }, [refreshUnreadCounts]);

  // Flattened results for easy keyboard index mapping
  const flattenedResults = React.useMemo(() => {
    if (!searchResults) return [];
    const items: Array<{
      type: 'inventory' | 'repair' | 'claim';
      id: number;
      title: string;
      subtitle: string;
      badgeText: string;
      badgeType: string;
      link: string;
    }> = [];

    searchResults.inventory.forEach(item => {
      items.push({
        type: 'inventory',
        id: item.id,
        title: item.name,
        subtitle: item.model || 'ไม่มีข้อมูลรุ่น',
        badgeText: `${item.quantity} ชิ้น`,
        badgeType: item.quantity < item.min_stock ? 'critical' : 'normal',
        link: `/inventory?search=${encodeURIComponent(item.name)}`
      });
    });

    searchResults.repairs.forEach(item => {
      items.push({
        type: 'repair',
        id: item.id,
        title: item.device_name,
        subtitle: `${item.ticket_no} · โดย ${item.reporter}`,
        badgeText: item.status,
        badgeType: item.status,
        link: `/repairs/${item.id}`
      });
    });

    searchResults.claims.forEach(item => {
      items.push({
        type: 'claim',
        id: item.id,
        title: item.device_name,
        subtitle: `CLAIM: ${item.ticket_no} · โดย ${item.reporter}`,
        badgeText: item.status,
        badgeType: item.status,
        link: `/claim-history/${item.id}`
      });
    });

    return items;
  }, [searchResults]);

  // Debounced API search
  useEffect(() => {
    if (!searchQuery.trim()) {
      return;
    }

    const delayDebounce = setTimeout(async () => {
      try {
        const results = await searchApi.globalSearch(searchQuery);
        setSearchResults(results);
        setSelectedIndex(0);
      } catch (err) {
        console.error('Failed to search:', err);
      } finally {
        setSearchLoading(false);
      }
    }, 250);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  // Ctrl+K Global Key Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleResultClick = (link: string) => {
    navigate(link);
    setIsSearchOpen(false);
    setSearchQuery('');
    setSearchResults(null);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsSearchOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (flattenedResults.length > 0 ? (prev + 1) % flattenedResults.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (flattenedResults.length > 0 ? (prev - 1 + flattenedResults.length) % flattenedResults.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (flattenedResults[selectedIndex]) {
        handleResultClick(flattenedResults[selectedIndex].link);
      }
    }
  };

  return (
    <NotificationContext.Provider value={{ notify, refreshUnreadCounts, playNotificationSound, unreadRepairCount, unreadClaimCount, lowStockCount }}>
      <div className="app-container">
        {/* Mobile Header */}
        <header className="mobile-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="sidebar-logo-icon" style={{ padding: '6px', transform: 'scale(0.8)', animation: 'none' }}>
              <Wrench size={18} />
            </div>
            <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-main)' }}>Maintenance</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button 
              className="mobile-hamburger"
              onClick={() => setIsSearchOpen(true)}
              aria-label="ค้นหา"
            >
              <Search size={20} />
            </button>
            <button 
              className="mobile-hamburger"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="เปิดเมนู"
            >
              <Menu size={24} />
            </button>
          </div>
        </header>

        {/* Mobile Overlay */}
        <div 
          className={`mobile-overlay ${isMobileMenuOpen ? 'active' : ''}`} 
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden={!isMobileMenuOpen}
        />

        {/* Toast Notifications */}
        <div className="toast-container">
          {notifications.map(n => {
            const getIcon = () => {
              switch (n.category) {
                case 'inventory':
                  return <Boxes size={20} />;
                case 'repair':
                  return <Wrench size={20} />;
                case 'claim':
                  return <ShieldAlert size={20} />;
                default:
                  return n.type === 'success' ? <Check size={20} /> : <Info size={20} />;
              }
            };

            return (
              <div 
                key={n.id} 
                className={`premium-toast premium-toast-border-${n.category}`}
              >
                <div className={`toast-icon-box toast-icon-${n.category}`}>
                  {getIcon()}
                </div>
                <div className="toast-content-wrapper">
                  <div className="toast-header">
                    <span className="toast-title">{n.title}</span>
                    <span className="toast-time">{n.timestamp}</span>
                    <button 
                      onClick={() => removeNotification(n.id)}
                      className="toast-close-btn"
                      title="ปิด"
                      aria-label="ปิดแจ้งเตือน"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div className="toast-body">{n.message}</div>
                  {n.link && (
                    <NavLink 
                      to={n.link} 
                      onClick={() => removeNotification(n.id)}
                      className="toast-action-btn"
                    >
                      ดูรายละเอียด →
                    </NavLink>
                  )}
                </div>
                <div className={`toast-progress-bar toast-progress-${n.category}`} />
              </div>
            );
          })}
        </div>

        <aside className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''} ${isMobileMenuOpen ? 'mobile-open' : ''}`} aria-hidden={isMobileView && !isMobileMenuOpen}>
          <div className="sidebar-header">
            <div className="sidebar-logo">
              <div className="sidebar-logo-icon">
                <Wrench size={24} />
              </div>
              <h1>Maintenance System</h1>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} className="hide-on-mobile">
              <button 
                className="sidebar-toggle-btn"
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                title={isSidebarCollapsed ? "ขยายเมนู" : "ย่อเมนู"}
              >
                {isSidebarCollapsed ? <PanelLeft size={20} /> : <PanelLeftClose size={20} />}
              </button>
            </div>
            
            {/* Close button visible only on mobile inside sidebar */}
            <button 
              className="mobile-hamburger sidebar-close-btn"
              onClick={() => setIsMobileMenuOpen(false)}
              aria-label="ปิดเมนู"
            >
              <X size={24} />
            </button>
          </div>

          <div 
            onClick={() => setIsSearchOpen(true)}
            className="sidebar-search-btn"
            role="button"
            tabIndex={0}
            aria-label="ค้นหาด่วน"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsSearchOpen(true);
              }
            }}
          >
            <Search size={16} />
            <span>ค้นหาด่วน...</span>
            {!isSidebarCollapsed && (
              <span style={{ 
                marginLeft: 'auto', 
                fontSize: '0.7rem', 
                background: '#cbd5e1', 
                color: '#475569', 
                padding: '2px 6px', 
                borderRadius: '6px',
                fontWeight: 800
              }}>Ctrl+K</span>
            )}
          </div>
          
          <nav>
            <NavLink to="/" onClick={handleNavLinkClick} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
              <LayoutGrid size={18} /> <span className="nav-text">ภาพรวมระบบ</span>
            </NavLink>
            
            <div className="nav-label">งานซ่อมบำรุง</div>
            <NavLink to="/repairs" onClick={handleNavLinkClick} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
              <Wrench size={18} /> <span className="nav-text">ติดตามงานซ่อม</span>
              {unreadRepairCount > 0 && (
                <span className="pulse-dot">{unreadRepairCount}</span>
              )}
            </NavLink>
            <NavLink to="/new" onClick={handleNavLinkClick} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
              <PlusCircle size={18} /> <span className="nav-text">แจ้งซ่อมใหม่</span>
            </NavLink>
            
            <div className="nav-label">งานเคลมสินค้า</div>
            <NavLink to="/claim-history" onClick={handleNavLinkClick} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
              <ShieldCheck size={18} /> <span className="nav-text">ติดตามงานเคลม</span>
              {unreadClaimCount > 0 && (
                <span className="pulse-dot">{unreadClaimCount}</span>
              )}
            </NavLink>
            <NavLink to="/claim" onClick={handleNavLinkClick} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
              <ShieldPlus size={18} /> <span className="nav-text">แจ้งเคลมใหม่</span>
            </NavLink>
            
            <div className="nav-label">งานคลังและสต็อก</div>
            <NavLink to="/inventory" onClick={handleNavLinkClick} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>  
              <Boxes size={18} /> <span className="nav-text">คลังพัสดุและสต็อก</span>
              {lowStockCount > 0 && (
                <span className="pulse-dot">{lowStockCount}</span>
              )}
            </NavLink>
            <NavLink to="/withdrawal" onClick={handleNavLinkClick} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}> 
              <ArrowUpRight size={18} /> <span className="nav-text">เบิกจ่ายพัสดุ</span>
            </NavLink>
            <NavLink to="/withdrawal-history" onClick={handleNavLinkClick} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}> 
              <ClipboardList size={18} /> <span className="nav-text">ประวัติการเบิกพัสดุ</span>
            </NavLink>
            <NavLink to="/transactions" onClick={handleNavLinkClick} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}> 
              <Activity size={18} /> <span className="nav-text">สมุดบัญชีสต็อก (Ledger)</span>
            </NavLink>
            
            <div className="nav-label">จัดซื้อและรายงาน</div>
            <NavLink to="/purchase-orders" onClick={handleNavLinkClick} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}> 
              <ShoppingBag size={18} /> <span className="nav-text">การจัดซื้อพัสดุ (PO)</span>
            </NavLink>
            <NavLink to="/reports" onClick={handleNavLinkClick} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}> 
              <PieChart size={18} /> <span className="nav-text">รายงานและสถิติวิเคราะห์</span>
            </NavLink>
          </nav>
        </aside>

        <main className="main-content">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      {/* Global Command Palette Search Modal */}
      {isSearchOpen && (
        <div 
          className="search-overlay" 
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsSearchOpen(false);
              setSearchQuery('');
              setSearchResults(null);
            }
          }}
        >
          <div className="search-modal">
            <div className="search-modal-header">
              <Search className="search-modal-icon" size={20} />
              <input
                type="text"
                placeholder="พิมพ์เพื่อค้นหาพัสดุ งานซ่อม หรือใบเคลม..."
                value={searchQuery}
                onChange={e => {
                  const val = e.target.value;
                  setSearchQuery(val);
                  if (!val.trim()) {
                    setSearchResults(null);
                    setSearchLoading(false);
                  } else {
                    setSearchLoading(true);
                  }
                }}
                onKeyDown={handleSearchKeyDown}
                autoFocus
                className="search-modal-input"
                aria-label="พิมพ์เพื่อค้นหาพัสดุ งานซ่อม หรือใบเคลม"
              />
              <button 
                onClick={() => {
                  setIsSearchOpen(false);
                  setSearchQuery('');
                  setSearchResults(null);
                }}
                className="search-modal-close"
                aria-label="ปิดกล่องค้นหา"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="search-modal-body text-main">
              {searchLoading && (
                <div className="search-modal-loading">
                  <div className="spinner"></div>
                  <span>กำลังค้นหา...</span>
                </div>
              )}
              
              {!searchLoading && searchQuery && flattenedResults.length === 0 && (
                <div className="search-modal-empty">
                  <span>ไม่พบข้อมูลสำหรับ "{searchQuery}"</span>
                </div>
              )}
              
              {!searchLoading && !searchQuery && (
                <div className="search-modal-placeholder">
                  <span>ยินดีต้อนรับสู่กล่องค้นหาด่วน</span>
                  <p>ค้นหาข้ามระบบได้อย่างง่ายดาย เพียงพิมพ์ชื่ออุปกรณ์ เลขที่ใบงาน หรือชื่อผู้แจ้ง</p>
                  <div className="search-tips">
                    <span>คีย์ลัด:</span>
                    <kbd>⇅</kbd> เลื่อนขึ้นลง · <kbd>Enter</kbd> เปิดดูรายละเอียด · <kbd>Esc</kbd> ปิด
                  </div>
                </div>
              )}

              {!searchLoading && flattenedResults.length > 0 && (
                <div className="search-modal-results">
                  {/* Categorized List */}
                  {['inventory', 'repair', 'claim'].map(category => {
                    const catItems = flattenedResults.filter(item => item.type === category);
                    if (catItems.length === 0) return null;
                    
                    const catTitle = category === 'inventory' ? 'คลังพัสดุ' : 
                                     category === 'repair' ? 'รายการซ่อมแซม' : 'รายการแจ้งเคลม';
                                     
                    return (
                      <div key={category} className="search-result-category">
                        <div className="search-result-category-title">{catTitle}</div>
                        {flattenedResults.map((item, index) => {
                          if (item.type !== category) return null;
                          const isSelected = index === selectedIndex;
                          
                          return (
                            <div
                              key={`${item.type}-${item.id}`}
                              className={`search-result-item ${isSelected ? 'selected' : ''}`}
                              onClick={() => handleResultClick(item.link)}
                              onMouseEnter={() => setSelectedIndex(index)}
                            >
                              <div className="search-result-item-icon">
                                {category === 'inventory' ? <Boxes size={16} /> : 
                                 category === 'repair' ? <Wrench size={16} /> : <ShieldAlert size={16} />}
                              </div>
                              <div className="search-result-item-info">
                                <div className="search-result-item-title">{item.title}</div>
                                <div className="search-result-item-subtitle">{item.subtitle}</div>
                              </div>
                              <span className={`badge badge-${item.badgeType}`} style={{ fontSize: '0.65rem', marginLeft: 'auto' }}>
                                {item.badgeText}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
};

export default Layout;
