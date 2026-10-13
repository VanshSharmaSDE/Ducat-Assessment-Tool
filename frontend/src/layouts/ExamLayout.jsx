import React from 'react';
import { Outlet } from 'react-router-dom';

export default function ExamLayout() {
  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-50 text-slate-800 flex flex-col select-none">
      <Outlet />
    </div>
  );
}
