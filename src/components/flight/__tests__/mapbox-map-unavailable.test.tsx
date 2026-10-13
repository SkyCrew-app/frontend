import { render, screen } from '@testing-library/react'

const Map = jest.fn()
jest.mock('mapbox-gl', () => ({
  __esModule: true,
  default: {
    Map: function (...args: unknown[]) {
      return Map(...args)
    },
    NavigationControl: jest.fn(),
    ScaleControl: jest.fn(),
    Marker: jest.fn(),
    Popup: jest.fn(),
  },
}))
jest.mock('mapbox-gl/dist/mapbox-gl.css', () => ({}))

import MapboxMap from '../MapboxMap'

const AIRPORT = { icao: 'LFPG', name: 'Paris', lat: 49, lon: 2.5 }
const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN

describe('MapboxMap when the map cannot be drawn', () => {
  afterEach(() => {
    process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN = TOKEN
    Map.mockReset()
  })

  it('shows a message instead of the map when no key is configured', () => {
    delete process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
    render(<MapboxMap waypoints={[]} departure={AIRPORT} arrival={AIRPORT} />)
    expect(screen.getByRole('status')).toHaveTextContent('La carte ne peut pas être affichée')
    expect(Map).not.toHaveBeenCalled()
  })

  it('shows the same message when the browser cannot create the map', () => {
    process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN = 'pk.test'
    Map.mockImplementation(() => {
      throw new Error('Failed to initialize WebGL')
    })
    render(<MapboxMap waypoints={[]} departure={AIRPORT} arrival={AIRPORT} />)
    expect(screen.getByRole('status')).toHaveTextContent('La carte ne peut pas être affichée')
  })
})
