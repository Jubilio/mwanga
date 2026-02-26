import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { fmt } from '../../utils/calculations';

export default function HousingChart({ data, currency }) {
  // Use a fallback empty array if data isn't ready
  const chartData = data || [];

  return (
    <div className="glass-card p-6 border-t-4 border-t-ocean/80">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-800 dark:text-white">Evolução Mensal</h3>
          <p className="text-xs text-gray-500 mt-1">Histórico de custos habitacionais no último ano</p>
        </div>
      </div>
      
      <div style={{ width: '100%', height: 280, minHeight: 280 }}>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(150,150,150,0.1)" />
            <XAxis 
              dataKey="mes" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 11, fill: '#888' }} 
              dy={10} 
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 11, fill: '#888' }} 
              tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(0)}k` : val}
            />
            <Tooltip 
              cursor={{ fill: 'rgba(200,200,200,0.05)' }}
              contentStyle={{ 
                backgroundColor: 'rgba(20,20,20,0.9)', 
                borderColor: 'rgba(255,255,255,0.1)',
                borderRadius: '12px',
                color: '#fff',
                backdropFilter: 'blur(8px)',
                boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
              }}
              formatter={(value) => [fmt(value, currency), 'Valor']}
              labelStyle={{ color: '#aaa', marginBottom: '4px' }}
            />
            <Bar 
              dataKey="valor" 
              fill="var(--color-ocean)" 
              radius={[6, 6, 0, 0]} 
              maxBarSize={40}
              className="hover:opacity-80 transition-opacity"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
