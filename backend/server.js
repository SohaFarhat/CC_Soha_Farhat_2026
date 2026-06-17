require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();

app.use(cors());
app.use(express.json());

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'sistema_venda_simples',
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

function toNull(value) {
  return value === undefined || value === null || value === '' ? null : value;
}

function toNumberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function toMoney(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function normalizarUnidade(value) {
  const unidade = String(value || 'UN').trim().toUpperCase();
  return unidade ? unidade.slice(0, 3) : 'UN';
}

async function obterOuCriarCategoria(conexao, categoria) {
  if (!categoria || !categoria.trim()) {
    return null;
  }

  const nomeCategoria = categoria.trim();

  await conexao.query(
    'INSERT IGNORE INTO categorias (nome) VALUES (?)',
    [nomeCategoria]
  );

  const [linhas] = await conexao.query(
    'SELECT id_categoria FROM categorias WHERE nome = ?',
    [nomeCategoria]
  );

  return linhas[0]?.id_categoria || null;
}

app.get('/', (_req, res) => {
  res.json({ mensagem: 'API do Sistema de Vendas Simples funcionando.' });
});

app.get('/api', (_req, res) => {
  res.json({
    mensagem: 'API do Sistema de Vendas Simples funcionando.',
    rotas: [
      '/api/teste-banco',
      '/api/produtos',
      '/api/clientes',
      '/api/fornecedores',
      '/api/funcionarios',
      '/api/paises',
      '/api/estados',
      '/api/cidades',
      '/api/cargos',
      '/api/condicoes-pagamento',
      '/api/categorias',
      '/api/vendas'
    ]
  });
});

app.get('/api/teste-banco', async (_req, res) => {
  try {
    const [linhas] = await pool.query('SELECT NOW() AS dataServidor');
    res.json({ conectado: true, dataServidor: linhas[0].dataServidor });
  } catch (erro) {
    res.status(500).json({ conectado: false, erro: erro.message });
  }
});

/* =========================
   LISTAS AUXILIARES
   ========================= */

app.get('/api/paises', async (_req, res) => {
  try {
    const [linhas] = await pool.query(`
      SELECT id_pais AS codigo, pais, sigla
      FROM paises
      ORDER BY pais
    `);
    res.json(linhas);
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

app.post('/api/paises', async (req, res) => {
  const { pais, sigla } = req.body;
  if (!pais) return res.status(400).json({ erro: 'Informe o país.' });

  try {
    const [resultado] = await pool.query(
      'INSERT INTO paises (pais, sigla) VALUES (?, ?)',
      [pais, sigla || '']
    );
    res.status(201).json({ codigo: resultado.insertId, pais, sigla });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

app.put('/api/paises/:codigo', async (req, res) => {
  const { pais, sigla } = req.body;
  try {
    await pool.query(
      'UPDATE paises SET pais = ?, sigla = ? WHERE id_pais = ?',
      [pais, sigla || '', req.params.codigo]
    );
    res.json({ mensagem: 'País atualizado com sucesso.' });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

app.delete('/api/paises/:codigo', async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM paises WHERE id_pais = ?',
      [req.params.codigo]
    );

    res.json({
      mensagem: 'País excluído com sucesso.'
    });
  } catch (erro) {
    res.status(500).json({
      erro: erro.message
    });
  }
});

app.get('/api/estados', async (_req, res) => {
  try {
    const [linhas] = await pool.query(`
      SELECT
        e.id_estado AS codigo,
        e.estado,
        e.uf,
        e.id_pais AS idPais,
        p.pais
      FROM estados e
      INNER JOIN paises p ON p.id_pais = e.id_pais
      ORDER BY e.estado
    `);
    res.json(linhas);
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

app.post('/api/estados', async (req, res) => {
  const { estado, uf, idPais } = req.body;
  if (!estado || !uf || !idPais) {
    return res.status(400).json({ erro: 'Informe país, estado e UF.' });
  }

  try {
    const [resultado] = await pool.query(
      'INSERT INTO estados (estado, uf, id_pais) VALUES (?, ?, ?)',
      [estado, uf, idPais]
    );
    res.status(201).json({ codigo: resultado.insertId, estado, uf, idPais });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

app.put('/api/estados/:codigo', async (req, res) => {
  const { estado, uf, idPais } = req.body;
  try {
    await pool.query(
      'UPDATE estados SET estado = ?, uf = ?, id_pais = ? WHERE id_estado = ?',
      [estado, uf, idPais, req.params.codigo]
    );
    res.json({ mensagem: 'Estado atualizado com sucesso.' });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

app.delete('/api/estados/:codigo', async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM estados WHERE id_estado = ?',
      [req.params.codigo]
    );

    res.json({
      mensagem: 'Estado excluído com sucesso.'
    });
  } catch (erro) {
    res.status(500).json({
      erro: erro.message
    });
  }
});

app.get('/api/cidades', async (_req, res) => {
  try {
    const [linhas] = await pool.query(`
      SELECT
        c.id_cidade AS codigo,
        c.cidade,
        c.codigo_ibge AS codigoIbge,
        c.id_estado AS idEstado,
        e.estado,
        e.uf,
        e.id_pais AS idPais,
        p.pais
      FROM cidades c
      INNER JOIN estados e ON e.id_estado = c.id_estado
      INNER JOIN paises p ON p.id_pais = e.id_pais
      ORDER BY c.cidade
    `);
    res.json(linhas);
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

app.post('/api/cidades', async (req, res) => {
  const { cidade, codigoIbge, idEstado } = req.body;
  if (!cidade || !idEstado) {
    return res.status(400).json({ erro: 'Informe estado e cidade.' });
  }

  try {
    const [resultado] = await pool.query(
      'INSERT INTO cidades (cidade, codigo_ibge, id_estado) VALUES (?, ?, ?)',
      [cidade, codigoIbge || null, idEstado]
    );
    res.status(201).json({ codigo: resultado.insertId, cidade, codigoIbge, idEstado });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

app.put('/api/cidades/:codigo', async (req, res) => {
  const { cidade, codigoIbge, idEstado } = req.body;
  try {
    await pool.query(
      'UPDATE cidades SET cidade = ?, codigo_ibge = ?, id_estado = ? WHERE id_cidade = ?',
      [cidade, codigoIbge || null, idEstado, req.params.codigo]
    );
    res.json({ mensagem: 'Cidade atualizada com sucesso.' });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

app.delete('/api/cidades/:codigo', async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM cidades WHERE id_cidade = ?',
      [req.params.codigo]
    );

    res.json({
      mensagem: 'Cidade excluída com sucesso.'
    });
  } catch (erro) {
    res.status(500).json({
      erro: erro.message
    });
  }
});

app.get('/api/cargos', async (_req, res) => {
  try {
    const [linhas] = await pool.query(`
      SELECT id_cargo AS codigo, cargo AS cargo
      FROM cargos
      ORDER BY cargo
    `);
    res.json(linhas);
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

app.post('/api/cargos', async (req, res) => {
  const { cargo } = req.body;
  if (!cargo) return res.status(400).json({ erro: 'Informe o cargo.' });

  try {
    const [resultado] = await pool.query(
      'INSERT INTO cargos (cargo) VALUES (?)',
      [cargo]
    );
    res.status(201).json({ codigo: resultado.insertId, cargo });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

app.put('/api/cargos/:codigo', async (req, res) => {
  const { cargo } = req.body;
  try {
    await pool.query('UPDATE cargos SET cargo = ? WHERE id_cargo = ?', [cargo, req.params.codigo]);
    res.json({ mensagem: 'Cargo atualizado com sucesso.' });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

app.delete('/api/cargos/:codigo', async (req, res) => {
  try {
    const [resultado] = await pool.query(
      'DELETE FROM cargos WHERE id_cargo = ?',
      [req.params.codigo]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({
        erro: 'Cargo não encontrado.'
      });
    }

    res.json({
      mensagem: 'Cargo excluído com sucesso.'
    });
  } catch (erro) {
    res.status(500).json({
      erro: erro.message
    });
  }
});

app.get('/api/condicoes-pagamento', async (_req, res) => {
  try {
    const [linhas] = await pool.query(`
      SELECT
        id_condicao_pagamento AS codigo,
        descricao,
        parcelas,
        ativo
      FROM condicoes_pagamento
      ORDER BY id_condicao_pagamento
    `);
    res.json(linhas.map(item => ({ ...item, ativo: Boolean(item.ativo) })));
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

app.post('/api/condicoes-pagamento', async (req, res) => {
  const { descricao, parcelas, ativo } = req.body;
  if (!descricao) return res.status(400).json({ erro: 'Informe a condição de pagamento.' });

  try {
    const [resultado] = await pool.query(
      'INSERT INTO condicoes_pagamento (descricao, parcelas, ativo) VALUES (?, ?, ?)',
      [descricao, Number(parcelas) || 1, ativo === false ? 0 : 1]
    );
    res.status(201).json({ codigo: resultado.insertId, descricao, parcelas, ativo });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

app.put('/api/condicoes-pagamento/:codigo', async (req, res) => {
  const { descricao, parcelas, ativo } = req.body;
  try {
    await pool.query(
      'UPDATE condicoes_pagamento SET descricao = ?, parcelas = ?, ativo = ? WHERE id_condicao_pagamento = ?',
      [descricao, Number(parcelas) || 1, ativo === false ? 0 : 1, req.params.codigo]
    );
    res.json({ mensagem: 'Condição atualizada com sucesso.' });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

app.delete('/api/condicoes-pagamento/:codigo', async (req, res) => {
  try {
    await pool.query('DELETE FROM condicoes_pagamento WHERE id_condicao_pagamento = ?', [req.params.codigo]);
    res.json({ mensagem: 'Condição excluída com sucesso.' });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

app.get('/api/categorias', async (_req, res) => {
  try {
    const [linhas] = await pool.query(`
      SELECT id_categoria AS codigo, nome
      FROM categorias
      ORDER BY id_categoria
    `);

    res.json(linhas);
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

app.post('/api/categorias', async (req, res) => {
  const { nome } = req.body;

  if (!nome) {
    return res.status(400).json({ erro: 'Informe a categoria.' });
  }

  try {
    const [resultado] = await pool.query(
      'INSERT INTO categorias (nome) VALUES (?)',
      [nome]
    );

    res.status(201).json({ codigo: resultado.insertId, nome });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

app.put('/api/categorias/:codigo', async (req, res) => {
  const { nome } = req.body;

  if (!nome) {
    return res.status(400).json({ erro: 'Informe a categoria.' });
  }

  try {
    await pool.query(
      'UPDATE categorias SET nome = ? WHERE id_categoria = ?',
      [nome, req.params.codigo]
    );

    res.json({ mensagem: 'Categoria atualizada com sucesso.' });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

app.delete('/api/categorias/:codigo', async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM categorias WHERE id_categoria = ?',
      [req.params.codigo]
    );

    res.json({ mensagem: 'Categoria excluída com sucesso.' });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});


/* =========================
   PRODUTOS
   ========================= */

app.get('/api/produtos', async (_req, res) => {
  try {
    const [linhas] = await pool.query(`
      SELECT
        p.id_produto AS codigo,
        p.produto AS nome,
        p.preco,
        p.estoque,
        p.unidade,
        p.ativo,
        c.nome AS categoria
      FROM produtos p
      LEFT JOIN categorias c ON c.id_categoria = p.id_categoria
      ORDER BY p.id_produto
    `);

    res.json(linhas.map(p => ({
      ...p,
      preco: Number(p.preco),
      estoque: Number(p.estoque),
      ativo: Boolean(p.ativo)
    })));
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

app.post('/api/produtos', async (req, res) => {
  const { nome, preco, estoque, unidade, categoria } = req.body;

  if (!nome || toMoney(preco) <= 0 || Number(estoque) < 0) {
    return res.status(400).json({
      erro: 'Preencha produto, preço e estoque corretamente.'
    });
  }

  let conexao;

  try {
    conexao = await pool.getConnection();
    await conexao.beginTransaction();

    const idCategoria = await obterOuCriarCategoria(conexao, categoria);
    const unidadeNormalizada = normalizarUnidade(unidade);

    const [resultado] = await conexao.query(
      `
      INSERT INTO produtos (
        produto, preco, estoque, unidade, id_categoria, ativo
      ) VALUES (?, ?, ?, ?, ?, 1)
      `,
      [
        nome,
        toMoney(preco),
        Number(estoque) || 0,
        unidadeNormalizada,
        idCategoria
      ]
    );

    await conexao.commit();

    res.status(201).json({
      codigo: resultado.insertId,
      nome,
      preco,
      estoque,
      unidade: unidadeNormalizada,
      categoria
    });
  } catch (erro) {
    if (conexao) {
      await conexao.rollback();
    }

    res.status(500).json({ erro: erro.message });
  } finally {
    if (conexao) {
      conexao.release();
    }
  }
});

app.put('/api/produtos/:codigo', async (req, res) => {
  const { nome, preco, estoque, unidade, categoria } = req.body;
  let conexao;

  try {
    conexao = await pool.getConnection();
    await conexao.beginTransaction();

    const idCategoria = await obterOuCriarCategoria(conexao, categoria);
    const unidadeNormalizada = normalizarUnidade(unidade);

    await conexao.query(
      `
      UPDATE produtos
      SET produto = ?, preco = ?, estoque = ?, unidade = ?, id_categoria = ?
      WHERE id_produto = ?
      `,
      [nome, toMoney(preco), Number(estoque) || 0, unidadeNormalizada, idCategoria, req.params.codigo]
    );

    await conexao.commit();
    res.json({ mensagem: 'Produto atualizado com sucesso.' });
  } catch (erro) {
    if (conexao) {
      await conexao.rollback();
    }

    res.status(500).json({ erro: erro.message });
  } finally {
    if (conexao) {
      conexao.release();
    }
  }
});

app.delete('/api/produtos/:codigo', async (req, res) => {
  try {
    await pool.query('DELETE FROM produtos WHERE id_produto = ?', [req.params.codigo]);
    res.json({ mensagem: 'Produto excluído com sucesso.' });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

/* =========================
   CLIENTES
   ========================= */

app.get('/api/clientes', async (_req, res) => {
  try {
    const [linhas] = await pool.query(`
      SELECT
        cl.id_cliente AS codigo,
        cl.cliente AS nome,
        cl.apelido,
        cl.data_nascimento AS dataNascimento,
        cl.cpf_cnpj AS cpfCnpj,
        cl.rg,
        cl.email,
        cl.celular,
        cl.telefone,
        cl.endereco,
        cl.numero,
        cl.complemento,
        cl.bairro,
        cl.id_cidade AS idCidade,
        ci.cidade,
        e.id_estado AS idEstado,
        e.estado,
        e.uf,
        p.id_pais AS idPais,
        p.pais,
        cl.cep,
        cl.ativo,
        cl.genero,
        cl.id_condicao_pagamento AS idCondicaoPagamento,
        cp.descricao AS formaPagamento,
        cl.limite_credito AS limiteCredito
      FROM clientes cl
      LEFT JOIN cidades ci ON ci.id_cidade = cl.id_cidade
      LEFT JOIN estados e ON e.id_estado = ci.id_estado
      LEFT JOIN paises p ON p.id_pais = e.id_pais
      LEFT JOIN condicoes_pagamento cp ON cp.id_condicao_pagamento = cl.id_condicao_pagamento
      ORDER BY cl.id_cliente
    `);

    res.json(linhas.map(c => ({
      ...c,
      ativo: Boolean(c.ativo),
      limiteCredito: Number(c.limiteCredito || 0)
    })));
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

app.post('/api/clientes', async (req, res) => {
  const c = req.body;

  if (!c.nome) {
    return res.status(400).json({ erro: 'Informe o nome do cliente.' });
  }

  try {
    const [resultado] = await pool.query(
      `
      INSERT INTO clientes (
        cliente, apelido, data_nascimento, cpf_cnpj, rg, email,
        celular, telefone, endereco, numero, complemento, bairro,
        id_cidade, cep, ativo, genero, id_condicao_pagamento, limite_credito
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        c.nome,
        c.apelido || '',
        toNull(c.dataNascimento),
        c.cpfCnpj || '',
        c.rg || '',
        c.email || '',
        c.celular || '',
        c.telefone || '',
        c.endereco || '',
        c.numero || '',
        c.complemento || '',
        c.bairro || '',
        toNumberOrNull(c.idCidade),
        c.cep || '',
        c.ativo === false ? 0 : 1,
        c.genero || '',
        toNumberOrNull(c.idCondicaoPagamento),
        toMoney(c.limiteCredito)
      ]
    );

    res.status(201).json({
      codigo: resultado.insertId,
      ...c
    });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

app.put('/api/clientes/:codigo', async (req, res) => {
  const c = req.body;

  try {
    await pool.query(
      `
      UPDATE clientes
      SET cliente = ?, apelido = ?, data_nascimento = ?, cpf_cnpj = ?, rg = ?,
          email = ?, celular = ?, telefone = ?, endereco = ?, numero = ?,
          complemento = ?, bairro = ?, id_cidade = ?, cep = ?, ativo = ?,
          genero = ?, id_condicao_pagamento = ?, limite_credito = ?
      WHERE id_cliente = ?
      `,
      [
        c.nome,
        c.apelido || '',
        toNull(c.dataNascimento),
        c.cpfCnpj || '',
        c.rg || '',
        c.email || '',
        c.celular || '',
        c.telefone || '',
        c.endereco || '',
        c.numero || '',
        c.complemento || '',
        c.bairro || '',
        toNumberOrNull(c.idCidade),
        c.cep || '',
        c.ativo === false ? 0 : 1,
        c.genero || '',
        toNumberOrNull(c.idCondicaoPagamento),
        toMoney(c.limiteCredito),
        req.params.codigo
      ]
    );

    res.json({ mensagem: 'Cliente atualizado com sucesso.' });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

app.delete('/api/clientes/:codigo', async (req, res) => {
  try {
    await pool.query('DELETE FROM clientes WHERE id_cliente = ?', [req.params.codigo]);
    res.json({ mensagem: 'Cliente excluído com sucesso.' });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

/* =========================
   FORNECEDORES
   ========================= */

app.get('/api/fornecedores', async (_req, res) => {
  try {
    const [linhas] = await pool.query(`
      SELECT
        f.id_fornecedor AS codigo,
        f.fornecedor AS nome,
        f.apelido,
        f.data_nascimento AS dataNascimento,
        f.cpf_cnpj AS cpfCnpj,
        f.rg,
        f.email,
        f.celular,
        f.telefone,
        f.endereco,
        f.numero,
        f.complemento,
        f.bairro,
        f.id_cidade AS idCidade,
        ci.cidade,
        e.id_estado AS idEstado,
        e.estado,
        e.uf,
        p.id_pais AS idPais,
        p.pais,
        f.cep,
        f.ativo,
        f.genero,
        f.id_condicao_pagamento AS idCondicaoPagamento,
        cp.descricao AS formaPagamento,
        f.limite_credito AS limiteCredito
      FROM fornecedores f
      LEFT JOIN cidades ci ON ci.id_cidade = f.id_cidade
      LEFT JOIN estados e ON e.id_estado = ci.id_estado
      LEFT JOIN paises p ON p.id_pais = e.id_pais
      LEFT JOIN condicoes_pagamento cp ON cp.id_condicao_pagamento = f.id_condicao_pagamento
      ORDER BY f.id_fornecedor
    `);

    res.json(linhas.map(f => ({
      ...f,
      ativo: Boolean(f.ativo),
      limiteCredito: Number(f.limiteCredito || 0)
    })));
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

app.post('/api/fornecedores', async (req, res) => {
  const f = req.body;

  if (!f.nome) {
    return res.status(400).json({ erro: 'Informe o nome do fornecedor.' });
  }

  try {
    const [resultado] = await pool.query(
      `
      INSERT INTO fornecedores (
        fornecedor, apelido, data_nascimento, cpf_cnpj, rg, email,
        celular, telefone, endereco, numero, complemento, bairro,
        id_cidade, cep, ativo, genero, id_condicao_pagamento, limite_credito
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        f.nome,
        f.apelido || '',
        toNull(f.dataNascimento),
        f.cpfCnpj || '',
        f.rg || '',
        f.email || '',
        f.celular || '',
        f.telefone || '',
        f.endereco || '',
        f.numero || '',
        f.complemento || '',
        f.bairro || '',
        toNumberOrNull(f.idCidade),
        f.cep || '',
        f.ativo === false ? 0 : 1,
        f.genero || '',
        toNumberOrNull(f.idCondicaoPagamento),
        toMoney(f.limiteCredito)
      ]
    );

    res.status(201).json({
      codigo: resultado.insertId,
      ...f
    });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

app.put('/api/fornecedores/:codigo', async (req, res) => {
  const f = req.body;

  try {
    await pool.query(
      `
      UPDATE fornecedores
      SET fornecedor = ?, apelido = ?, data_nascimento = ?, cpf_cnpj = ?, rg = ?,
          email = ?, celular = ?, telefone = ?, endereco = ?, numero = ?,
          complemento = ?, bairro = ?, id_cidade = ?, cep = ?, ativo = ?,
          genero = ?, id_condicao_pagamento = ?, limite_credito = ?
      WHERE id_fornecedor = ?
      `,
      [
        f.nome,
        f.apelido || '',
        toNull(f.dataNascimento),
        f.cpfCnpj || '',
        f.rg || '',
        f.email || '',
        f.celular || '',
        f.telefone || '',
        f.endereco || '',
        f.numero || '',
        f.complemento || '',
        f.bairro || '',
        toNumberOrNull(f.idCidade),
        f.cep || '',
        f.ativo === false ? 0 : 1,
        f.genero || '',
        toNumberOrNull(f.idCondicaoPagamento),
        toMoney(f.limiteCredito),
        req.params.codigo
      ]
    );

    res.json({ mensagem: 'Fornecedor atualizado com sucesso.' });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

app.delete('/api/fornecedores/:codigo', async (req, res) => {
  try {
    await pool.query('DELETE FROM fornecedores WHERE id_fornecedor = ?', [req.params.codigo]);
    res.json({ mensagem: 'Fornecedor excluído com sucesso.' });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

/* =========================
   FUNCIONÁRIOS
   ========================= */

app.get('/api/funcionarios', async (_req, res) => {
  try {
    const [linhas] = await pool.query(`
      SELECT
        f.id_funcionario AS codigo,
        f.funcionario,
        f.apelido,
        f.data_nascimento AS dataNascimento,
        f.cpf,
        f.rg,
        f.cnh,
        f.carteira_trabalho AS carteiraTrabalho,
        f.email,
        f.celular,
        f.telefone,
        f.endereco,
        f.numero,
        f.complemento,
        f.bairro,
        f.id_cidade AS idCidade,
        ci.cidade,
        e.id_estado AS idEstado,
        e.estado,
        e.uf,
        p.id_pais AS idPais,
        p.pais,
        f.cep,
        f.id_cargo AS idCargo,
        ca.cargo AS cargo,
        f.salario,
        f.ativo,
        f.genero
      FROM funcionarios f
      LEFT JOIN cidades ci ON ci.id_cidade = f.id_cidade
      LEFT JOIN estados e ON e.id_estado = ci.id_estado
      LEFT JOIN paises p ON p.id_pais = e.id_pais
      LEFT JOIN cargos ca ON ca.id_cargo = f.id_cargo
      ORDER BY f.id_funcionario
    `);

    res.json(linhas.map(f => ({
      ...f,
      salario: Number(f.salario || 0),
      ativo: Boolean(f.ativo)
    })));
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

app.post('/api/funcionarios', async (req, res) => {
  const f = req.body;

  if (!f.funcionario) {
    return res.status(400).json({ erro: 'Informe o nome do funcionário.' });
  }

  try {
    const [resultado] = await pool.query(
      `
      INSERT INTO funcionarios (
        funcionario, apelido, data_nascimento, cpf, rg, cnh, carteira_trabalho,
        email, celular, telefone, endereco, numero, complemento, bairro,
        id_cidade, cep, id_cargo, salario, ativo, genero
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        f.funcionario,
        f.apelido || '',
        toNull(f.dataNascimento),
        f.cpf || '',
        f.rg || '',
        f.cnh || '',
        f.carteiraTrabalho || '',
        f.email || '',
        f.celular || '',
        f.telefone || '',
        f.endereco || '',
        f.numero || '',
        f.complemento || '',
        f.bairro || '',
        toNumberOrNull(f.idCidade),
        f.cep || '',
        toNumberOrNull(f.idCargo),
        toMoney(f.salario),
        f.ativo === false ? 0 : 1,
        f.genero || ''
      ]
    );

    res.status(201).json({
      codigo: resultado.insertId,
      ...f
    });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

app.put('/api/funcionarios/:codigo', async (req, res) => {
  const f = req.body;

  try {
    await pool.query(
      `
      UPDATE funcionarios
      SET funcionario = ?, apelido = ?, data_nascimento = ?, cpf = ?, rg = ?, cnh = ?,
          carteira_trabalho = ?, email = ?, celular = ?, telefone = ?, endereco = ?,
          numero = ?, complemento = ?, bairro = ?, id_cidade = ?, cep = ?,
          id_cargo = ?, salario = ?, ativo = ?, genero = ?
      WHERE id_funcionario = ?
      `,
      [
        f.funcionario,
        f.apelido || '',
        toNull(f.dataNascimento),
        f.cpf || '',
        f.rg || '',
        f.cnh || '',
        f.carteiraTrabalho || '',
        f.email || '',
        f.celular || '',
        f.telefone || '',
        f.endereco || '',
        f.numero || '',
        f.complemento || '',
        f.bairro || '',
        toNumberOrNull(f.idCidade),
        f.cep || '',
        toNumberOrNull(f.idCargo),
        toMoney(f.salario),
        f.ativo === false ? 0 : 1,
        f.genero || '',
        req.params.codigo
      ]
    );

    res.json({ mensagem: 'Funcionário atualizado com sucesso.' });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

app.delete('/api/funcionarios/:codigo', async (req, res) => {
  try {
    await pool.query('DELETE FROM funcionarios WHERE id_funcionario = ?', [req.params.codigo]);
    res.json({ mensagem: 'Funcionário excluído com sucesso.' });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

/* =========================
   VENDAS
   ========================= */

app.get('/api/vendas', async (_req, res) => {
  try {
    const [vendasLinhas] = await pool.query(`
      SELECT
        v.id_venda AS codigo,
        v.data_venda AS data,
        v.subtotal,
        v.desconto_percentual AS descontoPercentual,
        v.desconto,
        v.total,
        v.forma_pagamento AS formaPagamento,
        v.id_condicao_pagamento AS idCondicaoPagamento,
        v.condicao_pagamento AS condicaoPagamento,
        v.recebido AS recebido,
        v.troco,
        c.id_cliente AS clienteCodigo,
        c.cliente AS clienteNome,
        f.id_funcionario AS funcionarioCodigo,
        f.funcionario AS funcionarioNome
      FROM vendas v
      INNER JOIN clientes c ON c.id_cliente = v.id_cliente
      LEFT JOIN funcionarios f ON f.id_funcionario = v.id_funcionario
      LEFT JOIN condicoes_pagamento cp ON cp.id_condicao_pagamento = v.id_condicao_pagamento
      ORDER BY v.id_venda
    `);

    const [itensLinhas] = await pool.query(`
      SELECT
        vi.id_venda AS vendaCodigo,
        vi.id_produto AS produtoCodigo,
        p.produto AS produtoNome,
        p.unidade AS produtoUnidade,
        vi.quantidade,
        vi.preco_unitario AS preco,
        vi.subtotal
      FROM venda_itens vi
      INNER JOIN produtos p ON p.id_produto = vi.id_produto
      ORDER BY vi.id_item
    `);

    const vendasFormatadas = vendasLinhas.map(v => ({
      codigo: v.codigo,
      data: v.data,
      cliente: {
        codigo: v.clienteCodigo,
        nome: v.clienteNome
      },
      funcionario: v.funcionarioCodigo ? {
        codigo: v.funcionarioCodigo,
        funcionario: v.funcionarioNome
      } : null,
      subtotal: Number(v.subtotal),
      descontoPercentual: Number(v.descontoPercentual),
      desconto: Number(v.desconto),
      total: Number(v.total),
      formaPagamento: v.formaPagamento || '',
      idCondicaoPagamento: v.idCondicaoPagamento,
      condicaoPagamento: v.condicaoPagamento || '',
      recebido: Number(v.recebido),
      troco: Number(v.troco),
      itens: itensLinhas
        .filter(i => i.vendaCodigo === v.codigo)
        .map(i => ({
          produtoCodigo: i.produtoCodigo,
          produtoNome: i.produtoNome,
          produtoUnidade: i.produtoUnidade,
          quantidade: Number(i.quantidade),
          preco: Number(i.preco),
          subtotal: Number(i.subtotal)
        }))
    }));

    res.json(vendasFormatadas);
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

app.post('/api/vendas', async (req, res) => {
  const venda = req.body;

  if (!venda.cliente || !Array.isArray(venda.itens) || venda.itens.length === 0) {
    return res.status(400).json({
      erro: 'Venda inválida. Informe cliente e itens.'
    });
  }

  let conexao;

  try {
    conexao = await pool.getConnection();
    await conexao.beginTransaction();

    const [resultadoVenda] = await conexao.query(
      `
      INSERT INTO vendas (
        id_cliente,
        id_funcionario,
        forma_pagamento,
        id_condicao_pagamento,
        condicao_pagamento,
        subtotal,
        desconto_percentual,
        desconto,
        total,
        recebido,
        troco
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        venda.cliente.codigo,
        venda.funcionario?.codigo || null,
        venda.formaPagamento || null,
        toNumberOrNull(venda.idCondicaoPagamento),
        venda.condicaoPagamento || null,
        toMoney(venda.subtotal),
        toMoney(venda.descontoPercentual),
        toMoney(venda.desconto),
        toMoney(venda.total),
        toMoney(venda.recebido),
        toMoney(venda.troco)
      ]
    );

    const idVenda = resultadoVenda.insertId;

    for (const item of venda.itens) {
      await conexao.query(
        `
        INSERT INTO venda_itens (
          id_venda,
          id_produto,
          quantidade,
          preco_unitario,
          subtotal
        )
        VALUES (?, ?, ?, ?, ?)
        `,
        [
          idVenda,
          item.produtoCodigo,
          Number(item.quantidade),
          toMoney(item.preco),
          toMoney(item.subtotal)
        ]
      );

      await conexao.query(
        `
        UPDATE produtos
        SET estoque = estoque - ?
        WHERE id_produto = ?
        `,
        [
          Number(item.quantidade),
          item.produtoCodigo
        ]
      );
    }

    await conexao.commit();

    res.status(201).json({
      mensagem: 'Venda salva com sucesso.',
      codigo: idVenda
    });
  } catch (erro) {
    if (conexao) {
      await conexao.rollback();
    }

    res.status(500).json({
      erro: erro.message
    });
  } finally {
    if (conexao) {
      conexao.release();
    }
  }
});

app.delete('/api/historico', async (req, res) => {
  let conexao;

  try {
    conexao = await pool.getConnection();

    await conexao.query('SET FOREIGN_KEY_CHECKS = 0');
    await conexao.query('TRUNCATE TABLE venda_itens');
    await conexao.query('TRUNCATE TABLE vendas');
    await conexao.query('SET FOREIGN_KEY_CHECKS = 1');

    res.json({
      mensagem: 'Histórico limpo com sucesso.'
    });
  } catch (erro) {
    try {
      if (conexao) {
        await conexao.query('SET FOREIGN_KEY_CHECKS = 1');
      }
    } catch (erroInterno) {
      console.error(erroInterno);
    }

    res.status(500).json({
      erro: erro.message
    });
  } finally {
    if (conexao) {
      conexao.release();
    }
  }
});

const porta = process.env.PORT || 3000;

app.listen(porta, () => {
  console.log(`API rodando em http://localhost:${porta}`);
});
