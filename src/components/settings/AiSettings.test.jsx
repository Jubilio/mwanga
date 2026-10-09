// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import i18n from '../../i18n';
import AiSettings from './AiSettings';
import api from '../../utils/api';
vi.mock('../../utils/api', () => ({ default: { get: vi.fn(), put: vi.fn(), post: vi.fn(), delete: vi.fn() } }));
let root, host;
beforeEach(async () => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; vi.clearAllMocks(); await i18n.changeLanguage('en'); api.get.mockResolvedValue({ data: { configured: false, provider: 'gemini', storageAvailable: true } }); host = document.createElement('div'); document.body.append(host); root = createRoot(host); await act(async () => root.render(<AiSettings />)); });
afterEach(async () => { await act(async () => root.unmount()); host.remove(); await i18n.changeLanguage('pt'); });
async function typeKey() { const input = host.querySelector('input'); await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'personal-key-123'); input.dispatchEvent(new Event('input',{bubbles:true})); }); return input; }
async function click(label) { await act(async () => [...host.querySelectorAll('button')].find(button => button.textContent === label).click()); }
it('tests without saving and only clears the secret after a confirmed save', async () => {
 const input = await typeKey(); api.post.mockResolvedValue({data:{success:true}}); await click('Test key'); expect(api.put).not.toHaveBeenCalled(); expect(input.value).toBe('personal-key-123');
 api.put.mockResolvedValue({ data: { configured:true,provider:'gemini',storageAvailable:true } }); await click('Save key'); expect(input.value).toBe(''); expect(host.textContent).toContain('Personal key configured'); expect(api.put).toHaveBeenCalledWith('/settings/ai',{provider:'gemini',apiKey:'personal-key-123'});
});
it('retains the draft and avoids reporting success after a failed save', async () => { const input=await typeKey(); api.put.mockRejectedValue(new Error('offline')); await click('Save key'); expect(input.value).toBe('personal-key-123'); expect(host.querySelector('[role="alert"]').textContent).toContain('Unable to confirm'); expect(host.textContent).not.toContain('Key saved.'); });
