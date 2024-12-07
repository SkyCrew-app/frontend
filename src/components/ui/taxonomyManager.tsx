import React, { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Separator } from '@/components/ui/separator';
import { Badge } from "@/components/ui/badge"
import { X } from 'lucide-react';

type TaxonomyCategory = 'maintenanceTypes' | 'licenseTypes' | 'aircraftCategories' | 'flightTypes';

const taxonomyLabels: Record<TaxonomyCategory, string> = {
  maintenanceTypes: 'Types de maintenance',
  licenseTypes: 'Types de licences',
  aircraftCategories: 'Catégories d\'aéronefs',
  flightTypes: 'Types de vols',
};

export function TaxonomyManager() {
  const { watch, setValue } = useFormContext();
  const taxonomies = watch('taxonomies');
  const [newItem, setNewItem] = useState<Record<TaxonomyCategory, string>>({
    maintenanceTypes: '',
    licenseTypes: '',
    aircraftCategories: '',
    flightTypes: '',
  });

const handleAddItem = (category: TaxonomyCategory) => {
  if (newItem[category].trim() !== '') {
    const currentItems = taxonomies[category] || [];
    setValue(`taxonomies.${category}`, [...currentItems, newItem[category].trim()]);
    setNewItem({ ...newItem, [category]: '' });
  }
};

const handleRemoveItem = (category: TaxonomyCategory, item: string) => {
  const currentItems = taxonomies[category] || [];
  setValue(
    `taxonomies.${category}`,
    currentItems.filter((i: string) => i !== item)
  );
};

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestion des taxonomies</CardTitle>
        <CardDescription>Configurez les différentes catégories et types utilisés dans l'aéroclub.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {(Object.keys(taxonomyLabels) as TaxonomyCategory[]).map((category) => (
          <div key={category} className="space-y-2">
            <Label htmlFor={category}>{taxonomyLabels[category]}</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {(taxonomies[category] || []).map((item: string) => (
                <Badge key={item} variant="secondary" className="text-sm">
                  {item}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-2 h-auto p-0 text-muted-foreground hover:text-foreground"
                    onClick={() => handleRemoveItem(category, item)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                id={category}
                value={newItem[category]}
                onChange={(e) => setNewItem({ ...newItem, [category]: e.target.value })}
                placeholder={`Ajouter un nouveau ${taxonomyLabels[category].toLowerCase()}`}
              />
              <Button onClick={() => handleAddItem(category)}>Ajouter</Button>
            </div>
            <Separator className="my-4" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

