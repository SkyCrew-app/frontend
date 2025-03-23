"use client"

import React, { useState } from "react"
import { useFormContext } from "react-hook-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { TaxonomyCategory as TaxonomyCategoryComponent } from "./taxonomy-category"
import { motion } from "framer-motion"
import { Tags } from "lucide-react"

type TaxonomyCategory = "maintenanceTypes" | "licenseTypes" | "aircraftCategories" | "flightTypes"

const taxonomyLabels: Record<TaxonomyCategory, string> = {
  maintenanceTypes: "Types de maintenance",
  licenseTypes: "Types de licences",
  aircraftCategories: "Catégories d'aéronefs",
  flightTypes: "Types de vols",
}

export function TaxonomyManager() {
  const { watch, setValue } = useFormContext()
  const taxonomies = watch("taxonomies") || {}
  const [newItem, setNewItem] = useState<Record<TaxonomyCategory, string>>({
    maintenanceTypes: "",
    licenseTypes: "",
    aircraftCategories: "",
    flightTypes: "",
  })

  const handleAddItem = (category: TaxonomyCategory) => {
    if (newItem[category].trim() !== "") {
      const currentItems = taxonomies[category] || []
      // Vérifier si l'élément existe déjà
      if (!currentItems.includes(newItem[category].trim())) {
        setValue(`taxonomies.${category}`, [...currentItems, newItem[category].trim()])
      }
      setNewItem({ ...newItem, [category]: "" })
    }
  }

  const handleRemoveItem = (category: TaxonomyCategory, item: string) => {
    const currentItems = taxonomies[category] || []
    setValue(
      `taxonomies.${category}`,
      currentItems.filter((i: string) => i !== item),
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <Card className="border-t-4 border-t-blue-500 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl flex items-center gap-2">
            <Tags className="h-5 w-5 text-blue-500" />
            Gestion des taxonomies
          </CardTitle>
          <CardDescription>Configurez les différentes catégories et types utilisés dans l'aéroclub.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {(Object.keys(taxonomyLabels) as TaxonomyCategory[]).map((category, index) => (
            <React.Fragment key={category}>
              <TaxonomyCategoryComponent
                categoryKey={category}
                categoryLabel={taxonomyLabels[category]}
                items={taxonomies[category] || []}
                newItemValue={newItem[category]}
                onNewItemChange={(value) => setNewItem({ ...newItem, [category]: value })}
                onAddItem={() => handleAddItem(category)}
                onRemoveItem={(item) => handleRemoveItem(category, item)}
              />
              {index < Object.keys(taxonomyLabels).length - 1 && <Separator className="my-4" />}
            </React.Fragment>
          ))}
        </CardContent>
      </Card>
    </motion.div>
  )
}
