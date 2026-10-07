import React from 'react';
import { afterEach, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import i18n from '../i18n';
import SimulatorQuality from './simulators/SimulatorQuality';
import ConfirmModal from './ConfirmModal';
import InstallBanner from './InstallBanner';
import NotificationPanel from './layout/NotificationPanel';

afterEach(() => i18n.changeLanguage('pt'));
const text = component => renderToStaticMarkup(component).replace(/<[^>]+>/g, ' ');

it('renders the simulator and its calculated advice completely in English', async () => {
  await i18n.changeLanguage('en');
  const output = text(<SimulatorQuality />);
  expect(output).toContain('Consistent earnings');
  expect(output).not.toMatch(/Avalie|negócio|perguntas|Lucros|Gestão|Saudável/);
});

it('updates confirmations and install prompts in both languages', async () => {
  await i18n.changeLanguage('en');
  const confirmation = text(<ConfirmModal isOpen title="Limpar Notificações?" message="Esta ação irá eliminar permanentemente todos os lembretes e alertas. Tens a certeza?" />);
  expect(confirmation).toContain('Confirm');
  expect(confirmation).toContain('Are you sure?');
  expect(confirmation).not.toContain('Cancelar');
  expect(text(<InstallBanner installPrompt={{}} />)).toContain('Install Mwanga');
  await i18n.changeLanguage('pt');
  expect(text(<InstallBanner installPrompt={{}} />)).toContain('Instalar Mwanga');
});

it('chooses English automatic notification content without changing the stored notification', async () => {
  const notification = { id: 1, title: 'Sequência financeira ativa', message: 'Texto original', type: 'motivation', action_payload: { localizedContent: { en: { title: 'Your financial streak is active', message: 'Record today to keep your streak.', quickActions: ['Record now'] } } } };
  await i18n.changeLanguage('en');
  const output = text(<NotificationPanel isOpen notifications={[notification]} />);
  expect(output).toContain('Record today to keep your streak.');
  expect(output).toContain('Record now');
  expect(output).not.toContain('Texto original');
  expect(notification.message).toBe('Texto original');
});
