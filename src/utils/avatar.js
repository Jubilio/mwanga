// Shared helpers for the user's avatar: initials, placeholder detection and the
// on-device photo preparation used before uploading a profile photo.

export const PLACEHOLDER_AVATAR = 'https://ui-avatars.com/api/?name=User&background=0D8ABC&color=fff&size=128';

// "Jubilio Mausse" -> "JM", "jubilio" -> "J". Returns '' when the name is unknown.
export function initialsFrom(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '';
  const first = Array.from(parts[0])[0] || '';
  const last = parts.length > 1 ? Array.from(parts[parts.length - 1])[0] || '' : '';
  return (first + last).toLocaleUpperCase('pt');
}

// A real photo the user chose, as opposed to an empty value or the generic "User" image.
export function hasOwnPhoto(url) {
  return typeof url === 'string' && url.length > 0 && url !== PLACEHOLDER_AVATAR;
}

export const PHOTO_MAX_SIDE = 512;
export const PHOTO_MAX_BYTES = 240 * 1024;
// Above this, even decoding may run a phone out of memory.
export const PHOTO_MAX_INPUT_BYTES = 40 * 1024 * 1024;

export class PhotoError extends Error {
  constructor(code) { super(code); this.code = code; }
}

async function decode(file) {
  if (typeof createImageBitmap === 'function') {
    try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch { /* try <img> below */ }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

const dataUrlBytes = dataUrl => Math.ceil((dataUrl.length - dataUrl.indexOf(',') - 1) * 3 / 4);

/**
 * Turns any photo the phone can display (large camera JPEGs, PNG, WebP, and HEIC where
 * the WebView can decode it) into a small square-safe JPEG data URL. The file type is not
 * trusted: Android pickers often send an empty or generic type, so the image is decoded
 * instead. Throws PhotoError('too_large' | 'unsupported').
 */
export async function prepareProfilePhoto(file, { maxSide = PHOTO_MAX_SIDE, maxBytes = PHOTO_MAX_BYTES } = {}) {
  if (!file) throw new PhotoError('unsupported');
  if (file.size > PHOTO_MAX_INPUT_BYTES) throw new PhotoError('too_large');
  if (file.type && !file.type.startsWith('image/')) throw new PhotoError('unsupported');

  let image;
  try { image = await decode(file); } catch { throw new PhotoError('unsupported'); }
  const width = image.width || image.naturalWidth;
  const height = image.height || image.naturalHeight;
  if (!width || !height) throw new PhotoError('unsupported');

  let side = maxSide;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const scale = Math.min(1, side / Math.max(width, height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const ctx = canvas.getContext('2d');
    // JPEG has no transparency: paint a white background under PNG/WebP cut-outs.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const quality = attempt < 3 ? 0.86 - attempt * 0.1 : 0.7;
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    if (dataUrl.startsWith('data:image/jpeg') && dataUrlBytes(dataUrl) <= maxBytes) {
      image.close?.();
      return dataUrl;
    }
    if (attempt >= 2) side = Math.round(side * 0.75);
  }
  image.close?.();
  throw new PhotoError('too_large');
}
