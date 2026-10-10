const buscaInput = document.querySelector('#busca');
const produtosContainer = document.querySelector('#produtos');
const statusElement = document.querySelector('#status');

let produtos = [];
const pageSize = 1000;

const formatCurrency = (value) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const normalize = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim();

const renderProducts = (items) => {
  produtosContainer.replaceChildren();

  if (!items.length) {
    statusElement.textContent = 'Nenhum produto encontrado.';
    return;
  }

  statusElement.textContent = `${items.length} produto${items.length === 1 ? '' : 's'} encontrado${items.length === 1 ? '' : 's'}.`;

  items.forEach((produto) => {
    const card = document.createElement('article');
    card.className = 'product';

    const name = document.createElement('h2');
    name.textContent = produto.nome;

    const price = document.createElement('p');
    price.className = 'price';
    price.textContent = formatCurrency(produto.preco);

    const identifiers = document.createElement('p');
    identifiers.className = 'identifiers';
    identifiers.textContent = produto.barcode
      ? `Código: ${produto.codigo} · Barras: ${produto.barcode}`
      : `Código: ${produto.codigo}`;

    card.append(name, price, identifiers);
    produtosContainer.appendChild(card);
  });
};

buscaInput.addEventListener('input', () => {
  const search = normalize(buscaInput.value);

  if (!search) {
    produtosContainer.replaceChildren();
    statusElement.textContent = `${produtos.length} produtos cadastrados. Digite para consultar um preço.`;
    return;
  }

  const encontrados = produtos.filter((produto) =>
    [produto.nome, produto.codigo, produto.barcode].some((campo) => normalize(campo).includes(search))
  );

  renderProducts(encontrados);
});

const loadProducts = async () => {
  try {
    const config = window.SUPABASE_CONFIG;
    if (!config?.url || !config?.publishableKey) {
      throw new Error('A configuração do Supabase está incompleta.');
    }

    const endpoint = new URL(`${config.url.replace(/\/+$/, '')}/rest/v1/produtos`);
    endpoint.searchParams.set('select', 'id,"Nome",codigo,codigo_barras,preco');
    endpoint.searchParams.set('order', 'codigo.asc,id.asc');
    endpoint.searchParams.set('limit', String(pageSize));

    for (let offset = 0; ; offset += pageSize) {
      endpoint.searchParams.set('offset', String(offset));
      const response = await fetch(endpoint, {
        headers: { apikey: config.publishableKey },
      });

      if (!response.ok) {
        throw new Error(`Falha ao carregar produtos do Supabase (HTTP ${response.status}).`);
      }

      const data = await response.json();
      if (!Array.isArray(data)) {
        throw new Error('A resposta do Supabase não contém uma lista de produtos.');
      }

      produtos.push(
        ...data.map((produto) => ({
          nome: produto.Nome,
          codigo: produto.codigo,
          barcode: produto.codigo_barras,
          preco: produto.preco,
        }))
      );
      if (data.length < pageSize) {
        break;
      }
    }

    statusElement.textContent = `${produtos.length} produtos cadastrados. Digite para consultar um preço.`;
  } catch (error) {
    statusElement.textContent = `Não foi possível carregar os produtos: ${error.message}`;
    console.error('Erro ao carregar produtos:', error);
  }
};

loadProducts();
