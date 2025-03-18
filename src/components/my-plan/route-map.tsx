"use client"

import { useEffect, useRef, useState } from "react"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle } from "lucide-react"
import type { Airport, Waypoint } from "@/lib/aviation-api"

interface RouteMapProps {
  departure?: Airport | null
  arrival?: Airport | null
  waypoints?: Waypoint[]
  className?: string
}

export function RouteMap({ departure, arrival, waypoints = [], className = "" }: RouteMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const [mapError, setMapError] = useState<string | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const markersRef = useRef<mapboxgl.Marker[]>([])

  useEffect(() => {
    if (!mapContainer.current) return

    if (!process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN) {
      setMapError("Clé d'API Mapbox manquante. Veuillez configurer NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN.")
      return
    }

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/navigation-night-v1",
        center: [2.213749, 46.227638],
        zoom: 5,
        accessToken: process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN,
      })

      map.current.addControl(new mapboxgl.NavigationControl())

      map.current.on("load", () => {
        console.log("Map loaded")
        setMapLoaded(true)
      })

      map.current.on("error", (e) => {
        console.error("Mapbox error:", e)
        setMapError("Erreur lors du chargement de la carte. Vérifiez votre clé API Mapbox et votre connexion internet.")
      })
    } catch (error) {
      console.error("Error initializing map:", error)
      setMapError("Impossible d'initialiser la carte. Veuillez vérifier votre connexion internet.")
    }

    return () => {
      markersRef.current.forEach((marker) => marker.remove())
      markersRef.current = []

      map.current?.remove()
    }
  }, [])

  useEffect(() => {
    if (!map.current || !mapLoaded || mapError) return

    try {
      markersRef.current.forEach((marker) => marker.remove())
      markersRef.current = []

      const points: [number, number][] = []

      if (departure) {
        const marker = new mapboxgl.Marker({ color: "#22c55e" })
          .setLngLat([departure.lon, departure.lat])
          .setPopup(new mapboxgl.Popup().setHTML(`<h3>${departure.name}</h3><p>${departure.icao}</p>`))
          .addTo(map.current)

        markersRef.current.push(marker)
        points.push([departure.lon, departure.lat])
      }

      waypoints.forEach((waypoint) => {
        const marker = new mapboxgl.Marker({ color: "#3b82f6" })
          .setLngLat([waypoint.lon, waypoint.lat])
          .setPopup(new mapboxgl.Popup().setHTML(`<h3>${waypoint.name || waypoint.ident}</h3><p>${waypoint.ident}</p>`))
          .addTo(map.current!)

        markersRef.current.push(marker)
        points.push([waypoint.lon, waypoint.lat])
      })

      if (arrival) {
        const marker = new mapboxgl.Marker({ color: "#ef4444" })
          .setLngLat([arrival.lon, arrival.lat])
          .setPopup(new mapboxgl.Popup().setHTML(`<h3>${arrival.name}</h3><p>${arrival.icao}</p>`))
          .addTo(map.current)

        markersRef.current.push(marker)
        points.push([arrival.lon, arrival.lat])
      }

      if (points.length >= 2) {
        if (map.current.getSource("route")) {
          map.current.removeLayer("route")
          map.current.removeSource("route")
        }

        map.current.addSource("route", {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: points,
            },
          },
        })

        map.current.addLayer({
          id: "route",
          type: "line",
          source: "route",
          layout: {
            "line-join": "round",
            "line-cap": "round",
          },
          paint: {
            "line-color": "#3b82f6",
            "line-width": 2,
            "line-dasharray": [2, 1],
          },
        })

        const bounds = new mapboxgl.LngLatBounds()
        points.forEach((point) => bounds.extend(point))
        map.current.fitBounds(bounds, { padding: 50 })
      }
    } catch (error) {
      console.error("Error updating map:", error)
      setMapError("Erreur lors de la mise à jour de la carte.")
    }
  }, [departure, arrival, waypoints, mapLoaded, mapError])

  if (mapError) {
    return (
      <Alert variant="destructive" className={`${className}`}>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{mapError}</AlertDescription>
      </Alert>
    )
  }

  return <div ref={mapContainer} className={`h-[400px] rounded-lg ${className}`} />
}
