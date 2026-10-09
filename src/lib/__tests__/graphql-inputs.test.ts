import { buildCreateFlightInput, optionalIdField, toIntId } from '../graphql-inputs';

describe('toIntId', () => {
  it('conserve un entier', () => {
    expect(toIntId(12)).toBe(12);
  });

  it('convertit une chaîne numérique', () => {
    expect(toIntId('7')).toBe(7);
  });

  it.each([undefined, null, '', '  ', 'abc', Number.NaN, 1.5])('retourne null pour %p', (value) => {
    expect(toIntId(value)).toBeNull();
  });
});

describe('optionalIdField', () => {
  it("inclut le champ quand l'identifiant est un vrai nombre", () => {
    expect(optionalIdField('courseId', '4')).toEqual({ courseId: 4 });
  });

  it("omet le champ quand l'identifiant est absent", () => {
    expect(optionalIdField('moduleId', undefined)).toEqual({});
  });
});

describe('buildCreateFlightInput', () => {
  const flightPlan = {
    flight_hours: 2,
    flight_type: 'VFR',
    origin_icao: 'LFPG',
    destination_icao: 'LFBO',
    number_of_passengers: 1,
    encoded_polyline: '',
    distance_km: 580,
    estimated_flight_time: 110,
    waypoints: ['WPT1', 'WPT2'],
    cruise_speed: 120,
    cruise_altitude: 3000,
  };

  it("retourne null tant que l'identifiant utilisateur est inconnu", () => {
    expect(buildCreateFlightInput(flightPlan, null, '3')).toBeNull();
  });

  it("n'envoie ni la vitesse ni l'altitude de croisière", () => {
    const input = buildCreateFlightInput(flightPlan, 5, '3');
    expect(input).not.toHaveProperty('cruise_speed');
    expect(input).not.toHaveProperty('cruise_altitude');
  });

  it('reprend les champs du plan de vol et convertit les identifiants en entiers', () => {
    expect(buildCreateFlightInput(flightPlan, 5, '3')).toEqual({
      flight_hours: 2,
      flight_type: 'VFR',
      origin_icao: 'LFPG',
      destination_icao: 'LFBO',
      number_of_passengers: 1,
      encoded_polyline: '',
      distance_km: 580,
      estimated_flight_time: 110,
      waypoints: ['WPT1', 'WPT2'],
      user_id: 5,
      reservation_id: 3,
    });
  });

  it('envoie reservation_id à null sans réservation valide', () => {
    expect(buildCreateFlightInput(flightPlan, 5, undefined)?.reservation_id).toBeNull();
  });
});
