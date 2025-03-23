import FinancialDashboard from "@/components/finance/FinancialDashboard"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Tableau de Bord Financier | SkyCrew",
  description: "Gestion financière de l'aéroclub - Revenus, dépenses et prévisions budgétaires",
}

export default function FinancePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b">
      <div className="container mx-auto p-6">
        <div className="mb-8 space-y-2">
          <h1 className="text-4xl font-bold text-gray-800">
            <span className="bg-clip-text">
              Tableau de Bord Financier
            </span>
          </h1>
          <p className="text-gray-500 max-w-3xl">
            Suivez les performances financières de l'aéroclub, analysez les dépenses et planifiez votre budget avec des
            prévisions précises.
          </p>
        </div>
        <FinancialDashboard />
      </div>
    </div>
  )
}

