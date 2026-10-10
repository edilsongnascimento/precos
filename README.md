# Consulta de preços

Aplicativo estático para consultar produtos armazenados no Supabase por nome, código ou código de barras. A busca aceita várias palavras em qualquer ordem, e o ícone de câmera abre a leitura do código de barras.

## Configurar o Supabase

1. No painel do projeto, abra **SQL Editor**, cole o conteúdo de [`supabase.sql`](./supabase.sql) e execute. O script usa a tabela existente `public.produtos` (`id`, `"Nome"`, `codigo`, `codigo_barras`, `preco`) e carrega o catálogo inicial. Produtos com código correspondente são atualizados; os que ainda não existem são inseridos. O script não altera políticas, permissões nem apaga linhas.
2. Publique o site. A configuração do projeto e a chave publishable ficam em [`supabase-config.js`](./supabase-config.js).

A chave `sb_publishable_` é própria para uso no navegador. Não coloque chaves `secret` ou `service_role` nesse arquivo. As alterações feitas pelo site são autorizadas pelas políticas RLS do Supabase.

## Configurar o painel administrativo

O link **Acessar painel administrativo** no rodapé abre [`admin.html`](./admin.html). O painel permite cadastrar, editar, pesquisar e excluir produtos usando uma conta de administrador do Supabase.

1. No painel do Supabase, abra **Authentication > Users** e crie o usuário administrador com e-mail e senha. Não habilite cadastro público de usuários.
2. Execute [`supabase-admin.sql`](./supabase-admin.sql) no **SQL Editor**. Esse script exige que `public.produtos` já exista. Ele habilita RLS e substitui as políticas existentes dessa tabela por leitura pública e escrita exclusiva de administradores; isso pode afetar outros clientes que usem a tabela.
3. Autorize a conta criada usando o e-mail exato do usuário (substitua `admin@seudominio.com` pelo e-mail cadastrado). O comando busca o UUID diretamente no Supabase, então não é necessário copiar nem digitar um UUID:

   ```sql
   insert into public.admin_users (user_id)
   select id
   from auth.users
   where email = 'admin@seudominio.com'
   on conflict (user_id) do nothing;
   ```

   Confirme que o acesso foi registrado:

   ```sql
   select users.email
   from public.admin_users as admins
   join auth.users as users on users.id = admins.user_id;
   ```

4. Publique o site novamente. Entre em `admin.html` usando o e-mail e a senha criados no primeiro passo.

O painel valida a permissão de administrador no banco. Mesmo que alguém abra a página sem autorização, as políticas RLS impedem alterações. A sessão fica apenas na memória da página e termina ao sair ou fechar a aba.

A leitura pela câmera requer HTTPS (ou `localhost`) e permissão de acesso à câmera. Usa a API nativa do navegador quando disponível e carrega o leitor ZXing como alternativa; essa alternativa precisa de conexão à internet. Ao reconhecer o código, o leitor fecha e a busca é preenchida automaticamente. O ZXing é distribuído sob licença MIT: [@zxing/browser](https://github.com/zxing-js/browser).

## Publicar no GitHub Pages

1. Crie um repositório no GitHub e envie os arquivos deste projeto para a branch `main` ou `master`.
2. No repositório, abra **Settings > Pages** e selecione **GitHub Actions** como origem da publicação.
3. O workflow em `.github/workflows/pages.yml` publica o site automaticamente após cada envio para `main` ou `master`. Também é possível iniciar a publicação manualmente pela aba **Actions**.

O endereço do site será exibido na execução concluída do workflow e nas configurações do GitHub Pages.

## Atualizar produtos

Após a carga inicial pelo SQL, gerencie os produtos pelo painel administrativo ou em **Table Editor > produtos** no Supabase. Cada linha usa estes campos:

```json
{
  "id": 1,
  "Nome": "Nome do produto",
  "codigo": "001245",
  "codigo_barras": "7891234567890",
  "preco": 25.90
}
```

O campo `codigo_barras` pode ficar vazio quando o produto não tiver código de barras. Como o site permite leitura pública, os preços cadastrados ficarão visíveis para qualquer pessoa com acesso ao endereço.
