# Distribuir o APK fora da Google Play

Canal oficial: **GitHub Releases** deste repositório (público), mais a página **/baixar** da app web.
O link `https://github.com/Jubilio/mwanga/releases/latest/download/mwanga.apk` aponta sempre para a versão mais recente.

Cada versão é feita pelo workflow **Android public release** (`.github/workflows/android-release.yml`), que:

1. Corre os testes e a verificação de traduções.
2. Compila o APK de release assinado com a chave oficial (os segredos ficam no GitHub, nunca no repositório).
3. Confirma a assinatura com `apksigner` e recusa APKs de debug.
4. Compara o certificado com a variável `MWANGA_CERT_SHA256`. Se for outra chave, pára: os telemóveis recusariam a actualização.
5. Procura credenciais de servidor dentro do APK (`scripts/scan-apk-secrets.mjs`). Se encontrar, pára.
6. Corre o MobSF (análise estática) e guarda o relatório JSON e PDF nos artefactos da execução.
7. Publica a release com `mwanga.apk`, `mwanga.apk.sha256`, instruções de instalação, as impressões digitais e o changelog gerado a partir dos PRs.

O `versionCode` vem da tag: `v1.2.3` → `10203`. Use sempre uma tag maior que a anterior.

## Configuração (uma vez)

Em GitHub: **Settings → Secrets and variables → Actions**.

### Secrets (separador *Secrets*)

Se já foram criados para a Play Store, não precisa repetir.

| Nome | Valor |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | O ficheiro `.jks` em base64 (ver comando abaixo) |
| `ANDROID_KEYSTORE_PASSWORD` | Password do keystore |
| `ANDROID_KEY_ALIAS` | Alias da chave |
| `ANDROID_KEY_PASSWORD` | Password da chave |
| `GOOGLE_SERVICES_JSON` | (opcional) conteúdo do `google-services.json`, para notificações |

No PowerShell, copia o keystore em base64 para a área de transferência (cola directamente no GitHub, não guarde noutro sítio):

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\Users\USER\Documents\mwanga-keys\mwanga-upload.jks")) | Set-Clipboard
```

### Variables (separador *Variables*)

| Nome | Valor |
|---|---|
| `MWANGA_CERT_SHA256` | Impressão digital SHA-256 do certificado (ver abaixo) |
| `VITE_API_URL` | (opcional) URL do backend; por omissão `https://mwanga-z1f4.onrender.com` |
| `VITE_GOOGLE_CLIENT_ID` | Já usada pelo workflow Android existente |

Para obter a impressão digital (o `keytool` vem com o JDK / Android Studio):

```powershell
keytool -list -v -keystore "C:\Users\USER\Documents\mwanga-keys\mwanga-upload.jks" -alias SEU_ALIAS
```

Copie a linha `SHA256:` (formato `AB:CD:...`). Se não definir a variável, a primeira execução mostra o valor num aviso e no resumo; confirme que coincide com o `keytool` e grave-o.

## Publicar uma versão

```powershell
git checkout main
git pull
git tag v1.0.1
git push origin v1.0.1
```

Ou em **Actions → Android public release → Run workflow**, indicando a tag. Por omissão fica como rascunho (draft): reveja e carregue em **Publish release**.

Depois de publicar:

1. Descarregue o `mwanga.apk` da release e envie-o em [virustotal.com](https://www.virustotal.com/gui/home/upload).
   Quando terminar, edite a release e acrescente o link do relatório em "Verificações automáticas".
2. Instale o APK num telemóvel por cima da versão anterior e confirme login e dados.
3. Leia o resumo MobSF da execução. Corrija primeiro os itens *high* que dizem respeito ao código do Mwanga.

## A chave de assinatura

Perder a chave significa que nenhum utilizador consegue actualizar: teriam de desinstalar e perder os dados locais.

- Guarde duas cópias encriptadas em locais diferentes (por exemplo, um ZIP 7-Zip com AES-256 numa pen USB e outro numa conta cloud pessoal).
- Guarde as passwords num gestor de passwords, não no mesmo sítio que o ficheiro.
- Nunca coloque o `.jks` ou as passwords no Git, em chats ou em email.

**Atenção se for para a Play Store mais tarde.** Com o Play App Signing, a Google assina as apps com uma chave dela e o ficheiro `mwanga-upload.jks` passa a ser só a chave de envio.
Um APK do GitHub e um da Play teriam assinaturas diferentes, e um não actualiza o outro.
Para manter um só canal de actualizações, na criação da app na Play Console escolha usar a sua própria chave (exportar e enviar esta chave) em vez da chave gerada pela Google.

## Verificação de programadores Android (Google)

Confirmado nas páginas oficiais em 31/10/2026 ([visão geral](https://developer.android.com/developer-verification), [FAQ](https://developer.android.com/developer-verification/guides/faq)):

- Desde 30/09/2026, a exigência aplica-se a apps instaladas a partir de lojas participantes no **Brasil, Indonésia, Singapura e Tailândia**. A expansão global, a todas as apps em telemóveis Android certificados, está prevista para **2027**. Moçambique não está na primeira fase.
- **Full distribution**: taxa única de **25 USD**, verificação de identidade e registo do pacote `com.mwanga.app` com a chave de assinatura. Quem tem conta na Play Console pode gerir isto a partir dela.
- **Limited distribution**: grátis, sem documento de identidade, mas só até **20 dispositivos** (não 50).
- APKs instalados por outras vias ainda não são bloqueados. Depois da expansão, quem não estiver registado obriga os utilizadores a um "modo avançado" com 24 horas de espera.
- Para registar o pacote é preciso a chave de assinatura: mais um motivo para não a perder.

## Outros canais

- **Firebase App Distribution**: útil para testadores (convites por email). Não serve para o público.
- **Uptodown / Aptoide**: podem receber o mesmo `mwanga.apk`; use sempre o ficheiro da release oficial, para manter a mesma assinatura.
- **F-Droid**: exige licença livre e não aceita bibliotecas proprietárias como o Firebase; o Mwanga não é elegível hoje.
