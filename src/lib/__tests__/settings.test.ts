import { taxonomiesFromRecord } from '../settings';

describe('taxonomiesFromRecord', () => {
  it("reprend les quatre listes de l'enregistrement chargé", () => {
    const record = {
      id: 3,
      taxonomies: {
        __typename: 'Taxonomies',
        aircraftCategories: ['Monomoteur', 'ULM'],
        flightTypes: ['Local'],
        licenseTypes: ['PPL', 'LAPL'],
        maintenanceTypes: ['50 heures'],
      },
    };

    expect(taxonomiesFromRecord(record)).toEqual({
      aircraftCategories: ['Monomoteur', 'ULM'],
      flightTypes: ['Local'],
      licenseTypes: ['PPL', 'LAPL'],
      maintenanceTypes: ['50 heures'],
    });
  });

  it('remplace une liste absente par une liste vide sans toucher aux autres', () => {
    expect(taxonomiesFromRecord({ taxonomies: { licenseTypes: ['PPL'], flightTypes: null } })).toEqual({
      aircraftCategories: [],
      flightTypes: [],
      licenseTypes: ['PPL'],
      maintenanceTypes: [],
    });
  });

  it("renvoie quatre listes vides si l'enregistrement n'a pas de taxonomies", () => {
    const empty = { aircraftCategories: [], flightTypes: [], licenseTypes: [], maintenanceTypes: [] };

    expect(taxonomiesFromRecord({})).toEqual(empty);
    expect(taxonomiesFromRecord(null)).toEqual(empty);
  });

  it("copie les listes pour que le formulaire ne modifie pas l'enregistrement chargé", () => {
    const licenseTypes = Object.freeze(['PPL']) as unknown as string[];
    const result = taxonomiesFromRecord({ taxonomies: { licenseTypes } });

    result.licenseTypes.push('CPL');

    expect(licenseTypes).toEqual(['PPL']);
  });
});
