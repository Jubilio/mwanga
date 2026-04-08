import { TrendingUp } from 'lucide-react';

/**
 * MwangaLogo — Pure CSS/SVG logo component.
 * No PNG dependency. Truly transparent. Scales perfectly.
 *
 * @param {'sidebar' | 'login'} variant
 */
export default function MwangaLogo({ variant = 'sidebar' }) {
  const isSidebar = variant === 'sidebar';

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
        <span style={{
          fontSize: isSidebar ? 18 : 28,
          fontWeight: 800,
          letterSpacing: '0.06em',
          color: '#e2e8f0',
          lineHeight: 1.1,
          textShadow: '0 0 12px rgba(56, 189, 248, 0.3)',
        }}>
          MWANGA
        </span>
        <span style={{
          fontSize: isSidebar ? 8.5 : 11,
          fontWeight: 600,
          letterSpacing: '0.22em',
          color: '#38bdf8',
          textTransform: 'uppercase',
          lineHeight: 1.2,
          textShadow: '0 0 8px rgba(56, 189, 248, 0.4)',
        }}>
          FINANCIAL LIGHT
        </span>
      </div>
    </div>
  );
}
