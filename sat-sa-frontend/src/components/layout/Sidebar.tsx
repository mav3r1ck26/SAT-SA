import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Building2, 
  UserCog, 
  AlertTriangle, 
  Eye, 
  AlertCircle, 
  Search, 
  Zap, 
  BarChart2, 
  GitCompare, 
  ClipboardList, 
  FolderSearch, 
  FileText, 
  Upload, 
  CheckCircle2, 
  History, 
  Settings,
  Shield,
  FileQuestion,
} from 'lucide-react';
import { NavLink as NavLinkType } from 'react-router-dom';
import { cn } from '../../lib/utils';

const navigation = [
  { 
    title: 'Overview', 
    href: '/', 
    icon: LayoutDashboard,
    description: 'Supervisory dashboard'
  },
  { 
    title: 'Entities', 
    href: '/entities', 
    icon: Building2,
    description: 'Entity directory'
  },
  { 
    title: 'Execution Gaps', 
    href: '/gaps', 
    icon: AlertTriangle,
    description: 'Execution gap findings'
  },
  { 
    title: 'Negative Space', 
    href: '/negative-space', 
    icon: Eye,
    description: 'Blind spot analysis'
  },
  { 
    title: 'Alert Analytics', 
    href: '/alert-analytics', 
    icon: AlertCircle,
    description: 'Alert patterns & disposition'
  },
  { 
    title: 'Investigation Analytics', 
    href: '/investigation-analytics', 
    icon: Search,
    description: 'Investigation depth & patterns'
  },
  { 
    title: 'Escalation Analytics', 
    href: '/escalation-analytics', 
    icon: Zap,
    description: 'Escalation patterns'
  },
  { 
    title: 'Peer Benchmarking', 
    href: '/benchmark', 
    icon: BarChart2,
    description: 'Sector peer comparison'
  },
  { 
    title: 'Review Prioritisation', 
    href: '/review-queue', 
    icon: ClipboardList,
    description: 'Manual review queue'
  },
  { 
    title: 'Anomalies', 
    href: '/anomalies', 
    icon: Zap,
    description: 'Statistical anomalies'
  },
  { 
    title: 'Evidence Explorer', 
    href: '/evidence', 
    icon: FolderSearch,
    description: 'Evidence traceability'
  },
  { 
    title: 'Reports', 
    href: '/reports', 
    icon: FileText,
    description: 'Supervisory reports'
  },
  { 
    title: 'Data Ingestion', 
    href: '/ingestion', 
    icon: Upload,
    description: 'Data upload & validation'
  },
  { 
    title: 'Validation', 
    href: '/validation', 
    icon: CheckCircle2,
    description: 'Model performance'
  },
  { 
    title: 'Audit Trail', 
    href: '/audit', 
    icon: History,
    description: 'Immutable audit log'
  },
  { 
    title: 'Settings', 
    href: '/settings', 
    icon: Settings,
    description: 'Configuration'
  },
];

const SECTIONS = [
  { title: 'SUPERVISORY', items: ['overview', 'entities'] },
  { title: 'ANALYTICS', items: ['gaps', 'negative-space', 'alert-analytics', 'investigation-analytics', 'escalation-analytics', 'anomalies'] },
  { title: 'SUPERVISORY ACTIONS', items: ['benchmark', 'review-queue', 'evidence'] },
  { title: 'REPORTING', items: ['reports', 'ingestion', 'validation', 'audit'] },
  { title: 'ADMIN', items: ['settings'] },
];

function getSection(href: string) {
  return SECTIONS.find(s => s.items.some(i => href === `/${i}` || (href === '/' && i === 'overview')))?.title || '';
}

export function Sidebar() {
  const location = useLocation();
  
  return (
    <aside className="fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col overflow-y-auto">
      <div className="p-4 border-b border-slate-200 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-navy-900 flex items-center justify-center">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-navy-950">SAT-SA</div>
          <div className="text-[10.5px] text-slate-400">Supervisory Analytics</div>
        </div>
      </div>
      
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {SECTIONS.map((section, sectionIndex) => (
          <div key={section.title}>
            <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              {section.title}
            </div>
            <div className="space-y-0.5">
              {section.items.map((item, itemIndex) => {
                const href = item === 'overview' ? '/' : `/${item}`;
                const isActive = location.pathname === href || (item === 'overview' && location.pathname === '/');
                const Icon = navigation.find(n => n.href === href)?.icon;
                
                return (
                  <NavLink
                    key={item}
                    to={href}
                    className={({ isActive }) => cn(
                      'flex items-center gap-3 px-3 py-2 rounded-md text-[12px] font-medium transition-colors',
                      isActive
                        ? 'bg-navy-900 text-white'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    )}
                    title={navigation.find(n => n.href === href)?.description}
                  >
                    {Icon && <Icon className="w-4.5 h-4.5 shrink-0" />}
                    <span className="truncate">{navigation.find(n => n.href === href)?.title || item}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      
      <div className="p-3 border-t border-slate-200">
        <div className="text-[10.5px] text-slate-400 mb-2">NCIIPC Supervisory</div>
        <div className="text-[11px] text-slate-500">
          SAT-SA v2.0.0 | Offline Mode
        </div>
      </div>
    </aside>
  );
}