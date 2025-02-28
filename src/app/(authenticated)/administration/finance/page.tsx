import FinancialDashboard from "@/components/finance/FinancialDashboard"

export default function FinancePage() {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto p-6">
        <h1 className="text-4xl font-bold mb-8 text-gray-800">Tableau de Bord Financier de l'Aéroclub</h1>
        <FinancialDashboard />
      </div>
    </div>
  )
}
