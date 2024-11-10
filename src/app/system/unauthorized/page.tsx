import Link from 'next/link';

export default function UnauthorizedPage() {
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-3xl font-bold mb-4">Accès refusé</h1>
      <p className="mb-6">Vous n'avez pas la permission d'accéder à cette page.</p>
      <Link href="/" className="text-blue-500">Retour à l'accueil</Link>
    </div>
  );
}
