// Profile photos are personal, but settings rows belong to a household. Each member's
// photo is stored under its own key, so family members no longer overwrite (or see)
// each other's photo. The legacy household-wide `profile_pic` row is only a fallback.
//
// Photos stay in the database as small data URLs (the app resizes them first). They are
// never written to the public uploads folder.

const PROFILE_PIC_KEY = 'profile_pic';
const MEMBER_PREFIX = 'profile_pic:u';
// A 512 px JPEG from the app is ~40-120 KB; 350 KB of base64 is ~260 KB of image.
const MAX_DATA_URL_LENGTH = 350 * 1024;
const DATA_URL = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/;
const AVATAR_SERVICE = /^https:\/\/ui-avatars\.com\/api\/\?[\w=&%.+-]{1,200}$/;

const memberPhotoKey = (userId) => `${MEMBER_PREFIX}${Number(userId)}`;
const isMemberPhotoKey = (key) => typeof key === 'string' && key.startsWith(MEMBER_PREFIX);

function hasImageSignature(type, base64) {
  const bytes = Buffer.from(base64.slice(0, 24), 'base64');
  if (type === 'jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === 'png') return bytes.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  return bytes.subarray(0, 4).toString('latin1') === 'RIFF' && bytes.subarray(8, 12).toString('latin1') === 'WEBP';
}

// Returns the value to store, or throws an Error with code 'INVALID_PROFILE_PIC'.
function validateProfilePic(value) {
  const invalid = (reason) => Object.assign(new Error(reason), { code: 'INVALID_PROFILE_PIC' });
  if (value === null || value === undefined || value === '') return '';
  if (typeof value !== 'string') throw invalid('Profile photo must be text');
  if (AVATAR_SERVICE.test(value)) return value;
  if (value.length > MAX_DATA_URL_LENGTH) throw invalid('Profile photo is too large');
  const match = DATA_URL.exec(value);
  if (!match) throw invalid('Profile photo must be a JPEG, PNG or WebP image');
  if (!hasImageSignature(match[1], match[2])) throw invalid('Profile photo content does not match its type');
  return value;
}

// Picks the signed-in member's photo from a household settings map.
function photoForMember(settingsMap, userId) {
  const own = settingsMap[memberPhotoKey(userId)];
  if (own !== undefined) return own || '';
  return settingsMap[PROFILE_PIC_KEY] || '';
}

// Removes every member's photo row and replaces profile_pic with the viewer's photo.
function withMemberPhoto(settingsMap, userId) {
  const photo = photoForMember(settingsMap, userId);
  const visible = Object.fromEntries(Object.entries(settingsMap).filter(([key]) => !isMemberPhotoKey(key)));
  return { ...visible, [PROFILE_PIC_KEY]: photo };
}

module.exports = {
  PROFILE_PIC_KEY,
  MAX_DATA_URL_LENGTH,
  memberPhotoKey,
  isMemberPhotoKey,
  validateProfilePic,
  photoForMember,
  withMemberPhoto,
};
