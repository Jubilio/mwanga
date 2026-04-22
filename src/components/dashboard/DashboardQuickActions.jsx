import { motion } from 'framer-motion';

export default function DashboardQuickActions({ quickActions, itemVariants }) {
  return (
    <motion.div variants={itemVariants} className="mb-12 flex flex-wrap items-center justify-center gap-4 sm:gap-8">
      {quickActions.map((action) => (
        <div key={action.label} className="group relative flex flex-col items-center">
          <button
            onClick={action.onClick}
            className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl dark:bg-white/5 dark:hover:bg-white/10 sm:h-16 sm:w-16"
          >
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br ${action.gradient} text-white shadow-lg ${action.shadow} transition-transform group-hover:scale-110 group-active:scale-95 sm:h-12 sm:w-12`}>
              <action.icon size={20} strokeWidth={3} />
            </div>
            
            {/* Subtle Glow Background */}
            <div className={`absolute inset-0 rounded-2xl bg-linear-to-br ${action.gradient} opacity-0 blur-xl transition-opacity group-hover:opacity-20`} />
          </button>

          {/* Hover Label (Tooltip style) */}
          <div className="pointer-events-none absolute -bottom-8 opacity-0 transition-all duration-300 group-hover:bottom-[-2.2rem] group-hover:opacity-100 z-20">
             <span className="whitespace-nowrap px-2 py-1 text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
               {action.label}
             </span>
          </div>
        </div>
      ))}
    </motion.div>
  );
}
