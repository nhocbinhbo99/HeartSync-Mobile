const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export function calculateAge(dateOfBirth: string, today: Date) {
  if (!DATE_ONLY.test(dateOfBirth)) return null;
  const [year, month, day] = dateOfBirth.split('-').map(Number);
  const birthDate = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(birthDate.getTime()) || birthDate.getUTCFullYear() !== year || birthDate.getUTCMonth() !== month - 1 || birthDate.getUTCDate() !== day) return null;
  let age = today.getUTCFullYear() - year;
  const beforeBirthday = today.getUTCMonth() < month - 1 || (today.getUTCMonth() === month - 1 && today.getUTCDate() < day);
  if (beforeBirthday) age -= 1;
  return age;
}

export function isAdult(dateOfBirth: string, today = new Date()) {
  const age = calculateAge(dateOfBirth, today);
  return age !== null && age >= 18;
}
