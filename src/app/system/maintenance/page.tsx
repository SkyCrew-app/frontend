'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Loader2, Twitter, Facebook, Instagram } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { useQuery } from '@apollo/client'
import { MAINTENANCE_QUERY } from '@/graphql/system'

interface MaintenanceDetails {
  maintenanceTime: string
  maintenanceMessage: string
}

const CountdownTimer = ({ endTime }: { endTime: Date }) => {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 })

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = endTime.getTime() - new Date().getTime()

      if (difference <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 })
        return
      }

      const hours = Math.floor(difference / (1000 * 60 * 60))
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((difference % (1000 * 60)) / 1000)

      setTimeLeft({ hours, minutes, seconds })
    }

    calculateTimeLeft()
    const timer = setInterval(calculateTimeLeft, 1000)

    return () => clearInterval(timer)
  }, [endTime])

  return (
    <div className="flex items-center justify-center space-x-4 text-2xl font-bold text-blue-600">
      <div className="flex flex-col items-center">
        <motion.span
          key={timeLeft.hours}
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          {String(timeLeft.hours).padStart(2, '0')}
        </motion.span>
        <span className="text-xs text-gray-500">Heures</span>
      </div>
      <span>:</span>
      <div className="flex flex-col items-center">
        <motion.span
          key={timeLeft.minutes}
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          {String(timeLeft.minutes).padStart(2, '0')}
        </motion.span>
        <span className="text-xs text-gray-500">Minutes</span>
      </div>
      <span>:</span>
      <div className="flex flex-col items-center">
        <motion.span
          key={timeLeft.seconds}
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          {String(timeLeft.seconds).padStart(2, '0')}
        </motion.span>
        <span className="text-xs text-gray-500">Secondes</span>
      </div>
    </div>
  )
}

export default function MaintenancePage() {
  const { data, loading, error } = useQuery<{ getMaintenanceDetails: string }>(MAINTENANCE_QUERY)

  const [maintenanceDetails, setMaintenanceDetails] = useState<MaintenanceDetails | null>(null)

  useEffect(() => {
    if (data?.getMaintenanceDetails) {
      try {
        const parsedData = JSON.parse(data.getMaintenanceDetails) as MaintenanceDetails
        setMaintenanceDetails(parsedData)
      } catch (e) {
        console.error("Error parsing maintenance details:", e)
      }
    }
  }, [data])

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center text-red-500">
        Une erreur est survenue lors du chargement des informations de maintenance.
      </div>
    )
  }

  const endTime = maintenanceDetails
    ? new Date(maintenanceDetails.maintenanceTime)
    : new Date()

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 overflow-hidden">
      <motion.div 
        className="max-w-md w-full space-y-8 text-center relative z-10"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.5 }}
      >
        <motion.div 
          className="flex justify-center bg-white"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <div className="w-96 h-64 relative bg-white">
            <img
              src="https://cdn.dribbble.com/users/49067/screenshots/3710403/media/b14fa0bc9d533524a1bfadb3c588a843.gif"
              alt="Maintenance en cours"
              className="w-full h-full object-contain bg-white"
            />
          </div>
        </motion.div>

        <motion.h1
          className="text-4xl font-bold text-gray-900"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.7 }}
        >
          Site en maintenance
        </motion.h1>

        <motion.p
          className="text-xl text-gray-600"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.9 }}
        >
          {maintenanceDetails?.maintenanceMessage ||
           "Nous effectuons actuellement des mises à jour pour améliorer votre expérience."}
        </motion.p>

        <motion.div
          className="flex flex-col items-center justify-center space-y-4 text-blue-500"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.1 }}
        >
          <div className="flex items-center space-x-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Temps restant estimé :</span>
          </div>
          <CountdownTimer endTime={endTime} />
        </motion.div>

        <motion.div
          className="pt-6"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.3 }}
        >
          <p className="text-sm text-gray-500 mb-4">
            Suivez-nous pour rester informé :
          </p>
          <div className="flex justify-center space-x-4">
            <Button variant="outline" size="sm">
              <Twitter className="mr-2 h-4 w-4" />
              Twitter
            </Button>
            <Button variant="outline" size="sm">
              <Facebook className="mr-2 h-4 w-4" />
              Facebook
            </Button>
            <Button variant="outline" size="sm">
              <Instagram className="mr-2 h-4 w-4" />
              Instagram
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}

