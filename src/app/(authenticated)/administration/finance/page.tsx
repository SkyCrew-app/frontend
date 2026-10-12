import FinancialDashboard from "@/components/finance/FinancialDashboard"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Tableau de bord financier | SkyCrew",
  description: "Gestion financière de l'aéroclub - Revenus, dépenses et prévisions budgétaires",
}

export default function FinancePage() {
  return (
    <div className="w-full">
      <div className="w-full">
        <div className="mb-8 space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            <span>
              Tableau de bord financier
            </span>
          </h1>
          <p className="text-muted-foreground max-w-3xl">
            Suivez les performances financières de l'aéroclub, analysez les dépenses et planifiez votre budget avec des
            prévisions précises.
          </p>
        </div>
        <FinancialDashboard />
      </div>
    </div>
  )
}

