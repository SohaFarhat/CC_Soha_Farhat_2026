const cultura = 'pt-BR';
const API_URL = 'http://localhost:3000/api';
const USAR_BANCO = true;

const USUARIO_PADRAO = 'Admin';
const SENHA_PADRAO = '1234';
const STORAGE_LOGIN = 'sistema-venda-simples-logado';
const STORAGE_PERFIL = 'sistema-venda-simples-perfil';

const USUARIOS_SISTEMA = [
  {
    usuario: 'Admin',
    senha: '1234',
    perfil: 'Admin',
    abas: [
      'dashboard',
      'venda',
      'clientes',
      'produtos',
      'fornecedores',
      'funcionarios',
      'paises',
      'estados',
      'cidades',
      'cargos',
      'categorias',
      'condicoes',
      'historico'
    ]
  },
  {
    usuario: 'Gerente',
    senha: '1234',
    perfil: 'Gerente',
    abas: ['dashboard', 'venda', 'clientes', 'produtos', 'fornecedores', 'funcionarios', 'paises', 'estados', 'cidades', 'cargos', 'categorias', 'condicoes', 'historico']
  },
  {
    usuario: 'Vendedor',
    senha: '1234',
    perfil: 'Vendedor',
    abas: ['dashboard', 'venda', 'clientes', 'produtos', 'historico']
  },
  {
    usuario: 'Estoquista',
    senha: '1234',
    perfil: 'Estoquista',
    abas: ['dashboard', 'produtos', 'categorias']
  }
];

let produtos = [];
let clientes = [];
let fornecedores = [];
let funcionarios = [];
let vendas = [];
let paises = [];
let estados = [];
let cidades = [];
let cargos = [];
let condicoesPagamento = [];
let categorias = [];
let dadosBancoCarregados = false;
let carregandoDadosBanco = false;
let carrinho = [];
let codigoSelecionadoNaTabela = null;
let toastTimer = null;

const $ = id => document.getElementById(id);

const formasPagamento = [
  {
    codigo: 'dinheiro',
    descricao: 'Dinheiro'
  },
  {
    codigo: 'pix',
    descricao: 'Pix'
  },
  {
    codigo: 'cartao_debito',
    descricao: 'Cartão de Débito'
  },
  {
    codigo: 'cartao_credito',
    descricao: 'Cartão de Crédito'
  },
  {
    codigo: 'boleto',
    descricao: 'Boleto'
  },
  {
    codigo: 'transferencia',
    descricao: 'Transferência Bancária'
  }
];

const produtoSelect = $('produtoSelect');
const clienteVendaSelect = $('clienteVendaSelect');
const funcionarioVendaSelect = $('funcionarioVendaSelect');
const formaPagamentoSelect = $('formaPagamentoSelect');
const condicaoPagamentoVendaSelect = $('condicaoPagamentoVendaSelect');
const quantidadeInput = $('quantidadeInput');
const descontoInput = $('descontoInput');
const recebidoInput = $('recebidoInput');
const reciboTexto = $('reciboTexto');
const itensTabela = $('itensTabela');
const precoProduto = $('precoProduto');
const estoqueProduto = $('estoqueProduto');
const subtotalValor = $('subtotalValor');
const totalValor = $('totalValor');
const trocoValor = $('trocoValor');
const dataHora = $('dataHora');
const toast = $('toast');
const btnTema = $('btnTema');

function mostrarMensagem(texto, tipo = '') {
  if (!toast) return;
  clearTimeout(toastTimer);
  toast.textContent = texto;
  toast.className = `toast mostrar ${tipo}`;
  toastTimer = setTimeout(() => {
    toast.className = 'toast';
  }, 3200);
}

function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString(cultura, { style: 'currency', currency: 'BRL' });
}

function obterDecimal(texto) {
  if (!texto || !String(texto).trim()) return 0;
  let normalizado = String(texto).replace(/R\$/g, '').trim();

  if (normalizado.includes(',') && normalizado.includes('.')) {
    normalizado = normalizado.replace(/\./g, '').replace(',', '.');
  } else {
    normalizado = normalizado.replace(',', '.');
  }

  const valor = Number.parseFloat(normalizado);
  return Number.isFinite(valor) ? valor : 0;
}

function proximoCodigo(lista) {
  return lista.length ? Math.max(...lista.map(item => Number(item.codigo) || 0)) + 1 : 1;
}

function usuarioLogado() {
  return localStorage.getItem('usuarioLogado') || USUARIO_PADRAO;
}

function perfilLogado() {
  return localStorage.getItem(STORAGE_PERFIL) || 'Admin';
}

function permissoesDoPerfil(perfil) {
  const usuario = USUARIOS_SISTEMA.find(item => item.perfil === perfil);
  return usuario ? usuario.abas : [];
}

function usuarioPodeAcessar(tela) {
  return permissoesDoPerfil(perfilLogado()).includes(tela);
}

function mostrarBloqueioPermissao(tela) {
  const modal = $('modalPermissao');
  const texto = $('modalPermissaoTexto');

  if (texto) {
    texto.textContent = `Seu perfil (${perfilLogado()}) não tem permissão para acessar a aba "${tela}".`;
  }

  if (modal) {
    modal.classList.add('mostrar');
  }
}

function fecharBloqueioPermissao() {
  $('modalPermissao')?.classList.remove('mostrar');
}

function ordenarPorCodigo(lista) {
  return [...lista].sort((a, b) => Number(a.codigo || 0) - Number(b.codigo || 0));
}

function atualizarBotoesPorPermissao() {
  document.querySelectorAll('.menu-btn').forEach(botao => {
    const permitido = usuarioPodeAcessar(botao.dataset.tela);
    botao.classList.toggle('menu-bloqueado', !permitido);
    botao.title = permitido ? '' : 'Sem permissão para acessar esta área';
  });
}

function normalizarData(data) {
  if (!data) return '';
  return String(data).slice(0, 10);
}

async function lerRespostaApi(resposta) {
  const texto = await resposta.text();

  if (!texto) {
    return {};
  }

  try {
    return JSON.parse(texto);
  } catch (_erro) {
    return { erro: texto };
  }
}

function mensagemErroApi(erro, contexto = 'operação') {
  const mensagem = erro && erro.message ? erro.message : String(erro || 'Erro desconhecido.');

  if (mensagem.includes('Failed to fetch')) {
    return 'Erro de conexão com o backend. Confira se o servidor Node está rodando em http://localhost:3000.';
  }

  if (mensagem.includes('ECONNREFUSED')) {
    return 'O backend não conseguiu conectar ao MySQL. Confira se o MySQL está aberto e se a senha do arquivo backend/.env está correta.';
  }

  if (mensagem.includes('Access denied')) {
    return 'Acesso negado ao MySQL. Confira usuário e senha no arquivo backend/.env.';
  }

  if (mensagem.includes('Unknown database')) {
    return 'Banco de dados não encontrado. Execute o schema_mysql_workbench.sql no MySQL Workbench.';
  }

  if (mensagem.includes('Unknown column')) {
    return `Erro de coluna no banco: ${mensagem}. Rode o schema_mysql_workbench.sql atualizado.`;
  }

  if (mensagem.includes('Table') && mensagem.includes("doesn't exist")) {
    return 'Tabela não encontrada no MySQL. Execute o schema_mysql_workbench.sql completo.';
  }

  if (mensagem.includes('Cannot add or update a child row')) {
    return 'Erro de relacionamento. Verifique se cidade, cargo, categoria ou condição de pagamento existem no banco.';
  }

  if (mensagem.includes('Duplicate entry')) {
    return 'Já existe um cadastro com essa informação única no banco.';
  }

  if (mensagem.includes('Data too long')) {
    return `Algum campo está maior que o limite permitido no banco: ${mensagem}`;
  }

  return `Erro ao ${contexto}: ${mensagem}`;
}

async function apiGet(caminho) {
  const resposta = await fetch(`${API_URL}${caminho}`);
  const resultado = await lerRespostaApi(resposta);

  if (!resposta.ok) {
    throw new Error(resultado.erro || 'Erro ao buscar dados da API.');
  }

  return resultado;
}

async function apiPost(caminho, dados) {
  const resposta = await fetch(`${API_URL}${caminho}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados)
  });

  const resultado = await lerRespostaApi(resposta);

  if (!resposta.ok) {
    throw new Error(resultado.erro || 'Erro ao salvar dados.');
  }

  return resultado;
}

async function apiPut(caminho, dados) {
  const resposta = await fetch(`${API_URL}${caminho}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados)
  });

  const resultado = await lerRespostaApi(resposta);

  if (!resposta.ok) {
    throw new Error(resultado.erro || 'Erro ao atualizar dados.');
  }

  return resultado;
}

async function apiDelete(caminho) {
  const resposta = await fetch(`${API_URL}${caminho}`, { method: 'DELETE' });
  const resultado = await lerRespostaApi(resposta);

  if (!resposta.ok) {
    throw new Error(resultado.erro || 'Erro ao excluir dados.');
  }

  return resultado;
}

async function carregarDadosDoBanco(mostrarAviso = false) {
  if (!USAR_BANCO) return;
  if (carregandoDadosBanco) return;

  carregandoDadosBanco = true;

  try {
    [
      paises,
      estados,
      cidades,
      cargos,
      condicoesPagamento,
      categorias,
      produtos,
      clientes,
      fornecedores,
      funcionarios,
      vendas
    ] = await Promise.all([
      apiGet('/paises'),
      apiGet('/estados'),
      apiGet('/cidades'),
      apiGet('/cargos'),
      apiGet('/condicoes-pagamento'),
      apiGet('/categorias'),
      apiGet('/produtos'),
      apiGet('/clientes'),
      apiGet('/fornecedores'),
      apiGet('/funcionarios'),
      apiGet('/vendas')
    ]);

    dadosBancoCarregados = true;
    atualizarTudoCadastrosEVenda();

    if (mostrarAviso) {
      mostrarMensagem('Dados carregados do banco com sucesso.', 'sucesso');
    }
  } catch (erro) {
    console.error(erro);
    mostrarMensagem(mensagemErroApi(erro, 'carregar dados do banco'), 'erro');
  } finally {
    carregandoDadosBanco = false;
  }
}

function verificarLoginSalvo() {
  localStorage.removeItem(STORAGE_LOGIN);
  localStorage.removeItem('usuarioLogado');
  localStorage.removeItem(STORAGE_PERFIL);

  $('telaLogin')?.classList.remove('oculto');
  $('sistemaPrincipal')?.classList.add('oculto');
}

async function fazerLogin(event) {
  event.preventDefault();

  const usuario = $('loginUsuario').value.trim();
  const senha = $('loginSenha').value.trim();
  const mensagem = $('loginMensagem');
  const acesso = USUARIOS_SISTEMA.find(item => item.usuario === usuario && item.senha === senha);

  if (acesso) {
    localStorage.setItem(STORAGE_LOGIN, 'true');
    localStorage.setItem('usuarioLogado', acesso.usuario);
    localStorage.setItem(STORAGE_PERFIL, acesso.perfil);

    $('telaLogin').classList.add('oculto');
    $('sistemaPrincipal').classList.remove('oculto');
    mensagem.textContent = '';

    atualizarBotoesPorPermissao();
    await carregarDadosDoBanco(true);
    navegarPara('dashboard');

    mostrarMensagem(`Login realizado como ${acesso.perfil}.`, 'sucesso');
    return;
  }

  mensagem.textContent = 'Usuário ou senha incorretos.';
}

function sairDoSistema() {
  const confirmar = confirm('Deseja realmente sair do sistema?');

  if (!confirmar) {
    return;
  }

  localStorage.removeItem(STORAGE_LOGIN);
  localStorage.removeItem('usuarioLogado');
  localStorage.removeItem(STORAGE_PERFIL);

  const telaLogin = $('telaLogin');
  const sistemaPrincipal = $('sistemaPrincipal');

  if (sistemaPrincipal) {
    sistemaPrincipal.classList.add('oculto');
  }

  if (telaLogin) {
    telaLogin.classList.remove('oculto');
  }

  mostrarMensagem('Você saiu do sistema.', 'sucesso');
}

function atualizarRelogio() {
  if (!dataHora) return;
  dataHora.textContent = new Date().toLocaleString(cultura, {
    dateStyle: 'short',
    timeStyle: 'medium'
  });
}

async function navegarPara(tela) {
  if (!usuarioPodeAcessar(tela)) {
    mostrarBloqueioPermissao(tela);
    return;
  }

  document.querySelectorAll('.menu-btn').forEach(btn => {
    btn.classList.toggle('ativo', btn.dataset.tela === tela);
  });

  document.querySelectorAll('.tela').forEach(secao => secao.classList.remove('ativa'));

  const idTela = `tela${tela.charAt(0).toUpperCase()}${tela.slice(1)}`;
  const telaSelecionada = $(idTela);

  if (!telaSelecionada) {
    mostrarMensagem(`Tela não encontrada: ${idTela}`, 'erro');
    return;
  }

  telaSelecionada.classList.add('ativa');

  if (USAR_BANCO && !dadosBancoCarregados && !carregandoDadosBanco) {
    await carregarDadosDoBanco(false);
  }

  if (tela === 'dashboard') recarregarDashboard();
  if (tela === 'clientes') recarregarClientes();
  if (tela === 'produtos') recarregarProdutos();
  if (tela === 'fornecedores') recarregarFornecedores();
  if (tela === 'funcionarios') recarregarFuncionarios();
  if (
    tela === 'paises' ||
    tela === 'estados' ||
    tela === 'cidades' ||
    tela === 'cargos' ||
    tela === 'categorias' ||
    tela === 'condicoes'
  ) {
  recarregarLocalidades();
}


  if (tela === 'historico') recarregarHistorico();
}

function preencherSelect(select, itens, valor, texto, placeholder = 'Selecionar') {
  if (!select) return;

  select.innerHTML = `<option value="">${placeholder}</option>`;

  itens.forEach(item => {
    const option = document.createElement('option');
    option.value = item[valor];
    option.textContent = typeof texto === 'function' ? texto(item) : item[texto];
    select.appendChild(option);
  });
}

function preencherProdutos() {
  if (!produtoSelect) {
    return;
  }

  const produtosOrdenados = ordenarPorCodigo(produtos)
    .filter(produto => produto.ativo !== false);

  produtoSelect.innerHTML = '<option value="">Selecione</option>';

  produtosOrdenados.forEach((produto, indice) => {
    const option = document.createElement('option');

    option.value = produto.codigo;
    option.textContent = `${indice + 1} - ${produto.nome}`;

    produtoSelect.appendChild(option);
  });

  atualizarSelectAnimado(produtoSelect);
}

function preencherCategoriasProdutos() {
  preencherSelect($('produtoCategoriaCadastro'), ordenarPorCodigo(categorias), 'nome', 'nome', 'Selecione');
}

function preencherClientesVenda() {
  preencherSelect(clienteVendaSelect, clientes.filter(c => c.ativo !== false), 'codigo', c => `${c.codigo} - ${c.nome}`, 'Selecione');
}

function preencherFuncionariosVenda() {
  preencherSelect(funcionarioVendaSelect, funcionarios.filter(f => f.ativo !== false), 'codigo', f => `${f.codigo} - ${f.funcionario}`, 'Selecione');
}

function preencherFormasPagamento() {
  preencherSelect(
    formaPagamentoSelect,
    formasPagamento,
    'codigo',
    'descricao',
    'Selecionar'
  );
}

function preencherCondicoesPagamento() {
  const ativos = condicoesPagamento.filter(condicao => {
    return condicao.ativo !== false;
  });

  preencherSelect(
    condicaoPagamentoVendaSelect,
    ativos,
    'codigo',
    'descricao',
    'Selecionar'
  );

  preencherSelect(
    $('clienteFormaPagamentoCadastro'),
    ativos,
    'codigo',
    'descricao',
    'Selecionar'
  );

  preencherSelect(
    $('fornecedorFormaPagamentoCadastro'),
    ativos,
    'codigo',
    'descricao',
    'Selecionar'
  );
}

function preencherLocalidadesNosFormularios() {
  preencherSelect($('clientePaisCadastro'), paises, 'codigo', 'pais', 'Selecionar');
  preencherSelect($('fornecedorPaisCadastro'), paises, 'codigo', 'pais', 'Selecionar');
  preencherSelect($('funcionarioPaisCadastro'), paises, 'codigo', 'pais', 'Selecionar');

  preencherSelect($('clienteEstadoCadastro'), estados, 'codigo', e => `${e.estado} - ${e.uf}`, 'Selecionar');
  preencherSelect($('fornecedorEstadoCadastro'), estados, 'codigo', e => `${e.estado} - ${e.uf}`, 'Selecionar');
  preencherSelect($('funcionarioEstadoCadastro'), estados, 'codigo', e => `${e.estado} - ${e.uf}`, 'Selecionar');

  preencherSelect($('clienteCidadeCadastro'), cidades, 'codigo', c => `${c.cidade} - ${c.uf}`, 'Selecionar');
  preencherSelect($('fornecedorCidadeCadastro'), cidades, 'codigo', c => `${c.cidade} - ${c.uf}`, 'Selecionar');
  preencherSelect($('funcionarioCidadeCadastro'), cidades, 'codigo', c => `${c.cidade} - ${c.uf}`, 'Selecionar');

  preencherSelect($('funcionarioCargoCadastro'), cargos, 'codigo', 'cargo', 'Selecionar');
}

function selecionarPaisEstadoPorCidade(prefixo, idCidade) {
  const cidade = cidades.find(c => Number(c.codigo) === Number(idCidade));
  if (!cidade) return;

  const paisSelect = $(`${prefixo}PaisCadastro`);
  const estadoSelect = $(`${prefixo}EstadoCadastro`);

  if (paisSelect) paisSelect.value = cidade.idPais || '';
  if (estadoSelect) estadoSelect.value = cidade.idEstado || '';
}

function produtoSelecionado() {
  const codigo = Number(produtoSelect.value);
  return produtos.find(produto => Number(produto.codigo) === codigo) || null;
}

function clienteSelecionado() {
  const codigo = Number(clienteVendaSelect.value);
  return clientes.find(cliente => Number(cliente.codigo) === codigo) || null;
}

function funcionarioSelecionado() {
  const codigo = Number(funcionarioVendaSelect.value);
  return funcionarios.find(funcionario => Number(funcionario.codigo) === codigo) || null;
}

function atualizarCondicaoPagamentoPeloCliente() {
  const cliente = clienteSelecionado();

  if (!cliente || !cliente.idCondicaoPagamento) {
    return;
  }

  condicaoPagamentoVendaSelect.value = cliente.idCondicaoPagamento;
  atualizarSelectAnimado(condicaoPagamentoVendaSelect);
}

function quantidadeNoCarrinho(codigoProduto) {
  return carrinho
    .filter(item => Number(item.produto.codigo) === Number(codigoProduto))
    .reduce((total, item) => total + item.quantidade, 0);
}

function atualizarProdutoSelecionado() {
  const produto = produtoSelecionado();

  if (!produto) {
    precoProduto.textContent = 'R$ 0,00';
    estoqueProduto.textContent = '0';
    return;
  }

  const estoqueDisponivel = Math.max(Number(produto.estoque || 0) - quantidadeNoCarrinho(produto.codigo), 0);
  precoProduto.textContent = formatarMoeda(produto.preco);
  estoqueProduto.textContent = `${estoqueDisponivel} disponível(is)`;
}

function obterSubtotal() {
  return carrinho.reduce((total, item) => total + Number(item.produto.preco) * item.quantidade, 0);
}

function obterDescontoPercentual() {
  let percentual = Number.parseInt(descontoInput.value, 10);
  if (!Number.isInteger(percentual)) percentual = 0;
  return Math.min(Math.max(percentual, 0), 100);
}

function obterDesconto() {
  return obterSubtotal() * (obterDescontoPercentual() / 100);
}

function obterRecebido() {
  return Math.max(obterDecimal(recebidoInput.value), 0);
}

function calcularTotal() {
  return Math.max(obterSubtotal() - obterDesconto(), 0);
}

function atualizarTotais() {
  const subtotal = obterSubtotal();
  const total = calcularTotal();
  const recebido = obterRecebido();

  subtotalValor.textContent = formatarMoeda(subtotal);
  totalValor.textContent = formatarMoeda(total);
  trocoValor.textContent = formatarMoeda(Math.max(recebido - total, 0));
}

function adicionarProduto() {
  const produto = produtoSelecionado();

  if (!produto) {
    mostrarMensagem('Selecione um produto.', 'aviso');
    return;
  }

  const quantidade = Number.parseInt(quantidadeInput.value.trim(), 10);

  if (!Number.isInteger(quantidade) || quantidade <= 0) {
    mostrarMensagem('Informe uma quantidade válida maior que zero.', 'aviso');
    quantidadeInput.focus();
    return;
  }

  const estoqueDisponivel = Number(produto.estoque || 0) - quantidadeNoCarrinho(produto.codigo);

  if (quantidade > estoqueDisponivel) {
    mostrarMensagem(`Estoque insuficiente. Disponível: ${estoqueDisponivel}`, 'aviso');
    return;
  }

  const itemExistente = carrinho.find(item => Number(item.produto.codigo) === Number(produto.codigo));

  if (itemExistente) {
    itemExistente.quantidade += quantidade;
  } else {
    carrinho.push({ produto, quantidade });
  }

  quantidadeInput.value = '';
  quantidadeInput.focus();
  recarregarTabela();
  atualizarProdutoSelecionado();
  atualizarTotais();
}

function recarregarTabela() {
  itensTabela.innerHTML = '';

  carrinho.forEach(item => {
    const tr = document.createElement('tr');
    tr.dataset.codigo = item.produto.codigo;

    if (Number(codigoSelecionadoNaTabela) === Number(item.produto.codigo)) {
      tr.classList.add('selecionado');
    }

    const subtotal = Number(item.produto.preco) * item.quantidade;

    tr.innerHTML = `
      <td>${item.produto.codigo}</td>
      <td>${item.produto.nome}</td>
      <td>${formatarMoeda(item.produto.preco)}</td>
      <td>${item.quantidade}</td>
      <td>${item.produto.unidade || 'UN'}</td>
      <td>${formatarMoeda(subtotal)}</td>
    `;

    tr.addEventListener('click', () => {
      codigoSelecionadoNaTabela = item.produto.codigo;
      recarregarTabela();
    });

    itensTabela.appendChild(tr);
  });
}

function removerItemSelecionado() {
  if (codigoSelecionadoNaTabela === null) {
    mostrarMensagem('Selecione um item para remover.', 'aviso');
    return;
  }

  carrinho = carrinho.filter(item => Number(item.produto.codigo) !== Number(codigoSelecionadoNaTabela));
  codigoSelecionadoNaTabela = null;
  recarregarTabela();
  atualizarProdutoSelecionado();
  atualizarTotais();
}

function gerarRecibo() {
  const subtotal = obterSubtotal();
  const desconto = obterDesconto();
  const total = calcularTotal();
  const recebido = obterRecebido();
  const cliente = clienteSelecionado();
  const funcionario = funcionarioSelecionado();
  const forma = formasPagamento.find(item => item.codigo === formaPagamentoSelect.value);

  const condicao = condicoesPagamento.find(item => {
    return Number(item.codigo) === Number(condicaoPagamentoVendaSelect.value);
  });
  const linhas = [];

  linhas.push('====================================');
  linhas.push('        SISTEMA DE VENDAS');
  linhas.push('====================================');
  linhas.push(`Data: ${new Date().toLocaleString(cultura)}`);
  linhas.push(`Cliente: ${cliente ? cliente.nome : '-'}`);
  linhas.push(`Funcionário: ${funcionario ? funcionario.funcionario : '-'}`);
  linhas.push(`Forma de pagamento: ${forma ? forma.descricao : '-'}`);
  linhas.push(`Condição de pagamento: ${condicao ? condicao.descricao : '-'}`);
  linhas.push('------------------------------------');

  carrinho.forEach(item => {
    linhas.push(item.produto.nome);
    linhas.push(`Qtd: ${item.quantidade} ${item.produto.unidade || 'UN'}  Preço: ${formatarMoeda(item.produto.preco)}`);
    linhas.push(`Subtotal: ${formatarMoeda(Number(item.produto.preco) * item.quantidade)}`);
    linhas.push('------------------------------------');
  });

  linhas.push(`Subtotal: ${formatarMoeda(subtotal)}`);
  linhas.push(`Desconto: ${obterDescontoPercentual()}% (${formatarMoeda(desconto)})`);
  linhas.push(`TOTAL:    ${formatarMoeda(total)}`);
  linhas.push(`Recebido: ${formatarMoeda(recebido)}`);
  linhas.push(`Troco:    ${formatarMoeda(Math.max(recebido - total, 0))}`);
  linhas.push('====================================');
  linhas.push('Obrigado pela preferência!');

  return linhas.join('\n');
}

async function finalizarVenda() {
  if (carrinho.length === 0) {
    mostrarMensagem('Adicione pelo menos um produto antes de finalizar a venda.', 'aviso');
    return;
  }

  const cliente = clienteSelecionado();
  if (!cliente) {
    mostrarMensagem('Cadastre e selecione um cliente antes de finalizar.', 'aviso');
    return;
  }

  const total = calcularTotal();
  const recebido = obterRecebido();

  if (recebido < total) {
    mostrarMensagem('O valor recebido é menor que o total da venda.', 'erro');
    recebidoInput.focus();
    return;
  }

  const funcionario = funcionarioSelecionado();
  const recibo = gerarRecibo();
  const venda = {
    cliente: { codigo: cliente.codigo, nome: cliente.nome },
    funcionario: funcionario ? { codigo: funcionario.codigo, funcionario: funcionario.funcionario } : null,
    formaPagamento: formaPagamentoSelect.options[formaPagamentoSelect.selectedIndex]?.textContent || '',
    idCondicaoPagamento: Number(condicaoPagamentoVendaSelect.value) || null,
    condicaoPagamento: condicaoPagamentoVendaSelect.options[condicaoPagamentoVendaSelect.selectedIndex]?.textContent || '',
    subtotal: obterSubtotal(),
    descontoPercentual: obterDescontoPercentual(),
    desconto: obterDesconto(),
    total,
    recebido,
    troco: Math.max(recebido - total, 0),
    itens: carrinho.map(item => ({
      produtoCodigo: item.produto.codigo,
      produtoNome: item.produto.nome,
      produtoUnidade: item.produto.unidade || 'UN',
      preco: item.produto.preco,
      quantidade: item.quantidade,
      subtotal: Number(item.produto.preco) * item.quantidade
    }))
  };

  try {
    if (USAR_BANCO) {
      await apiPost('/vendas', venda);
      produtos = await apiGet('/produtos');
      vendas = await apiGet('/vendas');
    } else {
      venda.codigo = proximoCodigo(vendas);
      venda.data = new Date().toISOString();
      carrinho.forEach(item => {
        item.produto.estoque -= item.quantidade;
      });
      vendas.push(venda);
    }

    reciboTexto.value = recibo;
    carrinho = [];
    codigoSelecionadoNaTabela = null;
    limparCamposVendaSemRecibo();
    atualizarTudoCadastrosEVenda();
    mostrarMensagem('Venda finalizada com sucesso!', 'sucesso');
  } catch (erro) {
    console.error(erro);
    mostrarMensagem(mensagemErroApi(erro, 'salvar venda'), 'erro');
  }
}

function limparCamposVendaSemRecibo() {
  quantidadeInput.value = '';
  descontoInput.value = '';
  recebidoInput.value = '';
  recarregarTabela();
  atualizarProdutoSelecionado();
  atualizarTotais();
}

function limparVendaAtual(confirmar) {
  if (confirmar && carrinho.length > 0 && !window.confirm('Deseja limpar a venda atual?')) return;
  carrinho = [];
  codigoSelecionadoNaTabela = null;
  reciboTexto.value = 'O recibo será gerado após finalizar a venda.';
  limparCamposVendaSemRecibo();
}

async function salvarProduto(event) {
  event.preventDefault();

  const codigoEditando = Number($('produtoCodigoCadastro').value);
  const produto = {
    nome: $('produtoNomeCadastro').value.trim(),
    preco: obterDecimal($('produtoPrecoCadastro').value),
    estoque: Number.parseInt($('produtoEstoqueCadastro').value, 10),
    unidade: $('produtoUnidadeCadastro').value || 'UN',
    categoria: $('produtoCategoriaCadastro').value.trim()
  };

  if (!produto.nome || produto.preco <= 0 || !Number.isInteger(produto.estoque) || produto.estoque < 0) {
    mostrarMensagem('Preencha produto, preço e estoque corretamente.', 'aviso');
    return;
  }

  try {
    if (USAR_BANCO) {
      if (codigoEditando) await apiPut(`/produtos/${codigoEditando}`, produto);
      else await apiPost('/produtos', produto);
      produtos = await apiGet('/produtos');
    } else if (codigoEditando) {
      Object.assign(produtos.find(p => Number(p.codigo) === codigoEditando), produto);
    } else {
      produtos.push({ codigo: proximoCodigo(produtos), ...produto });
    }

    limparFormProduto();
    atualizarTudoCadastrosEVenda();
    mostrarMensagem('Produto salvo com sucesso!', 'sucesso');
  } catch (erro) {
    console.error(erro);
    mostrarMensagem(mensagemErroApi(erro, 'salvar produto'), 'erro');
  }
}

function editarProduto(codigo) {
  const produto = produtos.find(p => Number(p.codigo) === Number(codigo));
  if (!produto) return;

  $('produtoCodigoCadastro').value = produto.codigo;
  $('produtoNomeCadastro').value = produto.nome || '';
  $('produtoPrecoCadastro').value = Number(produto.preco || 0).toFixed(2).replace('.', ',');
  $('produtoEstoqueCadastro').value = produto.estoque || 0;
  $('produtoUnidadeCadastro').value = produto.unidade || 'UN';
  $('produtoCategoriaCadastro').value = produto.categoria || '';
  atualizarSelectAnimado($('produtoUnidadeCadastro'));
}

async function excluirProduto(codigo) {
  if (carrinho.some(item => Number(item.produto.codigo) === Number(codigo))) {
    mostrarMensagem('Remova o produto do carrinho antes de excluir.', 'aviso');
    return;
  }

  if (!window.confirm('Deseja excluir este produto?')) return;

  try {
    if (USAR_BANCO) {
      await apiDelete(`/produtos/${codigo}`);
      produtos = await apiGet('/produtos');
    } else {
      produtos = produtos.filter(p => Number(p.codigo) !== Number(codigo));
    }

    limparFormProduto();
    atualizarTudoCadastrosEVenda();
    mostrarMensagem('Produto excluído.', 'sucesso');
  } catch (erro) {
    console.error(erro);
    mostrarMensagem(mensagemErroApi(erro, 'excluir produto'), 'erro');
  }
}

function limparFormProduto() {
  $('formProduto').reset();
  $('produtoCodigoCadastro').value = '';
  atualizarSelectAnimado($('produtoUnidadeCadastro'));
}

function dadosCliente() {
  const cidadeSelect = $('clienteCidadeCadastro');
  const condicaoSelect = $('clienteFormaPagamentoCadastro');

  return {
    nome: $('clienteNomeCadastro').value.trim(),
    apelido: $('clienteApelidoCadastro').value.trim(),
    dataNascimento: $('clienteDataNascimentoCadastro').value,
    cpfCnpj: $('clienteCpfCadastro').value.trim(),
    rg: $('clienteRgCadastro').value.trim(),
    email: $('clienteEmailCadastro').value.trim(),
    celular: $('clienteCelularCadastro').value.trim(),
    telefone: $('clienteTelefoneCadastro').value.trim(),
    endereco: $('clienteEnderecoCadastro').value.trim(),
    numero: $('clienteNumeroCadastro').value.trim(),
    complemento: $('clienteComplementoCadastro').value.trim(),
    bairro: $('clienteBairroCadastro').value.trim(),
    idCidade: Number(cidadeSelect.value) || null,
    cidade: cidadeSelect.options[cidadeSelect.selectedIndex]?.textContent || '',
    cep: $('clienteCepCadastro').value.trim(),
    ativo: $('clienteAtivoCadastro').value === 'true',
    genero: $('clienteGeneroCadastro').value,
    idCondicaoPagamento: Number(condicaoSelect.value) || null,
    formaPagamento: condicaoSelect.options[condicaoSelect.selectedIndex]?.textContent || '',
    limiteCredito: obterDecimal($('clienteLimiteCreditoCadastro').value)
  };
}

async function salvarCliente(event) {
  event.preventDefault();
  const codigoEditando = Number($('clienteCodigoCadastro').value);
  const cliente = dadosCliente();

  if (!cliente.nome) {
    mostrarMensagem('Informe o nome do cliente.', 'aviso');
    return;
  }

  try {
    if (USAR_BANCO) {
      if (codigoEditando) await apiPut(`/clientes/${codigoEditando}`, cliente);
      else await apiPost('/clientes', cliente);
      clientes = await apiGet('/clientes');
    } else if (codigoEditando) {
      Object.assign(clientes.find(c => Number(c.codigo) === codigoEditando), cliente);
    } else {
      clientes.push({ codigo: proximoCodigo(clientes), ...cliente });
    }

    limparFormCliente();
    atualizarTudoCadastrosEVenda();
    mostrarMensagem('Cliente salvo com sucesso!', 'sucesso');
  } catch (erro) {
    console.error(erro);
    mostrarMensagem(mensagemErroApi(erro, 'salvar cliente'), 'erro');
  }
}

function editarCliente(codigo) {
  const cliente = clientes.find(c => Number(c.codigo) === Number(codigo));
  if (!cliente) return;

  $('clienteCodigoCadastro').value = cliente.codigo;
  $('clienteNomeCadastro').value = cliente.nome || '';
  $('clienteApelidoCadastro').value = cliente.apelido || '';
  $('clienteDataNascimentoCadastro').value = normalizarData(cliente.dataNascimento);
  $('clienteCpfCadastro').value = cliente.cpfCnpj || '';
  $('clienteRgCadastro').value = cliente.rg || '';
  $('clienteEmailCadastro').value = cliente.email || '';
  $('clienteCelularCadastro').value = cliente.celular || '';
  $('clienteTelefoneCadastro').value = cliente.telefone || '';
  $('clienteEnderecoCadastro').value = cliente.endereco || '';
  $('clienteNumeroCadastro').value = cliente.numero || '';
  $('clienteComplementoCadastro').value = cliente.complemento || '';
  $('clienteBairroCadastro').value = cliente.bairro || '';
  $('clienteCidadeCadastro').value = cliente.idCidade || '';
  selecionarPaisEstadoPorCidade('cliente', cliente.idCidade);
  $('clienteCepCadastro').value = cliente.cep || '';
  $('clienteAtivoCadastro').value = cliente.ativo === false ? 'false' : 'true';
  $('clienteGeneroCadastro').value = cliente.genero || '';
  $('clienteFormaPagamentoCadastro').value = cliente.idCondicaoPagamento || '';
  $('clienteLimiteCreditoCadastro').value = cliente.limiteCredito || 0;
  atualizarSelectsAnimados();
}

async function excluirCliente(codigo) {
  if (!window.confirm('Deseja excluir este cliente?')) return;

  try {
    if (USAR_BANCO) {
      await apiDelete(`/clientes/${codigo}`);
      clientes = await apiGet('/clientes');
    } else {
      clientes = clientes.filter(c => Number(c.codigo) !== Number(codigo));
    }

    limparFormCliente();
    atualizarTudoCadastrosEVenda();
    mostrarMensagem('Cliente excluído.', 'sucesso');
  } catch (erro) {
    console.error(erro);
    mostrarMensagem(mensagemErroApi(erro, 'excluir cliente'), 'erro');
  }
}

function limparFormCliente() {
  $('formCliente').reset();
  $('clienteCodigoCadastro').value = '';
  atualizarSelectsAnimados();
}

function dadosFornecedor() {
  const cidadeSelect = $('fornecedorCidadeCadastro');
  const condicaoSelect = $('fornecedorFormaPagamentoCadastro');

  return {
    nome: $('fornecedorNomeCadastro').value.trim(),
    apelido: $('fornecedorApelidoCadastro').value.trim(),
    dataNascimento: $('fornecedorDataNascimentoCadastro').value,
    cpfCnpj: $('fornecedorCpfCnpjCadastro').value.trim(),
    rg: $('fornecedorRgCadastro').value.trim(),
    email: $('fornecedorEmailCadastro').value.trim(),
    celular: $('fornecedorCelularCadastro').value.trim(),
    telefone: $('fornecedorTelefoneCadastro').value.trim(),
    endereco: $('fornecedorEnderecoCadastro').value.trim(),
    numero: $('fornecedorNumeroCadastro').value.trim(),
    complemento: $('fornecedorComplementoCadastro').value.trim(),
    bairro: $('fornecedorBairroCadastro').value.trim(),
    idCidade: Number(cidadeSelect.value) || null,
    cep: $('fornecedorCepCadastro').value.trim(),
    ativo: $('fornecedorAtivoCadastro').value === 'true',
    genero: $('fornecedorGeneroCadastro').value,
    idCondicaoPagamento: Number(condicaoSelect.value) || null,
    limiteCredito: obterDecimal($('fornecedorLimiteCreditoCadastro').value)
  };
}

async function salvarFornecedor(event) {
  event.preventDefault();
  const codigoEditando = Number($('fornecedorCodigoCadastro').value);
  const fornecedor = dadosFornecedor();

  if (!fornecedor.nome) {
    mostrarMensagem('Informe o nome do fornecedor.', 'aviso');
    return;
  }

  try {
    if (USAR_BANCO) {
      if (codigoEditando) await apiPut(`/fornecedores/${codigoEditando}`, fornecedor);
      else await apiPost('/fornecedores', fornecedor);
      fornecedores = await apiGet('/fornecedores');
    } else if (codigoEditando) {
      Object.assign(fornecedores.find(f => Number(f.codigo) === codigoEditando), fornecedor);
    } else {
      fornecedores.push({ codigo: proximoCodigo(fornecedores), ...fornecedor });
    }

    limparFormFornecedor();
    atualizarTudoCadastrosEVenda();
    mostrarMensagem('Fornecedor salvo com sucesso!', 'sucesso');
  } catch (erro) {
    console.error(erro);
    mostrarMensagem(mensagemErroApi(erro, 'salvar fornecedor'), 'erro');
  }
}

function editarFornecedor(codigo) {
  const fornecedor = fornecedores.find(f => Number(f.codigo) === Number(codigo));
  if (!fornecedor) return;

  $('fornecedorCodigoCadastro').value = fornecedor.codigo;
  $('fornecedorNomeCadastro').value = fornecedor.nome || '';
  $('fornecedorApelidoCadastro').value = fornecedor.apelido || '';
  $('fornecedorDataNascimentoCadastro').value = normalizarData(fornecedor.dataNascimento);
  $('fornecedorCpfCnpjCadastro').value = fornecedor.cpfCnpj || '';
  $('fornecedorRgCadastro').value = fornecedor.rg || '';
  $('fornecedorEmailCadastro').value = fornecedor.email || '';
  $('fornecedorCelularCadastro').value = fornecedor.celular || '';
  $('fornecedorTelefoneCadastro').value = fornecedor.telefone || '';
  $('fornecedorEnderecoCadastro').value = fornecedor.endereco || '';
  $('fornecedorNumeroCadastro').value = fornecedor.numero || '';
  $('fornecedorComplementoCadastro').value = fornecedor.complemento || '';
  $('fornecedorBairroCadastro').value = fornecedor.bairro || '';
  $('fornecedorCidadeCadastro').value = fornecedor.idCidade || '';
  selecionarPaisEstadoPorCidade('fornecedor', fornecedor.idCidade);
  $('fornecedorCepCadastro').value = fornecedor.cep || '';
  $('fornecedorAtivoCadastro').value = fornecedor.ativo === false ? 'false' : 'true';
  $('fornecedorGeneroCadastro').value = fornecedor.genero || '';
  $('fornecedorFormaPagamentoCadastro').value = fornecedor.idCondicaoPagamento || '';
  $('fornecedorLimiteCreditoCadastro').value = fornecedor.limiteCredito || 0;
  atualizarSelectsAnimados();
}

async function excluirFornecedor(codigo) {
  if (!window.confirm('Deseja excluir este fornecedor?')) return;

  try {
    if (USAR_BANCO) {
      await apiDelete(`/fornecedores/${codigo}`);
      fornecedores = await apiGet('/fornecedores');
    } else {
      fornecedores = fornecedores.filter(f => Number(f.codigo) !== Number(codigo));
    }

    limparFormFornecedor();
    atualizarTudoCadastrosEVenda();
    mostrarMensagem('Fornecedor excluído.', 'sucesso');
  } catch (erro) {
    console.error(erro);
    mostrarMensagem(mensagemErroApi(erro, 'excluir fornecedor'), 'erro');
  }
}

function limparFormFornecedor() {
  $('formFornecedor').reset();
  $('fornecedorCodigoCadastro').value = '';
  atualizarSelectsAnimados();
}

function dadosFuncionario() {
  return {
    funcionario: $('funcionarioNomeCadastro').value.trim(),
    apelido: $('funcionarioApelidoCadastro').value.trim(),
    dataNascimento: $('funcionarioDataNascimentoCadastro').value,
    cpf: $('funcionarioCpfCadastro').value.trim(),
    rg: $('funcionarioRgCadastro').value.trim(),
    cnh: $('funcionarioCnhCadastro').value.trim(),
    carteiraTrabalho: $('funcionarioCarteiraTrabalhoCadastro').value.trim(),
    idCargo: Number($('funcionarioCargoCadastro').value) || null,
    email: $('funcionarioEmailCadastro').value.trim(),
    celular: $('funcionarioCelularCadastro').value.trim(),
    telefone: $('funcionarioTelefoneCadastro').value.trim(),
    endereco: $('funcionarioEnderecoCadastro').value.trim(),
    numero: $('funcionarioNumeroCadastro').value.trim(),
    complemento: $('funcionarioComplementoCadastro').value.trim(),
    bairro: $('funcionarioBairroCadastro').value.trim(),
    idCidade: Number($('funcionarioCidadeCadastro').value) || null,
    cep: $('funcionarioCepCadastro').value.trim(),
    salario: obterDecimal($('funcionarioSalarioCadastro').value),
    ativo: $('funcionarioAtivoCadastro').value === 'true',
    genero: $('funcionarioGeneroCadastro').value
  };
}

async function salvarFuncionario(event) {
  event.preventDefault();
  const codigoEditando = Number($('funcionarioCodigoCadastro').value);
  const funcionario = dadosFuncionario();

  if (!funcionario.funcionario) {
    mostrarMensagem('Informe o nome do funcionário.', 'aviso');
    return;
  }

  try {
    if (USAR_BANCO) {
      if (codigoEditando) await apiPut(`/funcionarios/${codigoEditando}`, funcionario);
      else await apiPost('/funcionarios', funcionario);
      funcionarios = await apiGet('/funcionarios');
    } else if (codigoEditando) {
      Object.assign(funcionarios.find(f => Number(f.codigo) === codigoEditando), funcionario);
    } else {
      funcionarios.push({ codigo: proximoCodigo(funcionarios), ...funcionario });
    }

    limparFormFuncionario();
    atualizarTudoCadastrosEVenda();
    mostrarMensagem('Funcionário salvo com sucesso!', 'sucesso');
  } catch (erro) {
    console.error(erro);
    mostrarMensagem(mensagemErroApi(erro, 'salvar funcionário'), 'erro');
  }
}

function editarFuncionario(codigo) {
  const funcionario = funcionarios.find(f => Number(f.codigo) === Number(codigo));
  if (!funcionario) return;

  $('funcionarioCodigoCadastro').value = funcionario.codigo;
  $('funcionarioNomeCadastro').value = funcionario.funcionario || '';
  $('funcionarioApelidoCadastro').value = funcionario.apelido || '';
  $('funcionarioDataNascimentoCadastro').value = normalizarData(funcionario.dataNascimento);
  $('funcionarioCpfCadastro').value = funcionario.cpf || '';
  $('funcionarioRgCadastro').value = funcionario.rg || '';
  $('funcionarioCnhCadastro').value = funcionario.cnh || '';
  $('funcionarioCarteiraTrabalhoCadastro').value = funcionario.carteiraTrabalho || '';
  $('funcionarioCargoCadastro').value = funcionario.idCargo || '';
  $('funcionarioEmailCadastro').value = funcionario.email || '';
  $('funcionarioCelularCadastro').value = funcionario.celular || '';
  $('funcionarioTelefoneCadastro').value = funcionario.telefone || '';
  $('funcionarioEnderecoCadastro').value = funcionario.endereco || '';
  $('funcionarioNumeroCadastro').value = funcionario.numero || '';
  $('funcionarioComplementoCadastro').value = funcionario.complemento || '';
  $('funcionarioBairroCadastro').value = funcionario.bairro || '';
  $('funcionarioCidadeCadastro').value = funcionario.idCidade || '';
  selecionarPaisEstadoPorCidade('funcionario', funcionario.idCidade);
  $('funcionarioCepCadastro').value = funcionario.cep || '';
  $('funcionarioSalarioCadastro').value = funcionario.salario || 0;
  $('funcionarioAtivoCadastro').value = funcionario.ativo === false ? 'false' : 'true';
  $('funcionarioGeneroCadastro').value = funcionario.genero || '';
  atualizarSelectsAnimados();
}

async function excluirFuncionario(codigo) {
  if (!window.confirm('Deseja excluir este funcionário?')) return;

  try {
    if (USAR_BANCO) {
      await apiDelete(`/funcionarios/${codigo}`);
      funcionarios = await apiGet('/funcionarios');
    } else {
      funcionarios = funcionarios.filter(f => Number(f.codigo) !== Number(codigo));
    }

    limparFormFuncionario();
    atualizarTudoCadastrosEVenda();
    mostrarMensagem('Funcionário excluído.', 'sucesso');
  } catch (erro) {
    console.error(erro);
    mostrarMensagem('Erro ao excluir funcionário. Verifique se ele já foi usado em vendas.', 'erro');
  }
}

function limparFormFuncionario() {
  $('formFuncionario').reset();
  $('funcionarioCodigoCadastro').value = '';
  atualizarSelectsAnimados();
}

function recarregarProdutos() {
  const tabela = $('produtosCadastroTabela');
  if (!tabela) return;

  tabela.innerHTML = ordenarPorCodigo(produtos).map((produto, indice) => `
    <tr>
      <td>${indice + 1}</td>
      <td>${produto.nome || '-'}</td>
      <td>${formatarMoeda(produto.preco)}</td>
      <td>${produto.estoque}</td>
      <td>${produto.unidade || 'UN'}</td>
      <td>${produto.categoria || '-'}</td>
      <td>
        <button class="btn btn-azul btn-pequeno" onclick="editarProduto(${produto.codigo})">Editar</button>
        <button class="btn btn-vermelho btn-pequeno" onclick="excluirProduto(${produto.codigo})">Excluir</button>
      </td>
    </tr>
  `).join('');

  recarregarProdutosSemEstoque();
}

function recarregarClientes() {
  const tabela = $('clientesCadastroTabela');
  if (!tabela) return;

  tabela.innerHTML = ordenarPorCodigo(clientes).map((c, indice) => `
    <tr>
      <td>${indice + 1}</td>
      <td>${c.nome || '-'}</td>
      <td>${c.apelido || '-'}</td>
      <td>${c.cpfCnpj || '-'}</td>
      <td>${c.celular || '-'}</td>
      <td>${c.email || '-'}</td>
      <td>${c.cidade || '-'}</td>
      <td>${c.formaPagamento || '-'}</td>
      <td>${c.ativo === false ? 'Inativo' : 'Ativo'}</td>
      <td>${formatarMoeda(c.limiteCredito || 0)}</td>
      <td>
        <button class="btn btn-azul btn-pequeno" onclick="editarCliente(${c.codigo})">Editar</button>
        <button class="btn btn-vermelho btn-pequeno" onclick="excluirCliente(${c.codigo})">Excluir</button>
      </td>
    </tr>
  `).join('');
}

function recarregarFornecedores() {
  const tabela = $('fornecedoresCadastroTabela');
  if (!tabela) return;

  tabela.innerHTML = ordenarPorCodigo(fornecedores).map((f, indice) => `
    <tr>
      <td>${indice + 1}</td>
      <td>${f.nome || '-'}</td>
      <td>${f.apelido || '-'}</td>
      <td>${f.cpfCnpj || '-'}</td>
      <td>${f.celular || '-'}</td>
      <td>${f.email || '-'}</td>
      <td>${f.cidade || '-'}</td>
      <td>${f.formaPagamento || '-'}</td>
      <td>${f.ativo === false ? 'Inativo' : 'Ativo'}</td>
      <td>${formatarMoeda(f.limiteCredito || 0)}</td>
      <td>
        <button class="btn btn-azul btn-pequeno" onclick="editarFornecedor(${f.codigo})">Editar</button>
        <button class="btn btn-vermelho btn-pequeno" onclick="excluirFornecedor(${f.codigo})">Excluir</button>
      </td>
    </tr>
  `).join('');
}

function recarregarFuncionarios() {
  const tabela = $('funcionariosCadastroTabela');
  if (!tabela) return;

  tabela.innerHTML = ordenarPorCodigo(funcionarios).map((f, indice) => `
    <tr>
      <td>${indice + 1}</td>
      <td>${f.funcionario || '-'}</td>
      <td>${f.cpf || '-'}</td>
      <td>${f.cnh || '-'}</td>
      <td>${f.cargo || '-'}</td>
      <td>${f.celular || '-'}</td>
      <td>${f.ativo === false ? 'Inativo' : 'Ativo'}</td>
      <td>
        <button class="btn btn-azul btn-pequeno" onclick="editarFuncionario(${f.codigo})">Editar</button>
        <button class="btn btn-vermelho btn-pequeno" onclick="excluirFuncionario(${f.codigo})">Excluir</button>
      </td>
    </tr>
  `).join('');
}

function recarregarProdutosSemEstoque() {
  const tabela = $('produtosSemEstoqueTabela');
  const mensagem = $('mensagemSemEstoque');
  if (!tabela || !mensagem) return;

  const produtosZerados = produtos.filter(produto => Number(produto.estoque) === 0);

  if (produtosZerados.length === 0) {
    mensagem.textContent = 'Nenhum produto sem estoque no momento.';
    mensagem.className = 'mensagem-estoque mensagem-ok';
    tabela.innerHTML = '';
    return;
  }

  mensagem.textContent = `Atenção: existem ${produtosZerados.length} produto(s) sem estoque. Verifique a necessidade de reposição.`;
  mensagem.className = 'mensagem-estoque mensagem-alerta';

  tabela.innerHTML = produtosZerados.map(produto => `
    <tr>
      <td>${produto.codigo}</td>
      <td>${produto.nome}</td>
      <td>${produto.categoria || '-'}</td>
      <td>${formatarMoeda(produto.preco)}</td>
      <td>${produto.estoque}</td>
      <td>${produto.unidade || 'UN'}</td>
      <td>Produto sem estoque. Necessário repor.</td>
    </tr>
  `).join('');
}

function recarregarHistorico() {
  const tabela = $('historicoTabela');
  if (!tabela) return;

  if (vendas.length === 0) {
    tabela.innerHTML = '<tr><td colspan="7">Nenhuma venda realizada ainda.</td></tr>';
    return;
  }

  tabela.innerHTML = vendas.slice().reverse().map(v => {
    const itens = (v.itens || []).map(item => `${item.quantidade}x ${item.produtoNome}`).join('<br>');
    const data = new Date(v.data).toLocaleString(cultura);

    return `
      <tr>
        <td>${v.codigo}</td>
        <td>${data}</td>
        <td>${v.cliente ? v.cliente.nome : '-'}</td>
        <td>${v.funcionario ? v.funcionario.funcionario : '-'}</td>
        <td>
          Forma: ${v.formaPagamento || '-'}<br>
          Condição: ${v.condicaoPagamento || '-'}
        </td>
        <td>${formatarMoeda(v.total)}</td>
        <td>${itens}</td>
      </tr>
    `;
  }).join('');
}

function recarregarDashboard() {
  const totalVendas = vendas.length;
  const valorTotalVendido = vendas.reduce((total, venda) => total + (Number(venda.total) || 0), 0);
  const ticketMedio = totalVendas > 0 ? valorTotalVendido / totalVendas : 0;
  const produtosSemEstoque = produtos.filter(produto => Number(produto.estoque) === 0);

  $('dashTotalVendas').textContent = totalVendas;
  $('dashValorVendido').textContent = formatarMoeda(valorTotalVendido);
  $('dashProdutos').textContent = produtos.length;
  $('dashClientes').textContent = clientes.length;
  $('dashFornecedores').textContent = fornecedores.length;
  $('dashFuncionarios').textContent = funcionarios.length;
  $('dashSemEstoque').textContent = produtosSemEstoque.length;
  $('dashTicketMedio').textContent = formatarMoeda(ticketMedio);

  recarregarUltimasVendasDashboard();
  recarregarProdutosMaisVendidosDashboard();
}

function recarregarUltimasVendasDashboard() {
  const tabela = $('dashUltimasVendasTabela');
  if (!tabela) return;

  const ultimasVendas = vendas.slice().reverse().slice(0, 5);

  if (ultimasVendas.length === 0) {
    tabela.innerHTML = '<tr><td colspan="6">Nenhuma venda realizada ainda.</td></tr>';
    return;
  }

  tabela.innerHTML = ultimasVendas.map(venda => `
    <tr>
      <td>${venda.codigo}</td>
      <td>${new Date(venda.data).toLocaleString(cultura)}</td>
      <td>${venda.cliente ? venda.cliente.nome : '-'}</td>
      <td>${venda.funcionario ? venda.funcionario.funcionario : '-'}</td>
      <td>
        Forma: ${venda.formaPagamento || '-'}<br>
        Condição: ${venda.condicaoPagamento || '-'}
      </td>
      <td>${formatarMoeda(venda.total || 0)}</td>
    </tr>
  `).join('');
}

function recarregarProdutosMaisVendidosDashboard() {
  const tabela = $('dashProdutosMaisVendidosTabela');
  if (!tabela) return;

  const resumoProdutos = {};

  vendas.forEach(venda => {
    (venda.itens || []).forEach(item => {
      if (!resumoProdutos[item.produtoCodigo]) {
        resumoProdutos[item.produtoCodigo] = { nome: item.produtoNome, quantidade: 0, total: 0 };
      }

      resumoProdutos[item.produtoCodigo].quantidade += Number(item.quantidade) || 0;
      resumoProdutos[item.produtoCodigo].total += Number(item.subtotal) || 0;
    });
  });

  const produtosMaisVendidos = Object.values(resumoProdutos)
    .sort((a, b) => b.quantidade - a.quantidade)
    .slice(0, 5);

  if (produtosMaisVendidos.length === 0) {
    tabela.innerHTML = '<tr><td colspan="3">Nenhum produto vendido ainda.</td></tr>';
    return;
  }

  tabela.innerHTML = produtosMaisVendidos.map(produto => `
    <tr>
      <td>${produto.nome}</td>
      <td>${produto.quantidade}</td>
      <td>${formatarMoeda(produto.total)}</td>
    </tr>
  `).join('');
}

function recarregarLocalidades() {
  const paisesTabela = $('paisesCadastroTabela');
  const estadosTabela = $('estadosCadastroTabela');
  const cidadesTabela = $('cidadesCadastroTabela');
  const cargosTabela = $('cargosCadastroTabela');
  const categoriasTabela = $('categoriasCadastroTabela');
  const condicoesTabela = $('condicoesPagamentoTabela');

  if (paisesTabela) {
    paisesTabela.innerHTML = ordenarPorCodigo(paises).map((p, indice) => `
      <tr>
        <td>${indice + 1}</td>
        <td>${p.pais}</td>
        <td>${p.sigla || '-'}</td>
        <td>
          <button class="btn btn-azul btn-pequeno" onclick="editarPais(${p.codigo})">Editar</button>
          <button class="btn btn-vermelho btn-pequeno" onclick="excluirPais(${p.codigo})">Excluir</button>
        </td>
      </tr>
    `).join('');
  }

  if (estadosTabela) {
    estadosTabela.innerHTML = ordenarPorCodigo(estados).map((e, indice) => `
      <tr>
        <td>${indice + 1}</td>
        <td>${e.pais || '-'}</td>
        <td>${e.estado}</td>
        <td>${e.uf}</td>
        <td>
          <button class="btn btn-azul btn-pequeno" onclick="editarEstado(${e.codigo})">Editar</button>
          <button class="btn btn-vermelho btn-pequeno" onclick="excluirEstado(${e.codigo})">Excluir</button>
        </td>
      </tr>
    `).join('');
  }

  if (cidadesTabela) {
    cidadesTabela.innerHTML = ordenarPorCodigo(cidades).map((c, indice) => `
      <tr>
        <td>${indice + 1}</td>
        <td>${c.estado || '-'}</td>
        <td>${c.cidade}</td>
        <td>
          <button class="btn btn-azul btn-pequeno" onclick="editarCidade(${c.codigo})">Editar</button>
          <button class="btn btn-vermelho btn-pequeno" onclick="excluirCidade(${c.codigo})">Excluir</button>
        </td>
      </tr>
    `).join('');
  }

  if (cargosTabela) {
    cargosTabela.innerHTML = ordenarPorCodigo(cargos).map((c, indice) => `
      <tr>
        <td>${indice + 1}</td>
        <td>${c.cargo}</td>
        <td>
          <button class="btn btn-azul btn-pequeno" onclick="editarCargo(${c.codigo})">Editar</button>
          <button class="btn btn-vermelho btn-pequeno" onclick="excluirCargo(${c.codigo})">Excluir</button>
        </td>
      </tr>
    `).join('');
  }

  if (categoriasTabela) {
    categoriasTabela.innerHTML = ordenarPorCodigo(categorias).map((c, indice) => `
      <tr>
        <td>${indice + 1}</td>
        <td>${c.nome}</td>
        <td>
          <button class="btn btn-azul btn-pequeno" onclick="editarCategoria(${c.codigo})">Editar</button>
          <button class="btn btn-vermelho btn-pequeno" onclick="excluirCategoria(${c.codigo})">Excluir</button>
        </td>
      </tr>
    `).join('');
  }

  if (condicoesTabela) {
    condicoesTabela.innerHTML = ordenarPorCodigo(condicoesPagamento).map((c, indice) => `
      <tr>
        <td>${indice + 1}</td>
        <td>${c.descricao}</td>
        <td>${c.parcelas}</td>
        <td>${c.ativo === false ? 'Inativo' : 'Ativo'}</td>
        <td>
          <button class="btn btn-azul btn-pequeno" onclick="editarCondicaoPagamento(${c.codigo})">Editar</button>
        </td>
      </tr>
    `).join('');
  }
}

async function salvarGenerico(event, tipo) {
  event.preventDefault();

  const mapa = {
    pais: {
      codigo: $('paisCodigoCadastro'),
      caminho: '/paises',
      dados: () => ({ pais: $('paisNomeCadastro').value.trim(), sigla: $('paisSiglaCadastro').value.trim() }),
      validar: dados => dados.pais,
      erro: 'Informe o país.',
      recarregar: async () => { paises = await apiGet('/paises'); }
    },
    estado: {
      codigo: $('estadoCodigoCadastro'),
      caminho: '/estados',
      dados: () => ({ idPais: Number($('estadoPaisCadastro').value), estado: $('estadoNomeCadastro').value.trim(), uf: $('estadoSiglaCadastro').value.trim() }),
      validar: dados => dados.idPais && dados.estado && dados.uf,
      erro: 'Informe país, estado e UF.',
      recarregar: async () => { estados = await apiGet('/estados'); }
    },
    cidade: {
      codigo: $('cidadeCodigoCadastro'),
      caminho: '/cidades',
      dados: () => ({ idEstado: Number($('cidadeEstadoCadastro').value), cidade: $('cidadeNomeCadastro').value.trim() }),
      validar: dados => dados.idEstado && dados.cidade,
      erro: 'Informe estado e cidade.',
      recarregar: async () => { cidades = await apiGet('/cidades'); }
    },
    cargo: {
      codigo: $('cargoCodigoCadastro'),
      caminho: '/cargos',
      dados: () => ({ cargo: $('cargoNomeCadastro').value.trim() }),
      validar: dados => dados.cargo,
      erro: 'Informe o cargo.',
      recarregar: async () => { cargos = await apiGet('/cargos'); }
    },
    categoria: {
      codigo: $('categoriaCodigoCadastro'),
      caminho: '/categorias',
      dados: () => ({ nome: $('categoriaNomeCadastro').value.trim() }),
      validar: dados => dados.nome,
      erro: 'Informe a categoria.',
      recarregar: async () => { categorias = await apiGet('/categorias'); }
    },
    condicao: {
      codigo: $('condicaoCodigoCadastro'),
      caminho: '/condicoes-pagamento',
      dados: () => ({ descricao: $('condicaoDescricaoCadastro').value.trim(), parcelas: Number($('condicaoParcelasCadastro').value) || 1, ativo: $('condicaoAtivoCadastro').value === 'true' }),
      validar: dados => dados.descricao,
      erro: 'Informe a descrição da condição.',
      recarregar: async () => { condicoesPagamento = await apiGet('/condicoes-pagamento'); }
    }
  };

  const config = mapa[tipo];
  const dados = config.dados();

  if (!config.validar(dados)) {
    mostrarMensagem(config.erro, 'aviso');
    return;
  }

  try {
    const codigo = Number(config.codigo.value);
    if (codigo) await apiPut(`${config.caminho}/${codigo}`, dados);
    else await apiPost(config.caminho, dados);

    await config.recarregar();
    limparLocalidades();
    atualizarTudoCadastrosEVenda();
    mostrarMensagem('Cadastro salvo com sucesso.', 'sucesso');
  } catch (erro) {
    console.error(erro);
    mostrarMensagem(mensagemErroApi(erro, 'salvar cadastro'), 'erro');
  }
}

function editarPais(codigo) {
  const p = paises.find(item => Number(item.codigo) === Number(codigo));
  if (!p) return;
  $('paisCodigoCadastro').value = p.codigo;
  $('paisNomeCadastro').value = p.pais || '';
  $('paisSiglaCadastro').value = p.sigla || '';
}

function editarEstado(codigo) {
  const e = estados.find(item => Number(item.codigo) === Number(codigo));
  if (!e) return;
  $('estadoCodigoCadastro').value = e.codigo;
  $('estadoPaisCadastro').value = e.idPais || '';
  $('estadoNomeCadastro').value = e.estado || '';
  $('estadoSiglaCadastro').value = e.uf || '';
  atualizarSelectAnimado($('estadoPaisCadastro'));
}

function editarCidade(codigo) {
  const c = cidades.find(item => Number(item.codigo) === Number(codigo));
  if (!c) return;
  $('cidadeCodigoCadastro').value = c.codigo;
  $('cidadeEstadoCadastro').value = c.idEstado || '';
  $('cidadeNomeCadastro').value = c.cidade || '';
  atualizarSelectAnimado($('cidadeEstadoCadastro'));
}

function editarCargo(codigo) {
  const c = cargos.find(item => Number(item.codigo) === Number(codigo));
  if (!c) return;
  $('cargoCodigoCadastro').value = c.codigo;
  $('cargoNomeCadastro').value = c.cargo || '';
}

function editarCategoria(codigo) {
  const categoria = categorias.find(item => Number(item.codigo) === Number(codigo));
  if (!categoria) return;
  $('categoriaCodigoCadastro').value = categoria.codigo;
  $('categoriaNomeCadastro').value = categoria.nome || '';
}

async function excluirCategoria(codigo) {
  const categoria = categorias.find(item => Number(item.codigo) === Number(codigo));

  if (!categoria) {
    mostrarMensagem('Categoria não encontrada.', 'aviso');
    return;
  }

  if (!confirm(`Deseja realmente excluir a categoria "${categoria.nome}"?`)) {
    return;
  }

  try {
    await apiDelete(`/categorias/${codigo}`);
    categorias = await apiGet('/categorias');
    produtos = await apiGet('/produtos');
    limparLocalidades();
    atualizarTudoCadastrosEVenda();
    recarregarLocalidades();
    mostrarMensagem('Categoria excluída com sucesso.', 'sucesso');
  } catch (erro) {
    console.error(erro);
    mostrarMensagem(mensagemErroApi(erro, 'excluir categoria'), 'erro');
  }
}

function editarCondicaoPagamento(codigo) {
  const c = condicoesPagamento.find(item => Number(item.codigo) === Number(codigo));
  if (!c) return;
  $('condicaoCodigoCadastro').value = c.codigo;
  $('condicaoDescricaoCadastro').value = c.descricao || '';
  $('condicaoParcelasCadastro').value = c.parcelas || 1;
  $('condicaoAtivoCadastro').value = c.ativo === false ? 'false' : 'true';
  atualizarSelectAnimado($('condicaoAtivoCadastro'));
}

function limparLocalidades() {
  ['formPais', 'formEstado', 'formCidade', 'formCargo', 'formCategoria', 'formCondicaoPagamento'].forEach(id => $(id)?.reset());
  ['paisCodigoCadastro', 'estadoCodigoCadastro', 'cidadeCodigoCadastro', 'cargoCodigoCadastro', 'categoriaCodigoCadastro', 'condicaoCodigoCadastro'].forEach(id => {
    if ($(id)) $(id).value = '';
  });
  atualizarSelectsAnimados();
}

async function limparHistorico() {
  const confirmar = confirm(
    'Deseja realmente limpar todo o histórico de vendas? Essa ação também apagará os dados no MySQL.'
  );

  if (!confirmar) {
    return;
  }

  try {
    await apiDelete('/historico');

    vendas = [];
    carrinho = [];
    codigoSelecionadoNaTabela = null;

    recarregarHistorico();
    recarregarTabela();
    atualizarTotais();

    if (reciboTexto) {
      reciboTexto.value = 'O recibo será gerado após finalizar a venda.';
    }

    recarregarDashboard();

    mostrarMensagem('Histórico limpo com sucesso no sistema e no MySQL.', 'sucesso');
  } catch (erro) {
    console.error(erro);
    mostrarMensagem(mensagemErroApi(erro, 'limpar histórico'), 'erro');
  }
}

function atualizarTudoCadastrosEVenda() {
  preencherProdutos();
  preencherClientesVenda();
  preencherFuncionariosVenda();
  preencherFormasPagamento();
  preencherCondicoesPagamento();
  preencherCategoriasProdutos();
  preencherLocalidadesNosFormularios();

  preencherSelect($('estadoPaisCadastro'), paises, 'codigo', 'pais', 'Selecionar');
  preencherSelect($('cidadeEstadoCadastro'), estados, 'codigo', e => `${e.estado} - ${e.uf}`, 'Selecionar');

  recarregarProdutos();
  recarregarClientes();
  recarregarFornecedores();
  recarregarFuncionarios();
  recarregarLocalidades();
  recarregarHistorico();
  recarregarDashboard();
  atualizarProdutoSelecionado();
  atualizarTotais();
  atualizarSelectsAnimados();
}

function aplicarTemaSalvo() {
  const temaSalvo = localStorage.getItem('temaSistema');

  if (temaSalvo === 'escuro') {
    document.body.classList.add('tema-escuro');
    btnTema.textContent = 'Tema Claro';
  } else {
    document.body.classList.remove('tema-escuro');
    btnTema.textContent = 'Tema Escuro';
  }
}

function alterarTema() {
  const escuro = document.body.classList.toggle('tema-escuro');
  localStorage.setItem('temaSistema', escuro ? 'escuro' : 'claro');
  btnTema.textContent = escuro ? 'Tema Claro' : 'Tema Escuro';
  mostrarMensagem(escuro ? 'Tema escuro ativado.' : 'Tema claro ativado.', 'sucesso');
}

function mascaraCpfCnpj(valor) {
  const numeros = valor.replace(/\D/g, '').slice(0, 14);

  if (numeros.length <= 11) {
    return numeros
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }

  return numeros
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

function mascaraTelefone(valor) {
  const numeros = valor.replace(/\D/g, '').slice(0, 11);

  if (numeros.length <= 10) {
    return numeros
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }

  return numeros
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
}

function mascaraCep(valor) {
  return valor.replace(/\D/g, '').slice(0, 8).replace(/(\d{5})(\d)/, '$1-$2');
}

function mascaraRg(valor) {
  return valor
    .replace(/\D/g, '')
    .slice(0, 9)
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1})$/, '$1-$2');
}

function aplicarMascaras() {
  ['clienteCpfCadastro', 'fornecedorCpfCnpjCadastro'].forEach(id => {
    $(id)?.addEventListener('input', event => {
      event.target.value = mascaraCpfCnpj(event.target.value);
    });
  });

  $('funcionarioCpfCadastro')?.addEventListener('input', event => {
    event.target.value = mascaraCpfCnpj(event.target.value).slice(0, 14);
  });

  ['clienteCelularCadastro', 'clienteTelefoneCadastro', 'fornecedorCelularCadastro', 'fornecedorTelefoneCadastro', 'funcionarioCelularCadastro', 'funcionarioTelefoneCadastro'].forEach(id => {
    $(id)?.addEventListener('input', event => {
      event.target.value = mascaraTelefone(event.target.value);
    });
  });

  ['clienteCepCadastro', 'fornecedorCepCadastro', 'funcionarioCepCadastro'].forEach(id => {
    $(id)?.addEventListener('input', event => {
      event.target.value = mascaraCep(event.target.value);
    });
  });

  ['clienteRgCadastro', 'fornecedorRgCadastro', 'funcionarioRgCadastro'].forEach(id => {
    $(id)?.addEventListener('input', event => {
      event.target.value = mascaraRg(event.target.value);
    });
  });
}

function atualizarSelectAnimado(select) {
  if (!select) return;
  const wrapper = select.closest('.select-animado');
  if (!wrapper) return;

  const botao = wrapper.querySelector('.select-botao');
  const lista = wrapper.querySelector('.select-opcoes');
  const optionSelecionada = select.options[select.selectedIndex];

  if (botao) botao.textContent = optionSelecionada ? optionSelecionada.textContent : 'Selecionar';
  if (!lista) return;

  lista.innerHTML = '';
  Array.from(select.options).forEach(option => {
    const item = document.createElement('div');
    item.className = 'select-opcao';
    item.textContent = option.textContent;
    item.dataset.value = option.value;

    if (option.value === select.value) item.classList.add('selecionada');

    item.addEventListener('click', () => {
      select.value = option.value;
      select.dispatchEvent(new Event('change'));
      atualizarSelectAnimado(select);
      wrapper.classList.remove('aberto');
    });

    lista.appendChild(item);
  });
}

function atualizarSelectsAnimados() {
  document.querySelectorAll('select').forEach(select => atualizarSelectAnimado(select));
}

function criarSelectsAnimados() {
  document.querySelectorAll('select').forEach(select => {
    if (select.dataset.animado === 'true') {
      atualizarSelectAnimado(select);
      return;
    }

    select.dataset.animado = 'true';
    const wrapper = document.createElement('div');
    wrapper.className = 'select-animado';

    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'select-botao';

    const lista = document.createElement('div');
    lista.className = 'select-opcoes';

    select.parentNode.insertBefore(wrapper, select);
    wrapper.appendChild(select);
    wrapper.appendChild(botao);
    wrapper.appendChild(lista);

    botao.addEventListener('click', event => {
      event.stopPropagation();
      document.querySelectorAll('.select-animado.aberto').forEach(aberto => {
        if (aberto !== wrapper) aberto.classList.remove('aberto');
      });
      atualizarSelectAnimado(select);
      wrapper.classList.toggle('aberto');
    });

    select.addEventListener('change', () => atualizarSelectAnimado(select));
    atualizarSelectAnimado(select);
  });

  document.addEventListener('click', () => {
    document.querySelectorAll('.select-animado.aberto').forEach(wrapper => wrapper.classList.remove('aberto'));
  });
}

function filtrarEstadosPorPais(prefixo) {
  const paisSelect = $(`${prefixo}PaisCadastro`);
  const estadoSelect = $(`${prefixo}EstadoCadastro`);
  const cidadeSelect = $(`${prefixo}CidadeCadastro`);

  if (!paisSelect || !estadoSelect) {
    return;
  }

  const idPais = Number(paisSelect.value);

  const estadosFiltrados = estados.filter(estado => {
    return !idPais || Number(estado.idPais) === idPais;
  });

  preencherSelect(
    estadoSelect,
    estadosFiltrados,
    'codigo',
    estado => `${estado.estado} - ${estado.uf}`,
    'Selecionar'
  );

  if (cidadeSelect) {
    preencherSelect(
      cidadeSelect,
      [],
      'codigo',
      'cidade',
      'Selecionar'
    );
  }

  atualizarSelectsAnimados();
}

function filtrarCidadesPorEstado(prefixo) {
  const estadoSelect = $(`${prefixo}EstadoCadastro`);
  const cidadeSelect = $(`${prefixo}CidadeCadastro`);

  if (!estadoSelect || !cidadeSelect) {
    return;
  }

  const idEstado = Number(estadoSelect.value);

  const cidadesFiltradas = cidades.filter(cidade => {
    return !idEstado || Number(cidade.idEstado) === idEstado;
  });

  preencherSelect(
    cidadeSelect,
    cidadesFiltradas,
    'codigo',
    cidade => `${cidade.cidade} - ${cidade.uf}`,
    'Selecionar'
  );

  atualizarSelectsAnimados();
}

function registrarEventos() {
  btnTema?.addEventListener('click', alterarTema);
  $('formLogin')?.addEventListener('submit', fazerLogin);
  btnTema?.addEventListener('click', alterarTema);
  $('btnAtualizarDashboard')?.addEventListener('click', async () => {
    await carregarDadosDoBanco(true);
  });

  document.querySelectorAll('.menu-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      await navegarPara(btn.dataset.tela);
    });
  });

  produtoSelect?.addEventListener('change', atualizarProdutoSelecionado);
  clienteVendaSelect?.addEventListener('change', atualizarCondicaoPagamentoPeloCliente);
  quantidadeInput?.addEventListener('keydown', event => {
    if (event.key === 'Enter') adicionarProduto();
  });
  descontoInput?.addEventListener('input', atualizarTotais);
  recebidoInput?.addEventListener('input', atualizarTotais);

  $('btnAdicionar')?.addEventListener('click', adicionarProduto);
  $('btnRemover')?.addEventListener('click', removerItemSelecionado);
  $('btnFinalizar')?.addEventListener('click', finalizarVenda);
  $('btnLimpar')?.addEventListener('click', () => limparVendaAtual(true));
  $('btnSair')?.addEventListener('click', sairDoSistema);
  $('btnLimparHistorico')?.addEventListener('click', limparHistorico);

  $('formProduto')?.addEventListener('submit', salvarProduto);
  $('btnNovoProduto')?.addEventListener('click', limparFormProduto);

  $('formCliente')?.addEventListener('submit', salvarCliente);
  $('btnNovoCliente')?.addEventListener('click', limparFormCliente);

  $('formFornecedor')?.addEventListener('submit', salvarFornecedor);
  $('btnNovoFornecedor')?.addEventListener('click', limparFormFornecedor);

  $('formFuncionario')?.addEventListener('submit', salvarFuncionario);
  $('btnNovoFuncionario')?.addEventListener('click', limparFormFuncionario);

  $('formPais')?.addEventListener('submit', event => salvarGenerico(event, 'pais'));
  $('formEstado')?.addEventListener('submit', event => salvarGenerico(event, 'estado'));
  $('formCidade')?.addEventListener('submit', event => salvarGenerico(event, 'cidade'));
  $('formCargo')?.addEventListener('submit', event => salvarGenerico(event, 'cargo'));
  $('formCategoria')?.addEventListener('submit', event => salvarGenerico(event, 'categoria'));
  $('formCondicaoPagamento')?.addEventListener('submit', event => salvarGenerico(event, 'condicao'));

  $('btnNovoPais')?.addEventListener('click', limparLocalidades);
  $('btnNovoEstado')?.addEventListener('click', limparLocalidades);
  $('btnNovoCidade')?.addEventListener('click', limparLocalidades);
  $('btnNovoCargo')?.addEventListener('click', limparLocalidades);
  $('btnNovoCategoria')?.addEventListener('click', limparLocalidades);
  $('btnNovoCondicao')?.addEventListener('click', limparLocalidades);
  $('btnFecharPermissao')?.addEventListener('click', fecharBloqueioPermissao);

  const btnLimparHistorico = $('btnLimparHistorico');

  if (btnLimparHistorico) {
    btnLimparHistorico.addEventListener('click', limparHistorico);
  }

  ['cliente', 'fornecedor', 'funcionario'].forEach(prefixo => {
    $(`${prefixo}PaisCadastro`)?.addEventListener('change', () => {
      filtrarEstadosPorPais(prefixo);
    });

    $(`${prefixo}EstadoCadastro`)?.addEventListener('change', () => {
      filtrarCidadesPorEstado(prefixo);
    });
  });

}

async function excluirPais(codigo) {
  const pais = paises.find(item => Number(item.codigo) === Number(codigo));

  if (!pais) {
    mostrarMensagem('País não encontrado.', 'aviso');
    return;
  }

  const confirmar = confirm(
    `Deseja realmente excluir o país "${pais.pais}"?`
  );

  if (!confirmar) {
    return;
  }

  try {
    await apiDelete(`/paises/${codigo}`);

    paises = await apiGet('/paises');
    estados = await apiGet('/estados');
    cidades = await apiGet('/cidades');

    limparLocalidades();
    atualizarTudoCadastrosEVenda();
    recarregarLocalidades();

    mostrarMensagem('País excluído com sucesso.', 'sucesso');
  } catch (erro) {
    console.error(erro);
    mostrarMensagem(mensagemErroApi(erro, 'excluir país'), 'erro');
  }
}

async function excluirEstado(codigo) {
  const estado = estados.find(item => Number(item.codigo) === Number(codigo));

  if (!estado) {
    mostrarMensagem('Estado não encontrado.', 'aviso');
    return;
  }

  const confirmar = confirm(
    `Deseja realmente excluir o estado "${estado.estado}"?`
  );

  if (!confirmar) {
    return;
  }

  try {
    await apiDelete(`/estados/${codigo}`);

    estados = await apiGet('/estados');
    cidades = await apiGet('/cidades');

    limparLocalidades();
    atualizarTudoCadastrosEVenda();
    recarregarLocalidades();

    mostrarMensagem('Estado excluído com sucesso.', 'sucesso');
  } catch (erro) {
    console.error(erro);
    mostrarMensagem(mensagemErroApi(erro, 'excluir estado'), 'erro');
  }
}

async function excluirCidade(codigo) {
  const cidade = cidades.find(item => Number(item.codigo) === Number(codigo));

  if (!cidade) {
    mostrarMensagem('Cidade não encontrada.', 'aviso');
    return;
  }

  const confirmar = confirm(
    `Deseja realmente excluir a cidade "${cidade.cidade}"?`
  );

  if (!confirmar) {
    return;
  }

  try {
    await apiDelete(`/cidades/${codigo}`);

    cidades = await apiGet('/cidades');

    limparLocalidades();
    atualizarTudoCadastrosEVenda();
    recarregarLocalidades();

    mostrarMensagem('Cidade excluída com sucesso.', 'sucesso');
  } catch (erro) {
    console.error(erro);
    mostrarMensagem(mensagemErroApi(erro, 'excluir cidade'), 'erro');
  }
}

async function excluirCargo(codigo) {
  const cargo = cargos.find(item => Number(item.codigo) === Number(codigo));

  if (!cargo) {
    mostrarMensagem('Cargo não encontrado.', 'aviso');
    return;
  }

  const confirmar = confirm(
    `Deseja realmente excluir o cargo "${cargo.cargo}"?`
  );

  if (!confirmar) {
    return;
  }

  try {
    await apiDelete(`/cargos/${codigo}`);

    cargos = await apiGet('/cargos');

    limparLocalidades();
    atualizarTudoCadastrosEVenda();
    recarregarLocalidades();

    mostrarMensagem('Cargo excluído com sucesso.', 'sucesso');
  } catch (erro) {
    console.error(erro);
    mostrarMensagem(mensagemErroApi(erro, 'excluir cargo'), 'erro');
  }
}

window.editarProduto = editarProduto;
window.excluirProduto = excluirProduto;

window.editarCliente = editarCliente;
window.excluirCliente = excluirCliente;

window.editarFornecedor = editarFornecedor;
window.excluirFornecedor = excluirFornecedor;

window.editarFuncionario = editarFuncionario;
window.excluirFuncionario = excluirFuncionario;

window.editarPais = editarPais;
window.excluirPais = excluirPais;

window.editarEstado = editarEstado;
window.excluirEstado = excluirEstado;

window.editarCidade = editarCidade;
window.excluirCidade = excluirCidade;

window.editarCargo = editarCargo;
window.excluirCargo = excluirCargo;

window.editarCategoria = editarCategoria;
window.excluirCategoria = excluirCategoria;

window.editarCondicaoPagamento = editarCondicaoPagamento;
window.fecharBloqueioPermissao = fecharBloqueioPermissao;

window.limparHistorico = limparHistorico;

window.sairDoSistema = sairDoSistema;

async function inicializarSistema() {
  registrarEventos();
  aplicarTemaSalvo();
  aplicarMascaras();
  criarSelectsAnimados();
  atualizarRelogio();
  setInterval(atualizarRelogio, 1000);
  verificarLoginSalvo();
  atualizarBotoesPorPermissao();
}

inicializarSistema();
