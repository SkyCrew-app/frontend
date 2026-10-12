import React from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Award, Hash, Building, Calendar, CheckCircle, AlertCircle } from 'lucide-react'
import { motion } from "framer-motion"

const formatDate = (date: string | number | Date) => {
  if (!date) return ""
  const d = new Date(date)
  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()} ${d.getHours().toString().padStart(2, "0")}h${d.getMinutes().toString().padStart(2, "0")}`
}

interface LicenseCardProps {
  license: {
    license_type: string
    status: string
    is_valid: boolean
    license_number: string
    certification_authority: string
    issue_date: string | number | Date
    expiration_date: string | number | Date
    id: string
  }
}

export function LicenseCard({ license }: LicenseCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="flex flex-col hover:shadow-md transition-shadow duration-300 h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center text-xl">
              <Award className="mr-3 text-info" size={24} />
              {license.license_type}
            </CardTitle>
            <Badge variant={license.is_valid ? "default" : "destructive"} className="text-sm px-3 py-1">
              {license.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex-grow space-y-4 pt-2">
          <div className="grid grid-cols-1 gap-3">
            <div className="flex items-center text-base text-muted-foreground">
              <Hash className="mr-3 text-muted-foreground flex-shrink-0" size={18} />
              <div className="flex-grow">
                <span className="font-medium">Numéro:</span>
                <span className="ml-1 break-all">{license.license_number}</span>
              </div>
            </div>

            <div className="flex items-center text-base text-muted-foreground">
              <Building className="mr-3 text-muted-foreground flex-shrink-0" size={18} />
              <div className="flex-grow">
                <span className="font-medium">Autorité:</span>
                <span className="ml-1 break-all">{license.certification_authority}</span>
              </div>
            </div>

            <div className="flex items-center text-base text-muted-foreground">
              <Calendar className="mr-3 text-success flex-shrink-0" size={18} />
              <div className="flex-grow">
                <span className="font-medium">Délivrée le:</span>
                <span className="ml-1">{formatDate(license.issue_date)}</span>
              </div>
            </div>

            <div className="flex items-center text-base text-muted-foreground">
              <Calendar className="mr-3 text-destructive flex-shrink-0" size={18} />
              <div className="flex-grow">
                <span className="font-medium">Expire le:</span>
                <span className="ml-1">{formatDate(license.expiration_date)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center text-base mt-2 pt-2 border-t border-border">
            {license.is_valid ? (
              <CheckCircle className="mr-3 text-success flex-shrink-0" size={18} />
            ) : (
              <AlertCircle className="mr-3 text-destructive flex-shrink-0" size={18} />
            )}
            <span className="font-medium">{license.is_valid ? "Valide" : "Non valide"}</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
