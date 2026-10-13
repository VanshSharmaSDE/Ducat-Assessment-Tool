import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.jpeg';
import {
  LayoutDashboard,
  BookOpen,
  Award,
  User,
  LogOut,
  Menu,
  X,
  Code2,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';

export default function UserLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Available Exams', path: '/exams', icon: BookOpen },
    { label: 'My Results', path: '/results', icon: Award },
    { label: 'Profile', path: '/profile', icon: User },
  ];

  return (
    <div className="min-h-screen bg-[#f4f7fe] text-slate-800 flex flex-col md:flex-row">
      {/* Mobile Topbar */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200">
        <div className="flex items-center space-x-2">
          <Code2 className="w-6 h-6 text-[#4f6bf7]" />
          <span className="font-bold tracking-tight text-slate-800">SkillCodex</span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100"
        >
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed md:sticky top-0 h-screen z-40 w-64 bg-white border-r border-slate-200/70 flex flex-col justify-between transition-transform duration-200 ease-in-out shadow-[2px_0_16px_rgba(0,0,0,0.02)] ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex flex-col min-h-0 flex-1">
          {/* Logo */}
          <div className="flex flex-col items-center px-6 py-5 border-b border-slate-100 gap-2 shrink-0">
            <div className="w-[140px] flex items-center justify-center">
              <img src={logo} alt="SkillCodex Logo" className="w-full h-auto rounded-xl" />
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-3.5 space-y-1.5 overflow-y-auto flex-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                      isActive
                        ? 'bg-[#4f6bf7] text-white shadow-md shadow-[#4f6bf7]/25'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-[#f4f7fe]'
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 opacity-40" />
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* User Footer (Floating profile card matching design image) */}
        <div className="p-3.5 border-t border-slate-100 shrink-0">
          <div className="flex items-center justify-between p-2.5 rounded-2xl bg-[#f4f7fe] border border-slate-200/60 shadow-sm">
            <Link to="/profile" className="flex items-center gap-2.5 min-w-0 hover:opacity-85 transition-opacity">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#4f6bf7] to-[#6073ea] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm shadow-[#4f6bf7]/30">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 truncate">{user?.name}</p>
                <div className="flex items-center gap-1.5">
                  <span className="inline-block px-1.5 py-0.2 text-[9px] font-extrabold tracking-wider rounded-md bg-blue-50 text-[#4f6bf7] border border-blue-200">
                    STUDENT
                  </span>
                  {(user?.studentId || user?.rollNumber) && (
                    <span className="text-[10px] font-mono text-slate-400 truncate">
                      {user?.studentId || user?.rollNumber}
                    </span>
                  )}
                </div>
              </div>
            </Link>
            <button
              onClick={handleLogout}
              title="Logout"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 min-h-screen overflow-y-auto bg-[#f4f7fe]">
        <Outlet />
      </main>
    </div>
  );
}
