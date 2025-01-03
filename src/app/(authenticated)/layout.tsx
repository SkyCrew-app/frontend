import MainLayout from '@/components/MainLayout';

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return <MainLayout>{children}</MainLayout>;
}
