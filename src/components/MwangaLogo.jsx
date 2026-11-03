import { TrendingUp } from 'lucide-react';

/**
 * MwangaLogo — Pure CSS/SVG logo component.
 * No PNG dependency. Truly transparent. Scales perfectly.
 *
 * @param {'sidebar' | 'login'} variant
 */
export default function MwangaLogo({ variant = 'sidebar', adaptive = false }) {
  const isSidebar = variant === 'sidebar';
  // On surfaces that follow the app theme (not the always-dark sidebar) the wordmark
  // must switch with it, or it reads 1.1:1 on the light background.
  const wordClass = adaptive ? 'text-dark dark:text-slate-200' : 'text-slate-200';
  const tagClass = adaptive ? 'text-ocean dark:text-sky-light' : 'text-sky-400';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: isSidebar ? 10 : 16,
      userSelect: 'none',
    }}>
      {/* Crystal icon */}
      <div style={{
        width: isSidebar ? 40 : 64,
        height: isSidebar ? 40 : 64,
        borderRadius: isSidebar ? 10 : 16,
        background: 'linear-gradient(145deg, #0c1a2e, #162d4a)',
        border: '1.5px solid rgba(56, 189, 248, 0.25)',
        boxShadow: '0 0 20px rgba(56, 189, 248, 0.15), inset 0 1px 1px rgba(255,255,255,0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <TrendingUp
          size={isSidebar ? 22 : 34}
          strokeWidth={2.5}
          style={{
            color: '#38bdf8',
            filter: 'drop-shadow(0 0 6px rgba(56, 189, 248, 0.6))',
          }}
        />
      </div>

      {/* Text */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: isSidebar ? 0 : 2 }}>
        <span className={wordClass} style={{
          fontSize: isSidebar ? 18 : 28,
          fontWeight: 700,
          letterSpacing: '0.06em',
          lineHeight: 1.1,
        }}>
          MWANGA
        </span>
        <span className={tagClass} style={{
          fontSize: isSidebar ? 10 : 12,
          fontWeight: 700,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          lineHeight: 1.2,
        }}>
          FINANCIAL LIGHT
        </span>
      </div>
    </div>
  );
}
