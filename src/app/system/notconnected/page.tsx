import Link from 'next/link';

export default function NotConnectedPage() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-black text-white">
      <div className="bg-gray-900 shadow-lg rounded-lg p-8 max-w-md text-center">
        <h1 className="text-3xl font-semibold mb-4">Accès Refusé</h1>
        <p className="text-base mb-6">
          Vous devez être connecté pour accéder à cette page.
        </p>
        <Link href="/">
          <div className="px-6 py-2 bg-white text-black rounded-md shadow hover:bg-gray-200 transition duration-300 cursor-pointer">
            Retour à la page de connexion
          </div>
        </Link>
      </div>
      <div className="mt-4 text-sm text-gray-400">
        <p>Contactez l'administrateur pour toute assistance.</p>
      </div>
    </div>
  );
}
