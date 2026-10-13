import { buildPopupHtml, getWaypointMarkerHtml, type WaypointData } from '../MapboxMap';

jest.mock('mapbox-gl', () => ({ __esModule: true, default: {} }));
jest.mock('mapbox-gl/dist/mapbox-gl.css', () => ({}));

const PAYLOAD = '<img src=x onerror=alert(1)>';

const waypoint = (overrides: Partial<WaypointData> = {}): WaypointData => ({
  ident: 'LFPG',
  type: 'APT',
  lat: 49.01,
  lon: 2.55,
  alt: 1500,
  name: 'Charles de Gaulle',
  ...overrides,
});

const elementsOf = (html: string) => {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  return holder;
};

describe('HTML des points de la carte', () => {
  it('affiche l’identifiant, le nom et l’altitude du point', () => {
    expect(elementsOf(getWaypointMarkerHtml(waypoint())).textContent).toContain('LFPG');

    const popup = elementsOf(buildPopupHtml(waypoint())).textContent;
    expect(popup).toContain('LFPG');
    expect(popup).toContain('Charles de Gaulle');
    expect(popup).toContain('ALT 1500ft');
  });

  it.each([
    ['l’identifiant', { ident: PAYLOAD }],
    ['le nom', { name: PAYLOAD }],
    ['le type', { type: PAYLOAD }],
    ['l’altitude', { alt: PAYLOAD as unknown as number }],
  ])('traite %s comme du texte, jamais comme du balisage', (_label, overrides) => {
    for (const html of [getWaypointMarkerHtml(waypoint(overrides)), buildPopupHtml(waypoint(overrides))]) {
      expect(elementsOf(html).querySelector('img')).toBeNull();
      expect(elementsOf(html).querySelector('[onerror]')).toBeNull();
    }
  });
});
