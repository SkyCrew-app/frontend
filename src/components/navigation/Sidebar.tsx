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
      { name: 'Historique', path: '/fleet/history' },
      { name: 'Maintenance', path: '/fleet/maintenance' },
    ],
  },
  {
    name: 'Réservations',
    icon: Calendar,
    path: '/reservations',
    subItems: [
      { name: 'Mes réservations', path: '/reservations/my' },
      { name: 'Mes plans de vol', path: '/reservations/flight-plans' },
    ],
  },
  {
    name: 'Instruction',
    icon: GraduationCap,
    path: '/instruction',
    subItems: [
      { name: 'Mes cours', path: '/instruction/courses' },
      { name: 'Mes évaluations', path: '/instruction/evaluations' },
      { name: 'E-learning', path: '/instruction/evaluations' },
    ],
  },
  {
    name: 'Administration',
    icon: Settings,
    path: '/administration',
    subItems: [
      { name: 'Membres', path: '/administration/users' },
      { name: 'Facturation', path: '/administration/billing' },
      { name: 'Sécurité', path: '/administration/security' },
      { name: 'Articles', path: '/administration/articles' },
      { name: 'Paramètres', path: '/administration/settings' },
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
    <aside className="bg-gray-50 dark:bg-gray-800 border-r">
      {/* Logo */}
      <div className="p-4 mb-2 flex items-center justify-center">
        <Link href="/dashboard">
          <svg version="1.0" xmlns="http://www.w3.org/2000/svg"
          className='h-8'
          viewBox="0 0 916.000000 272.000000"
          preserveAspectRatio="xMidYMid meet">

          <g transform="translate(0.000000,272.000000) scale(0.100000,-0.100000)"
          fill="currentColor" stroke="none">
          <path d="M2061 2479 c-51 -10 -96 -20 -98 -23 -2 -2 1 -13 8 -25 12 -18 -3
          -51 -135 -313 -82 -161 -152 -297 -157 -302 -18 -20 -7 -24 80 -28 49 -1 92
          -6 95 -9 9 -9 -106 -209 -127 -220 -25 -14 -47 -5 -90 37 -50 49 -54 95 -11
          151 14 19 24 36 23 38 -7 7 -236 -92 -354 -153 -66 -34 -146 -84 -178 -111
          -69 -60 -282 -183 -356 -206 -21 -6 -18 2 33 99 l57 105 -68 -31 c-37 -16 -71
          -35 -75 -41 -32 -51 -114 -157 -121 -157 -6 0 -53 43 -106 95 -54 52 -103 95
          -111 95 -23 0 -100 -50 -100 -65 0 -8 17 -54 38 -102 22 -48 54 -128 72 -176
          l33 -88 -32 -27 c-24 -20 -42 -53 -70 -127 -21 -55 -37 -101 -36 -103 2 -2 31
          4 64 14 60 16 62 18 130 113 l69 97 309 52 c169 29 330 55 356 58 l48 7 -50
          -84 c-28 -46 -65 -106 -82 -134 -17 -27 -115 -187 -218 -355 -172 -282 -189
          -307 -228 -325 -23 -11 -44 -23 -48 -27 -7 -7 101 13 232 43 l92 21 94 127
          c52 69 161 218 243 331 336 465 436 578 553 626 183 74 368 185 463 278 48 47
          61 67 78 123 27 87 21 94 -86 95 -82 1 -117 -3 -247 -28 -43 -9 -81 -14 -83
          -11 -2 2 47 156 111 342 63 186 115 340 115 341 0 7 -33 2 -129 -17z m-482
          -910 c25 -19 41 -38 39 -48 -3 -17 -81 -59 -110 -60 -18 -1 -58 64 -58 93 0
          16 45 45 71 46 8 0 34 -14 58 -31z m516 -29 c-3 -5 -12 -10 -18 -10 -7 0 -6 4
          3 10 19 12 23 12 15 0z m-675 -46 c11 -25 20 -50 20 -55 0 -10 -111 -65 -181
          -89 -51 -18 -85 -7 -98 31 -8 24 -8 36 1 47 16 19 197 110 221 111 12 1 24
          -14 37 -45z m555 27 c-11 -10 -195 -71 -210 -70 -8 0 196 75 215 78 2 1 0 -3
          -5 -8z m85 5 c0 -10 -586 -226 -613 -226 -29 1 31 25 343 136 52 18 131 47
          175 63 81 30 95 34 95 27z m-560 -162 c-254 -85 -472 -145 -520 -143 -14 0 35
          16 109 34 169 43 339 93 506 150 72 24 137 44 145 44 8 0 -100 -39 -240 -85z
          m-103 -80 c-3 -3 -12 -4 -19 -1 -8 3 -5 6 6 6 11 1 17 -2 13 -5z m-454 -71
          c-7 -2 -21 -2 -30 0 -10 3 -4 5 12 5 17 0 24 -2 18 -5z"/>
          <path d="M3807 2083 c-4 -3 -7 -262 -7 -574 l0 -569 23 -5 c12 -3 65 -5 117
          -3 l95 3 3 158 3 157 38 0 c63 0 85 -26 126 -151 23 -69 48 -123 65 -142 25
          -28 33 -31 83 -30 58 1 114 22 141 52 15 17 14 21 -9 63 -14 25 -36 77 -49
          114 -40 119 -67 165 -112 197 l-43 30 35 41 c33 38 154 263 154 285 0 7 -33
          11 -94 11 -125 0 -144 -13 -211 -141 -60 -116 -70 -129 -101 -129 l-24 0 0
          270 c0 307 -4 330 -64 355 -36 15 -157 21 -169 8z"/>
          <path d="M3198 2020 c-70 -11 -150 -48 -204 -94 -98 -83 -128 -232 -70 -350
          38 -78 108 -128 279 -200 149 -64 186 -92 194 -152 17 -126 -173 -147 -381
          -42 l-60 31 -33 -38 c-28 -33 -63 -110 -63 -140 0 -16 140 -81 220 -101 95
          -25 265 -22 351 5 151 48 232 157 231 312 0 83 -31 158 -88 213 -41 40 -135
          91 -273 147 -142 57 -186 121 -125 182 47 47 145 47 278 0 110 -39 111 -39
          135 -5 24 34 51 105 51 133 0 22 -63 52 -170 80 -91 24 -195 31 -272 19z"/>
          <path d="M5719 2021 c-113 -22 -227 -117 -284 -235 -110 -232 -76 -593 71
          -756 99 -110 301 -144 489 -84 71 23 178 80 208 112 l26 27 -21 42 c-12 23
          -38 58 -57 77 l-36 35 -65 -40 c-113 -69 -208 -85 -286 -50 -50 23 -76 55
          -106 129 -19 50 -22 75 -22 207 1 118 4 161 18 200 46 128 135 174 243 126 53
          -25 84 -81 91 -167 5 -71 9 -74 100 -74 66 0 106 21 128 69 34 70 -6 211 -77
          276 -99 89 -276 134 -420 106z"/>
          <path d="M7171 1725 c-95 -27 -151 -73 -194 -160 -39 -77 -49 -131 -49 -245 2
          -212 61 -322 207 -387 96 -42 340 -8 428 59 17 13 18 19 7 55 -7 22 -22 53
          -35 68 l-22 28 -49 -17 c-69 -24 -176 -32 -214 -16 -38 16 -66 54 -75 103 l-7
          37 206 0 206 0 7 28 c5 15 8 72 8 127 0 81 -4 109 -22 147 -30 65 -95 132
          -153 157 -66 28 -179 36 -249 16z m148 -170 c29 -14 61 -76 61 -115 0 -24 6
          -23 -164 -21 l-49 1 7 43 c15 90 75 129 145 92z"/>
          <path d="M4587 1714 c-44 -14 -47 -16 -41 -42 31 -127 177 -654 188 -678 16
          -35 68 -64 115 -64 37 0 39 -14 12 -68 -34 -67 -53 -77 -145 -77 -44 0 -94 4
          -109 8 -26 7 -29 4 -47 -36 -11 -24 -21 -63 -22 -87 l-3 -44 45 -13 c53 -16
          220 -19 268 -4 72 22 123 61 166 129 60 93 71 128 186 567 77 290 99 390 90
          399 -7 7 -51 11 -117 11 l-107 0 -61 -276 c-80 -357 -75 -337 -85 -319 -4 8
          -11 38 -14 65 -12 84 -95 437 -113 479 -28 64 -102 82 -206 50z"/>
          <path d="M6360 1683 c-36 -56 -37 -74 -7 -114 21 -30 22 -38 25 -327 2 -218 6
          -298 15 -304 14 -9 198 -11 221 -2 14 5 16 37 16 254 l0 248 31 26 c39 33 68
          40 130 33 49 -6 49 -6 65 31 17 39 44 172 37 184 -7 14 -110 20 -151 8 -48
          -12 -106 -59 -128 -103 l-16 -29 -21 35 c-27 44 -79 84 -127 97 -54 15 -58 13
          -90 -37z"/>
          <path d="M7708 1718 c-28 -6 -48 -16 -48 -23 0 -7 11 -60 24 -117 14 -57 48
          -204 76 -328 29 -124 59 -240 68 -259 22 -49 61 -61 189 -61 59 0 114 4 121 8
          12 8 54 244 83 465 7 53 15 97 18 97 4 0 21 -107 39 -237 34 -249 49 -299 92
          -320 27 -14 247 -18 266 -5 6 4 28 77 48 162 21 85 60 246 87 358 27 111 49
          213 49 226 0 30 -20 36 -132 36 -74 0 -87 -3 -92 -17 -12 -42 -86 -426 -97
          -500 -6 -46 -15 -83 -19 -83 -4 0 -13 37 -20 83 -6 45 -26 176 -44 291 l-32
          210 -34 9 c-40 10 -235 6 -246 -6 -6 -6 -31 -160 -94 -587 -2 -16 -20 30 -20
          52 0 53 -90 492 -106 515 -27 42 -78 51 -176 31z"/>
          </g>
          </svg>
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
                      <ChevronRight
                      className={cn(
                        'h-4 w-4 transition-transform duration-300',
                        isOpen && 'transform rotate-90'
                      )}
                      />
                    </button>
                  </div>
                  {isOpen && (
                    <div className="ml-6 mt-1">
                      {item.subItems.map((subItem) => (
                        <Link
                          key={subItem.name}
                          href={subItem.path}
                          className={cn(
                            'flex items-center p-2 rounded-md hover:bg-accent mb-1',
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
