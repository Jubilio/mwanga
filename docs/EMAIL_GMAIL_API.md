# Enviar emails pela API do Gmail (nexovibecontact@gmail.com)

O plano gratuito do Render bloqueia o SMTP (portas 25, 465 e 587). Por isso o Mwanga envia os emails
(campanhas do admin e recuperação de senha) pela **API do Gmail**, que usa HTTPS. Os emails saem do
próprio Gmail, com a assinatura do Google, e o limite continua a ser o do Gmail gratuito (cerca de 500 por dia).

São precisos três valores: **Client ID**, **Client Secret** e **Refresh token**. Demora cerca de 15 minutos.

## 1. Criar o projeto no Google Cloud

1. Abra https://console.cloud.google.com **com a conta nexovibecontact@gmail.com**.
2. No topo, abra o seletor de projetos → **Novo projeto** → nome `Mwanga Email` → **Criar**. Confirme que fica selecionado.
3. Menu ☰ → **APIs e serviços** → **Biblioteca** → procure **Gmail API** → **Ativar**.

## 2. Ecrã de consentimento (Google Auth Platform)

1. Menu ☰ → **APIs e serviços** → **Ecrã de consentimento OAuth** (ou **Google Auth Platform**) → **Começar**.
2. Nome da app: `Mwanga Email`. Email de suporte: nexovibecontact@gmail.com.
3. Público-alvo: **Externo**. Contacto: nexovibecontact@gmail.com. Aceite e **Criar**.
4. Em **Público-alvo**, carregue em **Publicar app** → confirmar, para ficar **Em produção**.
   Isto é importante: com a app "Em teste", o token deixa de funcionar ao fim de 7 dias.
   O Google vai mostrar um aviso de "app não verificada" quando autorizar. É normal: só a sua conta a usa.

## 3. Criar o cliente OAuth

1. **Clientes** (ou **Credenciais** → **Criar credenciais** → **ID do cliente OAuth**).
2. Tipo: **Aplicação Web**. Nome: `Mwanga Email`.
3. Em **URIs de redirecionamento autorizados**, adicione exatamente:
   `https://developers.google.com/oauthplayground`
4. **Criar**. Copie o **Client ID** e o **Client Secret** para um sítio seguro.

## 4. Obter o Refresh token

1. Abra https://developers.google.com/oauthplayground
2. Carregue no ⚙️ (canto superior direito) → marque **Use your own OAuth credentials** → cole o Client ID e o Client Secret.
3. À esquerda, na caixa "Input your own scopes", escreva:
   `https://www.googleapis.com/auth/gmail.send`
   e carregue em **Authorize APIs**.
4. Entre com **nexovibecontact@gmail.com**. No aviso "O Google não validou esta app", carregue em
   **Avançadas** → **Aceder a Mwanga Email (não seguro)** → **Continuar / Permitir**.
5. De volta ao Playground, carregue em **Exchange authorization code for tokens**.
6. Copie o **Refresh token** (começa normalmente por `1//`).

## 5. Pôr os valores no Render

No serviço do backend no Render → **Environment** → adicione:

| Variável | Valor |
|---|---|
| `GMAIL_CLIENT_ID` | o Client ID |
| `GMAIL_CLIENT_SECRET` | o Client Secret |
| `GMAIL_REFRESH_TOKEN` | o Refresh token |
| `EMAIL_FROM` | `nexovibecontact@gmail.com` |
| `EMAIL_FROM_NAME` | `Mwanga · NexoVibe` (opcional) |

Guarde. O Render reinicia o serviço. Nos **Logs** deve aparecer:
`Email service initialized (Gmail API) for nexovibecontact@gmail.com.`

As variáveis `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_SECURE`, `EMAIL_USER` e `EMAIL_PASS` deixam de ser usadas
quando as `GMAIL_*` existem. Pode apagá-las.

Nunca cole estes valores no chat nem no repositório.

## 6. Testar

Admin → **Emails** → escreva um email curto → **Enviar teste para mim**. Deve chegar em segundos à caixa do email da conta admin.

## Problemas comuns

| Erro | Causa e solução |
|---|---|
| `invalid_grant` | O token expirou ou foi revogado (por exemplo, a app ficou "Em teste"). Publique a app (passo 2.4) e repita o passo 4. |
| `invalid_client` / `unauthorized_client` | O Client ID/Secret no Render não são os mesmos que usou no Playground. |
| `Insufficient Permission` | O token foi criado sem o scope `gmail.send`. Repita o passo 4 com o scope certo. |
| `redirect_uri_mismatch` no Playground | Falta o URI `https://developers.google.com/oauthplayground` no cliente (passo 3.3). |
