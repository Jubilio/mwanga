import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Brain, TrendingUp, Target, ShieldCheck, ArrowRight, Lightbulb } from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  PieChart, Pie, Cell 
} from 'recharts';
import api from '../utils/api'; // Assuming an api utility exists or will be created

export default function Insights() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useOutletContext();

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        const response = await api.get('/insights');
        setData(response.data);
      } catch (error) {
        console.error('Error fetching insights:', error);
        showToast('Erro ao carregar insights da Binth', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchInsights();
  }, []);

  if (loading) return <div className="p-8 text-center animate-pulse">Binth está a analisar os seus dados...</div>;
  if (!data) return <div className="p-8 text-center">Não foi possível carregar os insights.</div>;

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#0088FE', '#00C49F', '#FFBB28'];

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      {/* Header com Binth */}
      <div className="glass-card p-6 bg-gradient-to-r from-ocean/20 to-aurora/20 border-aurora/30">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-aurora/20 flex items-center justify-center border-2 border-aurora animate-float">
            <Brain className="text-aurora w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Binth Insights</h1>
            <p className="text-aurora/80 text-sm">"A sua inteligência financeira, personalizada."</p>
          </div>
        </div>
      </div>

      {/* Tip da Binth destaque */}
      <div className="glass-card p-5 border-l-4 border-l-aurora flex gap-4 items-start">
        <Lightbulb className="text-aurora shrink-0 mt-1" />
        <div>
          <h3 className="font-semibold text-white mb-1">Dica da Binth</h3>
          <p className="text-gray-300 text-sm leading-relaxed">{data.oliviaTip}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Gráfico de Tendências */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-6 text-white font-semibold">
            <TrendingUp size={20} className="text-aurora" />
            Tendência Mensal (Receita vs Despesa)
          </div>
          <div style={{ width: '100%', height: 250, minHeight: 250 }}>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={data.monthlyTrends}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3d6b45" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3d6b45" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#e07a5f" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#e07a5f" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" tick={{fontSize: 10, fill: '#888'}} />
                <YAxis tick={{fontSize: 10, fill: '#888'}} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(23, 23, 23, 0.9)', borderColor: '#333' }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="income" name="Receita" stroke="#3d6b45" fillOpacity={1} fill="url(#colorIncome)" />
                <Area type="monotone" dataKey="expenses" name="Despesa" stroke="#e07a5f" fillOpacity={1} fill="url(#colorExpense)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribuição por Categoria */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-6 text-white font-semibold">
            <Target size={20} className="text-aurora" />
            Gastos por Categoria (Últimos 30 dias)
          </div>
          <div style={{ width: '100%', height: 250, minHeight: 250 }}>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={data.categorySpending}
                  dataKey="total"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({name}) => name}
                >
                  {data.categorySpending.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Projecções Futuras */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-6 text-white font-semibold">
          <ShieldCheck size={20} className="text-aurora" />
          Projecção Patrimonial (Baseado na média actual)
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10 text-center">
            <div className="text-gray-400 text-xs mb-1 uppercase tracking-wider">Poupança Mensal Média</div>
            <div className={`text-2xl font-bold ${data.projection.avgMonthlySavings >= 0 ? 'text-leaf' : 'text-coral'}`}>
              {Math.round(data.projection.avgMonthlySavings).toLocaleString()} MT
            </div>
          </div>
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10 text-center">
            <div className="text-gray-400 text-xs mb-1 uppercase tracking-wider">Projectado a 1 Ano</div>
            <div className="text-2xl font-bold text-aurora">
              {Math.round(data.projection.projectedYearlySavings).toLocaleString()} MT
            </div>
          </div>
        </div>
        <button className="w-full mt-6 py-3 rounded-xl bg-aurora/10 text-aurora font-semibold flex items-center justify-center gap-2 hover:bg-aurora/20 transition-all group">
          Explorar Estratégias Avançadas <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
}
