import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Capacitor } from '@capacitor/core';
import { useFinance } from '../hooks/useFinance';
import { hideSplash } from '../utils/splash';

const MotionDiv = motion.div;
const MotionSvg = motion.svg;
const MotionPath = motion.path;
const MotionSpan = motion.span;

// Long enough for the intro animation to finish even when the data is cached.
const MIN_VISIBLE_MS = 1600;
// Past this the regular loading screen behind the splash takes over.
const MAX_VISIBLE_MS = 45000;

/**
 * Animated launch screen for the Android app. It takes over from the static native
 * splash (same background colour) and stays until the first data load finishes.
 */
export default function AppSplash() {
  const { state } = useFinance();
  const [minElapsed, setMinElapsed] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const native = Capacitor.isNativePlatform();

  useEffect(() => {
    if (!native) return undefined;
    // The animated splash is on screen now, so the static native one can go.
    hideSplash();
    const min = setTimeout(() => setMinElapsed(true), MIN_VISIBLE_MS);
    const max = setTimeout(() => setTimedOut(true), MAX_VISIBLE_MS);
    return () => { clearTimeout(min); clearTimeout(max); };
  }, [native]);

  const visible = native && !timedOut && (state.loading || !minElapsed);

  return (
    <AnimatePresence>
      {visible && (
        <MotionDiv
          key="app-splash"
          role="status"
          aria-label="Mwanga"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24,
            background: 'radial-gradient(circle at 50% 40%, #0f6a8c 0%, #0a4d68 55%, #083d54 100%)',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          <MotionDiv
            initial={{ scale: 0.3, opacity: 0, rotate: -12 }}
            animate={{ scale: [0.3, 1.15, 0.95, 1], opacity: 1, rotate: 0 }}
            transition={{ duration: 0.8, times: [0, 0.55, 0.8, 1], ease: 'easeOut' }}
          >
            <MotionDiv
              animate={{ y: [0, -10, 0] }}
              transition={{ delay: 0.9, duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                width: 120, height: 120, borderRadius: 32,
                background: 'linear-gradient(145deg, #0c1a2e, #162d4a)',
                border: '2px solid rgba(56, 189, 248, 0.35)',
                boxShadow: '0 18px 40px rgba(0, 0, 0, 0.35), 0 0 40px rgba(56, 189, 248, 0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <MotionSvg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 8px rgba(56, 189, 248, 0.7))' }}>
                <MotionPath d="M22 7 13.5 15.5 8.5 10.5 2 17" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.35, duration: 0.6, ease: 'easeInOut' }} />
                <MotionPath d="M16 7h6v6" initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ delay: 0.9, duration: 0.3 }} />
              </MotionSvg>
            </MotionDiv>
          </MotionDiv>

          <MotionDiv
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5, ease: 'easeOut' }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}
          >
            <span style={{ fontSize: 34, fontWeight: 800, letterSpacing: '0.08em', color: '#f1f5f9' }}>MWANGA</span>
            <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.28em', color: '#7dd3fc' }}>FINANCIAL LIGHT</span>
          </MotionDiv>

          <div style={{ display: 'flex', gap: 8, marginTop: 16 }} aria-hidden="true">
            {[0, 1, 2].map(i => (
              <MotionSpan
                key={i}
                initial={{ opacity: 0.3, y: 0 }}
                animate={{ opacity: [0.3, 1, 0.3], y: [0, -6, 0] }}
                transition={{ delay: 1 + i * 0.15, duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
                style={{ width: 9, height: 9, borderRadius: '50%', background: '#7dd3fc', display: 'block' }}
              />
            ))}
          </div>
        </MotionDiv>
      )}
    </AnimatePresence>
  );
}
