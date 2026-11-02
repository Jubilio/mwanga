import { Capacitor, registerPlugin } from '@capacitor/core';

/**
 * Voice entry and launcher shortcuts.
 * Android app: the native QuickActions plugin (system speech screen, no mic permission).
 * Browser / PWA: the Web Speech API where the browser has it (Chrome, Edge, Safari).
 */
const QuickActions = registerPlugin('QuickActions');

const VOICE_LANGUAGE = 'pt-PT';

function isNativeAndroid() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

function browserRecognition() {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export function isVoiceInputSupported() {
  return isNativeAndroid() || Boolean(browserRecognition());
}

export class VoiceInputError extends Error {
  /** @param {'cancelled'|'denied'|'unavailable'|'no-speech'|'failed'} code */
  constructor(code, message) {
    super(message || code);
    this.code = code;
  }
}

function listenInBrowser({ signal } = {}) {
  const Recognition = browserRecognition();
  if (!Recognition) return Promise.reject(new VoiceInputError('unavailable'));

  return new Promise((resolve, reject) => {
    const recognition = new Recognition();
    recognition.lang = VOICE_LANGUAGE;
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.maxAlternatives = 3;
    let settled = false;
    const done = (fn, value) => {
      if (settled) return;
      settled = true;
      fn(value);
    };

    recognition.onresult = (event) => {
      const result = event.results?.[0];
      const alternatives = result ? Array.from(result).map((alt) => alt.transcript.trim()).filter(Boolean) : [];
      if (alternatives.length) done(resolve, { text: alternatives[0], alternatives });
      else done(reject, new VoiceInputError('no-speech'));
    };
    recognition.onerror = (event) => {
      const code = event.error === 'not-allowed' || event.error === 'service-not-allowed' ? 'denied'
        : event.error === 'no-speech' ? 'no-speech'
          : event.error === 'aborted' ? 'cancelled'
            : 'failed';
      done(reject, new VoiceInputError(code, event.error));
    };
    recognition.onend = () => done(reject, new VoiceInputError('no-speech'));
    signal?.addEventListener('abort', () => {
      recognition.abort();
      done(reject, new VoiceInputError('cancelled'));
    });

    try {
      recognition.start();
    } catch (error) {
      done(reject, new VoiceInputError('failed', error?.message));
    }
  });
}

/**
 * Listens for one sentence. Resolves { text, alternatives }; rejects with VoiceInputError.
 * @param {{ prompt?: string, signal?: AbortSignal }} [options]
 */
export async function listenOnce({ prompt, signal } = {}) {
  if (isNativeAndroid()) {
    try {
      const { text, alternatives } = await QuickActions.listen({ language: VOICE_LANGUAGE, prompt });
      return { text: String(text || '').trim(), alternatives: alternatives || [text] };
    } catch (error) {
      const code = error?.code === 'UNAVAILABLE' || error?.code === 'UNIMPLEMENTED' ? 'unavailable' : 'cancelled';
      throw new VoiceInputError(code, error?.message);
    }
  }
  return listenInBrowser({ signal });
}

const SHORTCUT_ACTIONS = { voice: 'VOICE', expense: 'ADD_EXPENSE', income: 'ADD_INCOME' };

/**
 * Long-press shortcut on the Android launcher icon. Calls handler with the quick-add
 * action ('VOICE' | 'ADD_EXPENSE' | 'ADD_INCOME'). Returns an unsubscribe function.
 */
export function onLauncherShortcut(handler) {
  if (!isNativeAndroid()) return () => {};
  let handle = null;
  let stopped = false;
  Promise.resolve(QuickActions.addListener('shortcut', (event) => {
    const action = SHORTCUT_ACTIONS[event?.mode];
    if (action) handler(action);
  }))
    .then((h) => {
      handle = h;
      if (stopped) h?.remove?.();
    })
    .catch(() => {});
  return () => {
    stopped = true;
    handle?.remove?.();
  };
}
