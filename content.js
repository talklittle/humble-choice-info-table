async function extractGameInfo() {
  const currentDomain = window.location.hostname;
  const currentPath = window.location.pathname;
  
  if (currentDomain.includes('store.steampowered.com')) {
    await extractSteamInfo();
  } else if (currentDomain.includes('opencritic.com') && currentPath.startsWith('/game/')) {
    extractOpenCriticInfo();
  } else if (currentDomain.includes('protondb.com')) {
    await extractProtonDBInfo();
  } else if (currentDomain.includes('humblebundle.com')) {
    extractHumbleChoice();
  }
}

async function extractSteamInfo() {
  const gameName = document.getElementById('appHubAppName')?.textContent;
  if (!gameName) {
    return;
  }

  const steamPage = removeURLQueryAndFragment(window.location.href);
  const steamAppId = getSteamAppIdFromURL(steamPage);

  const scoreRegex = /(\d+)%/;
  const userReviewsAnchors = document.querySelectorAll('#userReviews a[data-tooltip-html]');
  let scores = [];
  for (const anchor of userReviewsAnchors) {
    const tooltip = anchor.getAttribute('data-tooltip-html');
    const found = tooltip.match(scoreRegex);
    if (found.length >= 2) {
      scores.push(found[1]);
    }
  }
  if (scores.length === 1) {
    // assume no Recent Reviews
    scores.splice(0, 0, '--');
  }

  const steamDeckResultsEl = await observeQuerySelector('div[data-featuretarget=deck-verified-results] span');
  const steamDeckResults = steamDeckResultsEl?.textContent || '';
  let steamDeck;
  if (steamDeckResults.includes('Verified')) {
    steamDeck = '✅ Verified';
  } else if (steamDeckResults.includes('Playable')) {
    steamDeck = '🟨 Playable';
  } else if (steamDeckResults.includes('Unsupported')) {
    steamDeck = '❌ Unsupported';
  } else {
    steamDeck = '❓ Unknown';
  }

  const platformsEl = document.querySelector('.game_area_purchase_platform');
  let platforms = [];
  if (platformsEl?.querySelector('.win')) {
    platforms.push('Win');
  }
  if (platformsEl?.querySelector('.mac')) {
    platforms.push('Mac');
  }
  if (platformsEl?.querySelector('.linux')) {
    platforms.push('Linux');
  }

  await updateStoredInfo({
    [gameName]: {
      steamPage: steamPage,
      steamAppId: steamAppId,
      steamRecentAll: scores.join(' / '),
      steamDeck: steamDeck,
      operatingSystems: platforms.join(', ')
    }
  });

  await insertStoredAlternateTitle(steamAppId, gameName);
}

function extractOpenCriticInfo() {
  const gameName = document.querySelector('app-game-overview h1')?.textContent;
  if (!gameName) {
    return;
  }

  const scoreElement = document.querySelector('.score-orb');
  const score = scoreElement ? scoreElement.textContent.trim() : "--";
  const opencriticPage = removeURLQueryAndFragment(window.location.href);
  
  updateStoredInfo({
    [gameName]: {
      opencriticScore: score,
      opencriticPage: opencriticPage
    }
  });

  // Handle cases where OpenCritic appends a parenthesized year to the title
  let gameNameWithYearRemoved = removeParenthesizedYearFromEnd(gameName);
  if (gameNameWithYearRemoved !== gameName) {
    updateStoredInfo({
      [gameNameWithYearRemoved]: {
        opencriticScore: score,
        opencriticPage: opencriticPage
      }
    });
  }
}

async function extractProtonDBInfo() {
  const gameNameEl = await observeQuerySelector('[class^=GameInfo__Title]');
  const gameName = gameNameEl?.textContent;
  if (!gameName) {
    return;
  }

  const ratingElement = await observeQuerySelector('[class^=MedalSummary]');
  const rating = ratingElement ? ratingElement.textContent : "--";
  const protonDBPage = removeURLQueryAndFragment(window.location.href);

  let formattedRating;
  if (rating == 'Platinum') {
    formattedRating = '🎖️ Platinum';
  } else if (rating == 'Gold') {
    formattedRating = '🟨 Gold';
  } else if (rating == 'Silver') {
    formattedRating = '⬜ Silver';
  } else if (rating == 'Bronze') {
    formattedRating = '🟫 Bronze';
  } else if (rating == 'Borked') {
    formattedRating = '🟥 Borked';
  } else if (rating == 'Native') {
    formattedRating = '✅ Native';
  } else {
    formattedRating = '🕙 Awaiting Reports';
  }
  
  await updateStoredInfo({
    [gameName]: {
      protonDBRating: formattedRating,
      protonDBPage: protonDBPage
    }
  });

  const steamAppId = getSteamAppIdFromURL(protonDBPage);
  if (steamAppId) {
    await insertStoredAlternateTitle(steamAppId, gameName);
  }
}

function extractHumbleChoice() {
  // Try from webpack <script> in monthly URL, e.g. /membership/september-2025
  var dataString = document.getElementById('webpack-monthly-product-data')?.textContent;
  if (!dataString) {
    // Try from webpack <script> in logged-in URL, /membership/home
    dataString = document.getElementById('webpack-subscriber-hub-data')?.textContent;
  }
  if (dataString) {
    const data = JSON.parse(dataString);
    log('Humble Choice webpack info:', data);

    const contentChoiceData = data['contentChoiceOptions']['contentChoiceData'];
    let gameData = contentChoiceData['game_data'];
    let displayOrder = contentChoiceData['display_order'];

    const gameInfo = createGamesAndOrderObjectFromHumble(gameData, displayOrder);
    updateStoredInfo(gameInfo);

    return;
  }

  // Get from DOM elements from top-level /membership URL
  const dataEl = document.querySelector('button[data-content-choice-data]');
  const orderEl = document.querySelector('button[data-display-order]');
  if (dataEl && orderEl) {
    let gameData = JSON.parse(dataEl.getAttribute('data-content-choice-data'));
    let displayOrder = JSON.parse(orderEl.getAttribute('data-display-order'));
    log('Found Humble Choice DOM elements');
    
    const gameInfo = createGamesAndOrderObjectFromHumble(gameData, displayOrder);
    updateStoredInfo(gameInfo);

    return;
  }

  log('No Humble Choice data found on this page');
}

function createGamesAndOrderObjectFromHumble(gameData, displayOrderByShortKey) {
  let result = {};
  let shortKeyToTitleMap = {};
  for (let key in gameData) {
    if (gameData.hasOwnProperty(key)) {
      let gameInfo = gameData[key];
      if (!gameInfo['platforms'] || gameInfo['platforms'].length == 0) {
        // Not a game
        continue;
      }

      let title = gameInfo['title'];
      shortKeyToTitleMap[key] = title;

      result[title] = {};

      const steamAppId = getSteamAppIdFromHumbleGameInfo(gameInfo);
      if (steamAppId) {
        result[title]['steamAppId'] = steamAppId;
        log('Found steamAppId ' + steamAppId);
      }
    }
  }

  result['__gameDisplayOrder__'] = displayOrderByShortKey.map((key) => shortKeyToTitleMap[key]).filter((title) => title);
  log('Game display order:', result['__gameDisplayOrder__']);
  
  return result;
}

function getSteamAppIdFromHumbleGameInfo(gameInfo) {
  if (!gameInfo['tpkds']) {
    return undefined;
  }
  for (const entry of gameInfo['tpkds']) {
    if (entry['steam_app_id']) {
      return entry['steam_app_id'];
    }
  }
  return undefined;
}

function getSteamAppIdFromURL(urlString) {
  let url = new URL(urlString);
  if (url.host === 'store.steampowered.com' || url.host === 'www.protondb.com') {
    if (url.pathname.startsWith('/app/')) {
      let split = url.pathname.split('/');
      let id = parseInt(split[2]);
      if (!isNaN(id)) {
        return id;
      }
    }
  }
  return undefined;
}

async function updateStoredInfo(gameInfo) {
  const stored = await browser.storage.local.get({'knownInfo': {}});
  
  log('Known info before update:', JSON.stringify(stored.knownInfo));
  updateKnownInfo(stored.knownInfo, gameInfo);
  log('Known info after update:', JSON.stringify(stored.knownInfo));
      
  await browser.storage.local.set({knownInfo: stored.knownInfo});
}

function updateKnownInfo(knownInfo, gameInfo) {
  log("Updating document with:", gameInfo);

  for (let key in gameInfo) {
    if (key == '__gameDisplayOrder__') {
      knownInfo[key] = gameInfo[key];
    } else if (gameInfo.hasOwnProperty(key)) {
      // Merge in the new info, per game
      knownInfo[key] = {...knownInfo[key], ...gameInfo[key]};
      log(`Updating game ${key} with:`, knownInfo[key]);
    }
  }
}

async function insertStoredAlternateTitle(steamAppId, gameName) {
  // Associate with Humble game that uses different title formatting,
  // e.g. Roman numeral "II" instead of "2".
  //
  // Note: This association only works if the Humble Choice page was visited first,
  // and the current monthly games are known to this extension.
  // This is to avoid linear scan of *all* historical titles stored in extension storage.

  if (!steamAppId) {
    return;
  }

  const stored = await browser.storage.local.get({'knownInfo': {}});
  if (!stored.knownInfo['__gameDisplayOrder__']) {
    return;
  }

  for (const humbleTitle of stored.knownInfo['__gameDisplayOrder__']) {
    if (humbleTitle === gameName) {
      continue;
    }
    if (stored.knownInfo[humbleTitle] && stored.knownInfo[humbleTitle]['steamAppId'] === steamAppId) {
      let altTitles = stored.knownInfo[humbleTitle]['altTitles'] || [];
      if (!altTitles.includes(gameName)) {
        altTitles.push(gameName);
        await updateStoredInfo({
          [humbleTitle]: {
            altTitles: altTitles
          }
        });
      }
    }
  }
}