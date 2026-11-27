# Mania de Aromas

Sistema web de loja e painel administrativo desenvolvido com Node.js, Express e SQLite.

## Requisitos
- Node.js 18 ou superior
- npm

## Instalação (Windows / VS Code)
1. Abra a pasta do projeto no VS Code.
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Copie `.env.example` para `.env`.
4. Edite o `.env` e defina uma chave `SESSION_SECRET`, `ADMIN_EMAIL` e `ADMIN_PASSWORD` próprios.
5. Inicie:
   ```bash
   npm start
   ```
6. Acesse `http://localhost:3000`.

## Segurança e arquivos locais
Por segurança, este repositório não inclui `.env`, banco SQLite, imagens de uploads nem `node_modules`.
O banco e as pastas locais são criados/gerenciados pela aplicação conforme a configuração.

**Nunca publique senhas, tokens, dados de clientes ou o banco de produção no GitHub.**
