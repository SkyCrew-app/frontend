import React, { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || ''

interface MapboxMapProps {
  waypoints: [number, number][]
  departure: {
    name: string
    position: [number, number]
  }
  arrival: {
    name: string
    position: [number, number]
  }
  focusPoint?: {
    center: [number, number]
    zoom: number
  }
}

const MapboxMap: React.FC<MapboxMapProps> = ({ waypoints, departure, arrival, focusPoint }) => {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const lng = -70
  const lat = 42
  const zoom = 2

  useEffect(() => {
    if (map.current) return // initialize map only once
    map.current = new mapboxgl.Map({
      container: mapContainer.current!,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [lng, lat],
      zoom: zoom
    })
  }, [])

  useEffect(() => {
    if (!map.current) return

    // Remove existing markers
    const existingMarkers = document.querySelectorAll('.mapboxgl-marker');
    existingMarkers.forEach(marker => marker.remove());

    // Add departure marker
    if (!isNaN(departure.position[0]) && !isNaN(departure.position[1])) {
      new mapboxgl.Marker({ color: '#00FF00' })
        .setLngLat(departure.position)
        .setPopup(new mapboxgl.Popup().setHTML(`<h3>Départ: ${departure.name}</h3>`))
        .addTo(map.current!)
    }

    // Add arrival marker
    if (!isNaN(arrival.position[0]) && !isNaN(arrival.position[1])) {
      new mapboxgl.Marker({ color: '#FF0000' })
        .setLngLat(arrival.position)
        .setPopup(new mapboxgl.Popup().setHTML(`<h3>Arrivée: ${arrival.name}</h3>`))
        .addTo(map.current!)
    }

    // Add waypoint markers (excluding departure and arrival)
    waypoints.slice(1, -1).forEach((waypoint, index) => {
      return new mapboxgl.Marker({ color: '#FFFF00' })
        .setLngLat(waypoint)
        .setPopup(new mapboxgl.Popup().setHTML(`<h3>Waypoint ${index + 1}</h3>`))
        .addTo(map.current!)
    })
  }, [departure, arrival, waypoints])

  useEffect(() => {
    if (!map.current) return

    const addRouteLayer = () => {
      if (map.current?.getSource('route')) {
        map.current.removeLayer('route');
        map.current.removeSource('route');
      }

      // Add waypoints including departure and arrival
      const validWaypoints = [
        departure.position,
        ...waypoints,
        arrival.position
      ].filter(point => !isNaN(point[0]) && !isNaN(point[1]))

      if (validWaypoints.length >= 2) {
        map.current?.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: validWaypoints
            }
          }
        })

        map.current?.addLayer({
          id: 'route',
          type: 'line',
          source: 'route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#888',
            'line-width': 8
          }
        })

        // Fit bounds to include all points
        const bounds = new mapboxgl.LngLatBounds()
        validWaypoints.forEach(point => bounds.extend(point))
        map.current?.fitBounds(bounds, { padding: 50 })
      } else {
        console.error('Not enough valid waypoints to draw route')
      }
    }

    if (map.current.loaded()) {
      addRouteLayer();
    } else {
      map.current.on('load', addRouteLayer);
    }

    return () => {
      if (map.current) {
        if (map.current.getLayer('route')) {
          map.current.removeLayer('route');
        }
        if (map.current.getSource('route')) {
          map.current.removeSource('route');
        }
      }
    };
  }, [departure, arrival, waypoints])

  useEffect(() => {
    if (map.current && focusPoint) {
      map.current.flyTo({
        center: focusPoint.center,
        zoom: focusPoint.zoom,
        essential: true
      })
    }
  }, [focusPoint])

  return <div ref={mapContainer} className="h-full w-full" />
}

export default MapboxMap
