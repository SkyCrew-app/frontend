import { toMaintenanceInput } from '../maintenance';

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
