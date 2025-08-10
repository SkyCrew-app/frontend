"use client"

import { useState } from "react"
import AccountOverview from "@/components/account/AccountOverview"
import TransactionHistory from "@/components/account/TransactionHistory"
import TopUpAccount from "@/components/account/TopUpAccount"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useMediaQuery } from "@/hooks/use-media-query"
import { Wallet, CreditCard, History } from "lucide-react"
import { motion } from "framer-motion"
import { useTranslations } from "next-intl"

export default function MoneyAccountPage() {
  const [activeTab, setActiveTab] = useState("overview")
  const isMobile = useMediaQuery("(max-width: 768px)")

  const t = useTranslations("profile")

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  }

  if (!isMobile) {
    return (
      <motion.div
        className="min-h-screen py-12"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.h1 className="text-3xl font-bold mb-8 text-center md:text-left" variants={itemVariants}>
            {t('financialManagement')}
          </motion.h1>

          <motion.div className="grid gap-8 md:grid-cols-2" variants={itemVariants}>
            <AccountOverview />
            <TopUpAccount />
          </motion.div>

          <motion.div className="mt-12" variants={itemVariants}>
            <TransactionHistory />
          </motion.div>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="min-h-screen py-6">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-2xl font-bold mb-6 text-center">{t('financialManagement')}</h1>

        <Tabs defaultValue="overview" className="w-full" onValueChange={setActiveTab} value={activeTab}>
          <TabsList className="grid grid-cols-3 mb-6">
            <TabsTrigger value="overview" className="flex items-center justify-center">
              <Wallet className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">{t('pay')}</span>
            </TabsTrigger>
            <TabsTrigger value="topup" className="flex items-center justify-center">
              <CreditCard className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">{t('recharge')}</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center justify-center">
              <History className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">{t('history')}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <AccountOverview />
          </TabsContent>

          <TabsContent value="topup" className="space-y-4">
            <TopUpAccount />
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <TransactionHistory />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
