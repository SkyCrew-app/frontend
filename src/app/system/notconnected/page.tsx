import Link from 'next/link';

export default function NotConnectedPage() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-background text-foreground">
      <div className="bg-card shadow-lg rounded-lg p-8 max-w-md text-center border border-border">
        <h1 className="text-3xl font-semibold mb-4">Accès Refusé</h1>
        <p className="text-base mb-6 text-muted-foreground">
          Vous devez être connecté pour accéder à cette page.
        </p>
        <Link href="/">
          <div className="px-6 py-2 bg-primary text-primary-foreground rounded-md shadow hover:bg-primary/90 transition duration-300 cursor-pointer">
            Retour à la page de connexion
          </div>
        </Link>
      </div>
      <div className="mt-4 text-sm text-muted-foreground">
        <p>Contactez l'administrateur pour toute assistance.</p>
      </div>
    </div>
  );
}
