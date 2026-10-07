import { afterEach, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import i18n from '../../i18n';
import JourneyLearning from './JourneyLearning';
import JourneyReview from './JourneyReview';
import JourneyScenarios from './JourneyScenarios';
import PlanEditor from './PlanEditor';
import { buildJourneyReview, readJourney } from '../../utils/financialJourney';
afterEach(() => i18n.changeLanguage('pt'));
const render = element => renderToStaticMarkup(<MemoryRouter>{element}</MemoryRouter>);
it('renders all ten lessons and financial controls in English without Portuguese fallback', async () => {
  await i18n.changeLanguage('en');
  const learning = render(<JourneyLearning completedLessons={[]} />);
  expect((learning.match(/aria-pressed="false"/g) || []).length).toBe(10);
  const output = learning + render(<JourneyReview review={buildJourneyReview({}, readJourney(null), '2026-10-07')} completedLessons={0} />) + render(<JourneyScenarios saved={100} contribution={50} />) + render(<PlanEditor journey={readJourney(null)} goals={[]} />);
  expect(output).not.toMatch(/journey\.[a-z]|Objetivo|poupança|receitas|Aprender|Guardar|Revisão/);
  expect(output).toContain('annual return 0%');
  expect(output).toContain('CFPB');
});
it('renders Portuguese learning content', async () => {
  await i18n.changeLanguage('pt');
  expect(render(<JourneyLearning completedLessons={['purpose']} />)).toContain('aria-pressed="true"');
});
