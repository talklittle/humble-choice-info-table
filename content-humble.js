// Keep Humble's webpack DOM node in the DOM so this extension can parse it
const observer = new MutationObserver(records => {
  for (const {target, removedNodes} of records) {
    const element = Array.prototype.find.call(removedNodes, ({id}) =>
      id === 'webpack-monthly-product-data' || id === 'webpack-subscriber-hub-data'
    );
    if (element) {
      log('Re-add removed Humble webpack data DOM element');
      target.appendChild(element);
    }
  }
});
observer.observe(document, {
  subtree: true,
  childList: true
});

// Parse page after DOM fully loaded
document.addEventListener('DOMContentLoaded', () => {
  extractGameInfo();
});