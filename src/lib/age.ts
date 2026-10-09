// Age in completed years: the birthday must have passed in the current year.
export const getAge = (birthDate: Date, today: Date = new Date()): number => {
  const years = today.getFullYear() - birthDate.getFullYear()
  const birthdayPassed =
    today.getMonth() > birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate())

  return birthdayPassed ? years : years - 1
}
