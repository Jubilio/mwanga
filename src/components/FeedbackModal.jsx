import { useState, useRef } from 'react';
import { X, MessageSquare, Send, Camera, AlertCircle, CheckCircle2, Loader2, Image as ImageIcon } from 'lucide-react';
import api from '../utils/api';

export default function FeedbackModal({ isOpen, onClose, showToast }) {
  const [message, setMessage] = useState('');
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.size > 5 * 1024 * 1024) {
        showToast('Imagem demasiado grande (máx 5MB)', 'error');
        return;
      }
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
    }
  };

  const removeFile = () => {
    setFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) {
      showToast('Por favor, descreve o teu feedback ou erro.', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('message', message);
      if (file) {
        formData.append('screenshot', file);
      }

      await api.post('/feedback', formData);

      showToast('Obrigado! O teu feedback foi enviado.', 'success');
      setMessage('');
      removeFile();
      onClose();
    } catch (error) {
      console.error('Error submitting feedback:', error);
      showToast('Falha ao enviar feedback. Tenta novamente.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-101 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity" 
        onClick={onClose} 
      />
      
      <div className="relative w-full max-w-md animate-in fade-in zoom-in duration-300">
        <div className="overflow-hidden rounded-3xl border border-white/20 bg-white/90 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-[#1a2b3b]/95">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-black/5 p-6 dark:border-white/5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-ocean/10 text-ocean dark:bg-aurora/10 dark:text-aurora">
                <MessageSquare size={22} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-white">Feedback Mwanga</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Sugestões ou reporte de erros</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="rounded-full p-2 hover:bg-black/5 dark:hover:bg-white/5"
            >
              <X size={20} className="text-gray-400 hover:text-gray-600" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6">
            <div className="mb-4">
              <label className="mb-2 block text-xs font-black uppercase tracking-widest text-gray-400">
                O que queres partilhar?
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Descreve o erro ou a tua sugestão..."
                className="h-32 w-full resize-none rounded-2xl border border-black/5 bg-gray-50 p-4 text-sm focus:border-ocean/30 focus:outline-hidden dark:border-white/5 dark:bg-white/5 dark:text-white"
                maxLength={1000}
              />
            </div>

            <div className="mb-6">
              <label className="mb-2 block text-xs font-black uppercase tracking-widest text-gray-400">
                Screenshot (Opcional)
              </label>
              
              {!previewUrl ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-black/10 py-6 transition-colors hover:border-ocean/30 hover:bg-ocean/5 dark:border-white/10 dark:hover:border-aurora/30 dark:hover:bg-aurora/5"
                >
                  <Camera size={24} className="mb-2 text-gray-400" />
                  <span className="text-xs font-bold text-gray-500">Tocar para anexar screenshot</span>
                </button>
              ) : (
                <div className="group relative overflow-hidden rounded-2xl border border-black/10 dark:border-white/10">
                  <img src={previewUrl} alt="Preview" className="h-40 w-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={removeFile}
                      className="rounded-full bg-red-500 p-2 text-white shadow-lg transition-transform hover:scale-110"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>
              )}
              
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-ocean to-sky py-4 font-bold text-white shadow-lg shadow-ocean/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  <span>A enviar...</span>
                </>
              ) : (
                <>
                  <Send size={20} />
                  <span>Enviar Feedback</span>
                </>
              )}
            </button>
          </form>

          {/* Biblical Touch / Motivational */}
          <div className="bg-ocean/5 p-4 text-center dark:bg-aurora/5">
            <p className="flex items-center justify-center gap-2 text-[10px] font-bold italic text-ocean/60 dark:text-aurora/60">
              <AlertCircle size={12} />
              "Ouve o conselho e recebe a instrução..." — Provérbios 19:20
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
