# Publicar o Mwanga no Google Play

O Visual Studio App Center foi descontinuado em março de 2025, por isso este guia usa o caminho atual:
um AAB assinado, a Play Console e (opcional) o workflow "Android installer" do GitHub para enviar novas versões.
Os comandos Windows assumem o projeto em `C:\Users\USER\Documents\Project\mwanga` e o PowerShell.

## 1. Criar a chave de upload (uma vez)

Guarde a chave fora do repositório. Se a perder, terá de pedir ao Google a troca da chave de upload.

```powershell
mkdir C:\Users\USER\Documents\mwanga-keys
keytool -genkeypair -v -keystore C:\Users\USER\Documents\mwanga-keys\mwanga-upload.jks `
  -alias mwanga-upload -keyalg RSA -keysize 2048 -validity 10000
```

`keytool` vem com o JDK 21. Anote as passwords num gestor de passwords e faça uma cópia de segurança do `.jks`.
Com a assinatura de apps do Google Play (ativa por defeito), esta chave é só a chave de upload;
o Google guarda a chave final que assina a app instalada.

## 2. Gerar o primeiro AAB no computador

```powershell
cd C:\Users\USER\Documents\Project\mwanga
git pull
npm ci
$env:VITE_API_URL = "https://SEU-BACKEND"
$env:MWANGA_KEYSTORE_PATH = "C:\Users\USER\Documents\mwanga-keys\mwanga-upload.jks"
$env:MWANGA_KEYSTORE_PASSWORD = "..."
$env:MWANGA_KEY_ALIAS = "mwanga-upload"
$env:MWANGA_KEY_PASSWORD = "..."
$env:MWANGA_VERSION_CODE = "1"
$env:MWANGA_VERSION_NAME = "1.0.0"
npm run android:bundle
```

O ficheiro fica em `android\app\build\outputs\bundle\release\app-release.aab`.
Cada envio à Play precisa de um `MWANGA_VERSION_CODE` maior do que o anterior.

## 3. Configurar a Play Console

1. Crie a conta de programador em <https://play.google.com/console> (taxa única de 25 USD e verificação de identidade).
2. "Criar app": nome Mwanga, idioma predefinido Português, app gratuita.
3. Testes → Testes internos → Criar versão → carregue o `app-release.aab`. O primeiro envio tem de ser manual;
   a API do Google Play só funciona para apps que já existem na consola.
4. Preencha "Conteúdo da app": política de privacidade (URL público obrigatório), acesso à app
   (dê uma conta de teste ao revisor), anúncios, classificação de conteúdo, público-alvo,
   segurança dos dados e a declaração de funcionalidades financeiras.
5. Preencha a ficha da loja: descrição curta e longa, ícone 512×512, gráfico de destaque 1024×500 e pelo menos 2 capturas de ecrã.
6. Contas pessoais criadas depois de novembro de 2023 têm de fazer um teste fechado com pelo menos 12 testadores
   durante 14 dias antes de pedir acesso à produção.

### Permissões de SMS

O `AndroidManifest.xml` pede `READ_SMS` e `RECEIVE_SMS`. A Google só aceita estas permissões
com a declaração de permissões aprovada; "gestão de dinheiro baseada em SMS" é um dos usos aceites,
mas a revisão é rigorosa e pode atrasar ou rejeitar a publicação.
Se mantiver as permissões, preencha a declaração em Conteúdo da app → Permissões confidenciais
e grave um vídeo curto que mostre a importação de SMS do M-Pesa/e-Mola.

## 4. Automatizar envios pelo GitHub (opcional)

### Conta de serviço

1. Em <https://console.cloud.google.com>, crie (ou escolha) um projeto e ative a "Google Play Android Developer API".
2. IAM e administração → Contas de serviço → Criar. Não precisa de funções no Google Cloud.
3. Na conta criada: Chaves → Adicionar chave → JSON. Guarde o ficheiro fora do repositório.
4. Na Play Console: Utilizadores e autorizações → Convidar → e-mail da conta de serviço →
   permissões da app Mwanga para "Lançar para faixas de teste" (e "Lançar para produção" se quiser).

### Secrets do repositório

Em GitHub → Settings → Secrets and variables → Actions, crie:

- `ANDROID_KEYSTORE_BASE64`: no PowerShell,
  `[Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\Users\USER\Documents\mwanga-keys\mwanga-upload.jks")) | Set-Clipboard`
  e cole o conteúdo.
- `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.
- `PLAY_SERVICE_ACCOUNT_JSON`: o conteúdo completo do ficheiro JSON da conta de serviço.

Depois de colar, apague o JSON transferido ou guarde-o num local seguro. Nunca faça commit do `.jks` nem do JSON.

### Enviar uma versão

Actions → Android installer → Run workflow:

- `mode`: `bundle`
- `version_code`: maior do que o último enviado
- `play_track`: `internal` para testes, depois `alpha`/`beta`/`production`
- `play_status`: `draft` enquanto a app nunca foi publicada; `completed` depois disso

O AAB também fica disponível como artefacto da execução.
