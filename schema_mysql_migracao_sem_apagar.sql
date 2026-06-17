USE sistema_venda_simples;

-- Ajusta a tabela de cargos, caso ela tenha sido criada com a coluna antiga "nome".
SET @existe_nome_cargo = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'cargos'
    AND COLUMN_NAME = 'nome'
);

SET @sql_cargo = IF(
  @existe_nome_cargo > 0,
  'ALTER TABLE cargos CHANGE COLUMN nome cargo VARCHAR(80) NOT NULL UNIQUE',
  'SELECT "Tabela cargos já está correta" AS mensagem'
);

PREPARE stmt FROM @sql_cargo;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Garante que a tabela de categorias exista.
CREATE TABLE IF NOT EXISTS categorias (
  id_categoria INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(80) NOT NULL UNIQUE
);

-- Garante que a tabela produtos tenha id_categoria.
SET @existe_id_categoria = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'produtos'
    AND COLUMN_NAME = 'id_categoria'
);

SET @sql_produto_categoria = IF(
  @existe_id_categoria = 0,
  'ALTER TABLE produtos ADD COLUMN id_categoria INT NULL',
  'SELECT "Coluna id_categoria já existe em produtos" AS mensagem'
);

PREPARE stmt FROM @sql_produto_categoria;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Garante que a chave estrangeira de produtos para categorias exista.
SET @existe_fk_produto_categoria = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'produtos'
    AND CONSTRAINT_NAME = 'fk_produto_categoria'
);

SET @sql_fk_produto_categoria = IF(
  @existe_fk_produto_categoria = 0,
  'ALTER TABLE produtos ADD CONSTRAINT fk_produto_categoria FOREIGN KEY (id_categoria) REFERENCES categorias(id_categoria)',
  'SELECT "Chave fk_produto_categoria já existe" AS mensagem'
);

PREPARE stmt FROM @sql_fk_produto_categoria;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Categorias iniciais.
INSERT IGNORE INTO categorias (nome) VALUES
('Papelaria'),
('Material escolar'),
('Eletrônicos');
