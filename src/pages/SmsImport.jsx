import React, { useState, useRef } from 'react';
import { MessageSquare, ShieldCheck, Zap, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';
import api from '../utils/api';
import { useAuthStore } from '../hooks/useAuthStore';
import { useToast } from '../hooks/useToast';

const SAMPLE_SMS = [
  "A conta 406659018 foi debitada no valor de 20.00 MZN as 23:17 do dia 24/02/26. Millennium bim",
  "mKesh: Transferiste 1,500.00MT para Fatima Macie (845123456). Taxa: 15.00MT. Saldo: 8,230.50MT. Ref: TXN20260224001",
  "BCI: A sua conta 00123456-7 foi creditada com 45,000.00MZN em 24/02/2026 as 09:30. Referencia: SAL-2026-002",
  "Vodacom M-Pesa: Levantaste 2,000MT no agente A12345 (Maputo Centro). Taxa: 20MT. Saldo disponivel: 5,430.00MT",
  "Olá! A tua encomenda chegou. Levanta na loja mais próxima com o código 8821.",
];

const TYPE_COLORS = {
  debit: { bg: "bg-coral/10", border: "border-coral", text: "text-coral", label: "DÉBITO" },
  credit: { bg: "bg-aurora/10", border: "border-aurora", text: "text-aurora", label: "CRÉDITO" },
  transfer_out: { bg: "bg-gold/10", border: "border-gold", text: "text-gold", label: "TRANSF. SAÍDA" },
  transfer_in: { bg: "bg-sky/10", border: "border-sky", text: "text-sky", label: "TRANSF. ENTRADA" },
  withdrawal: { bg: "bg-purple-500/10", border: "border-purple-500", text: "text-purple-400", label: "LEVANTAMENTO" },
  deposit: { bg: "bg-emerald-500/10", border: "border-emerald-500", text: "text-emerald-400", label: "DEPÓSITO" },
  payment: { bg: "bg-orange-500/10", border: "border-orange-500", text: "text-orange-400", label: "PAGAMENTO" },
  fee: { bg: "bg-coral/10", border: "border-coral", text: "text-coral", label: "TAXA" },
  unknown: { bg: "bg-slate-500/10", border: "border-slate-500", text: "text-slate-400", label: "DESCONHECIDO" },
};

function ConfidenceBar({ score }) {
  const pct = Math.round((score || 0) * 100);
  const colorClass = pct >= 85 ? "bg-aurora shadow-[0_0_8px_rgba(46,204,113,0.5)]" : pct >= 60 ? "bg-gold shadow-[0_0_8px_rgba(201,150,58,0.5)]" : "bg-coral shadow-[0_0_8px_rgba(224,122,95,0.5)]";
  const textColor = pct >= 85 ? "text-aurora" : pct >= 60 ? "text-gold" : "text-coral";
  
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 bg-black/40 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-1000 ease-out ${colorClass}`} 
          style={{ width: `${pct}%` }} 
        />
      </div>
      <span className={`font-mono text-xs min-w-[32px] ${textColor}`}>{pct}%</span>
    </div>
  );
}

function DataRow({ label, value, accentClass }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex justify-between items-start py-2 border-b border-white/5 last:border-0">
      <span className="text-slate-400 text-xs font-mono uppercase tracking-wider min-w-[140px]">{label}</span>
      <span className={`text-sm font-medium text-right max-w-[240px] break-all ${accentClass || "text-slate-200"}`}>
        {String(value)}
      </span>
    </div>
  );
}

export default function SmsImport() {
  const [smsText, setSmsText] = useState(SAMPLE_SMS[0]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState([]);
  
  const { token } = useAuthStore();
  const { showToast } = useToast();
  const textareaRef = useRef(null);

  async function parse() {
    if (!smsText.trim()) return;
    setLoading(true);
    setResult(null);
    
    try {
      const res = await api.post("/sms/parse", { raw_text: smsText });
      
      const parsedData = res.data.data.parsed_data;
      setResult(parsedData);
      
      setHistory(h => [
        { sms: smsText.slice(0, 60) + (smsText.length > 60 ? "…" : ""), result: parsedData, ts: new Date().toLocaleTimeString("pt-MZ") },
        ...h.slice(0, 4)
      ]);
      
      showToast('SMS analisado com sucesso!', 'success');
      
    } catch (e) {
      console.error(e);
      showToast(e.response?.data?.message || 'Erro ao processar o SMS.', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function saveTransaction() {
    if (!result || !result.is_financial || !result.amount) return;
    setSaving(true);
    try {
      // Map parser output to standard transaction schema
      let tipo = 'despesa';
      if (['credit', 'deposit', 'transfer_in'].includes(result.transaction_type)) {
        tipo = 'receita';
      }
      
      const payload = {
        date: result.transaction_datetime ? result.transaction_datetime.split('T')[0] : new Date().toISOString().split('T')[0],
        type: tipo,
        amount: Number(result.amount),
        description: `${result.bank_name}: ${result.transaction_type} ${result.recipient_name ? '- ' + result.recipient_name : ''}`,
        category: 'Outros', // Default category for now
        source_type: 'sms',
        external_reference: result.transaction_id || null,
        fee_amount: result.fee_amount || 0,
        confidence_score: result.confidence_score
      };

      await api.post("/transacoes", payload);
      
      showToast('Transação guardada com sucesso!', 'success');
      setResult(null); // Clear form to ready for next
      setSmsText('');
      
    } catch (e) {
      console.error(e);
      showToast('Erro ao guardar a transação.', 'error');
    } finally {
      setSaving(false);
    }
  }

  const typeInfo = result?.transaction_type ? TYPE_COLORS[result.transaction_type] || TYPE_COLORS.unknown : null;

  return (
    <div className="p-6 max-w-6xl mx-auto font-mono">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Zap className="text-gold" />
          SMS Financial Parser Engine
        </h1>
        <p className="text-slate-400 mt-2">Cole mensagens SMS bancárias para extração estruturada e reconciliação automática.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        
        {/* LEFT COLUMN: INPUT */}
        <div className="flex flex-col gap-6">
          <div className="glass-card overflow-hidden">
            <div className="bg-white/5 border-b border-white/5 p-3 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-coral"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-gold"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-aurora"></div>
              </div>
              <span className="ml-2 text-xs text-slate-400 tracking-widest font-semibold flex items-center gap-2">
                <MessageSquare size={14} /> SMS INPUT
              </span>
            </div>
            
            <div className="p-5">
              <textarea
                ref={textareaRef}
                value={smsText}
                onChange={e => setSmsText(e.target.value)}
                placeholder="Cole aqui a mensagem SMS bancária..."
                className="w-full min-h-[140px] bg-black/20 border border-white/10 rounded-xl text-slate-200 text-sm p-4 resize-y focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/30 transition-all font-mono leading-relaxed"
              />
              
              <button
                onClick={parse}
                disabled={loading || !smsText.trim()}
                className="mt-4 w-full py-3.5 bg-linear-to-r from-gold to-gold-deep hover:from-gold-deep hover:to-sand text-midnight font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(212,175,55,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><RefreshCw size={18} className="animate-spin" /> ANALISANDO...</>
                ) : (
                  <><Zap size={18} /> EXTRAIR DADOS</>
                )}
              </button>
            </div>
          </div>

          <div className="glass-card p-5">
            <div className="text-xs text-slate-400 tracking-widest font-semibold mb-4">EXEMPLOS RÁPIDOS</div>
            <div className="flex flex-col gap-2">
              {SAMPLE_SMS.map((s, i) => (
                <div
                  key={i}
                  onClick={() => setSmsText(s)}
                  className={`p-3 rounded-lg text-xs cursor-pointer transition-all border leading-relaxed ${
                    smsText === s 
                      ? "bg-gold/10 border-gold/40 text-gold shadow-[0_0_10px_rgba(201,150,58,0.1)]" 
                      : "bg-black/20 border-white/5 text-slate-400 hover:bg-white/5 hover:text-slate-300"
                  }`}
                >
                  {s.length > 80 ? s.slice(0, 80) + "..." : s}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: OUTPUT */}
        <div className="flex flex-col gap-6">
          {result ? (
            <div className={`glass-card overflow-hidden border ${typeInfo?.border || 'border-white/10'} transition-all duration-500 animate-fade-in-up`}>
              
              <div className={`px-5 py-4 border-b ${typeInfo?.bg || 'bg-white/5'} border-white/10 flex items-center justify-between`}>
                {result.is_financial === false ? (
                  <span className="text-sm font-bold text-slate-400 flex items-center gap-2">
                    <AlertCircle size={16} /> NÃO FINANCEIRO
                  </span>
                ) : (
                  <>
                    <span className={`text-xs font-bold border rounded-md px-2.5 py-1 tracking-wider ${typeInfo?.border} ${typeInfo?.text} bg-black/20`}>
                      {typeInfo?.label || "UNKNOWN"}
                    </span>
                    <span className="text-xl font-bold text-white tracking-tight">
                      {result.amount ? `${result.amount.toLocaleString("pt-MZ", { minimumFractionDigits: 2 })} ${result.currency || "MZN"}` : "—"}
                    </span>
                  </>
                )}
              </div>

              {result.is_financial !== false && (
                <div className="p-5">
                  <div className="mb-6 bg-black/20 p-4 rounded-xl border border-white/5">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-slate-400 tracking-widest font-semibold flex items-center gap-1.5">
                        <ShieldCheck size={14} className="text-aurora" /> NÍVEL DE CONFIANÇA
                      </span>
                      {result.confidence_score >= 0.8 && (
                        <span className="text-[10px] bg-aurora/20 text-aurora px-2 py-0.5 rounded-full">ALTA</span>
                      )}
                    </div>
                    <ConfidenceBar score={result.confidence_score} />
                  </div>

                  <div className="space-y-1 bg-black/10 p-4 rounded-xl border border-white/5">
                    <DataRow label="Banco / Origem" value={result.bank_name} accentClass="text-slate-200 font-bold" />
                    <DataRow label="Conta Ref." value={result.account_number} accentClass="text-sky" />
                    <DataRow label="ID Transação" value={result.transaction_id} />
                    <DataRow label="Data/Hora" value={result.transaction_datetime} />
                    <DataRow 
                      label="Saldo Após" 
                      value={result.balance_after ? `${Number(result.balance_after).toLocaleString("pt-MZ", { minimumFractionDigits: 2 })} MZN` : null} 
                      accentClass="text-aurora" 
                    />
                    <DataRow 
                      label="Taxa Bancária" 
                      value={result.fee_amount ? `${result.fee_amount} MZN` : null} 
                      accentClass="text-coral" 
                    />
                    <DataRow label="Beneficiário" value={result.recipient_name} />
                    <DataRow label="Conta Benef." value={result.recipient_account} />
                    <DataRow label="Código Agente" value={result.agent_code} />
                    <DataRow label="Descrição" value={result.description} />
                  </div>

                  <div className="mt-6">
                    <button 
                      onClick={saveTransaction}
                      disabled={saving}
                      className="w-full py-3 bg-aurora/20 hover:bg-aurora/30 text-aurora border border-aurora/40 rounded-xl font-bold transition-all shadow-[0_0_15px_rgba(46,204,113,0.1)] hover:shadow-[0_0_20px_rgba(46,204,113,0.2)] disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {saving ? <RefreshCw size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                      CONFIRMAR & GRAVAR TRANSAÇÃO
                    </button>
                    <p className="text-center mt-3 text-[10px] text-slate-500">
                      Esta ação irá atualizar o saldo bancário correspondente à data de {result.transaction_datetime?.split('T')[0] || 'hoje'}.
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="glass-card flex flex-col items-center justify-center min-h-[400px] text-center p-8 border-dashed border-white/20">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                <MessageSquare size={24} className="text-slate-500" />
              </div>
              <p className="text-slate-400 leading-relaxed font-mono text-sm max-w-[250px]">
                Cole um SMS de transferência ou pagamento para iniciar a análise automatizada.
              </p>
            </div>
          )}

          {/* JSON raw for debugging/nerds */}
          {result && (
            <div className="glass-card overflow-hidden opacity-50 hover:opacity-100 transition-opacity">
              <div className="px-4 py-2 border-b border-white/5 text-[10px] text-slate-400 tracking-widest font-semibold flex justify-between">
                <span>PAYLOAD JSON (API)</span>
              </div>
              <pre className="p-4 text-[10px] text-slate-400 overflow-auto max-h-[200px] font-mono leading-relaxed bg-black/40">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
