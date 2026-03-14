import React, { useEffect, useRef, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface WaypointData {
  ident: string
  type: string
  lat: number
  lon: number
  alt: number
  name?: string | null
  ground_speed_kts?: number
  wind_correction_deg?: number
  fuel_remaining_liters?: number
  time_from_dep_min?: number
  leg_distance_nm?: number
}

interface MapboxMapProps {
  waypoints: WaypointData[]
  departure: { icao: string; name: string; lat: number; lon: number }
  arrival: { icao: string; name: string; lat: number; lon: number }
  focusPoint?: { center: [number, number]; zoom: number }
}

/* ------------------------------------------------------------------ */
/*  Geo helpers                                                        */
/* ------------------------------------------------------------------ */

const toRad = (d: number) => (d * Math.PI) / 180
const toDeg = (r: number) => (r * 180) / Math.PI

function computeBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLon = toRad(lon2 - lon1)
  const y = Math.sin(dLon) * Math.cos(toRad(lat2))
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon)
  return (toDeg(Math.atan2(y, x)) + 360) % 360
}

function haversineNm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3440.065
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(a))
}

/**
 * Interpolate points along a great circle arc (spherical slerp).
 * Returns an array of [lon, lat] suitable for GeoJSON.
 */
function greatCircleArc(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
  numPoints: number,
): [number, number][] {
  const lat1R = toRad(lat1), lon1R = toRad(lon1)
  const lat2R = toRad(lat2), lon2R = toRad(lon2)

  // Angular distance between the two points
  const d = 2 * Math.asin(
    Math.sqrt(
      Math.sin((lat2R - lat1R) / 2) ** 2 +
      Math.cos(lat1R) * Math.cos(lat2R) * Math.sin((lon2R - lon1R) / 2) ** 2,
    ),
  )

  // If points are very close, just return them directly
  if (d < 0.0001) return [[lon1, lat1], [lon2, lat2]]

  const points: [number, number][] = []
  for (let i = 0; i <= numPoints; i++) {
    const f = i / numPoints
    const A = Math.sin((1 - f) * d) / Math.sin(d)
    const B = Math.sin(f * d) / Math.sin(d)
    const x = A * Math.cos(lat1R) * Math.cos(lon1R) + B * Math.cos(lat2R) * Math.cos(lon2R)
    const y = A * Math.cos(lat1R) * Math.sin(lon1R) + B * Math.cos(lat2R) * Math.sin(lon2R)
    const z = A * Math.sin(lat1R) + B * Math.sin(lat2R)
    const lat = toDeg(Math.atan2(z, Math.sqrt(x * x + y * y)))
    const lon = toDeg(Math.atan2(y, x))
    points.push([lon, lat])
  }
  return points
}

/**
 * Compute how many interpolation points to use for a leg based on distance.
 */
function arcResolution(distNm: number): number {
  if (distNm < 5) return 2
  if (distNm < 30) return 8
  if (distNm < 100) return 16
  return 24
}

/* ------------------------------------------------------------------ */
/*  Formatting helpers                                                 */
/* ------------------------------------------------------------------ */

function formatAlt(alt: number): string {
  if (!alt || alt <= 0) return ''
  if (alt >= 5000) return `FL${Math.round(alt / 100).toString().padStart(3, '0')}`
  return `${alt}ft`
}

function formatBearing(deg: number): string {
  return `${Math.round(deg).toString().padStart(3, '0')}°`
}

/* ------------------------------------------------------------------ */
/*  Phase detection                                                    */
/* ------------------------------------------------------------------ */

type Phase = 'climb' | 'cruise' | 'descent'

const PHASE_COLORS: Record<Phase, string> = {
  climb: '#22C55E',
  cruise: '#E040FB',
  descent: '#F59E0B',
}

function getSegmentPhase(segIdx: number, tocIdx: number, todIdx: number): Phase {
  if (tocIdx >= 0 && segIdx < tocIdx) return 'climb'
  if (todIdx >= 0 && segIdx >= todIdx) return 'descent'
  return 'cruise'
}

/* ------------------------------------------------------------------ */
/*  SVG aviation symbols                                               */
/* ------------------------------------------------------------------ */

function getWaypointMarkerHtml(wp: WaypointData): string {
  const type = wp.type?.toUpperCase() ?? ''
  const ident = wp.ident ?? ''
  const alt = formatAlt(wp.alt)

  let svg: string
  let labelColor: string
  let size: number

  switch (type) {
    case 'APT':
      size = 26
      labelColor = '#FFFFFF'
      svg = `<svg width="${size}" height="${size}" viewBox="0 0 26 26">
        <circle cx="13" cy="13" r="11" fill="rgba(0,0,0,0.7)" stroke="#FFFFFF" stroke-width="1.5"/>
        <line x1="13" y1="3" x2="13" y2="23" stroke="#FFFFFF" stroke-width="1.2" opacity="0.8"/>
        <line x1="3" y1="13" x2="23" y2="13" stroke="#FFFFFF" stroke-width="1.2" opacity="0.8"/>
      </svg>`
      break
    case 'VOR':
      size = 22
      labelColor = '#00BFFF'
      svg = `<svg width="${size}" height="${size}" viewBox="0 0 22 22">
        <polygon points="11,1 20,6 20,16 11,21 2,16 2,6" fill="rgba(0,0,0,0.6)" stroke="#00BFFF" stroke-width="1.5"/>
        <circle cx="11" cy="11" r="2" fill="#00BFFF"/>
        <line x1="11" y1="1" x2="11" y2="4" stroke="#00BFFF" stroke-width="0.8" opacity="0.5"/>
        <line x1="11" y1="18" x2="11" y2="21" stroke="#00BFFF" stroke-width="0.8" opacity="0.5"/>
        <line x1="2" y1="6" x2="5" y2="7.5" stroke="#00BFFF" stroke-width="0.8" opacity="0.5"/>
        <line x1="20" y1="6" x2="17" y2="7.5" stroke="#00BFFF" stroke-width="0.8" opacity="0.5"/>
      </svg>`
      break
    case 'NDB':
      size = 20
      labelColor = '#FF6B6B'
      svg = `<svg width="${size}" height="${size}" viewBox="0 0 20 20">
        <circle cx="10" cy="10" r="7" fill="rgba(0,0,0,0.6)" stroke="#FF6B6B" stroke-width="1.5" stroke-dasharray="3,2"/>
        <circle cx="10" cy="10" r="2.5" fill="#FF6B6B"/>
      </svg>`
      break
    case 'FIX':
      size = 16
      labelColor = '#4ADE80'
      svg = `<svg width="${size}" height="${size}" viewBox="0 0 16 16">
        <polygon points="8,1 15,15 1,15" fill="rgba(0,0,0,0.6)" stroke="#4ADE80" stroke-width="1.5"/>
      </svg>`
      break
    case 'TOC':
      size = 22
      labelColor = '#22C55E'
      svg = `<svg width="${size}" height="${size}" viewBox="0 0 22 22">
        <rect x="2" y="2" width="18" height="18" rx="3" fill="rgba(0,0,0,0.7)" stroke="#22C55E" stroke-width="1.5"/>
        <path d="M11 6 L11 16 M7 10 L11 6 L15 10" stroke="#22C55E" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`
      break
    case 'TOD':
      size = 22
      labelColor = '#F59E0B'
      svg = `<svg width="${size}" height="${size}" viewBox="0 0 22 22">
        <rect x="2" y="2" width="18" height="18" rx="3" fill="rgba(0,0,0,0.7)" stroke="#F59E0B" stroke-width="1.5"/>
        <path d="M11 6 L11 16 M7 12 L11 16 L15 12" stroke="#F59E0B" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`
      break
    case 'SID':
    case 'STAR':
      size = 14
      labelColor = '#C084FC'
      svg = `<svg width="${size}" height="${size}" viewBox="0 0 14 14">
        <rect x="3" y="3" width="8" height="8" rx="1" fill="rgba(0,0,0,0.6)" stroke="#C084FC" stroke-width="1.5" transform="rotate(45 7 7)"/>
      </svg>`
      break
    case 'APP':
      size = 14
      labelColor = '#FB923C'
      svg = `<svg width="${size}" height="${size}" viewBox="0 0 14 14">
        <rect x="3" y="3" width="8" height="8" rx="1" fill="rgba(0,0,0,0.6)" stroke="#FB923C" stroke-width="1.5" transform="rotate(45 7 7)"/>
      </svg>`
      break
    default:
      size = 10
      labelColor = '#A0A0A0'
      svg = `<svg width="${size}" height="${size}" viewBox="0 0 10 10">
        <circle cx="5" cy="5" r="3.5" fill="rgba(0,0,0,0.6)" stroke="#A0A0A0" stroke-width="1.5"/>
      </svg>`
  }

  const displayLabel = type === 'TOC' ? 'T/C' : type === 'TOD' ? 'T/D' : ident

  return `
    <div style="display:flex;flex-direction:column;align-items:center;pointer-events:auto;cursor:pointer;">
      ${svg}
      <div style="
        margin-top:2px;
        font-family:'JetBrains Mono','Fira Code','SF Mono',monospace;
        font-size:10px;
        font-weight:600;
        color:${labelColor};
        text-shadow:0 0 4px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.7);
        white-space:nowrap;
        text-align:center;
        line-height:1.2;
      ">
        ${displayLabel}
        ${alt ? `<br/><span style="font-size:9px;font-weight:400;color:#B0B0B0;">${alt}</span>` : ''}
      </div>
    </div>
  `
}

/* ------------------------------------------------------------------ */
/*  Leg label (bearing + distance at midpoint)                         */
/* ------------------------------------------------------------------ */

function createLegLabelHtml(bearing: number, distNm: number, gs?: number): string {
  const gsInfo = gs ? `<br/><span style="color:#80CBC4;font-size:8px;">GS ${Math.round(gs)}kt</span>` : ''
  return `
    <div style="
      font-family:'JetBrains Mono','Fira Code','SF Mono',monospace;
      font-size:9px;
      color:#E0E0E0;
      background:rgba(0,0,0,0.65);
      padding:2px 5px;
      border-radius:3px;
      border:1px solid rgba(255,255,255,0.1);
      text-align:center;
      white-space:nowrap;
      pointer-events:none;
      line-height:1.3;
      backdrop-filter:blur(2px);
    ">
      <span style="color:#E040FB;">${formatBearing(bearing)}</span>
      <span style="color:#666;"> / </span>
      <span style="color:#FFF;">${distNm.toFixed(1)} NM</span>
      ${gsInfo}
    </div>
  `
}

/* ------------------------------------------------------------------ */
/*  Legend overlay                                                      */
/* ------------------------------------------------------------------ */

function createLegendHtml(): string {
  return `
    <div style="
      position:absolute;
      bottom:32px;
      left:10px;
      background:rgba(15,15,20,0.85);
      backdrop-filter:blur(6px);
      border:1px solid rgba(255,255,255,0.12);
      border-radius:8px;
      padding:10px 12px;
      font-family:'JetBrains Mono','Fira Code','SF Mono',monospace;
      font-size:10px;
      color:#ccc;
      z-index:5;
      line-height:1.6;
    ">
      <div style="font-weight:700;color:#fff;margin-bottom:4px;font-size:11px;">ROUTE</div>
      <div style="display:flex;align-items:center;gap:6px;">
        <span style="width:18px;height:3px;background:#22C55E;border-radius:1px;display:inline-block;"></span>
        <span>Montée</span>
      </div>
      <div style="display:flex;align-items:center;gap:6px;">
        <span style="width:18px;height:3px;background:#E040FB;border-radius:1px;display:inline-block;"></span>
        <span>Croisière</span>
      </div>
      <div style="display:flex;align-items:center;gap:6px;">
        <span style="width:18px;height:3px;background:#F59E0B;border-radius:1px;display:inline-block;"></span>
        <span>Descente</span>
      </div>
      <div style="margin-top:6px;font-weight:700;color:#fff;margin-bottom:4px;font-size:11px;">NAVAIDS</div>
      <div style="display:flex;align-items:center;gap:6px;">
        <svg width="12" height="12" viewBox="0 0 12 12"><polygon points="6,0.5 11,3.5 11,8.5 6,11.5 1,8.5 1,3.5" fill="none" stroke="#00BFFF" stroke-width="1.2"/></svg>
        <span style="color:#00BFFF;">VOR</span>
      </div>
      <div style="display:flex;align-items:center;gap:6px;">
        <svg width="12" height="12" viewBox="0 0 12 12"><circle cx="6" cy="6" r="4" fill="none" stroke="#FF6B6B" stroke-width="1.2" stroke-dasharray="2,1.5"/></svg>
        <span style="color:#FF6B6B;">NDB</span>
      </div>
      <div style="display:flex;align-items:center;gap:6px;">
        <svg width="10" height="10" viewBox="0 0 10 10"><polygon points="5,0.5 9.5,9 0.5,9" fill="none" stroke="#4ADE80" stroke-width="1.2"/></svg>
        <span style="color:#4ADE80;">FIX</span>
      </div>
    </div>
  `
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const MapboxMap: React.FC<MapboxMapProps> = ({ waypoints, departure, arrival, focusPoint }) => {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])
  const legendRef = useRef<HTMLDivElement | null>(null)

  /* ---- Cleanup markers ---- */
  const clearMarkers = useCallback(() => {
    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []
  }, [])

  /* ---- Init map ---- */
  useEffect(() => {
    if (!mapContainer.current) return
    if (map.current) return

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || ''

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [2.35, 46.85],
      zoom: 5,
      pitch: 0,
      bearing: 0,
      antialias: true,
    })

    map.current.addControl(new mapboxgl.NavigationControl({ showCompass: true }), 'top-right')
    map.current.addControl(new mapboxgl.ScaleControl({ unit: 'nautical' }), 'bottom-right')

    return () => {
      clearMarkers()
      map.current?.remove()
      map.current = null
    }
  }, [clearMarkers])

  /* ---- Draw route + markers ---- */
  useEffect(() => {
    if (!map.current) return

    const drawRoute = () => {
      const m = map.current!
      clearMarkers()

      // Remove existing layers/sources
      const layerIds = ['route-glow', 'route-main', 'route-dash']
      layerIds.forEach((id) => {
        if (m.getLayer(id)) m.removeLayer(id)
      })
      if (m.getSource('route')) m.removeSource('route')

      if (!waypoints || waypoints.length < 2) return

      // ---- Detect phases ----
      const tocIdx = waypoints.findIndex((wp) => wp.type?.toUpperCase() === 'TOC')
      const todIdx = waypoints.findIndex((wp) => wp.type?.toUpperCase() === 'TOD')

      // ---- Build GeoJSON per-segment with GREAT CIRCLE interpolation ----
      const features: GeoJSON.Feature[] = []
      for (let i = 0; i < waypoints.length - 1; i++) {
        const wp1 = waypoints[i]
        const wp2 = waypoints[i + 1]
        if (isNaN(wp1.lon) || isNaN(wp1.lat) || isNaN(wp2.lon) || isNaN(wp2.lat)) continue

        const distNm = wp2.leg_distance_nm ?? haversineNm(wp1.lat, wp1.lon, wp2.lat, wp2.lon)
        const numPts = arcResolution(distNm)
        const arcCoords = greatCircleArc(wp1.lat, wp1.lon, wp2.lat, wp2.lon, numPts)

        features.push({
          type: 'Feature',
          properties: {
            phase: getSegmentPhase(i, tocIdx, todIdx),
            index: i,
          },
          geometry: {
            type: 'LineString',
            coordinates: arcCoords,
          },
        })
      }

      const routeCollection: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features,
      }

      m.addSource('route', { type: 'geojson', data: routeCollection })

      // Layer 1 – glow / outline  (zoom-adaptive width)
      m.addLayer({
        id: 'route-glow',
        type: 'line',
        source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#000000',
          'line-width': [
            'interpolate', ['linear'], ['zoom'],
            3, 5,
            7, 8,
            12, 12,
            16, 18,
          ] as any,
          'line-opacity': 0.35,
          'line-blur': 3,
        },
      })

      // Layer 2 – main colored route  (zoom-adaptive width)
      m.addLayer({
        id: 'route-main',
        type: 'line',
        source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': [
            'match',
            ['get', 'phase'],
            'climb',
            PHASE_COLORS.climb,
            'cruise',
            PHASE_COLORS.cruise,
            'descent',
            PHASE_COLORS.descent,
            PHASE_COLORS.cruise,
          ],
          'line-width': [
            'interpolate', ['linear'], ['zoom'],
            3, 2,
            7, 3.5,
            12, 5,
            16, 8,
          ] as any,
          'line-opacity': 1,
        },
      })

      // Layer 3 – thin white dash overlay  (zoom-adaptive)
      m.addLayer({
        id: 'route-dash',
        type: 'line',
        source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'butt' },
        paint: {
          'line-color': '#FFFFFF',
          'line-width': [
            'interpolate', ['linear'], ['zoom'],
            3, 0.5,
            7, 1,
            12, 1.5,
            16, 2,
          ] as any,
          'line-dasharray': [6, 4],
          'line-opacity': 0.2,
        },
      })

      // ---- Waypoint markers ----
      waypoints.forEach((wp) => {
        if (isNaN(wp.lon) || isNaN(wp.lat)) return

        const el = document.createElement('div')
        el.innerHTML = getWaypointMarkerHtml(wp)
        el.style.cursor = 'pointer'

        const popupHtml = buildPopupHtml(wp)

        const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
          .setLngLat([wp.lon, wp.lat])
          .setPopup(
            new mapboxgl.Popup({
              offset: 15,
              closeButton: false,
              className: 'aviation-popup',
            }).setHTML(popupHtml),
          )
          .addTo(m)

        markersRef.current.push(marker)
      })

      // ---- Leg labels at midpoints (on the great circle arc midpoint) ----
      for (let i = 0; i < waypoints.length - 1; i++) {
        const wp1 = waypoints[i]
        const wp2 = waypoints[i + 1]
        if (isNaN(wp1.lon) || isNaN(wp1.lat) || isNaN(wp2.lon) || isNaN(wp2.lat)) continue

        const bearing = computeBearing(wp1.lat, wp1.lon, wp2.lat, wp2.lon)
        const dist = wp2.leg_distance_nm ?? haversineNm(wp1.lat, wp1.lon, wp2.lat, wp2.lon)
        const gs = wp2.ground_speed_kts

        if (dist < 1) continue

        // Use the great circle midpoint (not simple average) for label position
        const midArc = greatCircleArc(wp1.lat, wp1.lon, wp2.lat, wp2.lon, 2)
        const midPt = midArc[1] // midpoint of 3 points (index 0, 1, 2)

        const el = document.createElement('div')
        el.innerHTML = createLegLabelHtml(bearing, dist, gs)

        const marker = new mapboxgl.Marker({
          element: el,
          anchor: 'center',
        })
          .setLngLat(midPt)
          .addTo(m)

        markersRef.current.push(marker)
      }

      // ---- Fit bounds ----
      const bounds = new mapboxgl.LngLatBounds()
      waypoints.forEach((wp) => {
        if (!isNaN(wp.lon) && !isNaN(wp.lat)) {
          bounds.extend([wp.lon, wp.lat])
        }
      })
      if (!bounds.isEmpty()) {
        m.fitBounds(bounds, { padding: 60, maxZoom: 12 })
      }

      // ---- Legend ----
      if (!legendRef.current && mapContainer.current) {
        const legendDiv = document.createElement('div')
        legendDiv.innerHTML = createLegendHtml()
        mapContainer.current.appendChild(legendDiv)
        legendRef.current = legendDiv
      }
    }

    if (map.current.loaded()) {
      drawRoute()
    } else {
      map.current.on('load', drawRoute)
    }

    return () => {
      if (map.current) {
        const layerIds = ['route-glow', 'route-main', 'route-dash']
        layerIds.forEach((id) => {
          if (map.current?.getLayer(id)) map.current.removeLayer(id)
        })
        if (map.current.getSource('route')) map.current.removeSource('route')
      }
    }
  }, [waypoints, departure, arrival, clearMarkers])

  /* ---- Focus ---- */
  useEffect(() => {
    if (map.current && focusPoint) {
      map.current.flyTo({
        center: focusPoint.center,
        zoom: focusPoint.zoom,
        essential: true,
        duration: 1200,
      })
    }
  }, [focusPoint])

  return (
    <div ref={mapContainer} className="h-full w-full" style={{ background: '#0a0a0f' }}>
      <style>{`
        .aviation-popup .mapboxgl-popup-content {
          background: rgba(15, 15, 25, 0.92) !important;
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 8px;
          padding: 12px 14px;
          font-family: 'JetBrains Mono', 'Fira Code', 'SF Mono', monospace;
          font-size: 11px;
          color: #E0E0E0;
          box-shadow: 0 4px 20px rgba(0,0,0,0.5);
          max-width: 260px;
        }
        .aviation-popup .mapboxgl-popup-tip {
          border-top-color: rgba(15, 15, 25, 0.92) !important;
        }
        .aviation-popup .mapboxgl-popup-close-button {
          color: #888;
        }
        .mapboxgl-ctrl-scale {
          background: rgba(0,0,0,0.5) !important;
          color: #ccc !important;
          border-color: #666 !important;
          font-family: 'JetBrains Mono', monospace !important;
          font-size: 10px !important;
        }
      `}</style>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Popup builder                                                      */
/* ------------------------------------------------------------------ */

function buildPopupHtml(wp: WaypointData): string {
  const type = wp.type?.toUpperCase() ?? ''
  const lines: string[] = []

  const typeLabel =
    type === 'TOC'
      ? 'Top of Climb'
      : type === 'TOD'
        ? 'Top of Descent'
        : type === 'SID'
          ? 'Standard Instrument Departure'
          : type === 'STAR'
            ? 'Standard Arrival'
            : type === 'APP'
              ? 'Approach'
              : type

  lines.push(
    `<div style="font-size:13px;font-weight:700;color:#fff;margin-bottom:6px;">
      ${wp.ident}
      <span style="font-size:10px;font-weight:400;color:#888;margin-left:6px;">${typeLabel}</span>
    </div>`,
  )

  if (wp.name) {
    lines.push(`<div style="color:#aaa;margin-bottom:6px;">${wp.name}</div>`)
  }

  const details: string[] = []
  if (wp.alt) details.push(`<span style="color:#E040FB;">ALT ${formatAlt(wp.alt)}</span>`)
  if (wp.ground_speed_kts)
    details.push(`<span style="color:#80CBC4;">GS ${Math.round(wp.ground_speed_kts)}kt</span>`)
  if (wp.wind_correction_deg !== undefined && wp.wind_correction_deg !== 0)
    details.push(
      `<span style="color:#FFD54F;">WCA ${wp.wind_correction_deg > 0 ? '+' : ''}${wp.wind_correction_deg.toFixed(1)}°</span>`,
    )

  if (details.length > 0) {
    lines.push(`<div style="display:flex;gap:10px;flex-wrap:wrap;">${details.join('')}</div>`)
  }

  const extraDetails: string[] = []
  if (wp.time_from_dep_min !== undefined)
    extraDetails.push(
      `<span style="color:#90CAF9;">T+${Math.round(wp.time_from_dep_min)}min</span>`,
    )
  if (wp.fuel_remaining_liters !== undefined)
    extraDetails.push(
      `<span style="color:#A5D6A7;">Fuel ${wp.fuel_remaining_liters.toFixed(1)}L</span>`,
    )
  if (wp.leg_distance_nm !== undefined)
    extraDetails.push(
      `<span style="color:#CE93D8;">Leg ${wp.leg_distance_nm.toFixed(1)}NM</span>`,
    )

  if (extraDetails.length > 0) {
    lines.push(
      `<div style="margin-top:4px;display:flex;gap:10px;flex-wrap:wrap;">${extraDetails.join('')}</div>`,
    )
  }

  lines.push(
    `<div style="margin-top:6px;color:#666;font-size:9px;">
      ${wp.lat.toFixed(4)}N ${Math.abs(wp.lon).toFixed(4)}${wp.lon >= 0 ? 'E' : 'W'}
    </div>`,
  )

  return lines.join('')
}

export default MapboxMap
