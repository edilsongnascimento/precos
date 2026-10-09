# Consulta de preços

Aplicativo estático para consultar os produtos cadastrados em `produtos.json` por nome, código ou código de barras.

## Publicar no GitHub Pages

1. Crie um repositório no GitHub e envie os arquivos deste projeto para a branch `main` ou `master`.
2. No repositório, abra **Settings > Pages** e selecione **GitHub Actions** como origem da publicação.
3. O workflow em `.github/workflows/pages.yml` publica o site automaticamente após cada envio para `main` ou `master`. Também é possível iniciar a publicação manualmente pela aba **Actions**.

O endereço do site será exibido na execução concluída do workflow e nas configurações do GitHub Pages.

## Atualizar produtos

Edite `produtos.json` e envie a alteração para o GitHub. Cada produto usa este formato:

```json
{
  "codigo": "001245",
  "nome": "Nome do produto",
  "barcode": "7891234567890",
  "preco": 25.90
}
```

O campo `barcode` pode ser uma string vazia quando o produto não tiver código de barras na tabela. Como o site e esse arquivo serão públicos, os preços cadastrados ficarão visíveis para qualquer pessoa com acesso ao endereço.
