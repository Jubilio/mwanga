import { describe, expect, it } from 'vitest';
import { hasOwnPhoto, initialsFrom, PLACEHOLDER_AVATAR, prepareProfilePhoto } from './avatar';

describe('initialsFrom', () => {
  it('uses the first and last name', () => {
    expect(initialsFrom('Jubilio Mausse')).toBe('JM');
    expect(initialsFrom('  jubilio   da  silva mausse ')).toBe('JM');
    expect(initialsFrom('jubilio')).toBe('J');
    expect(initialsFrom('Élio')).toBe('É');
  });
  it('returns nothing when the name is unknown', () => {
    expect(initialsFrom(undefined)).toBe('');
    expect(initialsFrom('   ')).toBe('');
  });
});

describe('hasOwnPhoto', () => {
  it('ignores empty values and the generic placeholder', () => {
    expect(hasOwnPhoto('')).toBe(false);
    expect(hasOwnPhoto(undefined)).toBe(false);
    expect(hasOwnPhoto(PLACEHOLDER_AVATAR)).toBe(false);
    expect(hasOwnPhoto('data:image/jpeg;base64,/9j/4AAQ')).toBe(true);
  });
});

describe('prepareProfilePhoto', () => {
  it('rejects files that are not images or are huge before decoding', async () => {
    await expect(prepareProfilePhoto(new File(['x'], 'a.pdf', { type: 'application/pdf' }))).rejects.toMatchObject({ code: 'unsupported' });
    const huge = { size: 50 * 1024 * 1024, type: 'image/jpeg' };
    await expect(prepareProfilePhoto(huge)).rejects.toMatchObject({ code: 'too_large' });
  });
});
