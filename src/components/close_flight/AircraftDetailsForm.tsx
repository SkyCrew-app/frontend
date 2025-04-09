import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plane } from "lucide-react"

type AircraftDetailsFormProps = {
  aircraft: {
    registration_number: string
    model: string
    year_of_manufacture: number
    maxAltitude: number
    cruiseSpeed: number
    consumption: number
    total_flight_hours: number
  }
}

export default function AircraftDetailsForm({ aircraft }: AircraftDetailsFormProps) {
  if (!aircraft) return null

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Plane className="h-5 w-5 text-muted-foreground" />
          <CardTitle>Détails de l'aéronef</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Numéro d'immatriculation</p>
            <p className="text-lg font-semibold">{aircraft.registration_number}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Modèle</p>
            <p className="text-lg font-semibold">{aircraft.model}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Année de fabrication</p>
            <p className="text-lg font-semibold">{aircraft.year_of_manufacture}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Altitude maximale (pieds)</p>
            <p className="text-lg font-semibold">{aircraft.maxAltitude}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Vitesse de croisière (nœuds)</p>
            <p className="text-lg font-semibold">{aircraft.cruiseSpeed}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Consommation (L/h)</p>
            <p className="text-lg font-semibold">{aircraft.consumption}</p>
          </div>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Heures de vol totales</p>
          <p className="text-lg font-semibold">{aircraft.total_flight_hours}</p>
        </div>
      </CardContent>
    </Card>
  )
}

