import { useState } from 'react';
import { User } from 'lucide-react';
import { hasOwnPhoto, initialsFrom } from '../utils/avatar';

/**
 * The signed-in person's avatar: their photo when they chose one, otherwise their
 * initials. While the name is still unknown it shows a neutral person icon instead of
 * a made-up letter. A photo that fails to load falls back to the initials.
 */
export default function UserAvatar({ name, photo, className = '', textClassName = 'text-sm', iconSize = 18, alt = '' }) {
  const [failed, setFailed] = useState(null);
  const initials = initialsFrom(name);
  const showPhoto = hasOwnPhoto(photo) && failed !== photo;

  if (showPhoto) {
    return <img src={photo} alt={alt} onError={() => setFailed(photo)} className={`object-cover ${className}`} />;
  }
  return (
    <div role={alt ? 'img' : undefined} aria-label={alt || undefined} className={`flex items-center justify-center bg-linear-to-br from-ocean to-sky font-black text-white ${textClassName} ${className}`}>
      {initials || <User size={iconSize} strokeWidth={2.5} aria-hidden="true" />}
    </div>
  );
}
