"use client"

import { useParams } from "next/navigation"
import { AircraftFlightData } from "@/components/fleet-admin/AircraftFlightData"

export default function AircraftFlightDataPage() {
  const { id } = useParams()
  return <AircraftFlightData aircraftId={Number.parseInt(String(Array.isArray(id) ? id[0] : id), 10)} />
}
