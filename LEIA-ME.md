# Mapeamento de rede — GitHub Pages + Supabase

Esta versão mantém a interface do sistema atual e funciona com GitHub Pages para a página e Supabase para login, dados e histórico. O título é **Mapeamento de rede**.

O pacote está pronto para configurar. Ainda não foi publicado na sua conta do GitHub nem conectado a um projeto Supabase. O site anterior continua funcionando.

## O que vai para cada lugar

| Pasta | Destino |
| --- | --- |
| `site-publico/` | Suba **somente o conteúdo desta pasta** no repositório que publicará no GitHub Pages. A página já está compilada; você não precisa instalar Node para publicar. |
| `supabase-privado/` | Execute os arquivos SQL no painel Supabase. Contém o mapeamento real e o backup: **não envie esta pasta ao GitHub público nem ao Pages**. |
| `fonte/` | Código React/TypeScript para futuras alterações. Não é necessário para a publicação inicial. Não contém os dados reais da rede. |
| `ferramentas/` | Conversor local de backup JSON para SQL, útil se houver novas alterações antes da migração. |

## 1. Criar e preparar o Supabase

1. Crie um projeto para este sistema no [painel Supabase](https://supabase.com/dashboard). Guarde a senha do banco; ela não vai no site.
2. Abra **SQL Editor**, crie uma consulta, cole e execute todo o conteúdo de `supabase-privado/01_estrutura.sql`. Execute esse arquivo uma única vez em um projeto sem as tabelas `rede_*`.
3. Em outra consulta, execute `supabase-privado/02_dados.sql`. O arquivo contém os **519 registros atuais**, inclusive as duplicidades do PF24. A importação é cancelada se o destino já tiver registros ou histórico, para evitar sobrescrever trabalho existente.
4. Confira no **Table Editor**: `rede_records` deve conter 519 registros. O histórico de origem estava vazio quando esta cópia foi extraída; `rede_history` começa sem alterações.
5. A partir de agora, edições feitas neste novo sistema serão registradas em `rede_history`. O sistema anterior não se sincroniza automaticamente com este.

### Se alguém usar o site antigo antes da mudança definitiva

Combine uma pausa nas edições para fazer a troca. No site antigo, clique em **Exportar** e salve o JSON atualizado. Antes de executar `02_dados.sql`, gere uma nova versão desse SQL:

```sh
python ferramentas/gerar_importacao.py caminho/backup-atual.json supabase-privado/02_dados.sql
```

O conversor requer Python 3, sem instalar bibliotecas. Ele aceita o backup do site antigo e o desta versão; mantém registros, versões e valores antes/depois do histórico. Históricos importados ficam marcados como `migrado`: o nome anterior é preservado, mas não é tratado como uma identidade autenticada retroativa. Ele não recria contas de usuário.

Se já importou e começou a usar o novo banco, não tente sobrescrevê-lo com um backup antigo. A migração final deve ocorrer para um destino vazio ou passar por uma conciliação dos dois bancos.

## 2. Criar as contas da equipe

1. No Supabase, abra **Authentication > Users** e use a opção de adicionar/criar usuário por e-mail e senha. Confirme o e-mail ao criar a conta se essa opção aparecer, ou conclua a confirmação antes de entrar.
2. Abra `supabase-privado/03_liberar_usuario.sql`, substitua o e-mail e o nome pelos da conta que acabou de criar e execute no SQL Editor.
3. Repita para cada pessoa autorizada. Você também precisa criar e liberar sua própria conta.
4. Compartilhe as credenciais de cada pessoa individualmente. Use contas individuais para o histórico identificar quem fez a mudança.

Não há cadastro público na interface. Uma conta autenticada sem entrada ativa em `rede_members` também não consegue acessar os dados. Todas as pessoas liberadas nesta primeira versão podem consultar e editar. A administração das permissões é feita pelo dono do projeto no painel Supabase.

Para suspender alguém, mude `active` para `false` na respectiva linha de `rede_members`. As novas consultas e gravações passam a ser bloqueadas; dados já vistos ou exportados pela pessoa não podem ser recolhidos.

## 3. Ligar o site ao Supabase

No Supabase, abra **Connect** ou **Settings > API Keys** e copie:

- A URL do projeto, como `https://xxxxxxxx.supabase.co`.
- A **Publishable key**, que começa com `sb_publishable_`.

Abra `site-publico/config.js` no VS Code ou Bloco de Notas e substitua os dois valores de exemplo:

```js
window.REDE_CONFIG = {
  supabaseUrl: "https://SEU-PROJETO.supabase.co",
  supabaseKey: "sb_publishable_SUBSTITUA_AQUI"
};
```

A chave publicável fica visível no navegador por projeto. As tabelas usam RLS e as funções verificam se a conta pertence à equipe. **Não use chave `sb_secret_`, `service_role` nem a senha do banco no site.** Esta versão espera a chave publicável nova, não a chave `anon` antiga.

Se depois recompilar o código, coloque os mesmos valores em `fonte/public/config.js`, pois a compilação recria a pasta `site-publico/` a partir da fonte.

## 4. Publicar no GitHub Pages

1. Crie um repositório no GitHub, por exemplo `mapa-rede`.
2. Envie **o conteúdo de `site-publico/` para a raiz** do repositório: `index.html`, `config.js`, `favicon.svg`, `.nojekyll` e a pasta `assets/`. Preserve a pasta `assets/` e seus arquivos.
3. No repositório, abra **Settings > Pages**.
4. Em **Build and deployment > Source**, escolha **Deploy from a branch**.
5. Selecione a branch `main` e a pasta **/(root)**; salve.
6. Aguarde a publicação. Use o endereço informado pelo GitHub, normalmente `https://SEU-USUARIO.github.io/mapa-rede/`.

Os arquivos usam caminhos relativos, portanto funcionam dentro da pasta do repositório. Não é preciso GitHub Actions para esta opção de publicação. A disponibilidade do Pages para repositórios privados depende do plano da conta; os arquivos do site publicado ficam acessíveis aos visitantes. Os dados reais devem ficar somente no Supabase.

Se utilizar o site como projeto de trabalho, confirme com a empresa qual conta deve ser proprietária do repositório e do banco.

## 5. Recuperação de senha

No Supabase, vá a **Authentication > URL Configuration**:

- **Site URL:** informe a URL completa publicada, incluindo `/mapa-rede/` quando existir.
- **Redirect URLs:** adicione essa mesma URL para autorizar o retorno do e-mail de recuperação.

O botão **Esqueci minha senha** envia um link. Ao abrir o link, a página permite definir uma nova senha. A entrega de e-mails depende da configuração e dos limites do serviço de e-mail do seu projeto; configure SMTP para o envio à equipe conforme necessário. O login por senha de contas já criadas não depende desse envio.

## 6. Conferir antes de usar em equipe

1. Entre com sua conta liberada e confira os 519 registros.
2. Consulte `PF24` na aba Switches: as duas ocorrências do switch continuam presentes. As abas mantêm seus próprios valores, inclusive diferenças; uma edição não altera automaticamente outra aba.
3. Faça uma alteração de teste em um registro, informe o motivo e confira o histórico. Se restaurar o valor depois, a restauração também fica registrada.
4. Entre com outra conta liberada e confirme a consulta e a edição. Uma alteração feita por uma pessoa aparece para as outras na atualização seguinte, a cada 30 segundos, ou pelo botão **Atualizar**.
5. Se duas pessoas abrirem o mesmo registro e tentarem salvar, a segunda gravação com versão antiga será bloqueada. Feche, atualize e revise os dados.
6. Teste o acesso em janela anônima: antes de entrar, só deve aparecer a tela de login. Uma conta não liberada não pode consultar a rede.
7. Use **Exportar** para baixar dados e histórico em JSON. Guarde backups fora do repositório público.

O responsável das novas alterações é obtido no banco a partir da conta autenticada; não é um nome livre digitado na tela. O histórico não pode ser alterado ou apagado pelas contas da equipe via aplicativo. O administrador do banco ainda possui acesso administrativo.

## Editar o código no futuro

Instale Node.js 22.13 ou superior e, dentro de `fonte/`, execute:

```sh
npm ci
npm run dev
```

Depois das alterações:

```sh
npm run build
```

O resultado estará em `site-publico/`; envie os arquivos atualizados ao mesmo repositório. Para validar as regras do banco em PostgreSQL local embarcado:

```sh
npm run test:database
```

Os testes usam contas e registros fictícios. Cobrem bloqueio de anônimos e de contas não liberadas, RLS, autoria, escrita e histórico atômicos, repetição segura de pedidos, conflito de versão e revogação. A conexão com seu projeto Supabase e os e-mails precisam ser conferidos depois da configuração; este pacote não contém credenciais da sua conta.

## Referências oficiais

- [GitHub: configurar a origem de publicação do Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [Supabase: chaves de API](https://supabase.com/docs/guides/getting-started/api-keys)
- [Supabase: Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase: funções de banco](https://supabase.com/docs/guides/database/functions)
- [Supabase: autenticação com senha](https://supabase.com/docs/guides/auth/passwords)
