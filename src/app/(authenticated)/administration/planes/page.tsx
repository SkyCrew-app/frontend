"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AircraftList } from "@/components/fleet-admin/aircraft-list"
import { CreateAircraftForm } from "@/components/fleet-admin/create-aircraft-form"
import { Plane, Plus } from "lucide-react"
import { useQuery } from "@apollo/client"
import { GET_AIRCRAFTS } from "@/graphql/planes"
import type { AircraftsResponse } from "@/interfaces/aircraft"
import { Badge } from "@/components/ui/badge"

export default function FleetManagementPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const { refetch } = useQuery<AircraftsResponse>(GET_AIRCRAFTS, { skip: true })

  return (
    <div className="min-h-screen bg-gradient-to-b">
      <div className="container mx-auto px-2 py-6 sm:px-4 sm:py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-bold sm:text-3xl md:text-4xl">
                <Plane className="h-6 w-6 text-primary sm:h-7 sm:w-7 md:h-8 md:w-8" />
                Gestion de la Flotte
              </h1>
              <p className="mt-1 text-sm text-muted-foreground sm:text-base">
                Gérez les aéronefs de votre flotte, leurs caractéristiques et leur disponibilité
              </p>
            </div>

            <Button onClick={() => setIsCreateModalOpen(true)} size="sm" className="w-full sm:w-auto">
              <Plus className="mr-1.5 h-4 w-4" />
              <span>Ajouter un aéronef</span>
            </Button>
          </div>

          <Card className="border-t-4 border-t-primary shadow-md">
            <CardHeader className="pb-2">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-lg sm:text-xl">Flotte d'aéronefs</CardTitle>
                  <CardDescription>Consultez et gérez tous les aéronefs de votre flotte</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant="outline"
                    className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                  >
                    Disponible
                  </Badge>
                  <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                    Indisponible
                  </Badge>
                  <Badge
                    variant="outline"
                    className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                  >
                    Réservé
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <AircraftList />
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <CreateAircraftForm
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          refetch()
          setIsCreateModalOpen(false)
        }}
      />
    </div>
  )
}
