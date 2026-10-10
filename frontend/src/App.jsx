import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Layouts
import UserLayout from './layouts/UserLayout';
import AdminLayout from './layouts/AdminLayout';
import ExamLayout from './layouts/ExamLayout';

// Auth Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

// Candidate Pages
import UserDashboard from './pages/UserDashboard';
import AvailableExamsPage from './pages/AvailableExamsPage';
import ExamInstructionPage from './pages/ExamInstructionPage';
import CodingExamPage from './pages/CodingExamPage';
import UserResultsPage from './pages/UserResultsPage';
import ResultDetailPage from './pages/ResultDetailPage';
import ProfilePage from './pages/ProfilePage';

// Admin & Faculty Pages
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminExamsPage from './pages/admin/AdminExamsPage';
import AdminExamWizardPage from './pages/admin/AdminExamWizardPage';
import AdminQuestionsPage from './pages/admin/AdminQuestionsPage';
import AdminQuestionEditorPage from './pages/admin/AdminQuestionEditorPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminFacultyPage from './pages/admin/AdminFacultyPage';
import AdminResultsPage from './pages/admin/AdminResultsPage';
import AdminResultDetailPage from './pages/admin/AdminResultDetailPage';
import AdminSubmissionsPage from './pages/admin/AdminSubmissionsPage';
import AdminBatchesPage from './pages/admin/AdminBatchesPage';

// Protected Route Guard
function RequireAuth({ children, requiredRole, allowedRoles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default function App() {
  return (
    <Routes>
      {/* Public Auth Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Fullscreen Exam Session Route */}
      <Route
        path="/exams/:id/take"
        element={
          <RequireAuth>
            <ExamLayout />
          </RequireAuth>
        }
      >
        <Route index element={<CodingExamPage />} />
      </Route>

      {/* Candidate Portal Routes */}
      <Route
        path="/"
        element={
          <RequireAuth>
            <UserLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<UserDashboard />} />
        <Route path="exams" element={<AvailableExamsPage />} />
        <Route path="exams/:id/instructions" element={<ExamInstructionPage />} />
        <Route path="results" element={<UserResultsPage />} />
        <Route path="results/:id" element={<ResultDetailPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      {/* Faculty Shortcut Route - seamlessly routes to Faculty Control Hub */}
      <Route
        path="/faculty/*"
        element={
          <RequireAuth allowedRoles={['FACULTY', 'ADMIN']}>
            <Navigate to="/admin" replace />
          </RequireAuth>
        }
      />

      {/* Admin & Faculty Portal Routes */}
      <Route
        path="/admin"
        element={
          <RequireAuth allowedRoles={['ADMIN', 'FACULTY']}>
            <AdminLayout />
          </RequireAuth>
        }
      >
        <Route index element={<AdminDashboardPage />} />
        <Route path="exams" element={<AdminExamsPage />} />
        <Route path="exams/new" element={<AdminExamWizardPage />} />
        <Route path="exams/:id/edit" element={<AdminExamWizardPage />} />
        <Route path="questions" element={<AdminQuestionsPage />} />
        <Route path="questions/new" element={<AdminQuestionEditorPage />} />
        <Route path="questions/:id/edit" element={<AdminQuestionEditorPage />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="batches" element={<AdminBatchesPage />} />
        <Route path="faculty" element={<AdminFacultyPage />} />
        <Route path="results" element={<AdminResultsPage />} />
        <Route path="results/:id" element={<AdminResultDetailPage />} />
        <Route path="submissions" element={<AdminSubmissionsPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      {/* Catch-all Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
