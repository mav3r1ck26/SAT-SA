import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronDown, 
  User, 
  LogOut, 
  Search, 
  AlertCircle,
  Settings,
  Menu,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { fetchEntities } from '../../api/client';

export function TopNav({ onMenuClick }: { onMenuClick: () => void }) {
  const navigate = useNavigate();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  useEffect(() => {
    const query = searchQuery.trim();
    if (!query) {
      setSearchResults([]);
      return;
    }
    const timer = window.setTimeout(() => {
      fetchEntities({ search: query })
        .then(setSearchResults)
        .catch(() => setSearchResults([]));
    }, 200);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  const openEntity = (id: string) => {
    navigate(`/entity/${encodeURIComponent(id)}`);
    setSearchQuery('');
    setSearchOpen(false);
  };
  
  const notifications = [
    { id: 1, type: 'finding', title: 'New high-confidence finding', detail: 'EG-247 identified for CSE-014. Confidence 94%.', severity: 'high', time: '2 min ago', read: false },
    { id: 2, type: 'risk', title: 'Entity risk increased significantly', detail: 'CSE-014 risk score rose 12% vs previous period.', severity: 'high', time: '15 min ago', read: false },
    { id: 3, type: 'negative-space', title: 'New negative-space indicator', detail: 'Monitoring blind spot detected for CSE-014 Critical Asset Group.', severity: 'medium', time: '1 hr ago', read: true },
    { id: 4, type: 'data-quality', title: 'Data quality issue', detail: '14% of critical asset records have incomplete telemetry.', severity: 'medium', time: '3 hr ago', read: true },
  ];

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      <div className="flex items-center justify-between h-14 px-4 lg:px-6">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <button className="rounded-md p-2 text-slate-500 hover:bg-slate-100 lg:hidden" onClick={onMenuClick} aria-label="Open navigation">
            <Menu className="h-5 w-5" />
          </button>
          <div className="relative max-w-md hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search entities, findings, cases..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => setSearchOpen(true)}
              onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
              className="w-full pl-10 pr-4 py-2 text-[12px] bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
            />
            {searchOpen && searchQuery.trim() && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-md shadow-lg z-50 max-h-60 overflow-auto">
                {searchResults.length ? searchResults.slice(0, 8).map(entity => (
                  <button key={entity.id} className="block w-full px-3 py-2 text-left hover:bg-slate-50" onMouseDown={e => e.preventDefault()} onClick={() => openEntity(entity.id)}>
                    <span className="text-[12px] font-medium text-slate-800">{entity.id}</span>
                    <span className="ml-2 text-[11px] text-slate-500">{entity.name} · {entity.sector}</span>
                  </button>
                )) : (
                  <div className="p-2 text-[12px] text-slate-500">No matching entities</div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            className={cn('relative p-2 rounded-md text-slate-500 hover:bg-slate-100 transition-colors', notificationsOpen && 'bg-slate-100')}
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            aria-label="Notifications"
          >
            <AlertCircle className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-[10px] font-semibold text-white rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          <div className="w-px h-6 bg-slate-200 mx-1" />

          <div className="relative">
            <button
              className={cn('flex items-center gap-2 p-1.5 rounded-md hover:bg-slate-100 transition-colors', userMenuOpen && 'bg-slate-100')}
              onClick={() => setUserMenuOpen(!userMenuOpen)}
            >
              <div className="w-7 h-7 rounded-full bg-navy-900 flex items-center justify-center">
                <span className="text-white text-[11px] font-semibold">E01</span>
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-[12px] font-medium text-slate-800">Examiner-01</div>
                <div className="text-[11px] text-slate-500">Senior Examiner</div>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-1 w-48 bg-white border border-slate-200 rounded-md shadow-lg py-1 z-50">
                <div className="px-3 py-2 border-b border-slate-100">
                  <div className="text-[11px] font-semibold text-slate-800">Examiner-01</div>
                  <div className="text-[11px] text-slate-500">Senior Examiner</div>
                </div>
                <button className="w-full px-3 py-2 text-left text-[12px] text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Profile
                </button>
                <button className="w-full px-3 py-2 text-left text-[12px] text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
                <div className="border-t border-slate-100" />
                <button className="w-full px-3 py-2 text-left text-[12px] text-red-600 hover:bg-slate-50 flex items-center gap-2" onClick={() => { /* logout */ }}>
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {notificationsOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setNotificationsOpen(false)} />
      )}
      {notificationsOpen && (
        <div className="fixed right-0 top-14 z-50 w-full sm:w-80 bg-white border-l border-slate-200 shadow-xl h-[calc(100vh-3.5rem)] overflow-y-auto">
          <div className="p-3 border-b border-slate-200 flex items-center justify-between">
            <div className="text-[13px] font-semibold text-slate-800">Notifications</div>
            <button onClick={() => setNotificationsOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="max-h-[calc(100vh-5rem)] overflow-y-auto p-2">
            {notifications.map(n => (
              <button
                key={n.id}
                className={cn('w-full p-3 rounded-lg text-left hover:bg-slate-50 transition-colors', !n.read && 'bg-blue-50/50 border-l-2 border-blue-500')}
                onClick={() => { /* mark read */ }}
              >
                <div className="flex items-start gap-2">
                  <div className={cn('w-2 h-2 rounded-full mt-1.5 flex-shrink-0', 
                    n.severity === 'high' && 'bg-red-500',
                    n.severity === 'medium' && 'bg-amber-500',
                    n.severity === 'low' && 'bg-blue-500'
                  )} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-medium text-slate-800">{n.title}</div>
                    <div className="text-[11px] text-slate-600 mt-0.5 truncate">{n.detail}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={cn('badge', 
                        n.severity === 'high' && 'bg-red-50 text-red-700 border-red-200',
                        n.severity === 'medium' && 'bg-amber-50 text-amber-700 border-amber-200',
                        n.severity === 'low' && 'bg-blue-50 text-blue-700 border-blue-200'
                      )}>{n.severity}</span>
                      <span className="text-[10px] text-slate-400">{n.time}</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
            {!notifications.length && (
              <div className="p-6 text-center text-slate-400 text-[12px]">No notifications</div>
            )}
          </div>
        </div>
        )}
    </header>
  );
}
