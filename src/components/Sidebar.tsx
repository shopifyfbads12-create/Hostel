import { Page } from '../types';
import {
  LayoutDashboard,
  Users,
  DoorOpen,
  BedDouble,
  CreditCard,
  MessageSquareWarning,
  FileBarChart,
  LogOut,
  Building2,
  ChevronLeft,
  Menu,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

const navItems: { page: Page; label: string; icon: React.ElementType }[] = [
  { page: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { page: 'students', label: 'Students', icon: Users },
  { page: 'rooms', label: 'Rooms', icon: DoorOpen },
  { page: 'allocations', label: 'Allocations', icon: BedDouble },
  { page: 'fees', label: 'Fees', icon: CreditCard },
  { page: 'complaints', label: 'Complaints', icon: MessageSquareWarning },
  { page: 'reports', label: 'Reports', icon: FileBarChart },
];

export default function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const { signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const NavContent = () => (
    <>
      <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-700/50">
        <Building2 className="w-8 h-8 text-teal-400 shrink-0" />
        {!collapsed && <span className="text-xl font-bold text-white tracking-tight">HostelHub</span>}
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map(({ page, label, icon: Icon }) => {
          const active = currentPage === page;
          return (
            <button
              key={page}
              onClick={() => { onNavigate(page); setMobileOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                active
                  ? 'bg-teal-600/20 text-teal-400'
                  : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span>{label}</span>}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-slate-700/50 p-3">
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile header bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-slate-900 border-b border-slate-700/50 flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <Building2 className="w-7 h-7 text-teal-400" />
          <span className="text-lg font-bold text-white">HostelHub</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="text-slate-400 hover:text-white">
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/60" onClick={() => setMobileOpen(false)}>
          <div className="w-64 h-full bg-slate-900 flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-4 border-b border-slate-700/50">
              <span className="text-lg font-bold text-white">Menu</span>
              <button onClick={() => setMobileOpen(false)} className="text-slate-400 hover:text-white">
                <ChevronLeft className="w-5 h-5" />
              </button>
            </div>
            <NavContent />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col bg-slate-900 border-r border-slate-700/50 transition-all duration-300 ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        <NavContent />
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute top-6 -right-3 w-6 h-6 bg-slate-700 border border-slate-600 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          style={{ left: collapsed ? '68px' : '236px' }}
        >
          <ChevronLeft className={`w-3.5 h-3.5 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
        </button>
      </aside>
    </>
  );
}
