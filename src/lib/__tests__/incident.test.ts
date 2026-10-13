import {
  INCIDENT_STATUS_VALUES,
  canFollowUpIncidents,
  incidentCategoryLabel,
  incidentLevel,
  incidentPersonName,
  incidentPriorityLabel,
  incidentSeverity,
  incidentStatus,
  incidentStatusKey,
} from '../incident';

describe('incidentSeverity', () => {
  it('donne un libellé et une couleur aux codes du formulaire de clôture', () => {
    expect(incidentSeverity('low')).toEqual({ level: 'low', label: 'Faible', variant: 'neutral' });
    expect(incidentSeverity('medium')).toEqual({ level: 'medium', label: 'Moyenne', variant: 'warning' });
    expect(incidentSeverity('high')).toEqual({ level: 'high', label: 'Élevée', variant: 'danger' });
  });

  it('ramène les mots français des anciennes données aux trois mêmes niveaux', () => {
    expect(incidentSeverity('Faible').level).toBe('low');
    expect(incidentSeverity('Modéré').label).toBe('Moyenne');
    expect(incidentSeverity('Moyenne').level).toBe('medium');
    expect(incidentSeverity('Élevé').label).toBe('Élevée');
    expect(incidentSeverity(' ÉLEVÉE ').variant).toBe('danger');
    expect(incidentSeverity('Critique').level).toBe('high');
  });

  it("n'affiche jamais un code inconnu", () => {
    expect(incidentSeverity('SEV_4')).toEqual({ level: null, label: 'Non précisée', variant: 'neutral' });
    expect(incidentSeverity('')).toEqual({ level: null, label: 'Non précisée', variant: 'neutral' });
    expect(incidentSeverity(null).label).toBe('Non précisée');
    expect(incidentLevel(undefined)).toBeNull();
  });
});

describe('incidentPriorityLabel', () => {
  it('traduit les codes et reconnaît les mots français', () => {
    expect(incidentPriorityLabel('low')).toBe('Basse');
    expect(incidentPriorityLabel('medium')).toBe('Moyenne');
    expect(incidentPriorityLabel('high')).toBe('Haute');
    expect(incidentPriorityLabel('Basse')).toBe('Basse');
    expect(incidentPriorityLabel('haute')).toBe('Haute');
  });

  it("n'affiche jamais un code inconnu", () => {
    expect(incidentPriorityLabel('P1')).toBe('Non précisée');
    expect(incidentPriorityLabel(null)).toBe('Non précisée');
  });
});

describe('incidentStatus', () => {
  it('donne un libellé et une couleur aux trois statuts enregistrés', () => {
    expect(incidentStatus('Ouvert')).toEqual({ key: 'open', label: 'Ouvert', variant: 'warning' });
    expect(incidentStatus('En cours')).toEqual({ key: 'in_progress', label: 'En cours', variant: 'info' });
    expect(incidentStatus('Résolu')).toEqual({ key: 'resolved', label: 'Résolu', variant: 'success' });
  });

  it('tolère la casse, les accents et les restes en anglais', () => {
    expect(incidentStatusKey('ouvert')).toBe('open');
    expect(incidentStatusKey('OPEN')).toBe('open');
    expect(incidentStatusKey('en cours')).toBe('in_progress');
    expect(incidentStatusKey('in_progress')).toBe('in_progress');
    expect(incidentStatusKey('In progress')).toBe('in_progress');
    expect(incidentStatusKey('resolu')).toBe('resolved');
    expect(incidentStatusKey('resolved')).toBe('resolved');
    expect(incidentStatusKey('closed')).toBe('resolved');
  });

  it("n'affiche jamais un code inconnu", () => {
    expect(incidentStatus('ARCHIVED')).toEqual({ key: null, label: 'Non précisé', variant: 'neutral' });
    expect(incidentStatus(undefined).label).toBe('Non précisé');
  });

  it("envoie à l'API les valeurs qu'elle enregistre", () => {
    expect(INCIDENT_STATUS_VALUES).toEqual({ open: 'Ouvert', in_progress: 'En cours', resolved: 'Résolu' });
    // Each stored value is read back as the status it was sent for.
    for (const [key, value] of Object.entries(INCIDENT_STATUS_VALUES)) {
      expect(incidentStatusKey(value)).toBe(key);
    }
  });
});

describe('incidentCategoryLabel', () => {
  it('traduit les codes du formulaire de clôture', () => {
    expect(incidentCategoryLabel('mechanical')).toBe('Mécanique');
    expect(incidentCategoryLabel('electrical')).toBe('Électrique');
    expect(incidentCategoryLabel('weather')).toBe('Météorologique');
    expect(incidentCategoryLabel('human_error')).toBe('Erreur humaine');
    expect(incidentCategoryLabel('OTHER')).toBe('Autre');
  });

  it('garde tel quel un texte saisi librement', () => {
    expect(incidentCategoryLabel('Atterrissage')).toBe('Atterrissage');
    expect(incidentCategoryLabel(' Collision aviaire ')).toBe('Collision aviaire');
  });

  it('affiche un tiret quand la catégorie manque', () => {
    expect(incidentCategoryLabel('')).toBe('—');
    expect(incidentCategoryLabel(null)).toBe('—');
  });
});

describe('incidentPersonName', () => {
  it('assemble le prénom et le nom, ou affiche un tiret', () => {
    expect(incidentPersonName({ id: 1, first_name: 'Léa', last_name: 'Martin' })).toBe('Léa Martin');
    expect(incidentPersonName({ id: 1, first_name: 'Léa', last_name: null })).toBe('Léa');
    expect(incidentPersonName(null)).toBe('—');
  });
});

describe('canFollowUpIncidents', () => {
  it('réserve le suivi aux administrateurs et aux techniciens', () => {
    expect(canFollowUpIncidents({ role: { role_name: 'Administrateur' } })).toBe(true);
    expect(canFollowUpIncidents({ role: { role_name: 'Technicien' } })).toBe(true);
    expect(canFollowUpIncidents({ role: { role_name: 'Pilote' } })).toBe(false);
    expect(canFollowUpIncidents({ role: { role_name: 'Instructeur' } })).toBe(false);
    expect(canFollowUpIncidents({ role: null })).toBe(false);
    expect(canFollowUpIncidents(null)).toBe(false);
  });
});
