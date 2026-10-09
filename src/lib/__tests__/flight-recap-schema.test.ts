import { flightRecapSchema } from '../flight-recap-schema';

const baseValues = {
  flight_hours: 1.5,
  flight_type: 'VFR',
  origin_icao: 'LFPG',
  destination_icao: 'LFBO',
  distance_km: 580,
  estimated_flight_time: 2,
};

const incidentValues = {
  ...baseValues,
  incidentOccurred: true,
  incident_date: new Date(2026, 5, 15),
  severity_level: 'medium',
  incident_description: 'Crevaison au roulage',
  incident_priority: 'high',
  incident_category: 'mechanical',
};

const errorPaths = (values: unknown) => {
  const result = flightRecapSchema.safeParse(values);
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
};

describe('flightRecapSchema', () => {
  it("accepte une clôture sans incident sans aucun champ d'incident", () => {
    expect(flightRecapSchema.safeParse(baseValues).success).toBe(true);
  });

  it("accepte une date d'incident à null quand l'incident a été décoché", () => {
    const result = flightRecapSchema.safeParse({
      ...baseValues,
      incidentOccurred: false,
      incident_date: null,
      incident_description: '',
    });
    expect(result.success).toBe(true);
  });

  it('accepte un incident dont les quatre champs obligatoires sont renseignés', () => {
    expect(flightRecapSchema.safeParse(incidentValues).success).toBe(true);
  });

  it('signale les quatre champs manquants quand un incident est déclaré sans détail', () => {
    expect(errorPaths({ ...baseValues, incidentOccurred: true }).sort()).toEqual([
      'incident_category',
      'incident_description',
      'incident_priority',
      'severity_level',
    ]);
  });

  it.each(['severity_level', 'incident_description', 'incident_priority', 'incident_category'])(
    'signale uniquement %s quand ce champ manque',
    (field) => {
      expect(errorPaths({ ...incidentValues, [field]: undefined })).toEqual([field]);
    },
  );

  it("refuse une description d'incident composée uniquement d'espaces", () => {
    expect(errorPaths({ ...incidentValues, incident_description: '   ' })).toEqual(['incident_description']);
  });

  it('donne un message en français pour un champ obligatoire manquant', () => {
    const result = flightRecapSchema.safeParse({ ...incidentValues, incident_priority: undefined });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("La priorité de l'incident est requise");
    }
  });
});
