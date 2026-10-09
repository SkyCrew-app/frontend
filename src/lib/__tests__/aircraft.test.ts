import { buildAircraftInput } from '../aircraft';

describe('buildAircraftInput', () => {
  const base = {
    registration_number: 'F-ABCD',
    model: 'Robin DR400',
    year_of_manufacture: 2010,
    hourly_cost: 150.5,
  };

  it('arrondit les champs entiers et laisse les décimaux autorisés intacts', () => {
    const input = buildAircraftInput({
      ...base,
      year_of_manufacture: 2010.4,
      consumption: 25.5,
      maxAltitude: 12000.2,
      cruiseSpeed: 119.6,
      fuel_capacity: 109.5,
      empty_weight: 580.3,
      max_takeoff_weight: 1000.7,
    });

    expect(input).toEqual({
      registration_number: 'F-ABCD',
      model: 'Robin DR400',
      year_of_manufacture: 2010,
      hourly_cost: 150.5,
      consumption: 26,
      maxAltitude: 12000,
      cruiseSpeed: 120,
      fuel_capacity: 109.5,
      empty_weight: 580.3,
      max_takeoff_weight: 1000.7,
    });
  });

  it("envoie null pour une date d'inspection saisie puis vidée", () => {
    expect(buildAircraftInput({ ...base, last_inspection_date: '' }).last_inspection_date).toBeNull();
  });

  it("conserve une date d'inspection renseignée", () => {
    expect(buildAircraftInput({ ...base, last_inspection_date: '2026-03-01' }).last_inspection_date).toBe(
      '2026-03-01',
    );
  });

  it("n'ajoute pas les champs absents du formulaire", () => {
    const input = buildAircraftInput(base);

    expect(input).toEqual(base);
    expect('last_inspection_date' in input).toBe(false);
    expect('consumption' in input).toBe(false);
  });

  it('envoie null pour un champ numérique vidé (NaN)', () => {
    const input = buildAircraftInput({ ...base, consumption: Number.NaN, fuel_capacity: Number.NaN });

    expect(input.consumption).toBeNull();
    expect(input.fuel_capacity).toBeNull();
  });

  it('ne modifie pas les valeurs du formulaire', () => {
    const formData = { ...base, consumption: 25.5, last_inspection_date: '' };

    buildAircraftInput(formData);

    expect(formData).toEqual({ ...base, consumption: 25.5, last_inspection_date: '' });
  });
});
