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
      'marcas',
      'formasPagamento',
      'condicoes',
      'historico'
    ]
  },
  {
    usuario: 'Gerente',
    senha: '1234',
    perfil: 'Gerente',
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
      'marcas',
      'formasPagamento',
      'condicoes', 
      'historico'
    ]
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
let marcas = [];
let clientes = [];
let fornecedores = [];
let funcionarios = [];
let vendas = [];
let paises = [];
let estados = [];
let cidades = [];
let cargos = [];
let condicoesPagamento = [];
let formasPagamentoCadastro = [];
let unidades = [];
let parcelas = [];
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
      marcas,
      formasPagamentoCadastro,
      unidades,
      parcelas,
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
      apiGet('/marcas'),
      apiGet('/formas-pagamento'),
      apiGet('/unidades'),
      apiGet('/parcelas'),
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
    tela === 'marcas' ||
    tela === 'formasPagamento' ||
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
    .filter(itemProduto => itemProduto.ativo !== false);

  produtoSelect.innerHTML = '<option value="">Selecione</option>';

  produtosOrdenados.forEach((itemProduto, indice) => {
    const option = document.createElement('option');

    option.value = itemProduto.codigo;
    option.textContent = `${indice + 1} - ${itemProduto.produto}`;

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
  if (!formaPagamentoSelect) {
    return;
  }

  if (!formaPagamentoSelect.value && $('formaPagamentoNomeVenda')) {
    $('formaPagamentoNomeVenda').value = '';
  }
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
  preencherSelect($('funcionarioCargoCadastro'), cargos, 'codigo', 'cargo', 'Selecionar');
}

function selecionarPaisEstadoPorCidade(prefixo, idCidade) {
  const cidade = cidades.find(c => Number(c.codigo) === Number(idCidade));

  if (!cidade) {
    return;
  }

  const cidadeId = $(`${prefixo}CidadeCadastro`);
  const cidadeNome = $(`${prefixo}CidadeNomeCadastro`);
  const uf = $(`${prefixo}UfCadastro`);

  if (cidadeId) {
    cidadeId.value = cidade.codigo || '';
  }

  if (cidadeNome) {
    cidadeNome.value = cidade.cidade || '';
  }

  if (uf) {
    uf.value = cidade.uf || '';
  }
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
      <td>${item.produto.produto}</td>
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
  const forma = formaPagamentoSelect?.value || '';

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
  linhas.push(`Forma de pagamento: ${forma || '-'}`);
  linhas.push(`Condição de pagamento: ${condicao ? condicao.descricao : '-'}`);
  linhas.push('------------------------------------');

  carrinho.forEach(item => {
    linhas.push(item.produto.produto);
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
    formaPagamento: formaPagamentoSelect.value || '',
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
      produtoNome: item.produto.produto,
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

const CAMPOS_OBRIGATORIOS_CADASTROS = {
  produto: [
    {
      id: 'produtoNomeCadastro',
      nome: 'Produto'
    },
    {
      id: 'produtoPrecoCadastro',
      nome: 'Preço'
    },
    {
      id: 'produtoEstoqueCadastro',
      nome: 'Estoque'
    },
    {
      id: 'produtoUnidadeCadastro',
      nome: 'Unidade'
    },
    {
      id: 'produtoCategoriaCadastro',
      nome: 'Categoria'
    }
  ],

  cliente: [
    {
      id: 'clienteTipoCadastro',
      nome: 'Tipo'
    },
    {
      id: 'clienteNomeCadastro',
      nome: 'Cliente'
    },
    {
      id: 'clienteCpfCadastro',
      nome: 'CPF/CNPJ'
    },
    {
      id: 'clienteCelularCadastro',
      nome: 'Celular'
    },
    {
      id: 'clienteCidadeCadastro',
      nome: 'Cidade'
    },
    {
      id: 'clienteAtivoCadastro',
      nome: 'Ativo'
    },
    {
      id: 'clienteFormaPagamentoCadastro',
      nome: 'Condição de pagamento padrão'
    }
  ],

  fornecedor: [
    {
      id: 'fornecedorTipoCadastro',
      nome: 'Tipo'
    },
    {
      id: 'fornecedorNomeCadastro',
      nome: 'Fornecedor'
    },
    {
      id: 'fornecedorCpfCnpjCadastro',
      nome: 'CPF/CNPJ'
    },
    {
      id: 'fornecedorCelularCadastro',
      nome: 'Celular'
    },
    {
      id: 'fornecedorCidadeCadastro',
      nome: 'Cidade'
    },
    {
      id: 'fornecedorAtivoCadastro',
      nome: 'Ativo'
    },
    {
      id: 'fornecedorFormaPagamentoCadastro',
      nome: 'Condição de pagamento padrão'
    }
  ],

  funcionario: [
    {
      id: 'funcionarioTipoCadastro',
      nome: 'Tipo'
    },
    {
      id: 'funcionarioNomeCadastro',
      nome: 'Funcionário'
    },
    {
      id: 'funcionarioCpfCadastro',
      nome: 'CPF/CNPJ'
    },
    {
      id: 'funcionarioCargoCadastro',
      nome: 'Cargo'
    },
    {
      id: 'funcionarioCelularCadastro',
      nome: 'Celular'
    },
    {
      id: 'funcionarioCidadeCadastro',
      nome: 'Cidade'
    },
    {
      id: 'funcionarioAtivoCadastro',
      nome: 'Ativo'
    }
  ],

  pais: [
    {
      id: 'paisNomeCadastro',
      nome: 'País'
    },
    {
      id: 'paisSiglaCadastro',
      nome: 'Sigla'
    }
  ],

  estado: [
    {
      id: 'estadoPaisCadastro',
      nome: 'País'
    },
    {
      id: 'estadoNomeCadastro',
      nome: 'Estado'
    },
    {
      id: 'estadoSiglaCadastro',
      nome: 'Sigla'
    }
  ],

  cidade: [
    {
      id: 'cidadeEstadoCadastro',
      nome: 'Estado'
    },
    {
      id: 'cidadeNomeCadastro',
      nome: 'Cidade'
    }
  ],

  cargo: [
    {
      id: 'cargoNomeCadastro',
      nome: 'Cargo'
    }
  ],

  categoria: [
    {
      id: 'categoriaNomeCadastro',
      nome: 'Categoria'
    }
  ],

  condicao: [
    {
      id: 'condicaoDescricaoCadastro',
      nome: 'Descrição'
    },
    {
      id: 'condicaoParcelasCadastro',
      nome: 'Parcelas'
    },
    {
      id: 'condicaoAtivoCadastro',
      nome: 'Ativo'
    }
  ]
};

function obterTodosCamposObrigatorios() {
  return Object.values(CAMPOS_OBRIGATORIOS_CADASTROS).flat();
}

function aplicarAsteriscosObrigatorios() {
  obterTodosCamposObrigatorios().forEach(campoObrigatorio => {
    const campo = $(campoObrigatorio.id);

    if (!campo) {
      return;
    }

    const label = document.querySelector(`label[for="${campoObrigatorio.id}"]`);

    if (!label) {
      return;
    }

    if (label.querySelector('.campo-obrigatorio')) {
      return;
    }

    const asterisco = document.createElement('span');
    asterisco.className = 'campo-obrigatorio';
    asterisco.textContent = '*';

    label.appendChild(asterisco);
  });
}

function limparErrosObrigatorios() {
  document.querySelectorAll('.input-obrigatorio-vazio').forEach(campo => {
    campo.classList.remove('input-obrigatorio-vazio');
  });
}

function valorCampoObrigatorioVazio(campo) {
  if (!campo) {
    return false;
  }

  const valor = String(campo.value || '').trim();

  return valor === '';
}

function marcarCampoObrigatorioVazio(campo) {
  if (!campo) {
    return;
  }

  campo.classList.add('input-obrigatorio-vazio');

  const selectAnimado = campo.closest('.select-wrapper') || campo.parentElement;

  if (selectAnimado && selectAnimado.classList.contains('select-custom')) {
    selectAnimado.classList.add('input-obrigatorio-vazio');
  }
}

function removerErroCampoObrigatorio(campo) {
  if (!campo) {
    return;
  }

  campo.classList.remove('input-obrigatorio-vazio');

  const selectAnimado = campo.closest('.select-wrapper') || campo.parentElement;

  if (selectAnimado && selectAnimado.classList.contains('select-custom')) {
    selectAnimado.classList.remove('input-obrigatorio-vazio');
  }
}

function validarCamposObrigatorios(campos) {
  limparErrosObrigatorios();

  const camposVazios = [];

  campos.forEach(campoObrigatorio => {
    const campo = $(campoObrigatorio.id);

    if (!campo) {
      return;
    }

    if (valorCampoObrigatorioVazio(campo)) {
      camposVazios.push(campoObrigatorio);
      marcarCampoObrigatorioVazio(campo);
    }
  });

  if (camposVazios.length === 0) {
    return true;
  }

  const primeiroCampo = $(camposVazios[0].id);

  if (primeiroCampo) {
    primeiroCampo.focus();
  }

  mostrarMensagem(
    `Preencha o campo obrigatório: ${camposVazios[0].nome}.`,
    'erro'
  );

  return false;
}

function validarCadastroObrigatorio(tipo) {
  const campos = CAMPOS_OBRIGATORIOS_CADASTROS[tipo] || [];

  return validarCamposObrigatorios(campos);
}

function ativarRemocaoErroObrigatorio() {
  document.querySelectorAll('input, select, textarea').forEach(campo => {
    campo.addEventListener('input', () => {
      if (!valorCampoObrigatorioVazio(campo)) {
        removerErroCampoObrigatorio(campo);
      }
    });

    campo.addEventListener('change', () => {
      if (!valorCampoObrigatorioVazio(campo)) {
        removerErroCampoObrigatorio(campo);
      }
    });
  });
}

async function salvarProduto(event) {
  event.preventDefault();

  if (!validarCadastroObrigatorio('produto')) {
    return;
  }

  const codigoEditando = Number($('produtoCodigoCadastro').value);

  const dadosProduto = {
    produto: $('produtoNomeCadastro').value.trim().toUpperCase(),
    preco: obterDecimal($('produtoPrecoCadastro').value),
    unidade: $('produtoUnidadeCadastro').value || 'UN',
    categoria: $('produtoCategoriaCadastro').value.trim().toUpperCase(),
    marca: $('produtoMarcaCadastro')?.value.trim().toUpperCase() || ''
  };

  if (!dadosProduto.produto || dadosProduto.preco <= 0) {
    mostrarMensagem('Preencha produto e preço corretamente.', 'aviso');
    return;
  }

  try {
    if (USAR_BANCO) {
      if (codigoEditando) {
        await apiPut(`/produtos/${codigoEditando}`, dadosProduto);
      } else {
        await apiPost('/produtos', {
          ...dadosProduto,
          estoque: 0,
          custo: 0
        });
      }

      produtos = await apiGet('/produtos');
    } else if (codigoEditando) {
      Object.assign(produtos.find(p => Number(p.codigo) === codigoEditando), dadosProduto);
    } else {
      produtos.push({
        codigo: proximoCodigo(produtos),
        ...dadosProduto,
        estoque: 0,
        custo: 0
      });
    }

    limparFormProduto();
    atualizarTudoCadastrosEVenda();

    mostrarMensagem('Produto salvo com sucesso!', 'sucesso');

    fecharFormularioCadastro('produto');
  } catch (erro) {
    console.error(erro);
    mostrarMensagem(mensagemErroApi(erro, 'salvar produto'), 'erro');
  }
}

function editarProduto(codigo) {
  const itemProduto = produtos.find(p => Number(p.codigo) === Number(codigo));

  if (!itemProduto) {
    return;
  }

  $('produtoCodigoCadastro').value = itemProduto.codigo;
  $('produtoNomeCadastro').value = itemProduto.produto || '';
  $('produtoPrecoCadastro').value = Number(itemProduto.preco || 0).toFixed(2).replace('.', ',');

  if ($('produtoEstoqueCadastro')) {
    $('produtoEstoqueCadastro').value = itemProduto.estoque || 0;
    $('produtoEstoqueCadastro').readOnly = true;
  }

  if ($('produtoCustoCadastro')) {
    $('produtoCustoCadastro').value = Number(itemProduto.custo || 0).toFixed(2).replace('.', ',');
    $('produtoCustoCadastro').readOnly = true;
  }

  $('produtoUnidadeCadastro').value = itemProduto.unidade || 'UN';

  const unidade = unidades.find(item => item.unidade === itemProduto.unidade);

  if (unidade) {
    $('produtoUnidadeNomeCadastro').value = `${unidade.unidade} - ${unidade.descricao || ''}`;
  } else {
    $('produtoUnidadeNomeCadastro').value = itemProduto.unidade || '';
  }

  $('produtoCategoriaCadastro').value = itemProduto.categoria || '';
  $('produtoCategoriaNomeCadastro').value = itemProduto.categoria || '';

  if ($('produtoMarcaCadastro')) {
    $('produtoMarcaCadastro').value = itemProduto.marca || '';
  }

  if ($('produtoMarcaNomeCadastro')) {
    $('produtoMarcaNomeCadastro').value = itemProduto.marca || '';
  }

  atualizarSelectsAnimados();

  abrirFormularioCadastro('produto');
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

  if ($('produtoUnidadeCadastro')) {
    $('produtoUnidadeCadastro').value = '';
  }

  if ($('produtoUnidadeNomeCadastro')) {
    $('produtoUnidadeNomeCadastro').value = '';
  }

  if ($('produtoCategoriaCadastro')) {
    $('produtoCategoriaCadastro').value = '';
  }

  if ($('produtoCategoriaNomeCadastro')) {
    $('produtoCategoriaNomeCadastro').value = '';
  }

  if ($('produtoMarcaCadastro')) {
    $('produtoMarcaCadastro').value = '';
  }

  if ($('produtoMarcaNomeCadastro')) {
    $('produtoMarcaNomeCadastro').value = '';
  }

  if ($('produtoEstoqueCadastro')) {
    $('produtoEstoqueCadastro').value = '0';
    $('produtoEstoqueCadastro').readOnly = true;
  }

  if ($('produtoCustoCadastro')) {
    $('produtoCustoCadastro').value = '0,00';
    $('produtoCustoCadastro').readOnly = true;
  }

  atualizarSelectsAnimados();
}

function dadosCliente() {
  const cidadeSelect = $('clienteCidadeCadastro');
  const condicaoSelect = $('clienteFormaPagamentoCadastro');

  return {
    tipo: $('clienteTipoCadastro')?.value || '',
    nome: $('clienteNomeCadastro').value.trim(),
    apelido: $('clienteApelidoCadastro').value.trim(),
    dataNascimento: $('clienteDataNascimentoCadastro').value,
    cpfCnpj: $('clienteCpfCadastro').value.trim(),
    rg: $('clienteRgCadastro').value.trim(),
    email: $('clienteEmailCadastro').value.trim(),
    celular: $('clienteCelularCadastro').value.trim(),
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

  if (!validarCadastroObrigatorio('cliente')) {
    return;
  }

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
    fecharFormularioCadastro('cliente');
  } catch (erro) {
    console.error(erro);
    mostrarMensagem(mensagemErroApi(erro, 'salvar cliente'), 'erro');
  }
  
}

function editarCliente(codigo) {
  const cliente = clientes.find(c => Number(c.codigo) === Number(codigo));
  if (!cliente) return;

  $('clienteCodigoCadastro').value = cliente.codigo;
  $('clienteTipoCadastro').value = cliente.tipo || '';
  $('clienteNomeCadastro').value = cliente.nome || '';
  $('clienteApelidoCadastro').value = cliente.apelido || '';
  $('clienteDataNascimentoCadastro').value = normalizarData(cliente.dataNascimento);
  $('clienteCpfCadastro').value = cliente.cpfCnpj || '';
  $('clienteRgCadastro').value = cliente.rg || '';
  $('clienteEmailCadastro').value = cliente.email || '';
  $('clienteCelularCadastro').value = cliente.celular || '';
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

  abrirFormularioCadastro('cliente');

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

function dadosCliente() {
  const cidadeId = $('clienteCidadeCadastro');
  const cidadeNome = $('clienteCidadeNomeCadastro');
  const condicaoSelect = $('clienteFormaPagamentoCadastro');

  return {
    tipo: $('clienteTipoCadastro')?.value || '',
    nome: $('clienteNomeCadastro').value.trim(),
    apelido: $('clienteApelidoCadastro').value.trim(),
    dataNascimento: $('clienteDataNascimentoCadastro').value,
    cpfCnpj: $('clienteCpfCadastro').value.trim(),
    rg: $('clienteRgCadastro').value.trim(),
    email: $('clienteEmailCadastro').value.trim(),
    celular: $('clienteCelularCadastro').value.trim(),
    endereco: $('clienteEnderecoCadastro').value.trim(),
    numero: $('clienteNumeroCadastro').value.trim(),
    complemento: $('clienteComplementoCadastro').value.trim(),
    bairro: $('clienteBairroCadastro').value.trim(),
    idCidade: Number(cidadeId?.value) || null,
    cidade: cidadeNome?.value || '',
    cep: $('clienteCepCadastro').value.trim(),
    ativo: $('clienteAtivoCadastro').value === 'true',
    genero: $('clienteGeneroCadastro').value,
    idCondicaoPagamento: Number(condicaoSelect.value) || null,
    formaPagamento: condicaoSelect.options[condicaoSelect.selectedIndex]?.textContent || '',
    limiteCredito: obterDecimal($('clienteLimiteCreditoCadastro').value)
  };
}

function dadosFornecedor() {
  const cidadeId = $('fornecedorCidadeCadastro');
  const cidadeNome = $('fornecedorCidadeNomeCadastro');
  const condicaoSelect = $('fornecedorFormaPagamentoCadastro');

  return {
    tipo: $('fornecedorTipoCadastro').value,
    nome: $('fornecedorNomeCadastro').value.trim(),
    apelido: $('fornecedorApelidoCadastro').value.trim(),
    genero: $('fornecedorGeneroCadastro').value,
    dataNascimento: $('fornecedorDataNascimentoCadastro').value,
    cep: $('fornecedorCepCadastro').value.trim(),
    endereco: $('fornecedorEnderecoCadastro').value.trim(),
    numero: $('fornecedorNumeroCadastro').value.trim(),
    bairro: $('fornecedorBairroCadastro').value.trim(),
    complemento: $('fornecedorComplementoCadastro').value.trim(),
    idCidade: Number(cidadeId?.value) || null,
    cidade: cidadeNome?.value || '',
    celular: $('fornecedorCelularCadastro').value.trim(),
    email: $('fornecedorEmailCadastro').value.trim(),
    cpfCnpj: $('fornecedorCpfCnpjCadastro').value.trim(),
    rg: $('fornecedorRgCadastro').value.trim(),
    idCondicaoPagamento: Number(condicaoSelect.value) || null,
    formaPagamento: condicaoSelect.options[condicaoSelect.selectedIndex]?.textContent || '',
    limiteCredito: obterDecimal($('fornecedorLimiteCreditoCadastro').value),
    ativo: $('fornecedorAtivoCadastro').value === 'true'
  };
}

async function salvarFornecedor(event) {
  event.preventDefault();

  if (!validarCadastroObrigatorio('fornecedor')) {
    return;
  }

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
    fecharFormularioCadastro('fornecedor');
  } catch (erro) {
    console.error(erro);
    mostrarMensagem(mensagemErroApi(erro, 'salvar fornecedor'), 'erro');
  }
}

function editarFornecedor(codigo) {
  const fornecedor = fornecedores.find(f => Number(f.codigo) === Number(codigo));
  if (!fornecedor) return;

  $('fornecedorCodigoCadastro').value = fornecedor.codigo;
  $('fornecedorTipoCadastro').value = fornecedor.tipo || '';
  $('fornecedorNomeCadastro').value = fornecedor.nome || '';
  $('fornecedorApelidoCadastro').value = fornecedor.apelido || '';
  $('fornecedorDataNascimentoCadastro').value = normalizarData(fornecedor.dataNascimento);
  $('fornecedorCpfCnpjCadastro').value = fornecedor.cpfCnpj || '';
  $('fornecedorRgCadastro').value = fornecedor.rg || '';
  $('fornecedorEmailCadastro').value = fornecedor.email || '';
  $('fornecedorCelularCadastro').value = fornecedor.celular || '';
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

  abrirFormularioCadastro('fornecedor');
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
    tipo: $('funcionarioTipoCadastro').value,
    funcionario: $('funcionarioNomeCadastro').value.trim(),
    apelido: $('funcionarioApelidoCadastro').value.trim(),
    genero: $('funcionarioGeneroCadastro').value,
    dataNascimento: $('funcionarioDataNascimentoCadastro').value,
    cep: $('funcionarioCepCadastro').value.trim(),
    endereco: $('funcionarioEnderecoCadastro').value.trim(),
    numero: $('funcionarioNumeroCadastro').value.trim(),
    bairro: $('funcionarioBairroCadastro').value.trim(),
    complemento: $('funcionarioComplementoCadastro').value.trim(),
    idCidade: Number($('funcionarioCidadeCadastro').value) || null,
    celular: $('funcionarioCelularCadastro').value.trim(),
    email: $('funcionarioEmailCadastro').value.trim(),
    cpf: $('funcionarioCpfCadastro').value.trim(),
    rg: $('funcionarioRgCadastro').value.trim(),
    idCargo: Number($('funcionarioCargoCadastro').value) || null,
    cnh: $('funcionarioCnhCadastro').value.trim(),
    carteiraTrabalho: $('funcionarioCarteiraTrabalhoCadastro').value.trim(),
    salario: obterDecimal($('funcionarioSalarioCadastro').value),
    ativo: $('funcionarioAtivoCadastro').value === 'true'
  };
}

async function salvarFuncionario(event) {
  event.preventDefault();

  if (!validarCadastroObrigatorio('funcionario')) {
    return;
  }

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
    fecharFormularioCadastro('funcionario');
  } catch (erro) {
    console.error(erro);
    mostrarMensagem(mensagemErroApi(erro, 'salvar funcionário'), 'erro');
  }
}

function editarFuncionario(codigo) {
  const funcionario = funcionarios.find(f => Number(f.codigo) === Number(codigo));
  if (!funcionario) return;

  $('funcionarioCodigoCadastro').value = funcionario.codigo;
  $('funcionarioTipoCadastro').value = funcionario.tipo || '';
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

  abrirFormularioCadastro('funcionario');
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

  if (!tabela) {
    return;
  }

  tabela.innerHTML = ordenarPorCodigo(produtos).map((itemProduto, indice) => `
    <tr>
      <td>${indice + 1}</td>
      <td>${itemProduto.produto || '-'}</td>
      <td>${itemProduto.marca || '-'}</td>
      <td>${formatarMoeda(itemProduto.preco)}</td>
      <td>${formatarMoeda(itemProduto.custo || 0)}</td>
      <td>${itemProduto.estoque}</td>
      <td>${itemProduto.unidade || 'UN'}</td>
      <td>${itemProduto.categoria || '-'}</td>
      <td>${formatarDataCadastro(itemProduto.dataCadastro || itemProduto.data_cadastro)}</td>
      <td>${formatarDataCadastro(itemProduto.dataAlteracao || itemProduto.data_alteracao)}</td>
      <td>
        <button class="btn btn-azul btn-pequeno" onclick="editarProduto(${itemProduto.codigo})">Editar</button>
        <button class="btn btn-vermelho btn-pequeno" onclick="excluirProduto(${itemProduto.codigo})">Excluir</button>
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

  if (!tabela || !mensagem) {
    return;
  }

  const produtosZerados = produtos.filter(itemProduto => Number(itemProduto.estoque) === 0);

  if (produtosZerados.length === 0) {
    mensagem.textContent = 'Nenhum produto sem estoque no momento.';
    mensagem.className = 'mensagem-estoque mensagem-ok';
    tabela.innerHTML = '';
    return;
  }

  mensagem.textContent = `Atenção: existem ${produtosZerados.length} produto(s) sem estoque. Verifique a necessidade de reposição.`;
  mensagem.className = 'mensagem-estoque mensagem-alerta';

  tabela.innerHTML = produtosZerados.map(itemProduto => `
    <tr>
      <td>${itemProduto.codigo}</td>
      <td>${itemProduto.produto}</td>
      <td>${itemProduto.categoria || '-'}</td>
      <td>${formatarMoeda(itemProduto.preco)}</td>
      <td>${itemProduto.estoque}</td>
      <td>${itemProduto.unidade || 'UN'}</td>
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

function formatarDataCadastro(valor) {
  if (!valor) {
    return '-';
  }

  const data = new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return '-';
  }

  return data.toLocaleString(cultura);
}

async function salvarMarca(event) {
  event.preventDefault();

  const codigo = Number($('marcaCodigoCadastro')?.value);

  const dadosMarca = {
    marca: $('marcaNomeCadastro')?.value.trim().toUpperCase() || '',
    ativo: $('marcaAtivoCadastro')?.value === 'true'
  };

  if (!dadosMarca.marca) {
    mostrarMensagem('Informe a marca.', 'aviso');
    return;
  }

  try {
    if (codigo) {
      await apiPut(`/marcas/${codigo}`, dadosMarca);
    } else {
      await apiPost('/marcas', dadosMarca);
    }

    marcas = await apiGet('/marcas');

    limparFormMarca();
    atualizarTudoCadastrosEVenda();

    mostrarMensagem('Marca salva com sucesso.', 'sucesso');

    fecharFormularioCadastro('marca');
  } catch (erro) {
    console.error(erro);
    mostrarMensagem(mensagemErroApi(erro, 'salvar marca'), 'erro');
  }
}

function editarMarca(codigo) {
  const itemMarca = marcas.find(item => Number(item.codigo) === Number(codigo));

  if (!itemMarca) {
    return;
  }

  $('marcaCodigoCadastro').value = itemMarca.codigo;
  $('marcaNomeCadastro').value = itemMarca.marca || '';
  $('marcaAtivoCadastro').value = itemMarca.ativo === false ? 'false' : 'true';

  atualizarSelectAnimado($('marcaAtivoCadastro'));

  abrirFormularioCadastro('marca');
}

async function excluirMarca(codigo) {
  const itemMarca = marcas.find(item => Number(item.codigo) === Number(codigo));

  if (!itemMarca) {
    mostrarMensagem('Marca não encontrada.', 'aviso');
    return;
  }

  const confirmar = confirm(`Deseja excluir a marca "${itemMarca.marca}"?`);

  if (!confirmar) {
    return;
  }

  try {
    await apiDelete(`/marcas/${codigo}`);

    marcas = await apiGet('/marcas');

    limparFormMarca();
    atualizarTudoCadastrosEVenda();

    mostrarMensagem('Marca excluída com sucesso.', 'sucesso');
  } catch (erro) {
    console.error(erro);
    mostrarMensagem(mensagemErroApi(erro, 'excluir marca'), 'erro');
  }
}

function limparFormMarca() {
  $('formMarca')?.reset();

  if ($('marcaCodigoCadastro')) {
    $('marcaCodigoCadastro').value = '';
  }

  atualizarSelectsAnimados();
}

async function salvarFormaPagamento(event) {
  event.preventDefault();

  const codigo = Number($('formaPagamentoCodigoCadastro')?.value);

  const dados = {
    formaPagamento: $('formaPagamentoDescricaoCadastro')?.value.trim().toUpperCase() || '',
    ativo: $('formaPagamentoAtivoCadastro')?.value === 'true'
  };

  if (!dados.formaPagamento) {
    mostrarMensagem('Informe a forma de pagamento.', 'aviso');
    return;
  }

  try {
    if (codigo) {
      await apiPut(`/formas-pagamento/${codigo}`, dados);
    } else {
      await apiPost('/formas-pagamento', dados);
    }

    formasPagamentoCadastro = await apiGet('/formas-pagamento');

    limparFormFormaPagamento();
    atualizarTudoCadastrosEVenda();

    mostrarMensagem('Forma de pagamento salva com sucesso.', 'sucesso');

    fecharFormularioCadastro('formaPagamento');
  } catch (erro) {
    console.error(erro);
    mostrarMensagem(mensagemErroApi(erro, 'salvar forma de pagamento'), 'erro');
  }
}

function editarFormaPagamento(codigo) {
  const forma = formasPagamentoCadastro.find(item => {
    return Number(item.codigo) === Number(codigo);
  });

  if (!forma) {
    return;
  }

  $('formaPagamentoCodigoCadastro').value = forma.codigo;
  $('formaPagamentoDescricaoCadastro').value = forma.formaPagamento || '';
  $('formaPagamentoAtivoCadastro').value = forma.ativo === false ? 'false' : 'true';

  atualizarSelectAnimado($('formaPagamentoAtivoCadastro'));

  abrirFormularioCadastro('formaPagamento');
}

async function excluirFormaPagamento(codigo) {
  const forma = formasPagamentoCadastro.find(item => {
    return Number(item.codigo) === Number(codigo);
  });

  if (!forma) {
    mostrarMensagem('Forma de pagamento não encontrada.', 'aviso');
    return;
  }

  const confirmar = confirm(
    `Deseja excluir a forma de pagamento "${forma.formaPagamento}"?`
  );

  if (!confirmar) {
    return;
  }

  try {
    await apiDelete(`/formas-pagamento/${codigo}`);

    formasPagamentoCadastro = await apiGet('/formas-pagamento');

    limparFormFormaPagamento();
    atualizarTudoCadastrosEVenda();

    mostrarMensagem('Forma de pagamento excluída com sucesso.', 'sucesso');
  } catch (erro) {
    console.error(erro);
    mostrarMensagem(mensagemErroApi(erro, 'excluir forma de pagamento'), 'erro');
  }
}

function limparFormFormaPagamento() {
  $('formFormaPagamento')?.reset();

  if ($('formaPagamentoCodigoCadastro')) {
    $('formaPagamentoCodigoCadastro').value = '';
  }

  if ($('formaPagamentoAtivoCadastro')) {
    $('formaPagamentoAtivoCadastro').value = 'true';
  }

  atualizarSelectsAnimados();
}

function recarregarLocalidades() {
  const paisesTabela = $('paisesCadastroTabela');
  const estadosTabela = $('estadosCadastroTabela');
  const cidadesTabela = $('cidadesCadastroTabela');
  const cargosTabela = $('cargosCadastroTabela');
  const categoriasTabela = $('categoriasCadastroTabela');
  const condicoesTabela = $('condicoesPagamentoTabela');
  const marcasTabela = $('marcasCadastroTabela');
  const formasPagamentoTabela = $('formasPagamentoCadastroTabela');

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
        <td>${c.cidade || '-'}</td>
        <td>${c.ddd || '-'}</td>
        <td>${formatarDataCadastro(c.dataCadastro || c.data_cadastro)}</td>
        <td>${formatarDataCadastro(c.dataAlteracao || c.data_alteracao)}</td>
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
    condicoesTabela.innerHTML = ordenarPorCodigo(condicoesPagamento).map((c, indice) => {
      const multa = c.multaPercentual ?? c.multa_percentual ?? 0;
      const juros = c.jurosPercentual ?? c.juros_percentual ?? 0;
      const desconto = c.descontoPercentual ?? c.desconto_percentual ?? 0;

      return `
        <tr>
          <td>${indice + 1}</td>

          <td>${c.descricao || '-'}</td>

          <td>${c.parcelas || 0}</td>

          <td>${Number(multa || 0).toFixed(2).replace('.', ',')}%</td>

          <td>${Number(juros || 0).toFixed(2).replace('.', ',')}%</td>

          <td>${Number(desconto || 0).toFixed(2).replace('.', ',')}%</td>

          <td>${c.ativo === false ? 'Inativo' : 'Ativo'}</td>

          <td>
            <button
              class="btn btn-azul btn-pequeno"
              type="button"
              onclick="editarCondicaoPagamento(${c.codigo})"
            >
              Editar
            </button>

            <button
              class="btn btn-vermelho btn-pequeno"
              type="button"
              onclick="excluirCondicaoPagamento(${c.codigo})"
            >
              Excluir
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  if (marcasTabela) {
    marcasTabela.innerHTML = ordenarPorCodigo(marcas).map((m, indice) => `
      <tr>
        <td>${indice + 1}</td>
        <td>${m.marca || '-'}</td>
        <td>${m.ativo === false ? 'Inativo' : 'Ativo'}</td>
        <td>${formatarDataCadastro(m.dataCadastro || m.data_cadastro)}</td>
        <td>${formatarDataCadastro(m.dataAlteracao || m.data_alteracao)}</td>
        <td>
          <button class="btn btn-azul btn-pequeno" onclick="editarMarca(${m.codigo})">Editar</button>
          <button class="btn btn-vermelho btn-pequeno" onclick="excluirMarca(${m.codigo})">Excluir</button>
        </td>
      </tr>
    `).join('');
  }

  if (formasPagamentoTabela) {
    formasPagamentoTabela.innerHTML = ordenarPorCodigo(formasPagamentoCadastro).map((forma, indice) => `
      <tr>
        <td>${indice + 1}</td>
        <td>${forma.formaPagamento || '-'}</td>
        <td>${forma.ativo === false ? 'Inativo' : 'Ativo'}</td>
        <td>${formatarDataCadastro(forma.dataCadastro || forma.data_cadastro)}</td>
        <td>${formatarDataCadastro(forma.dataAlteracao || forma.data_alteracao)}</td>
        <td>
          <button class="btn btn-azul btn-pequeno" onclick="editarFormaPagamento(${forma.codigo})">Editar</button>
          <button class="btn btn-vermelho btn-pequeno" onclick="excluirFormaPagamento(${forma.codigo})">Excluir</button>
        </td>
      </tr>
    `).join('');
  }
}

async function salvarGenerico(event, tipo) {
  event.preventDefault();

  if (!validarCadastroObrigatorio(tipo)) {
    return;
  }

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
      dados: () => ({
        idEstado: Number($('cidadeEstadoCadastro').value),
        cidade: $('cidadeNomeCadastro').value.trim().toUpperCase(),
        ddd: $('cidadeDddCadastro')?.value.trim() || ''
      }),
      validar: dados => dados.idEstado && dados.cidade,
      erro: 'Informe estado e cidade.',
      recarregar: async () => {
        cidades = await apiGet('/cidades');
      }
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

  const camposObrigatoriosPorTipo = {
    pais: [
      { id: 'paisNomeCadastro', nome: 'País' }
    ],
    estado: [
      { id: 'estadoPaisCadastro', nome: 'País' },
      { id: 'estadoNomeCadastro', nome: 'Estado' },
      { id: 'estadoSiglaCadastro', nome: 'Sigla' }
    ],
    cidade: [
      { id: 'cidadeEstadoCadastro', nome: 'Estado' },
      { id: 'cidadeNomeCadastro', nome: 'Cidade' }
    ],
    cargo: [
      { id: 'cargoNomeCadastro', nome: 'Cargo' }
    ],
    categoria: [
      { id: 'categoriaNomeCadastro', nome: 'Categoria' }
    ],
    condicao: [
      { id: 'condicaoDescricaoCadastro', nome: 'Descrição' },
      { id: 'condicaoParcelasCadastro', nome: 'Parcelas' }
    ]
  };

  if (!validarCamposObrigatorios(camposObrigatoriosPorTipo[tipo] || [])) {
    return;
  }

  if (!config.validar(dados)) {
    mostrarMensagem(config.erro, 'aviso');
    return;
  }

  try {
    const codigo = Number(config.codigo.value);
    if (codigo) await apiPut(`${config.caminho}/${codigo}`, dados);
    else await apiPost(config.caminho, dados);

    await config.recarregar();
    limparFormularioLocalidade(tipo);
    atualizarTudoCadastrosEVenda();
    mostrarMensagem('Cadastro salvo com sucesso.', 'sucesso');
    fecharFormularioCadastro(tipo);
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

  abrirFormularioCadastro('pais');
}

function editarEstado(codigo) {
  const e = estados.find(item => Number(item.codigo) === Number(codigo));
  if (!e) return;
  $('estadoCodigoCadastro').value = e.codigo;
  $('estadoNomeCadastro').value = e.estado || '';
  $('estadoSiglaCadastro').value = e.uf || '';
  $('estadoPaisCadastro').value = e.idPais || '';
  $('estadoPaisNomeCadastro').value = `${e.pais || ''} - ${e.uf ? '' : ''}`.trim();

  const pais = paises.find(p => Number(p.codigo) === Number(e.idPais));

  if (pais) {
    $('estadoPaisNomeCadastro').value = `${pais.pais} - ${pais.sigla || ''}`;
  }

  abrirFormularioCadastro('estado');
}

function editarCidade(codigo) {
  const c = cidades.find(item => Number(item.codigo) === Number(codigo));

  if (!c) {
    return;
  }

  $('cidadeCodigoCadastro').value = c.codigo;
  $('cidadeNomeCadastro').value = c.cidade || '';
  $('cidadeEstadoCadastro').value = c.idEstado || '';
  $('cidadeEstadoNomeCadastro').value = `${c.estado || ''} - ${c.uf || ''}`;

  if ($('cidadeDddCadastro')) {
    $('cidadeDddCadastro').value = c.ddd || '';
  }

  abrirFormularioCadastro('cidade');
}

function editarCargo(codigo) {
  const c = cargos.find(item => Number(item.codigo) === Number(codigo));
  if (!c) return;
  $('cargoCodigoCadastro').value = c.codigo;
  $('cargoNomeCadastro').value = c.cargo || '';

  abrirFormularioCadastro('cargo');
}

function editarCategoria(codigo) {
  const categoria = categorias.find(item => Number(item.codigo) === Number(codigo));
  if (!categoria) return;
  $('categoriaCodigoCadastro').value = categoria.codigo;
  $('categoriaNomeCadastro').value = categoria.nome || '';

  abrirFormularioCadastro('categoria');
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

async function excluirCondicaoPagamento(codigo) {
  const condicao = condicoesPagamento.find(item => Number(item.codigo) === Number(codigo));

  if (!condicao) {
    mostrarMensagem('Condição de pagamento não encontrada.', 'aviso');
    return;
  }

  const confirmar = confirm(
    `Deseja realmente excluir a condição "${condicao.descricao}"?`
  );

  if (!confirmar) {
    return;
  }

  try {
    await apiDelete(`/condicoes-pagamento/${codigo}`);

    condicoesPagamento = await apiGet('/condicoes-pagamento');

    limparLocalidades();
    atualizarTudoCadastrosEVenda();
    recarregarLocalidades();

    mostrarMensagem('Condição excluída com sucesso.', 'sucesso');
  } catch (erro) {
    console.error(erro);
    mostrarMensagem(mensagemErroApi(erro, 'excluir condição de pagamento'), 'erro');
  }
}

function editarCondicaoPagamento(codigo) {
  const c = condicoesPagamento.find(item => Number(item.codigo) === Number(codigo));

  if (!c) {
    return;
  }

  $('condicaoCodigoCadastro').value = c.codigo;
  $('condicaoDescricaoCadastro').value = c.descricao || '';
  $('condicaoParcelasCadastro').value = c.parcelas || 1;

  const parcela = parcelas.find(item => {
    return Number(item.quantidade) === Number(c.parcelas);
  });

  if (parcela) {
    $('condicaoParcelaNomeCadastro').value = `${parcela.descricao} - ${parcela.quantidade}x`;
  } else {
    $('condicaoParcelaNomeCadastro').value = `${c.parcelas || 1} parcela(s)`;
  }

  $('condicaoAtivoCadastro').value = c.ativo === false ? 'false' : 'true';

  atualizarSelectAnimado($('condicaoAtivoCadastro'));

  abrirFormularioCadastro('condicao');
}

function limparLocalidades() {
  [
    'formPais',
    'formEstado',
    'formCidade',
    'formCargo',
    'formCategoria',
    'formCondicaoPagamento',
    'formUnidade',
    'formParcela'
  ].forEach(id => {
    $(id)?.reset();
  });

  [
    'paisCodigoCadastro',
    'estadoCodigoCadastro',
    'cidadeCodigoCadastro',
    'cargoCodigoCadastro',
    'categoriaCodigoCadastro',
    'condicaoCodigoCadastro',
    'unidadeCodigoCadastro',
    'parcelaCodigoCadastro'
  ].forEach(id => {
    if ($(id)) {
      $(id).value = '';
    }
  });

  if ($('condicaoParcelaNomeCadastro')) {
    $('condicaoParcelaNomeCadastro').value = '';
  }

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

function mascaraCelular(valor) {
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

  ['clienteCelularCadastro', 'fornecedorCelularCadastro', 'funcionarioCelularCadastro',].forEach(id => {
    $(id)?.addEventListener('input', event => {
      event.target.value = mascaraCelular(event.target.value);
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

  document.querySelectorAll('input, select, textarea').forEach(campo => {
    campo.addEventListener('input', () => {
      if (String(campo.value || '').trim()) {
        campo.classList.remove('input-obrigatorio-vazio');
      }
    });

    campo.addEventListener('change', () => {
      if (String(campo.value || '').trim()) {
        campo.classList.remove('input-obrigatorio-vazio');
      }
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

function abrirFormularioCadastro(tipo) {
  const mapa = mapaFormulariosCadastro();
  const idForm = mapa[tipo];

  if (!idForm) {
    mostrarMensagem(`Formulário não encontrado: ${tipo}`, 'erro');
    return;
  }

  const formCard = $(idForm);

  if (!formCard) {
    mostrarMensagem(`Card do formulário não encontrado: ${idForm}`, 'erro');
    return;
  }

  formCard.classList.remove('oculto');

  document.body.style.overflow = 'hidden';

  atualizarSelectsAnimados();
}

function fecharFormularioCadastro(tipo) {
  const mapa = mapaFormulariosCadastro();
  const idForm = mapa[tipo];

  if (!idForm) {
    return;
  }

  const formCard = $(idForm);

  if (formCard) {
    formCard.classList.add('oculto');

    formCard.classList.remove(
      'modal-cadastro-secundario',
      'modal-nivel-1',
      'modal-nivel-2',
      'modal-nivel-3',
      'modal-nivel-4'
    );
  }

  if (formCard && formulariosMovidos[tipo]) {
    const localOriginal = formulariosMovidos[tipo];

    if (localOriginal.proximoIrmao) {
      localOriginal.paiOriginal.insertBefore(formCard, localOriginal.proximoIrmao);
    } else {
      localOriginal.paiOriginal.appendChild(formCard);
    }

    delete formulariosMovidos[tipo];
  }

  const existeFormularioAberto = document.querySelector(
    '.cadastro-form-card:not(.oculto)'
  );

  if (!existeFormularioAberto) {
    document.body.style.overflow = '';
  }

  limparErrosObrigatorios();
}

function fecharFormularioAbertoComEsc(event) {
  if (event.key !== 'Escape') {
    return;
  }

  [
    'cliente',
    'fornecedor',
    'funcionario',
    'produto',
    'pais',
    'estado',
    'cidade',
    'cargo',
    'categoria',
    'marca',
    'formaPagamento',
    'condicao',
    'unidade',
    'parcela'
  ].forEach(tipo => {
    fecharFormularioCadastro(tipo);
  });
}

let callbackConsultaSelecao = null;
let dadosConsultaSelecao = [];

const formulariosMovidos = {};

function abrirModalConsultaSelecao(config) {
  const modal = $('modalConsultaSelecao');
  const titulo = $('modalConsultaTitulo');
  const filtro = $('modalConsultaFiltro');
  const head = $('modalConsultaHead');
  const body = $('modalConsultaBody');

  if (!modal || !titulo || !filtro || !head || !body) {
    return;
  }

  callbackConsultaSelecao = config.aoSelecionar;
  dadosConsultaSelecao = config.dados || [];

  titulo.textContent = config.titulo;
  filtro.value = '';

  const topo = titulo.closest('.modal-consulta-topo');

  if (topo) {
    topo.querySelectorAll('.btn-consulta-extra').forEach(botao => {
      botao.remove();
    });

    if (config.botaoNovo) {
      const botaoNovo = document.createElement('button');

      botaoNovo.type = 'button';
      botaoNovo.className = 'btn btn-verde btn-consulta-extra';
      botaoNovo.textContent = config.botaoNovo.texto || 'Novo';

      botaoNovo.addEventListener('click', event => {
        event.stopPropagation();

        if (typeof config.botaoNovo.acao === 'function') {
          config.botaoNovo.acao();
        }
      });

      const botaoFechar = $('btnFecharConsultaSelecao');

      if (botaoFechar) {
        topo.insertBefore(botaoNovo, botaoFechar);
      } else {
        topo.appendChild(botaoNovo);
      }
    }
  }

  head.innerHTML = config.head;

  renderizarConsultaSelecao(config);

  filtro.oninput = () => {
    renderizarConsultaSelecao(config);
  };

  modal.classList.add('mostrar');
}

function renderizarConsultaSelecao(config) {
  const filtro = String($('modalConsultaFiltro')?.value || '').toLowerCase();
  const body = $('modalConsultaBody');

  if (!body) {
    return;
  }

  const dadosFiltrados = dadosConsultaSelecao.filter(item => {
    return config.filtro(item).toLowerCase().includes(filtro);
  });

  if (dadosFiltrados.length === 0) {
    body.innerHTML = `
      <tr>
        <td colspan="6">Nenhum registro encontrado.</td>
      </tr>
    `;

    return;
  }

  body.innerHTML = dadosFiltrados.map(item => config.linha(item)).join('');

  body.querySelectorAll('tr[data-codigo]').forEach(tr => {
    tr.addEventListener('click', event => {
      if (event.target.closest('button')) {
        return;
      }

      const codigo = Number(tr.dataset.codigo);

      const item = dadosConsultaSelecao.find(registro => {
        return Number(registro.codigo) === codigo;
      });

      if (item && callbackConsultaSelecao) {
        callbackConsultaSelecao(item);
      }

      fecharModalConsultaSelecao();
    });
  });

  body.querySelectorAll('[data-editar-cidade]').forEach(botao => {
    botao.addEventListener('click', event => {
      event.stopPropagation();

      const codigo = Number(botao.dataset.editarCidade);

      editarCidadePelaConsulta(codigo);
    });
  });

  body.querySelectorAll('[data-editar-estado]').forEach(botao => {
    botao.addEventListener('click', event => {
      event.stopPropagation();

      const codigo = Number(botao.dataset.editarEstado);

      editarEstadoPelaConsulta(codigo);
    });
  });

  body.querySelectorAll('[data-editar-pais]').forEach(botao => {
    botao.addEventListener('click', event => {
      event.stopPropagation();

      const codigo = Number(botao.dataset.editarPais);

      editarPaisPelaConsulta(codigo);
    });
  });

  body.querySelectorAll('[data-editar-categoria]').forEach(botao => {
    botao.addEventListener('click', event => {
      event.stopPropagation();

      const codigo = Number(botao.dataset.editarCategoria);

      editarCategoriaPelaConsulta(codigo);
    });
  });

  body.querySelectorAll('[data-editar-unidade]').forEach(botao => {
    botao.addEventListener('click', event => {
      event.stopPropagation();

      const codigo = Number(botao.dataset.editarUnidade);

      editarUnidadePelaConsulta(codigo);
    });
  });

  body.querySelectorAll('[data-editar-parcela]').forEach(botao => {
    botao.addEventListener('click', event => {
      event.stopPropagation();

      const codigo = Number(botao.dataset.editarParcela);

      editarParcelaPelaConsulta(codigo);
    });
  });

  body.querySelectorAll('[data-editar-marca]').forEach(botao => {
    botao.addEventListener('click', event => {
      event.stopPropagation();

      const codigo = Number(botao.dataset.editarMarca);

      editarMarcaPelaConsulta(codigo);
    });
  });

  body.querySelectorAll('[data-editar-forma-pagamento]').forEach(botao => {
    botao.addEventListener('click', event => {
      event.stopPropagation();

      const codigo = Number(botao.dataset.editarFormaPagamento);

      editarFormaPagamentoPelaConsulta(codigo);
    });
  });

}

function fecharModalConsultaSelecao() {
  $('modalConsultaSelecao')?.classList.remove('mostrar');
  callbackConsultaSelecao = null;
  dadosConsultaSelecao = [];
}

function abrirConsultaPaises(callback) {
  abrirModalConsultaSelecao({
    titulo: 'Consulta de Países',

    dados: ordenarPorCodigo(paises),

    botaoNovo: {
      texto: 'Novo País',
      acao: abrirCadastroPaisPelaConsulta
    },

    head: `
      <tr>
        <th>Cód.</th>
        <th>País</th>
        <th>Sigla</th>
        <th>Ações</th>
      </tr>
    `,

    filtro: pais => {
      return `${pais.codigo} ${pais.pais} ${pais.sigla || ''}`;
    },

    linha: pais => `
      <tr data-codigo="${pais.codigo}">
        <td>${pais.codigo}</td>
        <td>${pais.pais}</td>
        <td>${pais.sigla || '-'}</td>
        <td>
          <button
            class="btn btn-azul btn-pequeno"
            type="button"
            data-editar-pais="${pais.codigo}"
          >
            Editar
          </button>
        </td>
      </tr>
    `,

    aoSelecionar: callback
  });
}

function abrirConsultaEstados(callback) {
  abrirModalConsultaSelecao({
    titulo: 'Consulta de Estados',

    dados: ordenarPorCodigo(estados),

    botaoNovo: {
      texto: 'Novo Estado',
      acao: abrirCadastroEstadoPelaConsulta
    },

    head: `
      <tr>
        <th>Cód.</th>
        <th>Estado</th>
        <th>UF</th>
        <th>País</th>
        <th>Ações</th>
      </tr>
    `,

    filtro: estado => {
      return `${estado.codigo} ${estado.estado} ${estado.uf} ${estado.pais || ''}`;
    },

    linha: estado => `
      <tr data-codigo="${estado.codigo}">
        <td>${estado.codigo}</td>
        <td>${estado.estado}</td>
        <td>${estado.uf}</td>
        <td>${estado.pais || '-'}</td>
        <td>
          <button
            class="btn btn-azul btn-pequeno"
            type="button"
            data-editar-estado="${estado.codigo}"
          >
            Editar
          </button>
        </td>
      </tr>
    `,

    aoSelecionar: callback
  });
}

let paiOriginalFormularioCidade = null;
let proximoIrmaoFormularioCidade = null;

function mapaFormulariosCadastro() {
  return {
    cliente: 'formCardCliente',
    fornecedor: 'formCardFornecedor',
    funcionario: 'formCardFuncionario',
    produto: 'formCardProduto',
    pais: 'formCardPais',
    estado: 'formCardEstado',
    cidade: 'formCardCidade',
    cargo: 'formCardCargo',
    categoria: 'formCardCategoria',
    marca: 'formCardMarca',
    formaPagamento: 'formCardFormaPagamento',
    condicao: 'formCardCondicao',
    unidade: 'formCardUnidade',
    parcela: 'formCardParcela'
  };
}

function limparFormularioLocalidade(tipo) {
  const mapa = {
    pais: {
      form: 'formPais',
      codigo: 'paisCodigoCadastro'
    },
    estado: {
      form: 'formEstado',
      codigo: 'estadoCodigoCadastro'
    },
    cidade: {
      form: 'formCidade',
      codigo: 'cidadeCodigoCadastro'
    },
    cargo: {
      form: 'formCargo',
      codigo: 'cargoCodigoCadastro'
    },
    categoria: {
      form: 'formCategoria',
      codigo: 'categoriaCodigoCadastro'
    },
    condicao: {
      form: 'formCondicaoPagamento',
      codigo: 'condicaoCodigoCadastro'
    }
  };

  const config = mapa[tipo];

  if (!config) {
    return;
  }

  $(config.form)?.reset();

  if ($(config.codigo)) {
    $(config.codigo).value = '';
  }

  atualizarSelectsAnimados();
}

function abrirFormularioCadastroSecundario(tipo) {
  const mapa = mapaFormulariosCadastro();
  const idForm = mapa[tipo];
  const formCard = $(idForm);

  if (!formCard) {
    mostrarMensagem(`Formulário não encontrado: ${tipo}`, 'erro');
    return;
  }

  if (!formulariosMovidos[tipo]) {
    formulariosMovidos[tipo] = {
      paiOriginal: formCard.parentNode,
      proximoIrmao: formCard.nextSibling
    };
  }

  document.body.appendChild(formCard);

  formCard.classList.remove('oculto');
  formCard.classList.add('modal-cadastro-secundario');

  formCard.classList.remove(
    'modal-nivel-1',
    'modal-nivel-2',
    'modal-nivel-3',
    'modal-nivel-4'
  );

  const quantidadeAbertos = document.querySelectorAll(
    '.cadastro-form-card.modal-cadastro-secundario:not(.oculto)'
  ).length;

  formCard.classList.add(`modal-nivel-${Math.min(quantidadeAbertos, 4)}`);

  document.body.style.overflow = 'hidden';

  atualizarSelectsAnimados();
}

function abrirCadastroCidadePelaConsulta() {
  fecharModalConsultaSelecao();

  limparFormularioLocalidade('cidade');

  abrirFormularioCadastroSecundario('cidade');

  const campoCidade = $('cidadeNomeCadastro');

  if (campoCidade) {
    campoCidade.focus();
  }
}

function abrirCadastroEstadoPelaConsulta() {
  fecharModalConsultaSelecao();

  limparFormularioLocalidade('estado');

  abrirFormularioCadastroSecundario('estado');

  const campoEstado = $('estadoNomeCadastro');

  if (campoEstado) {
    campoEstado.focus();
  }
}

function abrirCadastroPaisPelaConsulta() {
  fecharModalConsultaSelecao();

  limparFormularioLocalidade('pais');

  abrirFormularioCadastroSecundario('pais');

  const campoPais = $('paisNomeCadastro');

  if (campoPais) {
    campoPais.focus();
  }
}

function editarCidadePelaConsulta(codigo) {
  fecharModalConsultaSelecao();

  const cidade = cidades.find(item => Number(item.codigo) === Number(codigo));

  if (!cidade) {
    mostrarMensagem('Cidade não encontrada.', 'erro');
    return;
  }

  abrirFormularioCadastroSecundario('cidade');

  $('cidadeCodigoCadastro').value = cidade.codigo;
  $('cidadeNomeCadastro').value = cidade.cidade || '';
  $('cidadeEstadoCadastro').value = cidade.idEstado || '';
  $('cidadeEstadoNomeCadastro').value = `${cidade.estado || ''} - ${cidade.uf || ''}`;

  const campoCidade = $('cidadeNomeCadastro');

  if (campoCidade) {
    campoCidade.focus();
  }

  atualizarSelectsAnimados();
}

function editarEstadoPelaConsulta(codigo) {
  fecharModalConsultaSelecao();

  const estado = estados.find(item => {
    return Number(item.codigo) === Number(codigo);
  });

  if (!estado) {
    mostrarMensagem('Estado não encontrado.', 'erro');
    return;
  }

  abrirFormularioCadastroSecundario('estado');

  $('estadoCodigoCadastro').value = estado.codigo;
  $('estadoNomeCadastro').value = estado.estado || '';
  $('estadoSiglaCadastro').value = estado.uf || '';
  $('estadoPaisCadastro').value = estado.idPais || '';

  const pais = paises.find(item => {
    return Number(item.codigo) === Number(estado.idPais);
  });

  if (pais) {
    $('estadoPaisNomeCadastro').value = `${pais.pais} - ${pais.sigla || ''}`;
  } else {
    $('estadoPaisNomeCadastro').value = estado.pais || '';
  }

  const campoEstado = $('estadoNomeCadastro');

  if (campoEstado) {
    campoEstado.focus();
  }

  atualizarSelectsAnimados();
}

function editarPaisPelaConsulta(codigo) {
  fecharModalConsultaSelecao();

  const pais = paises.find(item => {
    return Number(item.codigo) === Number(codigo);
  });

  if (!pais) {
    mostrarMensagem('País não encontrado.', 'erro');
    return;
  }

  abrirFormularioCadastroSecundario('pais');

  $('paisCodigoCadastro').value = pais.codigo;
  $('paisNomeCadastro').value = pais.pais || '';
  $('paisSiglaCadastro').value = pais.sigla || '';

  const campoPais = $('paisNomeCadastro');

  if (campoPais) {
    campoPais.focus();
  }

  atualizarSelectsAnimados();
}

function abrirCadastroCategoriaPelaConsulta() {
  fecharModalConsultaSelecao();

  limparFormularioLocalidade('categoria');

  abrirFormularioCadastroSecundario('categoria');

  $('categoriaNomeCadastro')?.focus();
}

function editarCategoriaPelaConsulta(codigo) {
  fecharModalConsultaSelecao();

  const categoria = categorias.find(item => {
    return Number(item.codigo) === Number(codigo);
  });

  if (!categoria) {
    mostrarMensagem('Categoria não encontrada.', 'erro');
    return;
  }

  abrirFormularioCadastroSecundario('categoria');

  $('categoriaCodigoCadastro').value = categoria.codigo;
  $('categoriaNomeCadastro').value = categoria.nome || '';

  $('categoriaNomeCadastro')?.focus();
}

function abrirCadastroUnidadePelaConsulta() {
  fecharModalConsultaSelecao();

  $('formUnidade')?.reset();

  if ($('unidadeCodigoCadastro')) {
    $('unidadeCodigoCadastro').value = '';
  }

  abrirFormularioCadastroSecundario('unidade');

  $('unidadeSiglaCadastro')?.focus();

  atualizarSelectsAnimados();
}

function editarUnidadePelaConsulta(codigo) {
  fecharModalConsultaSelecao();

  const unidade = unidades.find(item => {
    return Number(item.codigo) === Number(codigo);
  });

  if (!unidade) {
    mostrarMensagem('Unidade não encontrada.', 'erro');
    return;
  }

  abrirFormularioCadastroSecundario('unidade');

  $('unidadeCodigoCadastro').value = unidade.codigo;
  $('unidadeSiglaCadastro').value = unidade.unidade || '';
  $('unidadeDescricaoCadastro').value = unidade.descricao || '';
  $('unidadeAtivoCadastro').value = unidade.ativo === false ? 'false' : 'true';

  atualizarSelectAnimado($('unidadeAtivoCadastro'));

  $('unidadeSiglaCadastro')?.focus();
}

function abrirCadastroParcelaPelaConsulta() {
  fecharModalConsultaSelecao();

  $('formParcela')?.reset();

  if ($('parcelaCodigoCadastro')) {
    $('parcelaCodigoCadastro').value = '';
  }

  abrirFormularioCadastroSecundario('parcela');

  $('parcelaDescricaoCadastro')?.focus();

  atualizarSelectsAnimados();
}

function editarParcelaPelaConsulta(codigo) {
  fecharModalConsultaSelecao();

  const parcela = parcelas.find(item => {
    return Number(item.codigo) === Number(codigo);
  });

  if (!parcela) {
    mostrarMensagem('Parcela não encontrada.', 'erro');
    return;
  }

  abrirFormularioCadastroSecundario('parcela');

  $('parcelaCodigoCadastro').value = parcela.codigo;
  $('parcelaDescricaoCadastro').value = parcela.descricao || '';
  $('parcelaQuantidadeCadastro').value = parcela.quantidade || 1;
  $('parcelaAtivoCadastro').value = parcela.ativo === false ? 'false' : 'true';

  atualizarSelectAnimado($('parcelaAtivoCadastro'));

  $('parcelaDescricaoCadastro')?.focus();
}

function abrirConsultaCidades(callback) {
  abrirModalConsultaSelecao({
    titulo: 'Consulta de Cidades',

    dados: ordenarPorCodigo(cidades),

    botaoNovo: {
      texto: 'Nova Cidade',
      acao: abrirCadastroCidadePelaConsulta
    },

    head: `
      <tr>
        <th>Cód.</th>
        <th>Cidade</th>
        <th>UF</th>
        <th>Estado</th>
        <th>Ações</th>
      </tr>
    `,

    filtro: cidade => {
      return `${cidade.codigo} ${cidade.cidade} ${cidade.uf || ''} ${cidade.estado || ''}`;
    },

    linha: cidade => `
      <tr data-codigo="${cidade.codigo}">
        <td>${cidade.codigo}</td>
        <td>${cidade.cidade}</td>
        <td>${cidade.uf || '-'}</td>
        <td>${cidade.estado || '-'}</td>
        <td>
          <button
            class="btn btn-azul btn-pequeno"
            type="button"
            data-editar-cidade="${cidade.codigo}"
          >
            Editar
          </button>
        </td>
      </tr>
    `,

    aoSelecionar: callback
  });
}

function abrirConsultaCategorias(callback) {
  abrirModalConsultaSelecao({
    titulo: 'Consulta de Categorias',

    dados: ordenarPorCodigo(categorias),

    botaoNovo: {
      texto: 'Nova Categoria',
      acao: abrirCadastroCategoriaPelaConsulta
    },

    head: `
      <tr>
        <th>Cód.</th>
        <th>Categoria</th>
        <th>Ações</th>
      </tr>
    `,

    filtro: categoria => {
      return `${categoria.codigo} ${categoria.nome || ''}`;
    },

    linha: categoria => `
      <tr data-codigo="${categoria.codigo}">
        <td>${categoria.codigo}</td>
        <td>${categoria.nome}</td>
        <td>
          <button
            class="btn btn-azul btn-pequeno"
            type="button"
            data-editar-categoria="${categoria.codigo}"
          >
            Editar
          </button>
        </td>
      </tr>
    `,

    aoSelecionar: callback
  });
}

function abrirConsultaUnidades(callback) {
  abrirModalConsultaSelecao({
    titulo: 'Consulta de Unidades',

    dados: ordenarPorCodigo(unidades),

    botaoNovo: {
      texto: 'Nova Unidade',
      acao: abrirCadastroUnidadePelaConsulta
    },

    head: `
      <tr>
        <th>Cód.</th>
        <th>Unidade</th>
        <th>Descrição</th>
        <th>Ativo</th>
        <th>Ações</th>
      </tr>
    `,

    filtro: unidade => {
      return `${unidade.codigo} ${unidade.unidade || ''} ${unidade.descricao || ''}`;
    },

    linha: unidade => `
      <tr data-codigo="${unidade.codigo}">
        <td>${unidade.codigo}</td>
        <td>${unidade.unidade}</td>
        <td>${unidade.descricao}</td>
        <td>${unidade.ativo === false ? 'Inativo' : 'Ativo'}</td>
        <td>
          <button
            class="btn btn-azul btn-pequeno"
            type="button"
            data-editar-unidade="${unidade.codigo}"
          >
            Editar
          </button>
        </td>
      </tr>
    `,

    aoSelecionar: callback
  });
}

function abrirConsultaParcelas(callback) {
  abrirModalConsultaSelecao({
    titulo: 'Consulta de Parcelas',

    dados: ordenarPorCodigo(parcelas),

    botaoNovo: {
      texto: 'Nova Parcela',
      acao: abrirCadastroParcelaPelaConsulta
    },

    head: `
      <tr>
        <th>Cód.</th>
        <th>Descrição</th>
        <th>Quantidade</th>
        <th>Ativo</th>
        <th>Ações</th>
      </tr>
    `,

    filtro: parcela => {
      return `${parcela.codigo} ${parcela.descricao || ''} ${parcela.quantidade || ''}`;
    },

    linha: parcela => `
      <tr data-codigo="${parcela.codigo}">
        <td>${parcela.codigo}</td>
        <td>${parcela.descricao}</td>
        <td>${parcela.quantidade}</td>
        <td>${parcela.ativo === false ? 'Inativo' : 'Ativo'}</td>
        <td>
          <button
            class="btn btn-azul btn-pequeno"
            type="button"
            data-editar-parcela="${parcela.codigo}"
          >
            Editar
          </button>
        </td>
      </tr>
    `,

    aoSelecionar: callback
  });
}

function selecionarPaisNoCadastroEstado(pais) {
  $('estadoPaisCadastro').value = pais.codigo;
  $('estadoPaisNomeCadastro').value = `${pais.pais} - ${pais.sigla || ''}`;
}

function selecionarEstadoNoCadastroCidade(estado) {
  $('cidadeEstadoCadastro').value = estado.codigo;
  $('cidadeEstadoNomeCadastro').value = `${estado.estado} - ${estado.uf}`;
}

function selecionarCidadeNoCadastro(prefixo, cidade) {
  $(`${prefixo}CidadeCadastro`).value = cidade.codigo;
  $(`${prefixo}CidadeNomeCadastro`).value = cidade.cidade || '';
  $(`${prefixo}UfCadastro`).value = cidade.uf || '';
}

function selecionarCategoriaNoProduto(categoria) {
  $('produtoCategoriaCadastro').value = categoria.nome || '';
  $('produtoCategoriaNomeCadastro').value = categoria.nome || '';
}

function selecionarUnidadeNoProduto(unidade) {
  $('produtoUnidadeCadastro').value = unidade.unidade || '';
  $('produtoUnidadeNomeCadastro').value = `${unidade.unidade} - ${unidade.descricao || ''}`;
}

function selecionarParcelaNaCondicao(parcela) {
  $('condicaoParcelasCadastro').value = parcela.quantidade || 1;
  $('condicaoParcelaNomeCadastro').value = `${parcela.descricao} - ${parcela.quantidade}x`;
}

function selecionarMarcaNoProduto(itemMarca) {
  $('produtoMarcaCadastro').value = itemMarca.marca || '';
  $('produtoMarcaNomeCadastro').value = itemMarca.marca || '';
}

function selecionarFormaPagamentoNaVenda(forma) {
  $('formaPagamentoSelect').value = forma.formaPagamento || '';
  $('formaPagamentoNomeVenda').value = forma.formaPagamento || '';
}

function selecionarFormaPagamentoNaCondicao(forma) {
  $('condicaoParcelaFormaCadastro').value = forma.formaPagamento || '';

  if ($('condicaoParcelaFormaNomeCadastro')) {
    $('condicaoParcelaFormaNomeCadastro').value = forma.formaPagamento || '';
  }
}

function abrirConsultaFormasPagamento(callback) {
  abrirModalConsultaSelecao({
    titulo: 'Consulta de Formas de Pagamento',

    dados: ordenarPorCodigo(
      formasPagamentoCadastro.filter(item => item.ativo !== false)
    ),

    botaoNovo: {
      texto: 'Nova Forma de Pagamento',
      acao: abrirCadastroFormaPagamentoPelaConsulta
    },

    head: `
      <tr>
        <th>Cód.</th>
        <th>Forma de Pagamento</th>
        <th>Ativo</th>
        <th>Ações</th>
      </tr>
    `,

    filtro: forma => {
      return `${forma.codigo} ${forma.formaPagamento || ''}`;
    },

    linha: forma => `
      <tr data-codigo="${forma.codigo}">
        <td>${forma.codigo}</td>
        <td>${forma.formaPagamento || '-'}</td>
        <td>${forma.ativo === false ? 'Inativo' : 'Ativo'}</td>
        <td>
          <button
            class="btn btn-azul btn-pequeno"
            type="button"
            data-editar-forma-pagamento="${forma.codigo}"
          >
            Editar
          </button>
        </td>
      </tr>
    `,

    aoSelecionar: callback
  });
}

function abrirCadastroFormaPagamentoPelaConsulta() {
  fecharModalConsultaSelecao();

  limparFormFormaPagamento();

  abrirFormularioCadastroSecundario('formaPagamento');

  $('formaPagamentoDescricaoCadastro')?.focus();
}

function editarFormaPagamentoPelaConsulta(codigo) {
  fecharModalConsultaSelecao();

  const forma = formasPagamentoCadastro.find(item => {
    return Number(item.codigo) === Number(codigo);
  });

  if (!forma) {
    mostrarMensagem('Forma de pagamento não encontrada.', 'erro');
    return;
  }

  abrirFormularioCadastroSecundario('formaPagamento');

  $('formaPagamentoCodigoCadastro').value = forma.codigo;
  $('formaPagamentoDescricaoCadastro').value = forma.formaPagamento || '';
  $('formaPagamentoAtivoCadastro').value = forma.ativo === false ? 'false' : 'true';

  atualizarSelectAnimado($('formaPagamentoAtivoCadastro'));

  $('formaPagamentoDescricaoCadastro')?.focus();
}

function abrirConsultaMarcas(callback) {
  abrirModalConsultaSelecao({
    titulo: 'Consulta de Marcas',

    dados: ordenarPorCodigo(marcas),

    botaoNovo: {
      texto: 'Nova Marca',
      acao: abrirCadastroMarcaPelaConsulta
    },

    head: `
      <tr>
        <th>Cód.</th>
        <th>Marca</th>
        <th>Ativo</th>
        <th>Ações</th>
      </tr>
    `,

    filtro: itemMarca => {
      return `${itemMarca.codigo} ${itemMarca.marca || ''}`;
    },

    linha: itemMarca => `
      <tr data-codigo="${itemMarca.codigo}">
        <td>${itemMarca.codigo}</td>
        <td>${itemMarca.marca || '-'}</td>
        <td>${itemMarca.ativo === false ? 'Inativo' : 'Ativo'}</td>
        <td>
          <button
            class="btn btn-azul btn-pequeno"
            type="button"
            data-editar-marca="${itemMarca.codigo}"
          >
            Editar
          </button>
        </td>
      </tr>
    `,

    aoSelecionar: callback
  });
}

function abrirCadastroMarcaPelaConsulta() {
  fecharModalConsultaSelecao();

  limparFormMarca();

  abrirFormularioCadastroSecundario('marca');

  $('marcaNomeCadastro')?.focus();
}

function editarMarcaPelaConsulta(codigo) {
  fecharModalConsultaSelecao();

  const itemMarca = marcas.find(item => Number(item.codigo) === Number(codigo));

  if (!itemMarca) {
    mostrarMensagem('Marca não encontrada.', 'erro');
    return;
  }

  abrirFormularioCadastroSecundario('marca');

  $('marcaCodigoCadastro').value = itemMarca.codigo;
  $('marcaNomeCadastro').value = itemMarca.marca || '';
  $('marcaAtivoCadastro').value = itemMarca.ativo === false ? 'false' : 'true';

  atualizarSelectAnimado($('marcaAtivoCadastro'));

  $('marcaNomeCadastro')?.focus();
}

async function salvarUnidade(event) {
  event.preventDefault();

  const codigo = Number($('unidadeCodigoCadastro').value);

  const unidade = {
    unidade: $('unidadeSiglaCadastro').value.trim().toUpperCase(),
    descricao: $('unidadeDescricaoCadastro').value.trim(),
    ativo: $('unidadeAtivoCadastro').value === 'true'
  };

  if (!unidade.unidade || !unidade.descricao) {
    mostrarMensagem('Informe unidade e descrição.', 'aviso');
    return;
  }

  try {
    if (codigo) {
      await apiPut(`/unidades/${codigo}`, unidade);
    } else {
      await apiPost('/unidades', unidade);
    }

    unidades = await apiGet('/unidades');

    mostrarMensagem('Unidade salva com sucesso.', 'sucesso');

    fecharFormularioCadastro('unidade');
  } catch (erro) {
    console.error(erro);
    mostrarMensagem(mensagemErroApi(erro, 'salvar unidade'), 'erro');
  }
}

async function salvarParcela(event) {
  event.preventDefault();

  const codigo = Number($('parcelaCodigoCadastro').value);

  const parcela = {
    descricao: $('parcelaDescricaoCadastro').value.trim(),
    quantidade: Number($('parcelaQuantidadeCadastro').value) || 1,
    ativo: $('parcelaAtivoCadastro').value === 'true'
  };

  if (!parcela.descricao || !parcela.quantidade) {
    mostrarMensagem('Informe descrição e quantidade.', 'aviso');
    return;
  }

  try {
    if (codigo) {
      await apiPut(`/parcelas/${codigo}`, parcela);
    } else {
      await apiPost('/parcelas', parcela);
    }

    parcelas = await apiGet('/parcelas');

    mostrarMensagem('Parcela salva com sucesso.', 'sucesso');

    fecharFormularioCadastro('parcela');
  } catch (erro) {
    console.error(erro);
    mostrarMensagem(mensagemErroApi(erro, 'salvar parcela'), 'erro');
  }
}

/* =========================================================
   CONDIÇÃO DE PAGAMENTO COM PARCELAS DETALHADAS
   ========================================================= */

let parcelasCondicaoAtual = [];
let indiceParcelaCondicaoEditando = null;

function formatarPercentualCondicao(valor) {
  return `${Number(valor || 0).toFixed(2).replace('.', ',')}%`;
}

function totalPercentualParcelasCondicao() {
  return parcelasCondicaoAtual.reduce((total, parcela) => {
    return total + Number(parcela.percentual || 0);
  }, 0);
}

function atualizarTotalPercentualCondicao() {
  const total = totalPercentualParcelasCondicao();

  if ($('condicaoTotalPercentualCadastro')) {
    $('condicaoTotalPercentualCadastro').value = formatarPercentualCondicao(total);
  }
}

function limparCamposParcelaCondicao() {
  if ($('condicaoParcelaNumeroCadastro')) {
    $('condicaoParcelaNumeroCadastro').value = parcelasCondicaoAtual.length + 1;
  }

  if ($('condicaoParcelaDiasCadastro')) {
    $('condicaoParcelaDiasCadastro').value = '';
  }

  if ($('condicaoParcelaPercentualCadastro')) {
    $('condicaoParcelaPercentualCadastro').value = '';
  }

  if ($('condicaoParcelaFormaCadastro')) {
    $('condicaoParcelaFormaCadastro').value = '';
  }

  if ($('condicaoParcelaFormaNomeCadastro')) {
    $('condicaoParcelaFormaNomeCadastro').value = '';
  }

  indiceParcelaCondicaoEditando = null;

  atualizarSelectsAnimados();
}

function renderizarParcelasCondicao() {
  const tabela = $('condicaoParcelasTabela');

  if (!tabela) {
    return;
  }

  if (parcelasCondicaoAtual.length === 0) {
    tabela.innerHTML = `
      <tr>
        <td colspan="5">Nenhuma parcela adicionada.</td>
      </tr>
    `;

    atualizarTotalPercentualCondicao();
    return;
  }

  tabela.innerHTML = parcelasCondicaoAtual.map((parcela, indice) => `
    <tr>
      <td>${parcela.numeroParcela}</td>
      <td>${parcela.dias}</td>
      <td>${formatarPercentualCondicao(parcela.percentual)}</td>
      <td>${parcela.formaPagamento}</td>
      <td>
        <button
          class="btn btn-azul btn-pequeno"
          type="button"
          onclick="editarParcelaCondicao(${indice})"
        >
          Editar
        </button>

        <button
          class="btn btn-vermelho btn-pequeno"
          type="button"
          onclick="excluirParcelaCondicao(${indice})"
        >
          Excluir
        </button>
      </td>
    </tr>
  `).join('');

  atualizarTotalPercentualCondicao();
}

function adicionarParcelaCondicao() {
  const numeroParcela = Number($('condicaoParcelaNumeroCadastro')?.value) || 0;
  const dias = Number($('condicaoParcelaDiasCadastro')?.value) || 0;
  const percentual = obterDecimal($('condicaoParcelaPercentualCadastro')?.value);
  const formaPagamento = $('condicaoParcelaFormaCadastro')?.value || '';

  if (!numeroParcela) {
    mostrarMensagem('Informe o número da parcela.', 'aviso');
    return;
  }

  if (percentual <= 0) {
    mostrarMensagem('Informe o percentual da parcela.', 'aviso');
    return;
  }

  if (!formaPagamento) {
    mostrarMensagem('Informe a forma de pagamento da parcela.', 'aviso');
    return;
  }

  const parcela = {
    numeroParcela,
    dias,
    percentual,
    formaPagamento
  };

  if (indiceParcelaCondicaoEditando !== null) {
    parcelasCondicaoAtual[indiceParcelaCondicaoEditando] = parcela;
  } else {
    parcelasCondicaoAtual.push(parcela);
  }

  parcelasCondicaoAtual.sort((a, b) => {
    return Number(a.numeroParcela) - Number(b.numeroParcela);
  });

  limparCamposParcelaCondicao();
  renderizarParcelasCondicao();
}

function editarParcelaCondicao(indice) {
  const parcela = parcelasCondicaoAtual[indice];

  if (!parcela) {
    return;
  }

  indiceParcelaCondicaoEditando = indice;

  $('condicaoParcelaNumeroCadastro').value = parcela.numeroParcela;
  $('condicaoParcelaDiasCadastro').value = parcela.dias;
  $('condicaoParcelaPercentualCadastro').value = String(parcela.percentual).replace('.', ',');
  $('condicaoParcelaFormaCadastro').value = parcela.formaPagamento;

  if ($('condicaoParcelaFormaNomeCadastro')) {
    $('condicaoParcelaFormaNomeCadastro').value = parcela.formaPagamento;
  }
}

function excluirParcelaCondicao(indice) {
  parcelasCondicaoAtual.splice(indice, 1);

  parcelasCondicaoAtual = parcelasCondicaoAtual.map((parcela, novoIndice) => {
    return {
      ...parcela,
      numeroParcela: novoIndice + 1
    };
  });

  limparCamposParcelaCondicao();
  renderizarParcelasCondicao();
}

function limparFormCondicaoPagamentoCompleto() {
  $('formCondicaoPagamento')?.reset();

  if ($('condicaoCodigoCadastro')) {
    $('condicaoCodigoCadastro').value = '';
  }

  parcelasCondicaoAtual = [];
  indiceParcelaCondicaoEditando = null;

  limparCamposParcelaCondicao();
  renderizarParcelasCondicao();
  atualizarSelectsAnimados();
}

function dadosCondicaoPagamentoCompleta() {
  return {
    descricao: $('condicaoDescricaoCadastro')?.value.trim() || '',
    parcelas: parcelasCondicaoAtual.length,
    multaPercentual: obterDecimal($('condicaoMultaCadastro')?.value),
    jurosPercentual: obterDecimal($('condicaoJurosCadastro')?.value),
    descontoPercentual: obterDecimal($('condicaoDescontoCadastro')?.value),
    ativo: $('condicaoAtivoCadastro')?.value === 'true',
    parcelasDetalhadas: parcelasCondicaoAtual
  };
}

async function salvarCondicaoPagamentoCompleta(event) {
  event.preventDefault();

  const codigo = Number($('condicaoCodigoCadastro')?.value);
  const dados = dadosCondicaoPagamentoCompleta();

  if (!dados.descricao) {
    mostrarMensagem('Informe a condição de pagamento.', 'aviso');
    return;
  }

  if (dados.parcelasDetalhadas.length === 0) {
    mostrarMensagem('Adicione pelo menos uma parcela.', 'aviso');
    return;
  }

  const total = totalPercentualParcelasCondicao();

  if (Math.abs(total - 100) > 0.05) {
    mostrarMensagem('O total das parcelas precisa fechar 100%.', 'erro');
    return;
  }

  try {
    if (codigo) {
      await apiPut(`/condicoes-pagamento/${codigo}`, dados);
    } else {
      await apiPost('/condicoes-pagamento', dados);
    }

    condicoesPagamento = await apiGet('/condicoes-pagamento');

    limparFormCondicaoPagamentoCompleto();
    atualizarTudoCadastrosEVenda();

    mostrarMensagem('Condição de pagamento salva com sucesso.', 'sucesso');

    fecharFormularioCadastro('condicao');
  } catch (erro) {
    console.error(erro);
    mostrarMensagem(mensagemErroApi(erro, 'salvar condição de pagamento'), 'erro');
  }
}

function editarCondicaoPagamento(codigo) {
  const condicao = condicoesPagamento.find(item => {
    return Number(item.codigo) === Number(codigo);
  });

  if (!condicao) {
    return;
  }

  $('condicaoCodigoCadastro').value = condicao.codigo;
  $('condicaoDescricaoCadastro').value = condicao.descricao || '';
  $('condicaoMultaCadastro').value = condicao.multaPercentual || condicao.multa_percentual || 0;
  $('condicaoJurosCadastro').value = condicao.jurosPercentual || condicao.juros_percentual || 0;
  $('condicaoDescontoCadastro').value = condicao.descontoPercentual || condicao.desconto_percentual || 0;
  $('condicaoAtivoCadastro').value = condicao.ativo === false ? 'false' : 'true';

  parcelasCondicaoAtual = [];

  if (Array.isArray(condicao.parcelasDetalhadas)) {
    parcelasCondicaoAtual = condicao.parcelasDetalhadas.map(parcela => {
      return {
        numeroParcela: Number(parcela.numeroParcela || parcela.numero_parcela),
        dias: Number(parcela.dias),
        percentual: Number(parcela.percentual),
        formaPagamento: parcela.formaPagamento || parcela.forma_pagamento
      };
    });
  } else if (Array.isArray(condicao.parcelas_detalhadas)) {
    parcelasCondicaoAtual = condicao.parcelas_detalhadas.map(parcela => {
      return {
        numeroParcela: Number(parcela.numeroParcela || parcela.numero_parcela),
        dias: Number(parcela.dias),
        percentual: Number(parcela.percentual),
        formaPagamento: parcela.formaPagamento || parcela.forma_pagamento
      };
    });
  }

  if (parcelasCondicaoAtual.length === 0 && Number(condicao.parcelas || 0) > 0) {
    const quantidade = Number(condicao.parcelas);
    const percentualBase = Number((100 / quantidade).toFixed(2));

    parcelasCondicaoAtual = Array.from({ length: quantidade }).map((_, indice) => {
      return {
        numeroParcela: indice + 1,
        dias: (indice + 1) * 30,
        percentual: indice + 1 === quantidade
          ? Number((100 - percentualBase * (quantidade - 1)).toFixed(2))
          : percentualBase,
        formaPagamento: 'Boleto Bancário'
      };
    });
  }

  renderizarParcelasCondicao();
  limparCamposParcelaCondicao();
  atualizarSelectsAnimados();

  abrirFormularioCadastro('condicao');
}

/* =========================
   EVENTOS
   ========================= */

function registrarEventos() {
  btnTema?.addEventListener('click', alterarTema);

  $('formLogin')?.addEventListener('submit', fazerLogin);

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
    if (event.key === 'Enter') {
      adicionarProduto();
    }
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

  $('btnNovoProduto')?.addEventListener('click', () => {
    limparFormProduto();
    abrirFormularioCadastro('produto');
  });

  $('btnCancelarProduto')?.addEventListener('click', () => {
    limparFormProduto();
    fecharFormularioCadastro('produto');
  });

  $('formCliente')?.addEventListener('submit', salvarCliente);

  $('btnNovoCliente')?.addEventListener('click', () => {
    limparFormCliente();
    abrirFormularioCadastro('cliente');
  });

  $('btnCancelarCliente')?.addEventListener('click', () => {
    limparFormCliente();
    fecharFormularioCadastro('cliente');
  });

  $('formFornecedor')?.addEventListener('submit', salvarFornecedor);

  $('btnNovoFornecedor')?.addEventListener('click', () => {
    limparFormFornecedor();
    abrirFormularioCadastro('fornecedor');
  });

  $('btnCancelarFornecedor')?.addEventListener('click', () => {
    limparFormFornecedor();
    fecharFormularioCadastro('fornecedor');
  });

  $('formFuncionario')?.addEventListener('submit', salvarFuncionario);

  $('btnNovoFuncionario')?.addEventListener('click', () => {
    limparFormFuncionario();
    abrirFormularioCadastro('funcionario');
  });

  $('btnCancelarFuncionario')?.addEventListener('click', () => {
    limparFormFuncionario();
    fecharFormularioCadastro('funcionario');
  });

  $('formPais')?.addEventListener('submit', event => salvarGenerico(event, 'pais'));
  $('formEstado')?.addEventListener('submit', event => salvarGenerico(event, 'estado'));
  $('formCidade')?.addEventListener('submit', event => salvarGenerico(event, 'cidade'));
  $('formCargo')?.addEventListener('submit', event => salvarGenerico(event, 'cargo'));
  $('formCategoria')?.addEventListener('submit', event => salvarGenerico(event, 'categoria'));

  $('formCondicaoPagamento')?.addEventListener('submit', salvarCondicaoPagamentoCompleta);

  $('btnNovoPais')?.addEventListener('click', () => {
    limparLocalidades();
    abrirFormularioCadastro('pais');
  });

  $('btnCancelarPais')?.addEventListener('click', () => {
    limparLocalidades();
    fecharFormularioCadastro('pais');
  });

  $('btnNovoEstado')?.addEventListener('click', () => {
    limparLocalidades();
    abrirFormularioCadastro('estado');
  });

  $('btnCancelarEstado')?.addEventListener('click', () => {
    limparLocalidades();
    fecharFormularioCadastro('estado');
  });

  $('btnNovoCidade')?.addEventListener('click', () => {
    limparLocalidades();
    abrirFormularioCadastro('cidade');
  });

  $('btnCancelarCidade')?.addEventListener('click', () => {
    limparLocalidades();
    fecharFormularioCadastro('cidade');
  });

  $('btnNovoCargo')?.addEventListener('click', () => {
    limparLocalidades();
    abrirFormularioCadastro('cargo');
  });

  $('btnCancelarCargo')?.addEventListener('click', () => {
    limparLocalidades();
    fecharFormularioCadastro('cargo');
  });

  $('btnNovoCategoria')?.addEventListener('click', () => {
    limparLocalidades();
    abrirFormularioCadastro('categoria');
  });

  $('btnCancelarCategoria')?.addEventListener('click', () => {
    limparLocalidades();
    fecharFormularioCadastro('categoria');
  });

  $('btnNovoCondicao')?.addEventListener('click', () => {
    limparFormCondicaoPagamentoCompleto();
    abrirFormularioCadastro('condicao');
  });

  $('btnCancelarCondicao')?.addEventListener('click', () => {
    limparFormCondicaoPagamentoCompleto();
    fecharFormularioCadastro('condicao');
  });

  $('btnAdicionarParcelaCondicao')?.addEventListener('click', adicionarParcelaCondicao);

  $('btnFecharPermissao')?.addEventListener('click', fecharBloqueioPermissao);
  $('btnFecharConsultaSelecao')?.addEventListener('click', fecharModalConsultaSelecao);

  $('btnConsultarPaisEstado')?.addEventListener('click', () => {
    abrirConsultaPaises(selecionarPaisNoCadastroEstado);
  });

  $('btnConsultarEstadoCidade')?.addEventListener('click', () => {
    abrirConsultaEstados(selecionarEstadoNoCadastroCidade);
  });

  $('btnConsultarCidadeCliente')?.addEventListener('click', () => {
    abrirConsultaCidades(cidade => selecionarCidadeNoCadastro('cliente', cidade));
  });

  $('btnConsultarCidadeFornecedor')?.addEventListener('click', () => {
    abrirConsultaCidades(cidade => selecionarCidadeNoCadastro('fornecedor', cidade));
  });

  $('btnConsultarCidadeFuncionario')?.addEventListener('click', () => {
    abrirConsultaCidades(cidade => selecionarCidadeNoCadastro('funcionario', cidade));
  });

  $('btnConsultarCategoriaProduto')?.addEventListener('click', () => {
    abrirConsultaCategorias(selecionarCategoriaNoProduto);
  });

  $('btnConsultarUnidadeProduto')?.addEventListener('click', () => {
    abrirConsultaUnidades(selecionarUnidadeNoProduto);
  });

  $('btnConsultarParcelaCondicao')?.addEventListener('click', () => {
    abrirConsultaParcelas(selecionarParcelaNaCondicao);
  });

  $('formUnidade')?.addEventListener('submit', salvarUnidade);

  $('btnCancelarUnidade')?.addEventListener('click', () => {
    fecharFormularioCadastro('unidade');
  });

  $('formParcela')?.addEventListener('submit', salvarParcela);

  $('btnCancelarParcela')?.addEventListener('click', () => {
    fecharFormularioCadastro('parcela');
  });

  $('formMarca')?.addEventListener('submit', salvarMarca);

  $('btnNovoMarca')?.addEventListener('click', () => {
    limparFormMarca();
    abrirFormularioCadastro('marca');
  });

  $('btnCancelarMarca')?.addEventListener('click', () => {
    limparFormMarca();
    fecharFormularioCadastro('marca');
  });

  $('btnConsultarMarcaProduto')?.addEventListener('click', () => {
    abrirConsultaMarcas(selecionarMarcaNoProduto);
  });

  $('formFormaPagamento')?.addEventListener('submit', salvarFormaPagamento);

  $('btnNovoFormaPagamento')?.addEventListener('click', () => {
    limparFormFormaPagamento();
    abrirFormularioCadastro('formaPagamento');
  });

  $('btnCancelarFormaPagamento')?.addEventListener('click', () => {
    limparFormFormaPagamento();
    fecharFormularioCadastro('formaPagamento');
  });

  $('btnConsultarFormaPagamentoVenda')?.addEventListener('click', () => {
    abrirConsultaFormasPagamento(selecionarFormaPagamentoNaVenda);
  });

  $('btnConsultarFormaPagamentoCondicao')?.addEventListener('click', () => {
    abrirConsultaFormasPagamento(selecionarFormaPagamentoNaCondicao);
  });

  document.addEventListener('keydown', fecharFormularioAbertoComEsc);
}

/* =========================
   EXCLUSÕES
   ========================= */

async function excluirPais(codigo) {
  const pais = paises.find(item => Number(item.codigo) === Number(codigo));

  if (!pais) {
    mostrarMensagem('País não encontrado.', 'aviso');
    return;
  }

  const confirmar = confirm(`Deseja realmente excluir o país "${pais.pais}"?`);

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

  const confirmar = confirm(`Deseja realmente excluir o estado "${estado.estado}"?`);

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

  const confirmar = confirm(`Deseja realmente excluir a cidade "${cidade.cidade}"?`);

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

  const confirmar = confirm(`Deseja realmente excluir o cargo "${cargo.cargo}"?`);

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

/* =========================
   FUNÇÕES GLOBAIS
   ========================= */

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
window.excluirCondicaoPagamento = excluirCondicaoPagamento;

window.editarParcelaCondicao = editarParcelaCondicao;
window.excluirParcelaCondicao = excluirParcelaCondicao;

window.editarMarca = editarMarca;
window.excluirMarca = excluirMarca;

window.editarFormaPagamento = editarFormaPagamento;
window.excluirFormaPagamento = excluirFormaPagamento;

window.fecharBloqueioPermissao = fecharBloqueioPermissao;
window.limparHistorico = limparHistorico;
window.sairDoSistema = sairDoSistema;

/* =========================
   INICIALIZAÇÃO
   ========================= */

async function inicializarSistema() {
  registrarEventos();
  aplicarTemaSalvo();
  aplicarMascaras();
  criarSelectsAnimados();

  aplicarAsteriscosObrigatorios();
  ativarRemocaoErroObrigatorio();

  atualizarRelogio();
  setInterval(atualizarRelogio, 1000);

  verificarLoginSalvo();
  atualizarBotoesPorPermissao();
}

inicializarSistema();