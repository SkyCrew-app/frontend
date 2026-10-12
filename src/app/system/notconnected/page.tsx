import Link from 'next/link';
import { LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuthCard } from '@/app/auth/_components/AuthCard';

export default function NotConnectedPage() {
  return (
    <AuthCard
      icon={LogIn}
      title="Connexion requise"
      description="Connectez-vous pour accéder à cette page."
      footer="Besoin d'aide ? Contactez un administrateur du club."
    >
      <Button asChild className="w-full">
        <Link href="/">Se connecter</Link>
      </Button>
    </AuthCard>
  );
}
