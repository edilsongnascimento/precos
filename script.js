const buscaInput = document.querySelector('#busca');
const produtosContainer = document.querySelector('#produtos');
const statusElement = document.querySelector('#status');
const openCameraButton = document.querySelector('#abrir-camera');
const closeCameraButton = document.querySelector('#fechar-camera');
const scannerDialog = document.querySelector('#leitor-camera');
const scannerVideo = document.querySelector('#video-camera');
const scannerStatus = document.querySelector('#status-camera');

let produtos = [];
let cameraStream = null;
let cameraControls = null;
let cameraActive = false;
let scanFrame = null;
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

const searchProducts = () => {
  const terms = normalize(buscaInput.value).split(/\s+/).filter(Boolean);

  if (!terms.length) {
    produtosContainer.replaceChildren();
    statusElement.textContent = `${produtos.length} produtos cadastrados. Digite para consultar um preço.`;
    return;
  }

  const encontrados = produtos.filter((produto) => {
    const searchableText = normalize([produto.nome, produto.codigo, produto.barcode].join(' '));
    return terms.every((term) => searchableText.includes(term));
  });

  renderProducts(encontrados);
};

const stopCamera = () => {
  cameraActive = false;

  if (scanFrame !== null) {
    cancelAnimationFrame(scanFrame);
    scanFrame = null;
  }

  cameraControls?.stop();
  cameraControls = null;
  (cameraStream ?? scannerVideo.srcObject)?.getTracks().forEach((track) => track.stop());
  cameraStream = null;
  scannerVideo.srcObject = null;
};

const closeScanner = () => {
  stopCamera();
  if (scannerDialog.open) {
    scannerDialog.close();
  }
};

const scanBarcode = async (detector) => {
  if (!cameraActive) {
    return;
  }

  if (scannerVideo.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
    try {
      const barcodes = await detector.detect(scannerVideo);
      if (barcodes.length && cameraActive) {
        buscaInput.value = barcodes[0].rawValue;
        closeScanner();
        buscaInput.dispatchEvent(new Event('input', { bubbles: true }));
        buscaInput.focus({ preventScroll: true });
        return;
      }
    } catch (error) {
      console.error('Erro ao ler o código de barras:', error);
      scannerStatus.textContent = 'Não foi possível ler o código. Feche e tente novamente.';
      closeScanner();
      return;
    }
  }

  if (cameraActive) {
    scanFrame = requestAnimationFrame(() => scanBarcode(detector));
  }
};

const startZXingCamera = async () => {
  const reader = new window.ZXingBrowser.BrowserMultiFormatReader();
  cameraActive = true;

  try {
    const controls = await reader.decodeFromConstraints(
      {
        audio: false,
        video: { facingMode: { ideal: 'environment' } },
      },
      scannerVideo,
      (result, _error, scanControls) => {
        if (!result || !cameraActive) {
          return;
        }

        cameraActive = false;
        scanControls.stop();
        cameraControls = null;
        scannerVideo.srcObject = null;
        if (scannerDialog.open) {
          scannerDialog.close();
        }
        buscaInput.value = result.getText();
        buscaInput.dispatchEvent(new Event('input', { bubbles: true }));
        buscaInput.focus({ preventScroll: true });
      }
    );

    if (!scannerDialog.open) {
      controls.stop();
      return;
    }

    cameraControls = controls;
    scannerStatus.textContent = 'Posicione o código de barras dentro da moldura.';
  } catch (error) {
    console.error('Não foi possível iniciar a leitura pela câmera:', error);
    scannerStatus.textContent = error.name === 'NotAllowedError'
      ? 'Permita o acesso à câmera no navegador e tente novamente.'
      : 'Não foi possível iniciar a câmera. Verifique a permissão e tente novamente.';
    stopCamera();
  }
};

const startCamera = async () => {
  scannerDialog.showModal();
  scannerStatus.textContent = 'Iniciando câmera...';

  if (!navigator.mediaDevices?.getUserMedia) {
    scannerStatus.textContent = 'A câmera precisa de uma conexão segura (HTTPS) e suporte do navegador.';
    return;
  }

  if (!window.BarcodeDetector) {
    if (window.ZXingBrowser?.BrowserMultiFormatReader) {
      await startZXingCamera();
    } else {
      scannerStatus.textContent = 'Não foi possível carregar o leitor de códigos. Verifique sua conexão e tente novamente.';
    }
    return;
  }

  try {
    const formats = await window.BarcodeDetector.getSupportedFormats();
    const supportedFormats = [
      'ean_13',
      'ean_8',
      'upc_a',
      'upc_e',
      'code_128',
      'code_39',
      'itf',
    ].filter((format) => formats.includes(format));

    if (!supportedFormats.length) {
      if (window.ZXingBrowser?.BrowserMultiFormatReader) {
        await startZXingCamera();
      } else {
        scannerStatus.textContent = 'Este navegador não oferece suporte aos formatos de código de barras do produto.';
      }
      return;
    }

    const detector = new window.BarcodeDetector({ formats: supportedFormats });
    cameraStream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: 'environment' } },
    });
    if (!scannerDialog.open) {
      stopCamera();
      return;
    }

    scannerVideo.srcObject = cameraStream;
    await scannerVideo.play();
    if (!scannerDialog.open) {
      stopCamera();
      return;
    }

    scannerStatus.textContent = 'Posicione o código de barras dentro da moldura.';
    cameraActive = true;
    scanFrame = requestAnimationFrame(() => scanBarcode(detector));
  } catch (error) {
    console.error('Não foi possível iniciar a leitura pela câmera:', error);
    scannerStatus.textContent = error.name === 'NotAllowedError'
      ? 'Permita o acesso à câmera no navegador e tente novamente.'
      : 'Não foi possível iniciar a câmera. Verifique a permissão e tente novamente.';
    stopCamera();
  }
};

buscaInput.addEventListener('input', searchProducts);
openCameraButton.addEventListener('click', startCamera);
closeCameraButton.addEventListener('click', closeScanner);
scannerDialog.addEventListener('close', stopCamera);
scannerDialog.addEventListener('click', (event) => {
  if (event.target === scannerDialog) {
    closeScanner();
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && scannerDialog.open) {
    closeScanner();
  }
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
