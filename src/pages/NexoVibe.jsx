import { Wallet, Cpu, Database, Map, Globe, Code, ArrowRight, Github, Linkedin, Mail } from 'lucide-react';

export default function NexoVibe() {
  const expertise = [
    {
      title: 'Desenvolvimento de Software',
      desc: 'Criação de sistemas robustos, escaláveis e com design premium. Especialista em ecossistemas modernos como React e Node.js.',
      icon: Code,
      color: 'var(--color-ocean)'
    },
    {
      title: 'Prompt Engineering & IA',
      desc: 'Otimização de fluxos de trabalho através de Inteligência Artificial Generativa, transformando prompts em produtividade.',
      icon: Cpu,
      color: 'var(--color-gold)'
    },
    {
      title: 'Data & GIS Analysis',
      desc: 'Análise inteligente de dados geográficos e estatísticos para suporte à decisão estratégica e planeamento.',
      icon: Map,
      color: 'var(--color-sky)'
    }
  ];

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '4rem' }}>
      {/* ─── HERO SECTION ─── */}
      <section style={{
        background: 'linear-gradient(135deg, var(--color-dark), #0a1926)',
        borderRadius: '30px',
        padding: '4rem 2rem',
        textAlign: 'center',
        color: 'white',
        position: 'relative',
        overflow: 'hidden',
        marginBottom: '3rem',
        boxShadow: '0 20px 50px rgba(0,0,0,0.3)'
      }}>
        {/* Floating Elements decorators */}
        <div style={{ position: 'absolute', top: '-10%', left: '-5%', width: '300px', height: '300px', background: 'var(--color-ocean)', opacity: 0.1, borderRadius: '50%', filter: 'blur(80px)' }}></div>
        <div style={{ position: 'absolute', bottom: '-10%', right: '-5%', width: '200px', height: '200px', background: 'var(--color-gold)', opacity: 0.1, borderRadius: '50%', filter: 'blur(60px)' }}></div>

        <div style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: '0.5rem', 
          padding: '0.5rem 1rem', 
          background: 'rgba(255,255,255,0.05)', 
          borderRadius: '999px',
          fontSize: '0.8rem',
          fontWeight: 600,
          color: 'var(--color-gold)',
          marginBottom: '1.5rem',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <Globe size={14} /> Inovação Digital de Moçambique
        </div>

        <h1 style={{ 
          fontFamily: 'var(--font-display)', 
          fontSize: '3.5rem', 
          fontWeight: 900, 
          lineHeight: 1, 
          marginBottom: '1rem',
          background: 'linear-gradient(to right, #fff, var(--color-sand))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          NEXO VIBE
        </h1>
        <p style={{ 
          fontSize: '1.2rem', 
          opacity: 0.8, 
          maxWidth: '600px', 
          margin: '0 auto 2.5rem',
          lineHeight: 1.6
        }}>
          Smarter Connections, Better Vibes. Interligando Dados, Inteligência Artificial e Equipas de Alta Performance.
        </p>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button className="btn btn-primary" style={{ padding: '0.8rem 2rem' }}>
            Explorar Serviços <ArrowRight size={18} />
          </button>
          <a href="#contact" className="btn btn-ghost" style={{ color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}>
            Falar com Jubílio
          </a>
        </div>
      </section>

      {/* ─── EXPERTISE CARDS ─── */}
      <h2 className="section-title" style={{ justifyContent: 'center', marginBottom: '2rem' }}>A Nossa Especialidade</h2>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
        gap: '1.5rem',
        marginBottom: '4rem'
      }}>
        {expertise.map((item, idx) => (
          <div key={idx} className="glass-card animate-fade-in-up" style={{ 
            padding: '2rem', 
            textAlign: 'left',
            animationDelay: `${idx * 0.1}s`,
            borderTop: `4px solid ${item.color}`
          }}>
            <div style={{ 
              width: '50px', 
              height: '50px', 
              background: `${item.color}15`, 
              color: item.color,
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.5rem'
            }}>
              <item.icon size={26} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem' }}>{item.title}</h3>
            <p style={{ color: 'var(--color-muted)', fontSize: '0.92rem', lineHeight: 1.6 }}>{item.desc}</p>
          </div>
        ))}
      </div>

      {/* ─── ABOUT JUBÍLIO ─── */}
      <div id="contact" style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: '2rem',
        alignItems: 'center',
        background: 'var(--color-surface)',
        borderRadius: '24px',
        padding: '2.5rem',
        border: '1px solid var(--color-border)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '180px', 
            height: '180px', 
            borderRadius: '50%', 
            background: 'linear-gradient(45deg, var(--color-ocean), var(--color-gold))',
            margin: '0 auto 1.5rem',
            padding: '4px',
            position: 'relative'
          }}>
            <div style={{ 
              width: '100%', 
              height: '100%', 
              borderRadius: '50%', 
              background: 'var(--color-dark)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '4rem',
              color: 'var(--color-sand)',
              fontWeight: 900
            }}>
              JM
            </div>
            {/* Online badge */}
            <div style={{ position: 'absolute', bottom: '15px', right: '15px', width: '24px', height: '24px', background: '#4ade80', borderRadius: '50%', border: '4px solid var(--color-surface)' }}></div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <a href="https://github.com/Jubilio" target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ background: 'var(--color-cream)', color: 'var(--color-ocean)' }}>
              <Github size={20} />
            </a>
            <a href="https://www.linkedin.com/in/jubilio-mausse" target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ background: 'var(--color-cream)', color: 'var(--color-ocean)' }}>
              <Linkedin size={20} />
            </a>
            <a href="mailto:contact@nexovibe.com" className="btn btn-ghost" style={{ background: 'var(--color-cream)', color: 'var(--color-ocean)' }}>
              <Mail size={20} />
            </a>
          </div>
        </div>

        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--color-ocean)' }}>
            Jubílio Maússe
          </h2>
          <p style={{ color: 'var(--color-muted)', marginBottom: '1.5rem' }}>
            Fundador da **NEXO VIBE**. Apaixonado por transformar desafios complexos em soluções digitais elegantes. Com experiência sólida em Moçambique no setor de infraestrutura e análise de dados (ACTED e IMPACT), trago uma visão global para problemas locais.
          </p>
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--color-cream)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-gold)' }}>
                <Wallet size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Mwanga Lead Developer</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>SaaS de Gestão Financeira Familiar</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── FOOTER ─── */}
      <footer style={{ marginTop: '4rem', textAlign: 'center', opacity: 0.6, fontSize: '0.8rem' }}>
        &copy; 2026 NEXO VIBE. Todos os direitos reservados.
      </footer>
    </div>
  );
}
