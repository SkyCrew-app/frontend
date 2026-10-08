export interface MaintenanceFormValues {
  id?: string
  aircraft_id: string
  maintenance_type: string
  status: string
  start_date: Date
  end_date: Date
  description: string
  maintenance_cost: string
  technician_id: string
}

// The API expects integer ids and a numeric cost, while the form holds strings.
export const toMaintenanceInput = (formData: MaintenanceFormValues) => ({
  aircraft_id: Number.parseInt(formData.aircraft_id, 10),
  maintenance_type: formData.maintenance_type,
  status: formData.status,
  start_date: formData.start_date,
  end_date: formData.end_date,
  description: formData.description,
  maintenance_cost: Number.parseFloat(formData.maintenance_cost) || 0,
  technician_id: formData.technician_id ? Number.parseInt(formData.technician_id, 10) : null,
})
