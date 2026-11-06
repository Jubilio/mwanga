// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import i18n from '../../i18n';
import ExportDataSettings from './ExportDataSettings';
import api from '../../utils/api';

vi.mock('../../utils/api', () => ({ default: { get: vi.fn() } }));

let root, host;
beforeEach(async () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  vi.clearAllMocks();
  await i18n.changeLanguage('pt');
  URL.createObjectURL = vi.fn(() => 'blob:x');
  URL.revokeObjectURL = vi.fn();
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  await act(async () => root.render(<ExportDataSettings />));
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); });

it('downloads the export as a JSON file', async () => {
  api.get.mockResolvedValue({ data: { format: 'mwanga-export-v1', tables: {} } });
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  await act(async () => host.querySelector('button').click());
  expect(api.get).toHaveBeenCalledWith('/auth/account/export');
  expect(click).toHaveBeenCalled();
  expect(host.textContent).toContain('Ficheiro pronto.');
});

it('says so when the export fails', async () => {
  api.get.mockRejectedValue(new Error('500'));
  await act(async () => host.querySelector('button').click());
  expect(host.querySelector('[role="alert"]').textContent).toContain('Não foi possível exportar');
});
