import Link from 'next/link';
import { Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuthCard } from '@/app/auth/_components/AuthCard';

export default function NotFound() {
  return (
    <AuthCard
      icon={Compass}
      title="Page introuvable"
      description="Cette page n'existe pas ou a été déplacée."
    >
      <Button asChild className="w-full">
        <Link href="/dashboard">Retour au tableau de bord</Link>
      </Button>
    </AuthCard>
  );
}
