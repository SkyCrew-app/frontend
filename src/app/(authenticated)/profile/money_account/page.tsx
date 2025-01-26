import AccountOverview from "@/components/account/AccountOverview"
import TransactionHistory from "@/components/account/TransactionHistory"
import TopUpAccount from "@/components/account/TopUpAccount"

export default function MoneyAccountPage() {
  return (
    <div className="min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-semibold mb-8">Gestion Financière</h1>

        <div className="grid gap-8 md:grid-cols-2">
          <AccountOverview />
          <TopUpAccount />
        </div>

        <div className="mt-12">
          <TransactionHistory />
        </div>
      </div>
    </div>
  )
}

