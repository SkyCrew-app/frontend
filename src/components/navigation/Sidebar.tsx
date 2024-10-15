'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Plane,
  Calendar,
  GraduationCap,
  Settings,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';

const menuItems = [
  {
    name: 'Tableau de bord',
    icon: LayoutDashboard,
    path: '/dashboard',
  },
  {
    name: 'Flotte',
    icon: Plane,
    path: '/fleet',
    subItems: [
      { name: 'État des avions', path: '/fleet/status' },
      { name: 'Historique', path: '/fleet/history' },
      { name: 'Maintenance', path: '/fleet/maintenance' },
    ],
  },
  {
    name: 'Réservations',
    icon: Calendar,
    path: '/reservations',
    subItems: [
      { name: 'Planification des vols', path: '/reservations/schedule' },
      { name: 'Mes réservations', path: '/reservations/my' },
      { name: 'Gestion des réservations', path: '/reservations/manage' },
    ],
  },
  {
    name: 'Instruction',
    icon: GraduationCap,
    path: '/instruction',
    subItems: [
      { name: 'Cours d\'instruction', path: '/instruction/courses' },
      { name: 'Évaluations', path: '/instruction/evaluations' },
      { name: 'Tableau de bord instructeur', path: '/instruction/dashboard' },
    ],
  },
  {
    name: 'Administration',
    icon: Settings,
    path: '/administration',
    subItems: [
      { name: 'Membres', path: '/administration/members' },
      { name: 'Facturation', path: '/administration/billing' },
      { name: 'Sécurité', path: '/administration/security' },
      { name: 'Personnel', path: '/administration/staff' },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [openMenus, setOpenMenus] = React.useState<string[]>([]);

  const toggleMenu = (path: string) => {
    setOpenMenus((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    );
  };

  return (
    <aside className="w-72 bg-background border-r flex flex-col">
      {/* Logo */}
      <div className="p-4 mb-2 flex items-center">
        <Link href="/dashboard">
          {/* Remplacez par votre logo réel */}
          <img src="/path/to/logo.png" alt="SkyCrew Logo" className="h-8 w-auto" />
        </Link>
      </div>
      {/* Séparateur */}
      <div className="border-b"></div>
      {/* Menu de navigation */}
      <nav className="flex-1 p-4 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = pathname.startsWith(item.path);
          const isOpen = openMenus.includes(item.path);

          return (
            <div key={item.name} className="mb-2">
              {item.subItems ? (
                <>
                  <div className="flex items-center justify-between w-full">
                    <Link
                      href={item.path}
                      className={cn(
                        'flex items-center p-3 rounded-md hover:bg-accent w-full',
                        isActive && 'bg-accent'
                      )}
                    >
                      <item.icon className="mr-2 h-5 w-5" />
                      <span>{item.name}</span>
                    </Link>
                    <button
                      onClick={() => toggleMenu(item.path)}
                      className="p-3 focus:outline-none"
                    >
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {isOpen && (
                    <div className="ml-6 mt-1">
                      {item.subItems.map((subItem) => (
                        <Link
                          key={subItem.name}
                          href={subItem.path}
                          className={cn(
                            'flex items-center p-2 rounded-md hover:bg-accent',
                            pathname === subItem.path && 'bg-accent'
                          )}
                        >
                          <span>{subItem.name}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <Link
                  href={item.path}
                  className={cn(
                    'flex items-center p-3 rounded-md hover:bg-accent',
                    isActive && 'bg-accent'
                  )}
                >
                  <item.icon className="mr-2 h-5 w-5" />
                  <span>{item.name}</span>
                </Link>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
