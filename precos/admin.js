const loginPanel = document.querySelector('#login-panel');
const adminPanel = document.querySelector('#admin-panel');
const loginForm = document.querySelector('#login-form');
const loginStatus = document.querySelector('#login-status');
const signedInAs = document.querySelector('#signed-in-as');
const logoutButton = document.querySelector('#logout-button');
const productForm = document.querySelector('#product-form');
const productFormTitle = document.querySelector('#product-form-title');
const productIdInput = document.querySelector('#product-id');
const productNameInput = document.querySelector('#product-name');
const productCodeInput = document.querySelector('#product-code');
const productBarcodeInput = document.querySelector('#product-barcode');
const productPriceInput = document.querySelector('#product-price');
const saveProductButton = document.querySelector('#save-product-button');
const cancelEditButton = document.querySelector('#cancel-edit-button');
const productStatus = document.querySelector('#product-status');
const searchForm = document.querySelector('#search-form');
const searchInput = document.querySelector('#product-search');
const listStatus = document.querySelector('#list-status');
const productRows = document.querySelector('#product-rows');
const previousPageButton = document.querySelector('#previous-page');
const nextPageButton = document.querySelector('#next-page');
const pageStatus = document.querySelector('#page-status');

const pageSize = 50;
let accessToken = null;
let refreshToken = null;
let currentPage = 0;
let currentSearch = '';
let totalProducts = 0;

const getConfig = () => {
  const config = window.SUPABASE_CONFIG;
  if (!config?.url || !config?.publishableKey) {
    throw new Error('A configuração do Supabase está incompleta.');
  }

  return {
    url: config.url.replace(/\/+$/, ''),
    publishableKey: config.publishableKey,
  };
};

const responseError = async (response) => {
  let detail = '';
  try {
    const body = await response.json();
    detail = body.msg || body.message || body.error_description || body.error || '';
  } catch {
    detail = '';
  }
  return new Error(detail || `Falha na solicitação (HTTP ${response.status}).`);
};

const sendApiRequest = async (path, options = {}) => {
  const config = getConfig();
  const headers = new Headers(options.headers);
  headers.set('apikey', config.publishableKey);
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }
  if (options.body) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(`${config.url}${path}`, { ...options, headers });
};

const refreshSession = async () => {
  const config = getConfig();
  const response = await fetch(`${config.url}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: {
      apikey: config.publishableKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!response.ok) {
    throw await responseError(response);
  }

  const session = await response.json();
  accessToken = session.access_token;
  refreshToken = session.refresh_token;
  if (!accessToken || !refreshToken) {
    throw new Error('O Supabase não retornou uma sessão renovada válida.');
  }
};

const apiRequest = async (path, options = {}) => {
  let response = await sendApiRequest(path, options);
  if (response.status === 401 && refreshToken) {
    try {
      await refreshSession();
    } catch (error) {
      showLogin();
      setLoginStatus('A sessão expirou ou não pôde ser renovada. Entre novamente.', true);
      throw error;
    }
    response = await sendApiRequest(path, options);
  }
  if (!response.ok) {
    throw await responseError(response);
  }
  return response;
};

const setLoginStatus = (message, isError = false) => {
  loginStatus.textContent = message;
  loginStatus.classList.toggle('is-error', isError);
};

const setAdminStatus = (element, message, isError = false) => {
  element.textContent = message;
  element.classList.toggle('is-error', isError);
};

const showLogin = () => {
  accessToken = null;
  refreshToken = null;
  adminPanel.hidden = true;
  loginPanel.hidden = false;
  loginForm.reset();
  signedInAs.textContent = '';
};

const formatCurrency = (value) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));

const verifyAdmin = async () => {
  const response = await apiRequest('/rest/v1/rpc/is_admin', { method: 'POST' });
  if (await response.json() !== true) {
    throw new Error('Este usuário não tem permissão de administrador.');
  }
};

const escapeSearchTerm = (value) =>
  value.trim().replace(/[^A-Za-zÀ-ÿ0-9 _-]/g, '').replace(/\s+/g, ' ');

const buildProductsUrl = () => {
  const config = getConfig();
  const endpoint = new URL(`${config.url}/rest/v1/produtos`);
  endpoint.searchParams.set('select', 'id,"Nome",codigo,codigo_barras,preco');
  endpoint.searchParams.set('order', 'codigo.asc,id.asc');
  endpoint.searchParams.set('limit', String(pageSize));

  if (currentSearch) {
    const term = currentSearch;
    endpoint.searchParams.set(
      'or',
      `(codigo.eq.${term},codigo_barras.eq.${term},"Nome".ilike.*${term}*)`
    );
  }

  return endpoint;
};

const addProductRow = (product) => {
  const row = document.createElement('tr');
  const nameCell = document.createElement('td');
  nameCell.textContent = product.Nome;

  const codeCell = document.createElement('td');
  codeCell.textContent = product.codigo;

  const priceCell = document.createElement('td');
  priceCell.textContent = formatCurrency(product.preco);

  const actionsCell = document.createElement('td');
  actionsCell.className = 'admin-row-actions';

  const editButton = document.createElement('button');
  editButton.className = 'admin-text-button';
  editButton.type = 'button';
  editButton.textContent = 'Editar';
  editButton.addEventListener('click', () => beginEdit(product));

  const deleteButton = document.createElement('button');
  deleteButton.className = 'admin-text-button admin-delete-button';
  deleteButton.type = 'button';
  deleteButton.textContent = 'Excluir';
  deleteButton.addEventListener('click', () => deleteProduct(product));

  actionsCell.append(editButton, deleteButton);
  row.append(nameCell, codeCell, priceCell, actionsCell);
  productRows.appendChild(row);
};

const loadProducts = async () => {
  listStatus.textContent = 'Carregando produtos...';
  listStatus.classList.remove('is-error');
  productRows.replaceChildren();

  const endpoint = buildProductsUrl();
  endpoint.searchParams.set('offset', String(currentPage * pageSize));

  try {
    const response = await apiRequest(endpoint.pathname + endpoint.search, {
      headers: { Prefer: 'count=exact' },
    });
    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new Error('A resposta do Supabase não contém uma lista de produtos.');
    }

    data.forEach(addProductRow);
    const contentRange = response.headers.get('Content-Range');
    const total = contentRange?.split('/')[1];
    const reportedTotal = total && total !== '*' ? Number(total) : Number.NaN;
    totalProducts = Number.isFinite(reportedTotal)
      ? reportedTotal
      : currentPage * pageSize + data.length;

    listStatus.textContent = data.length
      ? `${totalProducts} produto${totalProducts === 1 ? '' : 's'} encontrado${totalProducts === 1 ? '' : 's'}.`
      : 'Nenhum produto encontrado.';
    const totalPages = Math.max(1, Math.ceil(totalProducts / pageSize));
    pageStatus.textContent = `Página ${currentPage + 1} de ${totalPages}`;
    previousPageButton.disabled = currentPage === 0;
    nextPageButton.disabled = (currentPage + 1) * pageSize >= totalProducts;
  } catch (error) {
    setAdminStatus(listStatus, `Não foi possível carregar os produtos: ${error.message}`, true);
    console.error('Erro ao carregar produtos no painel:', error);
  }
};

const resetProductForm = () => {
  productForm.reset();
  productIdInput.value = '';
  productFormTitle.textContent = 'Cadastrar produto';
  saveProductButton.textContent = 'Cadastrar produto';
  cancelEditButton.hidden = true;
  setAdminStatus(productStatus, '');
};

const beginEdit = (product) => {
  productIdInput.value = product.id;
  productNameInput.value = product.Nome;
  productCodeInput.value = product.codigo;
  productBarcodeInput.value = product.codigo_barras || '';
  productPriceInput.value = product.preco;
  productFormTitle.textContent = 'Editar produto';
  saveProductButton.textContent = 'Salvar alterações';
  cancelEditButton.hidden = false;
  setAdminStatus(productStatus, '');
  productNameInput.focus();
  productForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const deleteProduct = async (product) => {
  if (!window.confirm(`Excluir "${product.Nome}"? Esta ação não pode ser desfeita.`)) {
    return;
  }

  setAdminStatus(listStatus, 'Excluindo produto...');
  try {
    const endpoint = new URL(`${getConfig().url}/rest/v1/produtos`);
    endpoint.searchParams.set('id', `eq.${product.id}`);
    await apiRequest(endpoint.pathname + endpoint.search, { method: 'DELETE' });
    if (productIdInput.value === String(product.id)) {
      resetProductForm();
    }
    setAdminStatus(listStatus, 'Produto excluído.');
    await loadProducts();
  } catch (error) {
    setAdminStatus(listStatus, `Não foi possível excluir o produto: ${error.message}`, true);
    console.error('Erro ao excluir produto:', error);
  }
};

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setLoginStatus('Verificando acesso...');
  const submitButton = loginForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;

  try {
    const config = getConfig();
    const response = await fetch(`${config.url}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        apikey: config.publishableKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: loginForm.elements.email.value.trim(),
        password: loginForm.elements.password.value,
      }),
    });
    if (!response.ok) {
      throw await responseError(response);
    }

    const session = await response.json();
    if (!session.access_token || !session.user?.email) {
      throw new Error('O Supabase não retornou uma sessão válida.');
    }

    accessToken = session.access_token;
    refreshToken = session.refresh_token;
    if (!refreshToken) {
      throw new Error('O Supabase não retornou uma sessão renovável.');
    }
    await verifyAdmin();
    loginPanel.hidden = true;
    adminPanel.hidden = false;
    signedInAs.textContent = `Conectado como ${session.user.email}`;
    loginForm.reset();
    currentPage = 0;
    await loadProducts();
  } catch (error) {
    showLogin();
    setLoginStatus(error.message, true);
    console.error('Erro ao entrar no painel:', error);
  } finally {
    submitButton.disabled = false;
  }
});

logoutButton.addEventListener('click', async () => {
  let logoutError = null;
  try {
    await apiRequest('/auth/v1/logout', { method: 'POST' });
  } catch (error) {
    console.error('Erro ao encerrar a sessão no Supabase:', error);
    logoutError = error;
  } finally {
    showLogin();
    setLoginStatus(
      logoutError
        ? 'Sessão encerrada neste navegador, mas não foi possível confirmar a saída no Supabase.'
        : 'Sessão encerrada.',
      Boolean(logoutError)
    );
  }
});

productForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  saveProductButton.disabled = true;
  setAdminStatus(productStatus, 'Salvando produto...');

  const product = {
    Nome: productNameInput.value.trim(),
    codigo: productCodeInput.value.trim(),
    codigo_barras: productBarcodeInput.value.trim(),
    preco: Number(productPriceInput.value),
  };

  try {
    const isEditing = Boolean(productIdInput.value);
    const endpoint = new URL(`${getConfig().url}/rest/v1/produtos`);
    const options = {
      method: isEditing ? 'PATCH' : 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify(product),
    };
    if (isEditing) {
      endpoint.searchParams.set('id', `eq.${productIdInput.value}`);
    }

    await apiRequest(endpoint.pathname + endpoint.search, options);
    resetProductForm();
    setAdminStatus(productStatus, isEditing ? 'Alterações salvas.' : 'Produto cadastrado.');
    currentPage = 0;
    await loadProducts();
  } catch (error) {
    setAdminStatus(productStatus, `Não foi possível salvar o produto: ${error.message}`, true);
    console.error('Erro ao salvar produto:', error);
  } finally {
    saveProductButton.disabled = false;
  }
});

cancelEditButton.addEventListener('click', resetProductForm);

searchForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  currentSearch = escapeSearchTerm(searchInput.value);
  searchInput.value = currentSearch;
  currentPage = 0;
  await loadProducts();
});

previousPageButton.addEventListener('click', async () => {
  if (currentPage > 0) {
    currentPage -= 1;
    await loadProducts();
  }
});

nextPageButton.addEventListener('click', async () => {
  if ((currentPage + 1) * pageSize < totalProducts) {
    currentPage += 1;
    await loadProducts();
  }
});
