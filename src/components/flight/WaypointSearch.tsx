import React, { useState } from 'react'
import { Combobox } from "@/components/ui/combobox"
import { Button } from "@/components/ui/button"
import { X } from 'lucide-react'

// Simulons une liste de waypoints pour l'autocomplétion
const waypointOptions = [
  { label: "PARIS", value: "LFPG" },
  { label: "LONDON", value: "EGLL" },
  { label: "NEW YORK", value: "KJFK" },
  { label: "TOKYO", value: "RJTT" },
  { label: "DUBAI", value: "OMDB" },
]

interface WaypointSearchProps {
  waypoints: string[]
  setWaypoints: React.Dispatch<React.SetStateAction<string[]>>
}

export function WaypointSearch({ waypoints, setWaypoints }: WaypointSearchProps) {
  const [selectedWaypoint, setSelectedWaypoint] = useState("")

  const addWaypoint = () => {
    if (selectedWaypoint && !waypoints.includes(selectedWaypoint)) {
      setWaypoints([...waypoints, selectedWaypoint])
      setSelectedWaypoint("")
    }
  }

  const removeWaypoint = (waypoint: string) => {
    setWaypoints(waypoints.filter(w => w !== waypoint))
  }

  return (
    <div className="space-y-4">
      <div className="flex space-x-2">
        <div className="flex-grow">
          <Combobox
            options={waypointOptions}
            value={selectedWaypoint}
            onChange={setSelectedWaypoint}
          />
        </div>
        <Button onClick={addWaypoint} disabled={!selectedWaypoint}>
          Ajouter
        </Button>
      </div>
      {waypoints.length > 0 && (
        <div className="bg-gray-100 p-4 rounded-md">
          <h4 className="font-semibold mb-2">Waypoints sélectionnés:</h4>
          <ul className="space-y-2">
            {waypoints.map((waypoint, index) => (
              <li key={index} className="flex items-center justify-between bg-white p-2 rounded-md">
                <span>{waypointOptions.find(w => w.value === waypoint)?.label || waypoint}</span>
                <Button variant="ghost" size="sm" onClick={() => removeWaypoint(waypoint)}>
                  <X className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
