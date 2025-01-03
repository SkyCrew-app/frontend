import Link from 'next/link';

export default function UnauthorizedPage() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-black text-white">
      <div className="bg-gray-900 shadow-lg rounded-lg p-8 max-w-md text-center">
        <h1 className="text-3xl font-semibold mb-4">Accès Refusé</h1>
        <p className="text-base mb-6">
          Vous n'avez pas la permission d'accéder à cette page.
        </p>
        <Link href="/dashboard">
          <div className="px-6 py-2 bg-white text-black rounded-md shadow hover:bg-gray-200 transition duration-300 cursor-pointer">
            Retour à l'accueil
          </div>
        </Link>
      </div>
      <div className="mt-4 text-sm text-gray-400">
        <p>Si vous pensez que c'est une erreur, contactez l'administrateur.</p>
      </div>
    </div>
  );
}
