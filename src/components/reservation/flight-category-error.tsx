export function FlightCategoryError({ visible }: Readonly<{ visible: boolean }>) {
  if (!visible) return null

  return (
    <p className="mt-1 text-sm text-red-500" role="alert">
      Veuillez sélectionner une catégorie de vol.
    </p>
  )
}
