import FinancialDashboard from "@/components/finance/FinancialDashboard"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Finances | SkyCrew",
  description: "Revenus, dépenses et prévisions de l'aéroclub",
}

export default function FinancePage() {
  return <FinancialDashboard />
}
