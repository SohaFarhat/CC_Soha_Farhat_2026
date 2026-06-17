# Sistema Kaneko Web — Sistema de Vendas Simples

Sistema de gerenciamento de vendas desenvolvido com HTML, CSS, JavaScript e Node.js + Express, integrado a banco de dados MySQL.

---

## Funcionalidades

- **Vendas** — registro de pedidos com carrinho, formas e condições de pagamento
- **Produtos** — cadastro com preço, estoque e categorias
- **Clientes** — cadastro completo com CPF/CNPJ, endereço e limite de crédito
- **Fornecedores** — gestão de fornecedores com dados fiscais e condições
- **Funcionários** — cadastro de colaboradores com cargo e salário
- **Localização** — países, estados e cidades com código IBGE
- **Dashboard** — resumo de vendas e métricas de estoque
- **Histórico** — visualização e limpeza do histórico de vendas

---

## Tecnologias

| Camada      | Tecnologia                        |
|-------------|-----------------------------------|
| Frontend    | HTML5, CSS3, JavaScript (Vanilla) |
| Backend     | Node.js, Express.js               |
| Banco       | MySQL 8.0+                        |
| Driver DB   | mysql2                            |
| Outros      | cors, dotenv                      |

---

## Pré-requisitos

- [Node.js](https://nodejs.org/) v18+
- [MySQL](https://www.mysql.com/) 8.0+
- Extensão **Live Server** no VS Code (ou qualquer servidor HTTP estático)

---

## Instalação e Configuração

### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/SistemaKaneko_Web.git
cd SistemaKaneko_Web
```

### 2. Configure o banco de dados

Abra o MySQL Workbench (ou outro cliente) e execute o script de criação do banco:

```bash
mysql -u root -p < schema_mysql_workbench.sql
```

Para atualizar um banco existente sem apagar dados:

```bash
mysql -u root -p < schema_mysql_migracao_sem_apagar.sql
```

### 3. Configure as variáveis de ambiente do backend

```bash
cd backend
cp .env.example .env
```

Edite o arquivo `.env` com suas credenciais MySQL:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=sua_senha
DB_NAME=sistema_venda_simples
DB_PORT=3306
PORT=3000
```

### 4. Instale as dependências e inicie o servidor

```bash
cd backend
npm install
node server.js
```

O servidor estará disponível em `http://localhost:3000`.

### 5. Abra o frontend

Abra o arquivo `index.html` com o **Live Server** do VS Code (porta padrão configurada: `5501`), ou sirva com qualquer servidor HTTP.

---

## Estrutura do Projeto

```
SistemaKaneko_Web/
├── index.html                           # Interface principal
├── script.js                            # Lógica do frontend
├── style.css                            # Estilos
├── schema_mysql_workbench.sql           # Schema completo do banco
├── schema_mysql_migracao_sem_apagar.sql # Script de migração
├── .gitignore
├── README.md
└── backend/
    ├── server.js                        # API Express (porta 3000)
    ├── package.json
    ├── .env.example                     # Template de variáveis de ambiente
    └── .env                             # NÃO commitado — credenciais locais
```

---

## API — Endpoints

Base URL: `http://localhost:3000/api`

| Método | Rota                          | Descrição                    |
|--------|-------------------------------|------------------------------|
| GET    | `/`                           | Status da API                |
| GET    | `/api/teste-banco`            | Testa conexão com o banco    |
| GET    | `/api/produtos`               | Lista produtos               |
| POST   | `/api/produtos`               | Cria produto                 |
| PUT    | `/api/produtos/:codigo`       | Atualiza produto             |
| DELETE | `/api/produtos/:codigo`       | Remove produto               |
| GET    | `/api/clientes`               | Lista clientes               |
| POST   | `/api/clientes`               | Cria cliente                 |
| GET    | `/api/vendas`                 | Lista vendas com itens       |
| POST   | `/api/vendas`                 | Registra nova venda          |
| DELETE | `/api/historico`              | Limpa histórico de vendas    |

> Os mesmos padrões GET/POST/PUT/DELETE se aplicam a: `fornecedores`, `funcionarios`, `categorias`, `cargos`, `condicoes_pagamento`, `paises`, `estados`, `cidades`.

---

## Banco de Dados — Tabelas

| Tabela               | Descrição                        |
|----------------------|----------------------------------|
| `paises`             | Países                           |
| `estados`            | Estados (com UF)                 |
| `cidades`            | Cidades (com código IBGE)        |
| `cargos`             | Cargos/funções                   |
| `condicoes_pagamento`| Condições de pagamento           |
| `categorias`         | Categorias de produtos           |
| `produtos`           | Produtos com preço e estoque     |
| `clientes`           | Clientes                         |
| `fornecedores`       | Fornecedores                     |
| `funcionarios`       | Funcionários                     |
| `vendas`             | Cabeçalho das vendas             |
| `venda_itens`        | Itens de cada venda              |

---

## Segurança

> **Atenção:** O sistema de login atual é do lado do cliente (frontend), adequado apenas para demonstração.  
> Para uso em produção, implemente autenticação no backend com JWT ou sessões seguras.

---

## Licença

Este projeto é de uso acadêmico/pessoal. Consulte o autor para uso comercial.
