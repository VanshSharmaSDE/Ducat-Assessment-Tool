import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.jpeg';
import {
  LayoutDashboard,
  FileCheck2,
  HelpCircle,
  Users,
  Award,
  Terminal,
  LogOut,
  Menu,
  X,
  Code2,
  ChevronRight,
  ExternalLink,
  ShieldAlert,
  User,
  GraduationCap,
  Layers,
  Building2
} from 'lucide-react';

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isSuperAdmin = user?.role === 'ADMIN';

  const navItems = [
    { label: isSuperAdmin ? 'Overview Analytics' : 'My Dashboard', path: '/admin', exact: true, icon: LayoutDashboard },
    { label: isSuperAdmin ? 'Examinations' : 'My Examinations', path: '/admin/exams', icon: FileCheck2 },
    { label: isSuperAdmin ? 'Question Bank' : 'My Questions', path: '/admin/questions', icon: HelpCircle },
    { label: isSuperAdmin ? 'Candidates' : 'My Students', path: '/admin/users', icon: Users },
    { label: isSuperAdmin ? 'Batches' : 'My Batches', path: '/admin/batches', icon: Layers },
    { label: isSuperAdmin ? 'Organizations' : 'My Organization', path: '/admin/organizations', icon: Building2 },
    ...(isSuperAdmin ? [{ label: 'Faculty Management', path: '/admin/faculty', icon: GraduationCap }] : []),
    { label: isSuperAdmin ? 'Results & Reports' : 'Student Results', path: '/admin/results', icon: Award },
    { label: isSuperAdmin ? 'Raw Submissions' : 'Submissions', path: '/admin/submissions', icon: Terminal },
    { label: isSuperAdmin ? 'Admin Profile' : 'Faculty Profile', path: '/admin/profile', icon: User },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {/* Mobile Topbar */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <Code2 className="w-6 h-6 text-amber-400" />
          <span className="font-bold tracking-tight text-white">
            {isSuperAdmin ? 'SkillCodex Admin' : 'SkillCodex Faculty'}
          </span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
        >
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed md:sticky top-0 h-screen z-40 w-64 bg-slate-900/95 backdrop-blur border-r border-slate-800 flex flex-col justify-between transition-transform duration-200 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div>
          {/* Logo */}
          <div className="flex flex-col items-center px-6 mt-6 border-b border-slate-800/80 gap-3">
            <div className="w-32 h-14 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-sky-500/20">
              {/* <Code2 className="w-5 h-5 text-white" /> */}
              <img src={logo} alt="SkillCodex Logo" className="w-full h-full rounded-xl" />
            </div>
            <div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.exact}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm ${
                      isActive
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 font-semibold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-40" />
                </NavLink>
              );
            })}

            {/* <div className="pt-4 mt-4 border-t border-slate-800">
              <Link
                to="/dashboard"
                className="flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm text-sky-400 bg-sky-500/10 border border-sky-500/20 hover:bg-sky-500/20 transition-all"
              >
                <div className="flex items-center gap-3">
                  <ExternalLink className="w-4 h-4 text-sky-400" />
                  <span>Student View</span>
                </div>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div> */}
          </nav>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/50 border border-slate-800/60">
            <Link to="/admin/profile" className="flex items-center gap-3 min-w-0 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center shrink-0">
                A
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
                <p className="text-[11px] text-amber-400/80 font-mono">ADMINISTRATOR</p>
              </div>
            </Link>
            <button
              onClick={handleLogout}
              title="Logout"
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 min-h-screen overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
