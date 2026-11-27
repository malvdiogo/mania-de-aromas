# Mania de Aromas — prévia estática

Esta pasta contém uma prévia visual independente do sistema Node.js/SQLite.

## Publicar no GitHub Pages
1. Copie `index.html` e a pasta `preview-assets/` para a raiz do repositório GitHub.
2. No GitHub, abra Settings → Pages.
3. Em Build and deployment, selecione Deploy from a branch.
4. Escolha `main` e `/ (root)`, depois Save.
5. Aguarde a publicação e abra o endereço mostrado pelo GitHub Pages.

A prévia usa dados de catálogo copiados do banco no momento da geração. Não consulta o SQLite nem atualiza automaticamente com a loja.

## Limitações
- Não possui carrinho funcional, checkout, pedidos, login ou painel administrativo.
- Não altera estoque e não grava dados.
- Para operações reais, utilize a aplicação completa hospedada na Railway.

## Segurança
Não publique `.env`, credenciais, banco SQLite ou dados privados no repositório público.
