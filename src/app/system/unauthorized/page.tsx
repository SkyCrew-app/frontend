import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuthCard } from '@/app/auth/_components/AuthCard';

export default function UnauthorizedPage() {
  return (
    <AuthCard
      icon={ShieldAlert}
      tone="warning"
      title="Accès refusé"
      description="Vous n'avez pas la permission d'accéder à cette page."
      footer="Si vous pensez qu'il s'agit d'une erreur, contactez un administrateur du club."
    >
      <Button asChild className="w-full">
        <Link href="/dashboard">Retour au tableau de bord</Link>
      </Button>
    </AuthCard>
  );
}
