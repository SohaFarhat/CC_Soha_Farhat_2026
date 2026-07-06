DROP DATABASE IF EXISTS sistema_venda_simples;

CREATE DATABASE IF NOT EXISTS sistema_venda_simples
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE sistema_venda_simples;

CREATE TABLE IF NOT EXISTS paises (
  id_pais INT NOT NULL AUTO_INCREMENT,
  pais VARCHAR(60) NOT NULL,
  sigla VARCHAR(3) NOT NULL,
  data_inclusao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  data_alteracao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_pais),
  UNIQUE KEY uk_pais (pais)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS estados (
  id_estado INT NOT NULL AUTO_INCREMENT,
  estado VARCHAR(50) NOT NULL,
  uf CHAR(2) NOT NULL,
  id_pais INT NOT NULL,
  data_inclusao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  data_alteracao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_estado),
  UNIQUE KEY uk_uf (uf),
  INDEX idx_pais (id_pais),
  CONSTRAINT fk_estado_pais 
    FOREIGN KEY (id_pais) REFERENCES paises (id_pais)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cidades (
  id_cidade INT NOT NULL AUTO_INCREMENT,
  cidade VARCHAR(60) NOT NULL,
  ddd VARCHAR(5) NULL,
  codigo_ibge VARCHAR(7) DEFAULT NULL,
  id_estado INT NOT NULL,
  data_cadastro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  data_alteracao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_cidade),
  UNIQUE KEY uk_cidade_estado (cidade, id_estado),
  INDEX idx_estado (id_estado),
  CONSTRAINT fk_cidade_estado 
    FOREIGN KEY (id_estado) REFERENCES estados (id_estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cargos (
  id_cargo INT AUTO_INCREMENT PRIMARY KEY,
  cargo VARCHAR(80) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS condicoes_pagamento (
  id_condicao_pagamento INT AUTO_INCREMENT PRIMARY KEY,
  descricao VARCHAR(80) NOT NULL UNIQUE,
  parcelas INT NOT NULL DEFAULT 1,
  ativo TINYINT(1) NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS condicoes_pagamento_parcelas (
  id_parcela_condicao INT AUTO_INCREMENT PRIMARY KEY,
  id_condicao_pagamento INT NOT NULL,
  numero_parcela INT NOT NULL,
  dias INT NOT NULL,
  percentual DECIMAL(10,2) NOT NULL,
  forma_pagamento VARCHAR(80) NOT NULL,
  FOREIGN KEY (id_condicao_pagamento) REFERENCES condicoes_pagamento(id_condicao_pagamento)
  ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS formas_pagamento (
  id_forma_pagamento INT AUTO_INCREMENT PRIMARY KEY,
  forma_pagamento VARCHAR(80) NOT NULL UNIQUE,
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  data_cadastro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  data_alteracao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categorias (
  id_categoria INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(80) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS clientes (
  id_cliente INT AUTO_INCREMENT PRIMARY KEY,
  tipo VARCHAR(30),
  cliente VARCHAR(50) NOT NULL,
  apelido VARCHAR(30),
  data_nascimento DATE,
  cpf_cnpj VARCHAR(18),
  rg VARCHAR(20),
  email VARCHAR(80),
  celular VARCHAR(20),
  endereco VARCHAR(80),
  numero VARCHAR(20),
  complemento VARCHAR(120),
  bairro VARCHAR(40),
  id_cidade INT,
  cep VARCHAR(12),
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  genero VARCHAR(30),
  id_condicao_pagamento INT,
  limite_credito DECIMAL(10,2) NOT NULL DEFAULT 0.00,

  data_cadastro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  data_ultima_alteracao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  usuario_alteracao VARCHAR(80) DEFAULT NULL,

  CONSTRAINT fk_cliente_cidade
    FOREIGN KEY (id_cidade) REFERENCES cidades(id_cidade),

  CONSTRAINT fk_cliente_condicao_pagamento
    FOREIGN KEY (id_condicao_pagamento) REFERENCES condicoes_pagamento(id_condicao_pagamento)
);

CREATE TABLE IF NOT EXISTS fornecedores (
  id_fornecedor INT AUTO_INCREMENT PRIMARY KEY,
  tipo VARCHAR(30),
  fornecedor VARCHAR(50) NOT NULL,
  apelido VARCHAR(30),
  data_nascimento DATE,
  cpf_cnpj VARCHAR(18),
  rg VARCHAR(20),
  email VARCHAR(80),
  celular VARCHAR(20),
  endereco VARCHAR(80),
  numero VARCHAR(20),
  complemento VARCHAR(120),
  bairro VARCHAR(40),
  id_cidade INT,
  cep VARCHAR(12),
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  genero VARCHAR(30),
  id_condicao_pagamento INT,
  limite_credito DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  data_cadastro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  data_ultima_alteracao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  usuario_alteracao VARCHAR(80) DEFAULT NULL,
  
  CONSTRAINT fk_fornecedor_cidade
    FOREIGN KEY (id_cidade) REFERENCES cidades(id_cidade),
  CONSTRAINT fk_fornecedor_condicao_pagamento
    FOREIGN KEY (id_condicao_pagamento) REFERENCES condicoes_pagamento(id_condicao_pagamento)
);

CREATE TABLE IF NOT EXISTS funcionarios (
  id_funcionario INT AUTO_INCREMENT PRIMARY KEY,
  tipo VARCHAR(30),
  funcionario VARCHAR(50) NOT NULL,
  apelido VARCHAR(30),
  data_nascimento DATE,
  cpf VARCHAR(14),
  rg VARCHAR(20),
  cnh VARCHAR(30),
  carteira_trabalho VARCHAR(40),
  email VARCHAR(80),
  celular VARCHAR(20),
  endereco VARCHAR(80),
  numero VARCHAR(20),
  complemento VARCHAR(120),
  bairro VARCHAR(40),
  id_cidade INT,
  cep VARCHAR(12),
  id_cargo INT,
  salario DECIMAL(10,2) DEFAULT 0.00,
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  genero VARCHAR(30),
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  data_cadastro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  data_ultima_alteracao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  usuario_alteracao VARCHAR(80) DEFAULT NULL,

  CONSTRAINT fk_funcionario_cidade
    FOREIGN KEY (id_cidade) REFERENCES cidades(id_cidade),
  CONSTRAINT fk_funcionario_cargo
    FOREIGN KEY (id_cargo) REFERENCES cargos(id_cargo)
);

CREATE TABLE IF NOT EXISTS produtos (
  id_produto INT AUTO_INCREMENT PRIMARY KEY,
  produto VARCHAR(40) NOT NULL,
  marca VARCHAR(100) NULL,
  custo DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  preco DECIMAL(10,2) NOT NULL,
  estoque INT NOT NULL DEFAULT 0,
  unidade VARCHAR(3) NOT NULL DEFAULT 'UN',
  id_categoria INT,
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  data_cadastro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  data_ultima_alteracao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  usuario_alteracao VARCHAR(80) DEFAULT NULL,

  CONSTRAINT fk_produto_categoria
    FOREIGN KEY (id_categoria) REFERENCES categorias(id_categoria)
);

CREATE TABLE IF NOT EXISTS vendas (
  id_venda INT AUTO_INCREMENT PRIMARY KEY,
  id_cliente INT NULL,
  id_funcionario INT NULL,
  forma_pagamento VARCHAR(80),
  id_condicao_pagamento INT NULL,
  condicao_pagamento VARCHAR(80),
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  desconto_percentual DECIMAL(5,2) NOT NULL DEFAULT 0,
  desconto DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  recebido DECIMAL(10,2) NOT NULL DEFAULT 0,
  troco DECIMAL(10,2) NOT NULL DEFAULT 0,
  data_venda DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_venda_cliente
    FOREIGN KEY (id_cliente)
    REFERENCES clientes(id_cliente),

  CONSTRAINT fk_venda_funcionario
    FOREIGN KEY (id_funcionario)
    REFERENCES funcionarios(id_funcionario),

  CONSTRAINT fk_venda_condicao_pagamento
    FOREIGN KEY (id_condicao_pagamento)
    REFERENCES condicoes_pagamento(id_condicao_pagamento)
);

CREATE TABLE IF NOT EXISTS venda_itens (
  id_item INT AUTO_INCREMENT PRIMARY KEY,
  id_venda INT NOT NULL,
  id_produto INT NOT NULL,
  quantidade INT NOT NULL,
  preco_unitario DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,

  data_cadastro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  data_ultima_alteracao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  usuario_alteracao VARCHAR(80) DEFAULT NULL,

  CONSTRAINT fk_item_venda
    FOREIGN KEY (id_venda) REFERENCES vendas(id_venda)
    ON DELETE CASCADE,
  CONSTRAINT fk_item_produto
    FOREIGN KEY (id_produto) REFERENCES produtos(id_produto)
);

CREATE TABLE IF NOT EXISTS unidades (
  id_unidade INT AUTO_INCREMENT PRIMARY KEY,
  unidade VARCHAR(10) NOT NULL UNIQUE,
  descricao VARCHAR(80) NOT NULL,
  ativo TINYINT(1) NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS parcelas (
  id_parcela INT AUTO_INCREMENT PRIMARY KEY,
  descricao VARCHAR(80) NOT NULL,
  quantidade INT NOT NULL DEFAULT 1,
  ativo TINYINT(1) NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS marcas (
  id_marca INT AUTO_INCREMENT PRIMARY KEY,
  marca VARCHAR(100) NOT NULL UNIQUE,
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  data_cadastro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  data_alteracao DATETIME NULL ON UPDATE CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS trg_baixar_estoque_venda;

DELIMITER $$
CREATE TRIGGER trg_baixar_estoque_venda
AFTER INSERT ON venda_itens
FOR EACH ROW
BEGIN
  UPDATE produtos
     SET estoque = estoque - NEW.quantidade
   WHERE id_produto = NEW.id_produto;
END$$
DELIMITER ;

INSERT IGNORE INTO paises (id_pais, pais, sigla) VALUES
(1, 'Brasil', 'BR');

INSERT IGNORE INTO estados (id_estado, estado, uf, id_pais) VALUES
(1, 'Acre', 'AC', 1),
(2, 'Alagoas', 'AL', 1),
(3, 'Amapá', 'AP', 1),
(4, 'Amazonas', 'AM', 1),
(5, 'Bahia', 'BA', 1),
(6, 'Ceará', 'CE', 1),
(7, 'Distrito Federal', 'DF', 1),
(8, 'Espírito Santo', 'ES', 1),
(9, 'Goiás', 'GO', 1),
(10, 'Maranhão', 'MA', 1),
(11, 'Mato Grosso', 'MT', 1),
(12, 'Mato Grosso do Sul', 'MS', 1),
(13, 'Minas Gerais', 'MG', 1),
(14, 'Pará', 'PA', 1),
(15, 'Paraíba', 'PB', 1),
(16, 'Paraná', 'PR', 1),
(17, 'Pernambuco', 'PE', 1),
(18, 'Piauí', 'PI', 1),
(19, 'Rio de Janeiro', 'RJ', 1),
(20, 'Rio Grande do Norte', 'RN', 1),
(21, 'Rio Grande do Sul', 'RS', 1),
(22, 'Rondônia', 'RO', 1),
(23, 'Roraima', 'RR', 1),
(24, 'Santa Catarina', 'SC', 1),
(25, 'São Paulo', 'SP', 1),
(26, 'Sergipe', 'SE', 1),
(27, 'Tocantins', 'TO', 1);

INSERT IGNORE INTO cidades (cidade, codigo_ibge, id_estado) VALUES
('São Paulo', '3550308', 25),
('Rio de Janeiro', '3304557', 19),
('Belo Horizonte', '3106200', 13);

INSERT IGNORE INTO cargos (cargo) VALUES
('Administrador'),
('Gerente'),
('Vendedor'),
('Operador de Caixa'),
('Estoquista');

INSERT IGNORE INTO condicoes_pagamento (descricao, parcelas, ativo) VALUES
('À vista', 1, 1),
('2x', 2, 1),
('3x', 3, 1),
('4x', 4, 1),
('5x', 5, 1),
('6x', 6, 1),
('12x', 12, 1),
('30 dias', 1, 1),
('30/60 dias', 2, 1),
('30/60/90 dias', 3, 1);

INSERT IGNORE INTO categorias (nome) VALUES
('Papelaria'),
('Material escolar'),
('Eletrônicos');

INSERT IGNORE INTO unidades (unidade, descricao, ativo) VALUES
('UN', 'Unidade', 1),
('CX', 'Caixa', 1),
('KG', 'Quilo', 1),
('LT', 'Litro', 1),
('MT', 'Metro', 1),
('PC', 'Peça', 1);

INSERT IGNORE INTO parcelas (descricao, quantidade, ativo) VALUES
('À vista', 1, 1),
('2 parcelas', 2, 1),
('3 parcelas', 3, 1),
('4 parcelas', 4, 1),
('5 parcelas', 5, 1),
('6 parcelas', 6, 1);

INSERT INTO marcas (marca, ativo) VALUES
('SEM MARCA', 1);

INSERT IGNORE INTO formas_pagamento (forma_pagamento, ativo) VALUES
('DINHEIRO', 1),
('PIX', 1),
('CARTÃO DE DÉBITO', 1),
('CARTÃO DE CRÉDITO', 1),
('BOLETO BANCÁRIO', 1),
('TRANSFERÊNCIA BANCÁRIA', 1);