function extractGameInfo() {
  const currentDomain = window.location.hostname;
  const currentPath = window.location.pathname;
  
  if (currentDomain.includes('store.steampowered.com')) {
    extractSteamInfo();
  } else if (currentDomain.includes('opencritic.com') && currentPath.startsWith('/game/')) {
    extractOpenCriticInfo();
  } else if (currentDomain.includes('protondb.com')) {
    extractProtonDBInfo();
  } else if (currentDomain.includes('humblebundle.com')) {
    extractHumbleChoice();
  }
}

function extractSteamInfo() {
  const gameName = document.getElementById('appHubAppName')?.textContent;
  if (!gameName) {
    return;
  }

  const steamPage = removeURLQueryAndFragment(window.location.href);

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
  
  const steamDeckResults = document.querySelector('div[data-featuretarget=deck-verified-results]')?.textContent || '';
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
  
  updateStoredInfo({
    [gameName]: {
      steamPage: steamPage,
      steamRecentAll: scores.join(' / '),
      steamDeck: steamDeck,
      operatingSystems: platforms.join(', ')
    }
  });
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

function extractProtonDBInfo() {
  const gameName = document.querySelector('[class^=GameInfo__Title]')?.textContent;
  if (!gameName) {
    return;
  }

  const ratingElement = document.querySelector('[class^=MedalSummary]');
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
  
  updateStoredInfo({
    [gameName]: {
      protonDBRating: formattedRating,
      protonDBPage: protonDBPage
    }
  });
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
    }
  }

  result['__gameDisplayOrder__'] = displayOrderByShortKey.map((key) => shortKeyToTitleMap[key]).filter((title) => title);
  log('Game display order:', result['__gameDisplayOrder__']);
  
  return result;
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