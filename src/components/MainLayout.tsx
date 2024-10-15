import React, { ReactNode } from 'react';
import Navbar from './navigation/Navbar';
import Sidebar from './navigation/Sidebar';

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-col flex-1">
        <Navbar />
        <main className="flex-1 p-4 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
