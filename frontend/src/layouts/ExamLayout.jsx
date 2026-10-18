import React from 'react';
import { Outlet } from 'react-router-dom';
import ErrorBoundary from '../components/ErrorBoundary';

export default function ExamLayout() {
  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col select-none">
      <ErrorBoundary fallbackUrl="/exams">
        <Outlet />
      </ErrorBoundary>
    </div>
  );
}
