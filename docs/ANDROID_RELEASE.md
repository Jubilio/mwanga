# Android: instalação e distribuição

O projeto usa Capacitor 8 com `com.mwanga.app`, Android mínimo API 24 e target API 36.
Esta alteração prepara o processo de compilação; não inclui uma chave de assinatura nem publica na Play Store.

## Gerar um APK de teste

Pré-requisitos: Node.js 22+, JDK 21, Android SDK com API 36 e Build Tools 36.0.0.

```bash
npm ci
export VITE_API_URL=https://SEU-BACKEND
npm run android:debug
```

No PowerShell:

```powershell
$env:VITE_API_URL = "https://SEU-BACKEND"
npm run android:debug
```

O APK está em `android/app/build/outputs/apk/debug/app-debug.apk`.
Copie para o telemóvel e autorize a instalação pela aplicação utilizada para abrir o ficheiro.
O APK debug serve para testes; o lançamento público deve usar uma assinatura de release.
A API deve estar acessível por HTTPS e permitir a origem Android `https://localhost` quando aplicável.
A URL da API fica visível na aplicação. Nunca coloque chaves de IA, passwords ou segredos em variáveis VITE.

## Gerar uma versão assinada

Crie ou reutilize uma chave de assinatura. Preserve a mesma chave para atualizar instalações existentes.
Guarde a chave e as passwords fora do Git. No ambiente da compilação, configure:

- `MWANGA_KEYSTORE_PATH`: caminho absoluto do ficheiro JKS.
- `MWANGA_KEYSTORE_PASSWORD`: password do keystore.
- `MWANGA_KEY_ALIAS`: alias da chave.
- `MWANGA_KEY_PASSWORD`: password da chave.
- `MWANGA_VERSION_CODE`: inteiro crescente a cada lançamento.
- `MWANGA_VERSION_NAME`: versão apresentada ao utilizador, por exemplo `1.0.1`.

Execute `npm run android:release` para APK ou `npm run android:bundle` para AAB.
O AAB é enviado à Play Console; não é um instalador que se abre diretamente no telemóvel.

## Compilar no GitHub

Depois de integrar esta alteração na branch principal, abra Actions → Android installer → Run workflow.
Indique a URL pública da API, o modo e a versão. Descarregue o artefacto no final da execução.

Para release/bundle, configure os seguintes Repository Secrets:

- `ANDROID_KEYSTORE_BASE64`: ficheiro JKS codificado em base64.
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

O workflow não publica releases nem envia a aplicação à Play Store.
As notificações nativas ainda dependem da configuração Firebase `google-services.json`.
As permissões SMS existentes precisam de revisão para o canal de distribuição escolhido e teste num dispositivo.

## Validação antes de distribuir

Teste no telemóvel: instalação, login, troca PT/EN, registo de transações, navegação das sugestões,
acesso sem rede, recuperação da ligação e atualização sobre a versão anterior.
Teste também Google login e notificações nativas com a configuração real de produção.
Os testes automatizados não substituem estes testes do dispositivo.

## Próximas melhorias

- Traduzir os textos ainda fixos de score, notificações, relatórios PDF e respostas de outros endpoints.
- Alinhar contexto e score do servidor com o ciclo financeiro personalizado (a análise local já o usa).
- Uniformizar IDs das ações da IA para navegação em todos os componentes, independente do idioma.
- Validar o formato das respostas dos modelos e atualizar/configurar modelos por fornecedor.
- Rever armazenamento de sessão e isolamento do histórico antes de uma distribuição pública.
