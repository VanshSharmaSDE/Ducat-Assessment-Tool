import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getProfilePictureUrl, handleAvatarError } from '../utils/imageUrl';
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
  Building2,
  CheckSquare,
  Settings,
  FolderTree,
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
    { label: isSuperAdmin ? 'Coding Questions' : 'My Coding Bank', path: '/admin/questions', icon: HelpCircle },
    { label: isSuperAdmin ? 'MCQ Question Bank' : 'My MCQ Bank', path: '/admin/mcq-questions', icon: CheckSquare },
    { label: isSuperAdmin ? 'Candidates' : 'My Students', path: '/admin/users', icon: Users },
    { label: isSuperAdmin ? 'Technologies' : 'My Technologies', path: '/admin/technologies', icon: Layers },
    { label: isSuperAdmin ? 'Batches' : 'My Batches', path: '/admin/batches', icon: FolderTree },
    ...(isSuperAdmin ? [{ label: 'Organizations', path: '/admin/organizations', icon: Building2 }] : []),
    ...(isSuperAdmin ? [{ label: 'Faculty Management', path: '/admin/faculty', icon: GraduationCap }] : []),
    { label: isSuperAdmin ? 'Results & Reports' : 'Student Results', path: '/admin/results', icon: Award },
    { label: isSuperAdmin ? 'Raw Submissions' : 'Submissions', path: '/admin/submissions', icon: Terminal },
    { label: isSuperAdmin ? 'Admin Profile' : 'Faculty Profile', path: '/admin/profile', icon: User },
    { label: 'Settings', path: '/admin/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#f4f7fe] dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col md:flex-row">
      {/* Mobile Topbar */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center space-x-2">
          <Code2 className="w-6 h-6 text-[#4f6bf7]" />
          <span className="font-bold tracking-tight text-slate-800 dark:text-slate-100">
            {isSuperAdmin ? 'SkillCodex Admin' : 'SkillCodex Faculty'}
          </span>
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
        className={`fixed md:sticky top-0 h-screen z-40 w-64 bg-white dark:bg-slate-900 border-r border-slate-200/70 dark:border-slate-800 flex flex-col justify-between transition-transform duration-200 ease-in-out shadow-[2px_0_16px_rgba(0,0,0,0.02)] ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex flex-col min-h-0 flex-1">
          {/* Logo */}
          <div className="flex flex-col items-center px-6 py-5 border-b border-slate-100 dark:border-slate-800 gap-2 shrink-0">
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
                  end={item.exact}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                      isActive
                        ? 'bg-[#4f6bf7] text-white shadow-md shadow-[#4f6bf7]/25'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-[#f4f7fe] dark:hover:bg-slate-800/60'
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

        {/* Floating Profile Card at bottom (matching reference image) */}
        <div className="p-3.5 border-t border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center justify-between p-2.5 rounded-2xl bg-[#f4f7fe] dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 shadow-sm">
            <Link to="/admin/profile" className="flex items-center gap-2.5 min-w-0 hover:opacity-85 transition-opacity">
              {user?.profilePicture && (
                <img
                  src={getProfilePictureUrl(user.profilePicture)}
                  alt={user?.name || 'Profile'}
                  className="w-9 h-9 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700 shadow-xs"
                  onError={(e) => handleAvatarError(e, user?.profilePicture)}
                />
              )}
              <div
                className={`w-9 h-9 rounded-full bg-gradient-to-tr from-[#4f6bf7] to-[#6073ea] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm shadow-[#4f6bf7]/30 ${
                  user?.profilePicture ? 'hidden' : ''
                }`}
              >
                {user?.name?.charAt(0).toUpperCase() || 'A'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{user?.name}</p>
                <div className="flex items-center gap-1.5">
                  <span className="inline-block px-1.5 py-0.2 text-[9px] font-extrabold tracking-wider rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                    {isSuperAdmin ? 'ADMIN' : 'FACULTY'}
                  </span>
                  {(user?.adminId || user?.facultyId) && (
                    <span className="text-[10px] font-mono text-slate-400 dark:text-slate-400 truncate">
                      {user?.adminId || user?.facultyId}
                    </span>
                  )}
                </div>
              </div>
            </Link>
            <button
              onClick={handleLogout}
              title="Logout"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 min-h-screen overflow-y-auto bg-[#f4f7fe] dark:bg-slate-950">
        <Outlet />
      </main>
    </div>
  );
}
