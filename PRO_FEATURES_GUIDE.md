# ✨ Pro Features Mode - Developer Guide

## Overview

O sistema Mwanga agora tem suporte completo para subscription tiers e controle de features Pro.

**Por padrão em desenvolvimento, todos os utilizadores têm acesso a features PRO.**

## Como Funciona

### 1. **Subscription Tiers Disponíveis**

- **free**: Transações, Orçamento, Habitação, Metas
- **growth**: Free features + Dívidas, Patrimony, Relatórios  
- **pro**: Growth features + Xitique, Crédito, Simuladores, Insights, SMS Import, NexoVibe
- **legacy**: Todas as features (admin/developer)

### 2. **Ativar/Desativar Pro Mode**

#### Arquivo: `src/config/features.js`

```javascript
DEVELOPER_MODE = true  // Modo dev: novo utilizador = pro
DEVELOPER_MODE = false // Modo prod: novo utilizador = free
```

### 3. **Verificar Subscription Tier**

#### Na aplicação (Frontend):

```javascript
import { useFinance } from '../hooks/useFinance';

function MyComponent() {
  const { state } = useFinance();
  
  const isPro = state.settings?.subscription_tier === 'pro' 
    || state.settings?.subscription_tier === 'legacy';
  
  return isPro ? <ProFeature /> : <FreeFeature />;
}
```

#### Ou usar o hook dedicado:

```javascript
import { useProFeatures } from '../hooks/useProFeatures';

function MyComponent() {
  const { isPro, canUseXitique, canUseCredit } = useProFeatures();
  
  return (
    <div>
      {canUseXitique && <XitiqueFeature />}
      {canUseCredit && <CreditFeature />}
    </div>
  );
}
```

### 4. **Settings do Utilizador**

O subscription tier é armazenado em `state.settings.subscription_tier`.

**Exemplo:**
```javascript
{
  settings: {
    user_salary: 50000,
    subscription_tier: 'pro'  // ← Aqui
  }
}
```

### 5. **Atualizar Tier de Um Utilizador Manualmente**

No Console do Browser:

```javascript
// Para settar um utilizador como Pro
const token = localStorage.getItem('mwanga-token');
fetch('/api/settings/subscription_tier', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ subscription_tier: 'pro' })
});
```

### 6. **Componentes Afetados**

Estes componentes agora verificam o `subscription_tier`:

- **Sidebar.jsx**: Esconde badge PRO e "Premium CTA" se for PRO
- **PremiumCard.jsx**: Não aparece se for PRO  
- **Settings.jsx**: Mostra o tier atual na aba Perfil
- **Dashboard.jsx**: Acesso completo a todas features se for PRO

## Checklist de Features Pro

### ✨ Enabled (Visíveis para Pro Users):

- ✅ Xitique (`/xitique`)
- ✅ Crédito (`/credito`)
- ✅ Simuladores (`/simuladores`)
- ✅ Insights (`/insights`)
- ✅ SMS Import (`/sms-import`)
- ✅ Patrimony (`/patrimonio`)
- ✅ Relatórios (`/relatorio`)
- ✅ NexoVibe (`/nexovibe`)

### 📌 Status Atual

**Todos os utilizadores em DEVELOPMENT têm acesso PRO completo.**

## Troubleshooting

### Feature não apareça mesmo com Pro=true?

1. Verifique se `state.settings.subscription_tier === 'pro'`
   ```javascript
   console.log(state.settings.subscription_tier);
   ```

2. Limpe o localStorage e faça logout/login:
   ```javascript
   localStorage.clear();
   window.location.reload();
   ```

3. Verifique o arquivo `src/config/features.js` e confirme que `DEVELOPER_MODE = true`

### Premium Card ainda aparece?

Faça refresh da página (Ctrl+F5) para limpar cache.

## Production Deployment

Quando for para produção, **remova esta funcionalidade de desenvolvimento**:

1. Atualize `src/config/features.js`:
   ```javascript
   export const DEVELOPER_MODE = false;
   ```

2. Implemente validação real de subscripção no backend:
   - Sincronize com payment provider (Stripe, etc.)
   - Atualize `subscription_tier` baseado em pagamento

3. Remova qualquer hardcode de "pro" nos settings default
