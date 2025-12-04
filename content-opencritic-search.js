async function fillInSearchFieldFromURLFragment() {
  const searchTermPrefixed = window.location.hash;
  if (!searchTermPrefixed.startsWith('#humble-search-')) {
    return;
  }
  const searchTerm = decodeURIComponent(searchTermPrefixed.substring('#humble-search-'.length));

  const searchField = await observeQuerySelector('#form1');
  if (!searchField) {
    return;
  }

  searchField.value = searchTerm;
  searchField.dispatchEvent(new Event('input'));
}

function watchForJsNavigation() {
  let oldHref = document.location.href;
  const body = document.querySelector('body');
  const observer = new MutationObserver(_mutations => {
    if (oldHref !== document.location.href) {
      let newPath = document.location.pathname;
      if (newPath.startsWith('/game/')) {
        extractGameInfo();
      }
    }
  });
  observer.observe(body, { childList: true, subtree: true });
}

(async () => await fillInSearchFieldFromURLFragment())();

watchForJsNavigation();