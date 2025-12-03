const LOGGING = false;

// Cross-browser support
const isFirefox = typeof browser !== 'undefined';
const isChrome = typeof browser === 'undefined';
if (isChrome) {
  browser = chrome;
}

function log(message, ...moreArgs) {
  if (LOGGING) {
    console.log(message, ...moreArgs);
  }
}

function removeURLQueryAndFragment(url) {
  const queryIndex = url.indexOf('?');
  if (queryIndex !== -1) {
    url = url.substring(0, queryIndex);
  }
  const hashIndex = url.indexOf('#');
  if (hashIndex !== -1) {
    url = url.substring(0, hashIndex);
  }
  return url;
}

function removeParenthesizedYearFromEnd(str) {
    const yearPattern = / \(\d{4}\)$/;

    if (yearPattern.test(str)) {
        return str.replace(yearPattern, '');
    }

    return str;
}

function observeQuerySelector(query, timeoutMillis) {
  if (!timeoutMillis) {
    timeoutMillis = 10000;
  }

  return new Promise((resolve, reject) => {
    let el = document.querySelector(query);
    if (el) {
      resolve(el);
      return;
    }

    const domObserver = new MutationObserver((_mutationList, observer) => {
      const el = document.querySelector(query);

      if (el) {
        observer.disconnect();
        resolve(el);
      }
    });
    domObserver.observe(document.body, { childList: true, subtree: true });

    setTimeout(() => {
      reject(new Error('timeout'));
    }, timeoutMillis);
  });
}