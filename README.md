# Mania de Aromas — site + loja + painel (Node, Express, SQLite)
## Windows 11
1. Instale o Node.js LTS (nodejs.org). 2. Abra esta pasta no VS Code (terminal: Ctrl+`).
3. `npm install`  4. Copie `.env.example` para `.env` e defina `SESSION_SECRET`, `ADMIN_EMAIL` e `ADMIN_PASSWORD` (10+ caracteres).
5. `npm start` (cria o banco em `data/mania.db` e o administrador na 1ª execução; depois apague `ADMIN_PASSWORD` do `.env`).
6. Site: http://localhost:3000 — Painel: http://localhost:3000/#/admin
## Regras
- O estoque é baixado ao registrar o pedido (transação) e devolvido ao cancelar.
- O pedido nasce "aguardando atendimento"; abrir o WhatsApp não confirma nem paga.
- Configure o WhatsApp em Painel › Loja (sem ele o pedido é recusado).
## Backup
Pare o servidor e copie `data/mania.db` e `public/uploads/`. Para restaurar, coloque-os de volta.


## Atualizações do sistema
- Cadastro de produtos com imagem principal e segunda imagem (JPG, PNG ou WebP).
- Marque produtos como destaque no painel; a Home alterna automaticamente os destaques em carrossel, com duas imagens por produto.
- Painel Resumo mostra unidades vendidas, faturamento dos últimos 30 dias e desempenho por produto.
- Checkout registra a forma de pagamento escolhida: dinheiro, Pix, cartão de crédito, cartão de débito ou boleto. O pedido continua sendo confirmado com a loja pelo WhatsApp; não há cobrança automática nem emissão de boleto bancário.
- Interface atualizada com Manrope e Playfair Display.

## Deploy
1. Use Node.js LTS.
2. Na pasta do projeto, execute `npm install` e configure as variáveis do `.env` conforme `.env.example`.
3. Execute `npm start`.
4. O banco SQLite existente é migrado automaticamente na inicialização para incluir as novas colunas. Faça backup de `data/mania.db` e `public/uploads/` antes de atualizar.
