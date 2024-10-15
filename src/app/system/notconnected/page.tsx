// /src/app/unauthorized/page.tsx
import Link from 'next/link';

export default function NotConnectedPage() {
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-3xl font-bold mb-4">Accès refusé</h1>
      <p className="mb-6">Vous devez être connecté pour acceder à cette page</p>
      <Link href="/" className="text-blue-500">Retour à la page login</Link>
    </div>
  );
}
