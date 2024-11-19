import MainLayout from '@/components/MainLayout';
import { ReactNode } from 'react';

export default function AuthenticatedLayout({ children }: { children: ReactNode }) {
  return <MainLayout>{children}</MainLayout>;
}
