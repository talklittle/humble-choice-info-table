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