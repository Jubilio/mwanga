import React, { useState } from 'react';
import { Briefcase, CheckCircle, XCircle, TrendingUp, Shield, Users, BookOpen } from 'lucide-react';

export default function SimulatorQuality() {
  const [criteria, setCriteria] = useState({
    consistentEarnings: null,
    goodROE: null,
    healthyBalance: null,
    greatManagement: null,
    simpleBusiness: null,
  });

  const handleToggle = (key, value) => {
    setCriteria(prev => ({ ...prev, [key]: value }));
  };

  const score = Object.values(criteria).filter(v => v === true).length * 20;
  const answered = Object.values(criteria).filter(v => v !== null).length;
  const isComplete = answered === 5;

  const getScoreMessage = () => {
    if (!isComplete) return 'Responda a todas as perguntas para obter o seu Buffett Score.';
    if (score === 100) return 'Excelente! Este é um negócio "Fenomenal" segundo Warren Buffett. Vale a pena investir fortemente.';
    if (score >= 80) return 'Muito Bom. Tem a maioria dos pilares fundamentais. Avalie com cuidado o critério em falta.';
    if (score >= 60) return 'Razoável. Pode haver oportunidades, mas faltam elementos essenciais de segurança e qualidade.';
    return 'Arriscado. Segundo a filosofia de Buffett, não cumpres os critérios mínimos de qualidade e segurança.';
  };

  const getScoreColor = () => {
    if (score >= 80) return 'text-leaf';
    if (score >= 60) return 'text-gold';
    return 'text-coral';
  };

  const questions = [
    {
      id: 'consistentEarnings',
      label: 'Lucros Consistentes',
      desc: 'O negócio tem demonstrado poder de gerar lucros de forma consistente ao longo dos anos?',
      icon: TrendingUp,
    },
    {
      id: 'goodROE',
      label: 'Alto Retorno (ROE > 20%)',
      desc: 'O negócio gera um bom retorno sobre o capital próprio investido? (Sem anos negativos)',
      icon: Briefcase,
    },
    {
      id: 'healthyBalance',
      label: 'Balanço Saudável',
      desc: 'O negócio tem pouca ou nenhuma dívida, possuindo recursos para sobreviver a crises?',
      icon: Shield,
    },
    {
      id: 'greatManagement',
      label: 'Gestão Honesta e Competente',
      desc: 'Os líderes já estão no lugar, são competentes e têm "skin in the game" (o próprio dinheiro investido)?',
      icon: Users,
    },
    {
      id: 'simpleBusiness',
      label: 'Negócio Simples',
      desc: 'Consegue compreender exatamente como o negócio ganha dinheiro? Está no seu "Círculo de Competência"?',
      icon: BookOpen,
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="glass-card p-8 bg-linear-to-br from-ocean/20 to-midnight">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex-1">
            <h2 className="text-xl font-black text-white mb-2">Simulador de Qualidade Buffett</h2>
            <p className="text-sm text-gray-400">
              Avalie qualquer negócio, imóvel ou oportunidade de investimento usando os 5 critérios rigorosos de aquisição do Warren Buffett.
            </p>
          </div>
          <div className="w-full md:w-auto p-6 rounded-[24px] bg-black/40 border border-white/5 flex flex-col items-center justify-center min-w-[200px]">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-2">Buffett Score</span>
            <div className={`text-5xl font-black ${getScoreColor()}`}>
              {score}<span className="text-2xl text-gray-600">%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {questions.map((q) => {
          const Icon = q.icon;
          const val = criteria[q.id];
          return (
            <div key={q.id} className="glass-card p-6 border-white/5 transition-all hover:border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-gray-400 shrink-0">
                  <Icon size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">{q.label}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{q.desc}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                <button
                  onClick={() => handleToggle(q.id, true)}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                    val === true ? 'bg-leaf text-midnight' : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  <CheckCircle size={14} /> Sim
                </button>
                <button
                  onClick={() => handleToggle(q.id, false)}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                    val === false ? 'bg-coral text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  <XCircle size={14} /> Não
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {isComplete && (
        <div className={`p-6 rounded-[24px] border ${score >= 80 ? 'bg-leaf/10 border-leaf/20' : score >= 60 ? 'bg-gold/10 border-gold/20' : 'bg-coral/10 border-coral/20'} animate-scale-in`}>
          <h4 className={`text-sm font-black uppercase tracking-widest mb-2 ${getScoreColor()}`}>Veredicto</h4>
          <p className="text-sm text-gray-300 leading-relaxed">{getScoreMessage()}</p>
        </div>
      )}
    </div>
  );
}
