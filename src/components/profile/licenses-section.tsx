"use client"

import React, { useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Filter, Calendar, ChevronUp, ChevronDown } from 'lucide-react'
import { LicenseCard } from "./license-card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { motion } from "framer-motion"

interface LicensesSectionProps {
  licenses: Array<{
    issue_date: string | number | Date
    certification_authority: string
    license_number: string
    status: string
    is_valid: boolean
    id: string
    license_type: string
    expiration_date: string | number | Date
  }>
}

export function LicensesSection({ licenses = [] }: LicensesSectionProps) {
  const [sortBy, setSortBy] = useState("expiration_date")
  const [filterBy, setFilterBy] = useState("all")

  const getSortedAndFilteredLicenses = () => {
    if (!licenses || licenses.length === 0) {
      return []
    }

    let filteredLicenses = [...licenses]
    if (filterBy === "valid") {
      filteredLicenses = filteredLicenses.filter((license) => license.is_valid)
    } else if (filterBy === "expired") {
      filteredLicenses = filteredLicenses.filter((license) => !license.is_valid)
    }

    return filteredLicenses.sort((a, b) => {
      if (sortBy === "type") {
        return a.license_type.localeCompare(b.license_type)
      } else if (sortBy === "issue_date") {
        return new Date(b.issue_date).getTime() - new Date(a.issue_date).getTime()
      } else if (sortBy === "expiration_date") {
        return new Date(a.expiration_date).getTime() - new Date(b.expiration_date).getTime()
      } else if (sortBy === "status") {
        return a.status.localeCompare(b.status)
      }
      return 0
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="w-full shadow-md">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl font-semibold">Mes licences</CardTitle>
            <div className="flex items-center space-x-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setSortBy(sortBy === "expiration_date" ? "expiration_date_desc" : "expiration_date")
                      }
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      Trier par date
                      {sortBy === "expiration_date" ? (
                        <ChevronUp className="ml-2 h-4 w-4" />
                      ) : (
                        <ChevronDown className="ml-2 h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Trier par date d'expiration</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="mr-2 h-4 w-4" />
                    Filtrer
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Filtrer par</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => setFilterBy("all")}>Toutes les licences</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterBy("valid")}>Licences valides</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterBy("expired")}>Licences expirées</DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuLabel>Trier par</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => setSortBy("type")}>Type de licence</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy("issue_date")}>Date de délivrance</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy("expiration_date")}>Date d'expiration</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy("status")}>Statut</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {licenses && licenses.length > 0 ? (
              getSortedAndFilteredLicenses().map((license) => (
                <LicenseCard key={license.id} license={license} />
              ))
            ) : (
              <div className="col-span-full text-center text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-2">Aucune licence</h3>
                <p>Vous n'avez pas encore de licence enregistrée.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
