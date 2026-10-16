// Base map: OpenFreeMap vector tiles (free, no key, commercial use allowed, no SLA — design § 2.9).
// The style address is configuration, so a club can switch to a self-hosted Protomaps file
// without a new image: NEXT_PUBLIC_MAP_STYLE_URL / NEXT_PUBLIC_MAP_STYLE_DARK_URL.

export const DEFAULT_MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/positron"
export const DEFAULT_MAP_STYLE_DARK_URL = "https://tiles.openfreemap.org/styles/dark"

export const mapStyleUrl = (theme: "light" | "dark" = "light") => {
  const light = process.env.NEXT_PUBLIC_MAP_STYLE_URL?.trim() || DEFAULT_MAP_STYLE_URL
  const dark = process.env.NEXT_PUBLIC_MAP_STYLE_DARK_URL?.trim() || (light === DEFAULT_MAP_STYLE_URL ? DEFAULT_MAP_STYLE_DARK_URL : light)
  return theme === "dark" ? dark : light
}

/** Origins the browser must reach for the base map (style, tiles, glyphs, sprites). */
export const mapOrigins = (): string[] => {
  const origins = new Set<string>()
  for (const value of [mapStyleUrl("light"), mapStyleUrl("dark")]) {
    try {
      const { origin } = new URL(value)
      if (origin.startsWith("http")) origins.add(origin)
    } catch {
      // A relative address: served by the site itself ('self').
    }
  }
  return [...origins]
}

// Attributions required by OpenFreeMap / OpenMapTiles / OpenStreetMap (ODbL) and the SIA licence.
export const BASE_MAP_ATTRIBUTION =
  '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> ' +
  '<a href="https://www.openmaptiles.org/" target="_blank" rel="noopener">© OpenMapTiles</a> ' +
  'Data from <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap</a>'
