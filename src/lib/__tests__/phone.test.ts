import { isValidPhone, normalisePhone } from '../phone';
import { profileSchema } from '../validations';

describe('normalisePhone', () => {
  it.each([
    ['06 12 34 56 78', '0612345678'],
    ['06.12.34.56.78', '0612345678'],
    ['06-12-34-56-78', '0612345678'],
    ['+33 6 12 34 56 78', '+33612345678'],
    ['0033 6 12 34 56 78', '+33612345678'],
    ['+44 (20) 7946-0958', '+442079460958'],
    ['', ''],
  ])('enregistre « %s » sous la forme « %s »', (typed, saved) => {
    expect(normalisePhone(typed)).toBe(saved);
  });

  it('accepte une valeur absente', () => {
    expect(normalisePhone(null)).toBe('');
    expect(normalisePhone(undefined)).toBe('');
  });
});

describe('isValidPhone', () => {
  it.each([
    '0612345678',
    '06 12 34 56 78',
    '+33 6 12 34 56 78',
    '0033612345678',
    '+1 415 555 2671',
    '+44 20 7946 0958',
    '+49 30 901820',
    '+12345678',
    '+123456789012345',
  ])('accepte « %s »', (value) => {
    expect(isValidPhone(value)).toBe(true);
  });

  it.each([
    '',
    '123',
    '0612345',
    '06123456789',
    '612345678',
    '+1234567',
    '+1234567890123456',
    '+0612345678',
    '+33 6 12 34 AB 78',
    'appelez-moi',
  ])('refuse « %s »', (value) => {
    expect(isValidPhone(value)).toBe(false);
  });
});

describe('profileSchema', () => {
  const profile = (phone?: string) => profileSchema.safeParse({ first_name: 'Camille', last_name: 'Martin', phone });

  it('accepte un numéro international ou français, ou pas de numéro', () => {
    expect(profile('+44 20 7946 0958').success).toBe(true);
    expect(profile('06 12 34 56 78').success).toBe(true);
    expect(profile(undefined).success).toBe(true);
    expect(profile('').success).toBe(true);
  });

  it('refuse un numéro incomplet', () => {
    const result = profile('123');
    expect(result.success).toBe(false);
    expect(!result.success && result.error.issues[0].message).toBe('Numéro de téléphone invalide');
  });
});
