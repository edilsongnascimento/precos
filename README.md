# Consulta de preços

Aplicativo estático para consultar produtos armazenados no Supabase por nome, código ou código de barras.

## Configurar o Supabase

1. No painel do projeto, abra **SQL Editor**, cole o conteúdo de [`supabase.sql`](./supabase.sql) e execute. O script usa a tabela existente `public.produtos` (`id`, `"Nome"`, `codigo`, `codigo_barras`, `preco`) e carrega o catálogo inicial. Produtos com código correspondente são atualizados; os que ainda não existem são inseridos. O script não altera políticas, permissões nem apaga linhas.
2. Publique o site. A configuração do projeto e a chave publishable ficam em [`supabase-config.js`](./supabase-config.js).

A chave `sb_publishable_` é própria para uso no navegador. Não coloque chaves `secret` ou `service_role` nesse arquivo. Cadastros e alterações devem ser feitos no painel do Supabase.

## Publicar no GitHub Pages

1. Crie um repositório no GitHub e envie os arquivos deste projeto para a branch `main` ou `master`.
2. No repositório, abra **Settings > Pages** e selecione **GitHub Actions** como origem da publicação.
3. O workflow em `.github/workflows/pages.yml` publica o site automaticamente após cada envio para `main` ou `master`. Também é possível iniciar a publicação manualmente pela aba **Actions**.

O endereço do site será exibido na execução concluída do workflow e nas configurações do GitHub Pages.

## Atualizar produtos

Após a carga inicial pelo SQL, gerencie os produtos em **Table Editor > produtos** no Supabase. Cada linha usa estes campos:

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
