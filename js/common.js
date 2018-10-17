document.addEventListener('DOMContentLoaded', (event) => {
  registerServiceWorker();
});

/**
 * Register service worker
 */
registerServiceWorker = () => {
  if (!navigator.serviceWorker) {
    console.log('Service worker not available in your browser.');
    return;
  }
  navigator.serviceWorker.register('/sw.js')
    .then(navigator.serviceWorker.ready)
    .then(function () {
      console.log('service worker registered')
    })
    .catch(function (error) {
      console.log('error when registering service worker', error, arguments)
    });
}