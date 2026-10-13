import {
  administrationInputFromValues,
  settingsFormSchema,
  settingsFormValuesFromRecord,
  tabsWithErrors,
  taxonomiesFromRecord,
} from '../settings';

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

describe('formulaire des paramètres', () => {
  const record = {
    id: 7,
    clubName: 'Aéroclub de test',
    contactEmail: 'contact@aeroclub.fr',
    contactPhone: '0478123456',
    address: '1 rue du Terrain',
    closureDays: null,
    timeSlotDuration: 60,
    reservationStartTime: '08:00',
    reservationEndTime: '20:00',
    maintenanceDay: null,
    maintenanceDuration: 4,
    pilotLicenses: null,
    membershipFee: 180,
    flightHourRate: null,
    clubRules: null,
    allowGuestPilots: true,
    guestPilotFee: null,
    fuelManagement: 'inconnu',
    fuelPrice: null,
    isMaintenanceActive: false,
    maintenanceMessage: null,
    maintenanceTime: '2026-10-12T14:30:00.000Z',
    taxonomies: null,
  };

  it('remplit les valeurs manquantes sans rendre le formulaire invalide', () => {
    const values = settingsFormValuesFromRecord(record);

    expect(values.closureDays).toEqual([]);
    expect(values.maintenanceDay).toBe('');
    expect(values.fuelManagement).toBe('self-service');
    expect(values.guestPilotFee).toBe(0);
    expect(settingsFormSchema.safeParse(values).success).toBe(true);
  });

  it("renvoie la fin de maintenance au format ISO, ou null quand elle est vide", () => {
    const values = settingsFormValuesFromRecord(record);

    expect(administrationInputFromValues(7, values)).toMatchObject({
      id: 7,
      maintenanceTime: '2026-10-12T14:30:00.000Z',
      flightHourRate: null,
    });
    expect(administrationInputFromValues(7, { ...values, maintenanceTime: '' }).maintenanceTime).toBeNull();
  });

  it('refuse une fin des réservations avant leur début, avec un message en français', () => {
    const values = { ...settingsFormValuesFromRecord(record), reservationEndTime: '07:00' };
    const result = settingsFormSchema.safeParse(values);

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({
      path: ['reservationEndTime'],
      message: "L'heure de fin doit être après l'heure de début",
    });
  });

  it.each(['04 78 12 34 56', '+33 4 78 12 34 56', '+44 20 7946 0958', '+1 415-555-2671'])(
    'accepte le téléphone de contact « %s » et l’enregistre sans séparateurs',
    (contactPhone) => {
      const values = { ...settingsFormValuesFromRecord(record), contactPhone };

      expect(settingsFormSchema.safeParse(values).success).toBe(true);
      expect(administrationInputFromValues(7, values).contactPhone).toBe(contactPhone.replace(/[\s-]/g, ''));
    },
  );

  it.each(['', '1234', '478123456', '+33 4 78 AB'])('refuse le téléphone de contact « %s »', (contactPhone) => {
    const result = settingsFormSchema.safeParse({ ...settingsFormValuesFromRecord(record), contactPhone });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['contactPhone']);
  });

  it("indique les onglets qui contiennent un champ invalide, dans l'ordre d'affichage", () => {
    expect(tabsWithErrors(['membershipFee', 'clubName'])).toEqual(['general', 'members']);
    expect(tabsWithErrors([])).toEqual([]);
  });
});
