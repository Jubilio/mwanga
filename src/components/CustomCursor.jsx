import { useEffect, useState } from 'react';

export default function CustomCursor() {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches) {
      return undefined;
    }

    const updatePosition = (event) => {
      setPosition({ x: event.clientX, y: event.clientY });
      setVisible(true);
      setActive(Boolean(event.target.closest('a, button, input, textarea, select, label, [role="button"]')));
    };

    const hideCursor = () => setVisible(false);

    window.addEventListener('mousemove', updatePosition);
    window.addEventListener('mouseleave', hideCursor);

    return () => {
      window.removeEventListener('mousemove', updatePosition);
      window.removeEventListener('mouseleave', hideCursor);
    };
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <>
      <div
        className={`custom-cursor-ring ${active ? 'is-active' : ''}`}
        style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
      />
      <div
        className={`custom-cursor-dot ${active ? 'is-active' : ''}`}
        style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
      />
    </>
  );
}
