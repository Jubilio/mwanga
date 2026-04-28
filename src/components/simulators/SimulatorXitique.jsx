import { useEffect, useState } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { Check, Info, RefreshCcw } from 'lucide-react';
import { motion } from 'framer-motion';
import { fmt } from '../../utils/calculations';

export default function SimulatorXitique({ currency }) {
  const { t } = useTranslation();

  const [contribution, setContribution] = useState(5000);
  const [participants, setParticipants] = useState(10);
  const [position,     setPosition]     = useState(1);

  // Keep position within participants bounds
  useEffect(() => {
    if (position > participants) {
      const timer = setTimeout(() => setPosition(participants), 0);
      return () => clearTimeout(timer);
    }
  }, [participants, position]);

  const pool                    = contribution * participants;
  const monthsUntilReceive      = Math.max(0, position - 1);
  const installmentWindow       = Math.max(1, participants - 1);
  const equivalentBankInterest  = pool * 0.26 * (installmentWindow / 12);
  const liquidityGain           = Math.max(0, pool - contribution);

  return (
    <motion.div
      key="xitique"
      initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }}
      className="glass-card p-6 rounded-[28px] border border-white/5 shadow-2xl"
    >
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-sky/10 flex items-center justify-center text-sky"><RefreshCcw size={20} /></div>
        <div>
          <h2 className="text-xl font-black text-midnight dark:text-white">{t('simulators.xitique.title')}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('simulators.xitique.subtitle')}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-[0.95fr_1.05fr] gap-8">
        <div className="space-y-5">
          <div className="rounded-[24px] bg-white/5 border border-white/5 p-5">
            <div className="flex justify-between text-xs mb-2"><span className="text-gray-400">{t('simulators.xitique.labels.monthly_contribution')}</span><span className="font-bold text-white">{fmt(contribution, currency)}</span></div>
            <input type="range" min="1000" max="30000" step="500" value={contribution} onChange={(e) => setContribution(Number(e.target.value))} className="w-full accent-sky" />
          </div>
          <div className="rounded-[24px] bg-white/5 border border-white/5 p-5">
            <div className="flex justify-between text-xs mb-2"><span className="text-gray-400">{t('simulators.xitique.labels.participants')}</span><span className="font-bold text-white">{participants}</span></div>
            <input type="range" min="2" max="24" value={participants} onChange={(e) => setParticipants(Number(e.target.value))} className="w-full accent-sky" />
          </div>
          <div className="rounded-[24px] bg-white/5 border border-white/5 p-5">
            <div className="flex justify-between text-xs mb-2"><span className="text-gray-400">{t('simulators.xitique.labels.position')}</span><span className="font-bold text-white">{position}{t('simulators.xitique.labels.position_suffix')}</span></div>
            <input type="range" min="1" max={participants} value={position} onChange={(e) => setPosition(Number(e.target.value))} className="w-full accent-sky" />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 content-start">
          <div className="rounded-[24px] bg-ocean/5 border border-ocean/10 p-5">
            <div className="text-[10px] font-black uppercase text-ocean mb-1">{t('simulators.xitique.summary.circle_amount')}</div>
            <div className="text-2xl font-black dark:text-white">{fmt(pool, currency)}</div>
          </div>
          <div className="rounded-[24px] bg-gold/5 border border-gold/10 p-5">
            <div className="text-[10px] font-black uppercase text-gold mb-1">{t('simulators.xitique.summary.months_to_receive')}</div>
            <div className="text-2xl font-black dark:text-white">{monthsUntilReceive}</div>
          </div>
          <div className="rounded-[24px] bg-leaf/5 border border-leaf/10 p-5">
            <div className="text-[10px] font-black uppercase text-leaf mb-1">{t('simulators.xitique.summary.immediate_liquidity')}</div>
            <div className="text-2xl font-black dark:text-white">{fmt(liquidityGain, currency)}</div>
          </div>
          <div className="rounded-[24px] bg-coral/5 border border-coral/10 p-5">
            <div className="text-[10px] font-black uppercase text-coral mb-1">{t('simulators.xitique.summary.avoided_interest')}</div>
            <div className="text-2xl font-black dark:text-white">{fmt(equivalentBankInterest, currency)}</div>
          </div>

          <div className="md:col-span-2 rounded-[28px] bg-black/5 dark:bg-white/5 border border-white/5 p-5 space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-full bg-ocean/20 flex items-center justify-center text-ocean shrink-0"><Check size={20} /></div>
              <div>
                <div className="text-lg font-black dark:text-white">{t('simulators.xitique.insights.quick_read_title')}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400 leading-7">
                  <Trans
                    i18nKey="simulators.xitique.insights.quick_read_msg"
                    values={{ position, months: monthsUntilReceive, plural: monthsUntilReceive === 1 ? '' : 'es', amount: fmt(pool, currency) }}
                    components={{ strong: <strong className="text-white" /> }}
                  />
                </div>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-full bg-gold/20 flex items-center justify-center text-gold shrink-0"><Info size={20} /></div>
              <div>
                <div className="text-lg font-black dark:text-white">{t('simulators.xitique.insights.credit_comp_title')}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400 leading-7">
                  <Trans
                    i18nKey="simulators.xitique.insights.credit_comp_msg"
                    values={{ amount: fmt(equivalentBankInterest, currency) }}
                    components={{ strong: <strong className="text-white" /> }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
