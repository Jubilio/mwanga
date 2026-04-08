import { useState, useEffect } from 'react';
import api from '../utils/api';
import { 
  MessageSquare, Clock, Search, RefreshCw, 
  ExternalLink, User, Calendar, Image as ImageIcon,
  CheckCircle, Trash2, X
} from 'lucide-react';

const G = {
  bg: '#07090f', bg2: '#0c1018',
  card: 'rgba(255,255,255,0.04)',
  border: 'rgba(255,255,255,0.07)',
  gold: '#F59E0B',
  text: '#e8f0fe', muted: '#6b7fa3',
  green: '#10B981', red: '#EF4444', blue: '#3B82F6',
};

export default function AdminFeedback() {
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => { fetchFeedback(); }, []);

  async function fetchFeedback() {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('mwanga-admin-token');
      const resp = await api.get('/feedback', {
        headers: { Authorization: `Bearer ${token}` },
      });
      // The backend returns { status: 'success', data: [...] }
      const data = resp.data.data || resp.data;
      setFeedback(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching feedback:', err);
      setError(err.response?.data?.error || 'Falha ao carregar mensagens de feedback.');
    } finally {
      setLoading(false);
    }
  }

  const filtered = feedback.filter((f) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (f.message || '').toLowerCase().includes(q) || 
      (f.user_name || '').toLowerCase().includes(q) ||
      (f.user_email || '').toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 900, margin: 0, fontFamily: "'Sora', sans-serif" }}>
            <MessageSquare size={22} style={{ verticalAlign: 'middle', marginRight: '10px', color: G.gold }} />
            Feedback dos Utilizadores
          </h1>
          <p style={{ color: G.muted, fontSize: '13px', margin: '4px 0 0' }}>
            Sugestões, reclamações e relatórios de bugs submetidos via app.
          </p>
        </div>
        <button
          onClick={fetchFeedback}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '10px 16px', borderRadius: '12px',
            background: G.card, border: `1px solid ${G.border}`,
            color: G.text, cursor: loading ? 'wait' : 'pointer',
            fontSize: '12px', fontWeight: 700,
          }}
        >
          <RefreshCw size={14} style={{ opacity: loading ? 0.4 : 1 }} />
          {loading ? 'Atualizando...' : 'Atualizar'}
        </button>
      </div>

      {/* Search */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        background: G.bg2, border: `1px solid ${G.border}`, borderRadius: '14px',
        padding: '10px 16px', marginBottom: '20px',
      }}>
        <Search size={16} color={G.muted} />
        <input
          type="text"
          placeholder="Pesquisar por mensagem ou utilizador..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1, background: 'none', border: 'none', outline: 'none',
            color: G.text, fontSize: '14px',
          }}
        />
      </div>

      {error && (
        <div style={{
          marginBottom: '16px', background: `${G.red}14`, color: G.text,
          border: `1px solid ${G.red}40`, borderRadius: '14px', padding: '14px 16px',
          fontSize: '13px',
        }}>
          {error}
        </div>
      )}

      {/* Grid of Feedback */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
        {filtered.map((item) => (
          <div 
            key={item.id} 
            style={{ 
              background: G.bg2, 
              borderRadius: '20px', 
              border: `1px solid ${G.border}`,
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ 
                  width: '40px', height: '40px', borderRadius: '12px', 
                  background: G.card, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: G.gold
                }}>
                  <User size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '14px' }}>{item.user_name || 'Anónimo'}</div>
                  <div style={{ fontSize: '11px', color: G.muted }}>{item.user_email || 'Sem email'}</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: G.muted }}>
                  <Calendar size={12} />
                  {new Date(item.created_at).toLocaleDateString('pt-MZ', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
                {item.screenshot_url && (
                  <span style={{ fontSize: '10px', fontWeight: 700, color: G.blue, background: `${G.blue}15`, padding: '2px 8px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <ImageIcon size={10} /> Inclui Screenshot
                  </span>
                )}
              </div>
            </div>

            <div style={{ 
              background: 'rgba(255,255,255,0.02)', 
              borderRadius: '14px', 
              padding: '16px',
              fontSize: '14px',
              lineHeight: '1.6',
              color: G.text,
              whiteSpace: 'pre-wrap'
            }}>
              {item.message}
            </div>

            {item.screenshot_url && (
              <div 
                style={{ 
                  width: 'fit-content',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  border: `1px solid ${G.border}`
                }}
                onClick={() => setSelectedImage(`${api.defaults.baseURL.replace('/api', '')}/uploads/feedback/${item.screenshot_url}`)}
              >
                <img 
                  src={`${api.defaults.baseURL.replace('/api', '')}/uploads/feedback/${item.screenshot_url}`} 
                  alt="Anexo" 
                  style={{ maxHeight: '120px', maxWidth: '100%', objectFit: 'cover' }}
                />
              </div>
            )}
          </div>
        ))}

        {filtered.length === 0 && (
          <div style={{ padding: '48px', textAlign: 'center', color: G.muted, background: G.bg2, borderRadius: '20px', border: `2px dashed ${G.border}` }}>
            {loading ? 'A carregar mensagens...' : 'Nenhum feedback encontrado.'}
          </div>
        )}
      </div>

      {/* Image Modal Preview */}
      {selectedImage && (
        <div 
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '40px'
          }}
          onClick={() => setSelectedImage(null)}
        >
          <button 
            style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
            onClick={() => setSelectedImage(null)}
          >
            <X size={32} />
          </button>
          <img 
            src={selectedImage} 
            alt="Feedback Full Size" 
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px' }}
          />
        </div>
      )}
    </div>
  );
}
