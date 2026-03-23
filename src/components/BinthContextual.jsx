import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, RefreshCw } from 'lucide-react';

export default function BinthContextual({ page }) {
  const [insight, setInsight] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchInsight = async () => {
    setLoading(true);
    let apiUrl = import.meta.env.VITE_API_URL || '';
    if (!apiUrl.endsWith('/api')) {
      apiUrl = `${apiUrl.replace(/\/$/, '')}/api`;
    }

    try {
      const response = await fetch(`${apiUrl}/binth/insights/${page}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('mwanga-token')}`
        }
      });
      const data = await response.json();
      setInsight(data);
    } catch (err) {
      console.error('Error fetching Binth insight:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsight();
  }, [page]);

  if (!loading && !insight) return null;

  const INSIGHT_BORDER = {
    warning:     'rgba(245,158,11,0.4)',
    opportunity: 'rgba(0,214,143,0.4)',
    celebration: 'rgba(0,214,143,0.5)',
    action:      'rgba(99,102,241,0.4)',
    info:        'rgba(255,255,255,0.12)',
  };
  const borderColor = INSIGHT_BORDER[insight?.insight_type] || INSIGHT_BORDER.info;

  return (
    <div className="glass-card p-4 relative overflow-hidden group" style={{ borderLeft: `3px solid ${borderColor}` }}>
      {/* Background Sparkle Effect */}
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <Sparkles size={48} className="text-gold" />
      </div>

      <div className="flex items-start gap-3 relative z-10">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold to-yellow-600 flex items-center justify-center flex-shrink-0 animate-pulse-slow">
          <span className="text-lg font-bold text-white">B</span>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] uppercase tracking-widest font-bold text-gold">Binth Inteligência</span>
            <button onClick={fetchInsight} disabled={loading} className="text-gray-400 hover:text-gold transition-colors">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {loading ? (
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4 animate-pulse"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/2 animate-pulse"></div>
            </div>
          ) : (
            <>
              <p className="text-sm dark:text-gray-200 leading-relaxed italic">
                "{insight.message}"
              </p>

              {/* ─ Biblical Insight ─ */}
              {insight.biblical_insight && (
                <div className="mt-2 flex items-start gap-1.5 text-[11px] text-amber-600 dark:text-amber-400">
                  <span className="mt-px flex-shrink-0">&#128214;</span>
                  <em className="opacity-90">{insight.biblical_insight}</em>
                </div>
              )}

              {/* ─ Alert banner ─ */}
              {insight.alerta && (
                <div className="mt-2 text-[11px] font-semibold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 rounded-lg px-2.5 py-1.5">
                  {insight.alerta}
                </div>
              )}
              
              <div className="mt-3 flex flex-wrap gap-2">
                {insight.quick_actions?.map((action, i) => (
                  <button 
                    key={i} 
                    className="text-[11px] bg-gold/10 hover:bg-gold/20 text-gold-dark dark:text-gold px-2 py-1 rounded transition-colors border border-gold/10"
                    onClick={() => navigate('/insights')}
                  >
                    {action}
                  </button>
                ))}
                <button 
                  onClick={() => navigate('/insights')}
                  className="text-[11px] font-bold text-dark dark:text-white flex items-center gap-1 hover:underline ml-auto"
                >
                  Ver mais <ArrowRight size={12} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
