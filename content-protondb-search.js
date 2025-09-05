function watchForJsNavigation() {
  let oldHref = document.location.href;
  const body = document.querySelector('body');
  const observer = new MutationObserver(_mutations => {
    if (oldHref !== document.location.href) {
      let newPath = document.location.pathname;
      if (newPath.startsWith('/app/')) {
        extractGameInfo();
      }
    }
  });
  observer.observe(body, { childList: true, subtree: true });
}

watchForJsNavigation();