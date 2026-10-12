import {
  MAINTENANCE_UPLOAD_MAX_FILES,
  MAINTENANCE_UPLOAD_MAX_FILE_SIZE,
  buildCreateMaintenanceVariables,
  buildUpdateMaintenanceVariables,
  maintenanceFileName,
  maintenanceFileUrl,
  maintenanceStatus,
  maintenanceTechnicianLabel,
  maintenanceTypeLabel,
  toMaintenanceInput,
  validateMaintenanceAttachments,
} from '../maintenance';

describe('toMaintenanceInput', () => {
  const start = new Date('2024-03-10T12:00:00');
  const end = new Date('2024-03-15T12:00:00');
  const formData = {
    aircraft_id: '3',
    maintenance_type: 'INSPECTION',
    status: 'PLANNED',
    start_date: start,
    end_date: end,
    description: 'Changement des pneus',
    maintenance_cost: '499.90',
    technician_id: '7',
  };

  it('convertit les identifiants et le coût en nombres', () => {
    expect(toMaintenanceInput(formData)).toEqual({
      aircraft_id: 3,
      maintenance_type: 'INSPECTION',
      status: 'PLANNED',
      start_date: start,
      end_date: end,
      description: 'Changement des pneus',
      maintenance_cost: 499.9,
      technician_id: 7,
    });
  });

  it('envoie un technicien nul et un coût à zéro quand ils ne sont pas renseignés', () => {
    const input = toMaintenanceInput({
      ...formData,
      maintenance_cost: '',
      technician_id: '',
    });

    expect(input.technician_id).toBeNull();
    expect(input.maintenance_cost).toBe(0);
  });

  it("n'inclut ni l'identifiant de la maintenance ni les fichiers du formulaire", () => {
    const input = toMaintenanceInput({
      ...formData,
      id: '12',
      images: [new File([''], 'photo.png')],
    } as Parameters<typeof toMaintenanceInput>[0]);

    expect(input).not.toHaveProperty('id');
    expect(input).not.toHaveProperty('images');
  });
});

describe('pièces jointes de maintenance', () => {
  const formData = {
    aircraft_id: '3',
    maintenance_type: 'INSPECTION',
    status: 'PLANNED',
    start_date: new Date('2024-03-10T12:00:00'),
    end_date: new Date('2024-03-15T12:00:00'),
    description: '',
    maintenance_cost: '',
    technician_id: '',
  };
  const photo = new File(['a'], 'photo.png', { type: 'image/png' });
  const report = new File(['b'], 'rapport.pdf', { type: 'application/pdf' });

  describe('buildCreateMaintenanceVariables', () => {
    it('envoie les images et les documents sous les noms attendus par la mutation', () => {
      const variables = buildCreateMaintenanceVariables({
        ...formData,
        images: [photo],
        documents: [report],
      });

      expect(variables).toEqual({
        createMaintenanceInput: toMaintenanceInput(formData),
        images: [photo],
        files: [report],
      });
    });

    it("n'envoie aucune variable de fichier quand rien n'est sélectionné", () => {
      const variables = buildCreateMaintenanceVariables({ ...formData, images: [], documents: [] });

      expect(Object.keys(variables)).toEqual(['createMaintenanceInput']);
    });
  });

  describe('buildUpdateMaintenanceVariables', () => {
    it("ajoute l'identifiant entier et seulement les fichiers sélectionnés", () => {
      const variables = buildUpdateMaintenanceVariables({ ...formData, id: '12', documents: [report] });

      expect(variables).toEqual({
        updateMaintenanceInput: { id: 12, ...toMaintenanceInput(formData) },
        files: [report],
      });
      expect(variables).not.toHaveProperty('images');
    });

    it('renvoie null sans identifiant valide', () => {
      expect(buildUpdateMaintenanceVariables(formData)).toBeNull();
      expect(buildUpdateMaintenanceVariables({ ...formData, id: 'abc' })).toBeNull();
    });
  });

  describe('validateMaintenanceAttachments', () => {
    const sized = (name: string, size: number) => {
      const file = new File([''], name);
      Object.defineProperty(file, 'size', { value: size });
      return file;
    };

    it('accepte une sélection conforme', () => {
      expect(validateMaintenanceAttachments({ images: [photo], documents: [report] })).toBeNull();
      expect(validateMaintenanceAttachments({})).toBeNull();
      expect(
        validateMaintenanceAttachments({ images: [sized('a.png', MAINTENANCE_UPLOAD_MAX_FILE_SIZE)] }),
      ).toBeNull();
    });

    it('refuse un fichier trop volumineux', () => {
      expect(
        validateMaintenanceAttachments({ documents: [sized('gros.pdf', MAINTENANCE_UPLOAD_MAX_FILE_SIZE + 1)] }),
      ).toContain('gros.pdf');
    });

    it('refuse deux fichiers de même nom, même de nature différente', () => {
      expect(
        validateMaintenanceAttachments({ images: [photo], documents: [new File(['c'], 'photo.png')] }),
      ).toContain('photo.png');
    });

    it('refuse plus de fichiers que la limite, images et documents confondus', () => {
      const many = (prefix: string, count: number) =>
        Array.from({ length: count }, (_, index) => new File(['x'], `${prefix}-${index}`));

      expect(
        validateMaintenanceAttachments({ images: many('img', 5), documents: many('doc', 5) }),
      ).toBeNull();
      expect(
        validateMaintenanceAttachments({ images: many('img', 6), documents: many('doc', 5) }),
      ).toContain(String(MAINTENANCE_UPLOAD_MAX_FILES));
    });
  });

  describe('maintenanceFileUrl et maintenanceFileName', () => {
    it("encode chaque segment du chemin renvoyé par l'API", () => {
      expect(
        maintenanceFileUrl('http://localhost:3000', '/uploads/maintenance/4/rapport été #2.pdf'),
      ).toBe('http://localhost:3000/uploads/maintenance/4/rapport%20%C3%A9t%C3%A9%20%232.pdf');
    });

    it('extrait le nom du fichier', () => {
      expect(maintenanceFileName('/uploads/maintenance/4/rapport.pdf')).toBe('rapport.pdf');
      expect(maintenanceFileName('100%.pdf')).toBe('100%.pdf');
    });
  });
});

describe('libellés des maintenances', () => {
  it('traduit chaque type et ne montre jamais un code brut', () => {
    expect(maintenanceTypeLabel('INSPECTION')).toBe('Inspection');
    expect(maintenanceTypeLabel('SOFTWARE_UPDATE')).toBe('Mise à jour logicielle');
    expect(maintenanceTypeLabel('UNKNOWN_CODE')).toBe('Autre');
    expect(maintenanceTypeLabel(null)).toBe('—');
  });

  it('donne un libellé et une couleur à chaque statut', () => {
    expect(maintenanceStatus('PLANNED')).toEqual({ label: 'Planifiée', variant: 'info' });
    expect(maintenanceStatus('IN_PROGRESS')).toEqual({ label: 'En cours', variant: 'warning' });
    expect(maintenanceStatus('COMPLETED')).toEqual({ label: 'Terminée', variant: 'success' });
    expect(maintenanceStatus('CANCELLED')).toEqual({ label: 'Annulée', variant: 'danger' });
    expect(maintenanceStatus(undefined)).toEqual({ label: '—', variant: 'neutral' });
  });

  it('nomme un technicien par son prénom et son e-mail', () => {
    expect(maintenanceTechnicianLabel({ first_name: 'Marie', email: 'marie@example.com' })).toBe(
      'Marie · marie@example.com',
    );
    expect(maintenanceTechnicianLabel({ email: 'marie@example.com' })).toBe('marie@example.com');
  });
});
