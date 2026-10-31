import { motion } from 'framer-motion';

/** Grelha de atalhos do Início: ícone grande e nome sempre visível. */
export default function DashboardQuickActions({ quickActions, itemVariants }) {
  return (
    <motion.div variants={itemVariants} className="glass-card gap-x-2 gap-y-5 p-5 sm:gap-x-6"
      // Inline grid: the unlayered .glass-card rule would otherwise beat Tailwind's `grid`.
      style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}
    >
      {quickActions.map((action) => (
        <button
          key={action.label}
          type="button"
          onClick={action.onClick}
          className="group flex min-w-0 flex-col items-center gap-2 text-center"
        >
          <span className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br ${action.gradient} text-white shadow-lg ${action.shadow} transition-transform group-hover:-translate-y-0.5 group-active:scale-95 sm:h-14 sm:w-14`}>
            <action.icon size={22} strokeWidth={2.5} />
          </span>
          <span className="w-full truncate text-[11px] font-bold leading-tight text-slate-600 dark:text-slate-300">
            {action.label}
          </span>
        </button>
      ))}
    </motion.div>
  );
}
