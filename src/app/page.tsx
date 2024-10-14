// app/page.tsx ou pages/index.tsx

import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold mb-6">Bienvenue sur SkyCrew</h1>
      <Button>Cliquer ici</Button>
    </main>
  );
}
