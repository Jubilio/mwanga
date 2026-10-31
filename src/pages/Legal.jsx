import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import MwangaLogo from '../components/MwangaLogo';

/**
 * Páginas públicas de Política de Privacidade (/privacidade) e Termos de Utilização (/termos).
 * São pedidas pelo Google (ecrã de consentimento OAuth, Google Play) e devem descrever
 * o que a app faz de facto. Ao mudar o tratamento de dados, atualize o texto e a data.
 */
const CONTACT = 'nexovibecontact@gmail.com';
const UPDATED = '31 de outubro de 2026';

const PRIVACY = {
  title: 'Política de Privacidade',
  intro: 'Esta política explica que dados o Mwanga recolhe, para que os usa e que escolhas tem. O Mwanga é um produto da NexoVibe, em Moçambique.',
  sections: [
    {
      h: 'Que dados recolhemos',
      items: [
        'Conta: nome, email e senha (guardada apenas de forma cifrada). Se entrar com o Google, recebemos o seu nome, email e foto de perfil da conta Google.',
        'Dados financeiros que introduz: transações, contas, orçamentos, metas, dívidas, xitique e outros registos que cria na app.',
        'Mensagens SMS de dinheiro móvel e bancos: só quando escolhe importar SMS. No Android, a app lê as mensagens já recebidas de remetentes como M-Pesa, e-Mola, mKesh e bancos, para criar as transações. O texto dessas mensagens é enviado ao nosso servidor apenas para ser interpretado.',
        'Documentos de identificação e fotos que carrega por vontade própria (por exemplo, para verificação KYC, pedidos de crédito ou relatórios de problemas).',
        'Número de WhatsApp, se ligar a conta ao assistente por WhatsApp.',
        'Dados técnicos: identificador do dispositivo para notificações push, registos de erros e de utilização da app para a melhorar e proteger.',
      ],
    },
    {
      h: 'Para que usamos os dados',
      items: [
        'Para fornecer as funções da app: registar e organizar as suas finanças, gerar relatórios, alertas e sugestões.',
        'Para o assistente Binth: quando lhe faz uma pergunta, enviamos a pergunta e o contexto financeiro necessário a um fornecedor de inteligência artificial (por exemplo Google Gemini, Groq ou OpenRouter) para gerar a resposta.',
        'Para enviar notificações e emails sobre a sua conta (por exemplo recuperação de senha) e, se não cancelar, novidades do Mwanga.',
        'Para segurança, prevenção de fraude e resolução de problemas técnicos.',
      ],
    },
    {
      h: 'Com quem partilhamos',
      items: [
        'Não vendemos os seus dados.',
        'Usamos fornecedores que guardam ou processam dados por nossa conta: alojamento da base de dados (Supabase), servidores (Render, Vercel, Netlify), cache (Upstash), notificações (Google Firebase), envio de email (Gmail), monitorização de erros (Sentry) e os fornecedores de IA indicados acima.',
        'Se pedir crédito a um parceiro através da app, partilhamos com esse parceiro os dados do pedido, só com a sua autorização.',
        'Podemos divulgar dados quando a lei o exigir.',
      ],
    },
    {
      h: 'Emails do Mwanga',
      items: [
        'Podemos enviar emails com novidades e avisos para o email da sua conta. Cada email tem um link para cancelar a subscrição, e pode voltar a subscrever quando quiser.',
        'Os emails de segurança, como a recuperação de senha, continuam a ser enviados.',
      ],
    },
    {
      h: 'Quanto tempo guardamos',
      items: [
        'Guardamos os dados enquanto a sua conta existir.',
        `Pode pedir para apagar a conta e todos os dados associados escrevendo para ${CONTACT}. Apagamos no prazo de 30 dias, exceto o que a lei nos obrigue a guardar.`,
      ],
    },
    {
      h: 'Os seus direitos',
      items: [
        `Pode pedir acesso, correção ou eliminação dos seus dados, ou retirar consentimentos (por exemplo, a importação de SMS) a qualquer momento. Escreva para ${CONTACT}.`,
        'Pode desligar a leitura de SMS e as notificações nas definições do telemóvel.',
      ],
    },
    {
      h: 'Segurança',
      items: [
        'Usamos ligações cifradas (HTTPS), senhas guardadas com hash e acesso restrito aos dados. Nenhum sistema é totalmente seguro, mas trabalhamos para proteger a sua informação.',
      ],
    },
    {
      h: 'Crianças',
      items: ['O Mwanga não se destina a menores de 18 anos.'],
    },
    {
      h: 'Alterações',
      items: ['Se mudarmos esta política, atualizamos a data no topo e, quando a mudança for importante, avisamos na app ou por email.'],
    },
  ],
};

const TERMS = {
  title: 'Termos de Utilização',
  intro: 'Ao criar uma conta ou usar o Mwanga, aceita estes termos. O Mwanga é um produto da NexoVibe, em Moçambique.',
  sections: [
    {
      h: 'O que é o Mwanga',
      items: [
        'O Mwanga é uma app de gestão de finanças pessoais e familiares: registo de transações, orçamentos, metas, dívidas, xitique, simuladores e um assistente com inteligência artificial.',
        'O Mwanga não é um banco nem uma instituição de crédito, e não guarda nem movimenta o seu dinheiro.',
      ],
    },
    {
      h: 'A sua conta',
      items: [
        'Tem de ter pelo menos 18 anos e dar informação verdadeira.',
        'É responsável por manter a sua senha segura e por tudo o que é feito na sua conta.',
        `Pode deixar de usar o Mwanga a qualquer momento e pedir para apagar a conta escrevendo para ${CONTACT}.`,
      ],
    },
    {
      h: 'Informação, não aconselhamento',
      items: [
        'As análises, simulações, pontuações e respostas do assistente Binth são informativas. Não são aconselhamento financeiro, jurídico ou fiscal, e podem conter erros.',
        'As decisões financeiras são suas. Confirme os valores importantes com o seu banco ou operador.',
        'Os pedidos de crédito são decididos pelos parceiros, não pelo Mwanga.',
      ],
    },
    {
      h: 'Uso aceitável',
      items: [
        'Não use o Mwanga para atividades ilegais, para tentar aceder a dados de outras pessoas, nem para perturbar o serviço.',
        'Podemos suspender contas que violem estes termos.',
      ],
    },
    {
      h: 'Planos e pagamentos',
      items: [
        'Algumas funções podem exigir um plano pago. O preço e o que inclui são mostrados antes de pagar.',
      ],
    },
    {
      h: 'Disponibilidade e responsabilidade',
      items: [
        'Fazemos o possível para manter o serviço disponível e os dados corretos, mas o Mwanga é fornecido tal como está, sem garantia de funcionamento contínuo.',
        'Na medida permitida pela lei, a NexoVibe não responde por perdas resultantes de decisões tomadas com base na app, nem por falhas de serviços de terceiros.',
      ],
    },
    {
      h: 'Privacidade',
      items: ['O tratamento dos seus dados está descrito na Política de Privacidade.'],
      link: { to: '/privacidade', label: 'Ler a Política de Privacidade' },
    },
    {
      h: 'Alterações e lei aplicável',
      items: [
        'Podemos atualizar estes termos. Se a mudança for importante, avisamos na app ou por email.',
        'Estes termos regem-se pela lei da República de Moçambique.',
      ],
    },
  ],
};

export default function Legal({ page }) {
  const doc = page === 'terms' ? TERMS : PRIVACY;
  const muted = { color: 'var(--color-muted)' };

  return (
    <div className="min-h-screen w-full" style={{ background: 'var(--color-cream)', color: 'var(--color-text)', padding: '1.5rem 1rem' }}>
      <div className="flex w-full max-w-3xl flex-col gap-8" style={{ margin: '0 auto' }}>
        <header className="flex items-center justify-between gap-4">
          <MwangaLogo variant="sidebar" />
          <Link to="/bem-vindo" className="inline-flex items-center gap-1 text-sm font-semibold" style={muted}>
            <ArrowLeft size={16} /> Voltar
          </Link>
        </header>

        <section className="flex flex-col gap-3">
          <h1 className="font-display text-3xl font-black leading-tight">{doc.title}</h1>
          <p className="text-xs" style={muted}>Última atualização: {UPDATED}</p>
          <p className="text-base" style={muted}>{doc.intro}</p>
        </section>

        {doc.sections.map((section) => (
          <section key={section.h} className="flex flex-col gap-3">
            <h2 className="text-lg font-bold">{section.h}</h2>
            <ul className="flex list-disc flex-col gap-2 text-sm leading-relaxed" style={{ paddingLeft: '1.25rem' }}>
              {section.items.map((item) => <li key={item}>{item}</li>)}
            </ul>
            {section.link && (
              <Link to={section.link.to} className="text-sm font-semibold underline">{section.link.label}</Link>
            )}
          </section>
        ))}

        <footer className="flex flex-wrap gap-4 border-t text-xs" style={{ borderColor: 'var(--color-border)', paddingTop: '1rem', ...muted }}>
          <span>Contacto: <a href={`mailto:${CONTACT}`} className="underline">{CONTACT}</a></span>
          <Link to={page === 'terms' ? '/privacidade' : '/termos'} className="underline">
            {page === 'terms' ? 'Política de Privacidade' : 'Termos de Utilização'}
          </Link>
        </footer>
      </div>
    </div>
  );
}
