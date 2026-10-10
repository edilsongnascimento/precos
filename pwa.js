const installButton = document.querySelector('#install-app');
const installStatus = document.querySelector('#install-status');
let installPrompt = null;

const hideInstallOption = () => {
  installButton.hidden = true;
};

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  installPrompt = event;
  installButton.hidden = false;
  installStatus.textContent = 'Instale o app para abrir a consulta em uma janela própria.';
});

window.addEventListener('appinstalled', () => {
  installPrompt = null;
  hideInstallOption();
  installStatus.textContent = 'Consulta de Preços instalada.';
});

installButton.addEventListener('click', async () => {
  if (!installPrompt) {
    installStatus.textContent = 'Para instalar, use o menu ⋮ do Chrome e escolha “Instalar Consulta de Preços”.';
    return;
  }

  const prompt = installPrompt;
  installPrompt = null;
  hideInstallOption();

  try {
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    installStatus.textContent = outcome === 'accepted'
      ? 'Instalação iniciada.'
      : 'Instalação cancelada. Você pode tentar novamente pelo menu ⋮ do Chrome.';
  } catch (error) {
    installStatus.textContent = 'Não foi possível abrir a instalação. Use o menu ⋮ do Chrome.';
    console.error('Não foi possível iniciar a instalação do app:', error);
  }
});

const canRegisterServiceWorker =
  'serviceWorker' in navigator &&
  (window.location.protocol === 'https:' ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1');

if (canRegisterServiceWorker) {
  navigator.serviceWorker.register(new URL('./service-worker.js', window.location.href))
    .catch((error) => {
      installStatus.textContent = 'Não foi possível ativar o suporte offline neste navegador.';
      console.error('Não foi possível registrar o service worker:', error);
    });
}
