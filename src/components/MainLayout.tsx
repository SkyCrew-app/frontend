import React, { ReactNode } from 'react';
import Navbar from './navigation/Navbar';
import Sidebar from './navigation/Sidebar';

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex w-screen h-screen">
      <Sidebar />
      <div className="w-full overflow-x-hidden">
        <Navbar />
        <main className="p-4">{children}</main>
      </div>
    </div>
  );
}
