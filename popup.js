// On Chrome update the icon based on the light/dark theme.
// Requires user interaction; not automatic.
// When icon_variants API is stabilized, use that instead, in manifest.json.
// Could also use Chrome-specific Offscreen API and service worker,
// but that requires adding nonstandard "offscreen" permission in manifest.json,
// which breaks Firefox, and I don't want to maintain separate manifest files.
if (isChrome) {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
  if (prefersDark.matches) {
    // dark theme, light icon
    chrome.action.setIcon({
      path: {
        "16": "icons/table-dark-16.png",
        "32": "icons/table-dark-32.png"
      }
    });
  } else {
    // light theme, dark icon
    chrome.action.setIcon({
      path: {
        "16": "icons/table-16.png",
        "32": "icons/table-32.png"
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', function() {
  const toggleMarkdownButton = document.getElementById('toggleMarkdown');
  const copyMarkdownButton = document.getElementById('copyMarkdown');
  const copyMarkdownSuccessDummy = document.getElementById('copyMarkdownSuccess');
  const clearDataButton = document.getElementById('clearData');
  const currentTable = document.getElementById('currentTable');
  const currentMarkdown = document.getElementById('currentMarkdown');
  const initialOverlay = document.getElementById('initialOverlay');

  toggleMarkdownButton.addEventListener('click', () => {
    if (currentMarkdown.style.display === 'none') {
      currentMarkdown.style.display = '';
      currentTable.style.display = 'none';
    } else {
      currentTable.style.display = '';
      currentMarkdown.style.display = 'none';
    }
  });

  copyMarkdownButton.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(currentMarkdown.value);
    } catch (error) {
      log(error.message);
      return;
    }

    copyMarkdownSuccessDummy.style.display = '';
    copyMarkdownButton.style.display = 'none';
    setTimeout(() => {
      copyMarkdownSuccessDummy.style.display = 'none';
      copyMarkdownButton.style.display = '';
    }, 1000);
  });

  clearDataButton.addEventListener('click', () => {
    if (window.confirm("Delete stored game data?")) {
      browser.storage.local.remove('knownInfo');
    }
  });

  async function rebuildTable() {
    const data = await browser.storage.local.get({'knownInfo': {}});
    let knownInfo = data.knownInfo;

    // merge data from alternate game titles (different capitalization/punctuation)
    mergeAlternateTitleGameInfo(knownInfo);

    currentTable.replaceChildren(...buildCurrentTableRowElements(knownInfo));
    currentMarkdown.value = buildCurrentMarkdown(knownInfo);

    // If there's no data yet, show overlay directing user to Humble Choice page
    if (knownInfo['__gameDisplayOrder__']) {
      initialOverlay.style.display = 'none';
    } else {
      initialOverlay.style.display = '';
    }
  }
  rebuildTable();
  browser.storage.onChanged.addListener(rebuildTable);
});

function mergeAlternateTitleGameInfo(updatedInfo) {
  if (!updatedInfo['__gameDisplayOrder__']) {
    return;
  }
  for (const humbleTitle of updatedInfo['__gameDisplayOrder__']) {
    if (updatedInfo[humbleTitle] && updatedInfo[humbleTitle]['altTitles']) {
      for (const altTitle of updatedInfo[humbleTitle]['altTitles']) {
        updatedInfo[humbleTitle] = {...updatedInfo[humbleTitle], ...updatedInfo[altTitle]};
      }
    }
  }
}

function buildCurrentTableRowElements(updatedInfo) {
  const rows = [];
  
  // Create header row
  const headerRow = document.createElement('tr');
  const headers = ['Steam Page', 'OpenCritic', 'Steam Recent/All', 'Operating Systems', 'Steam Deck', 'ProtonDB'];
  
  headers.forEach(headerText => {
    const th = document.createElement('th');
    th.textContent = headerText;
    headerRow.appendChild(th);
  });
  
  rows.push(headerRow);
  
  if (!updatedInfo['__gameDisplayOrder__']) {
    return rows;
  }
  
  for (const key of updatedInfo['__gameDisplayOrder__']) {
    if (updatedInfo.hasOwnProperty(key)) {
      const row = document.createElement('tr');
      let oneGameInfo = updatedInfo[key];
      let title = key;
      let steamAppId = oneGameInfo['steamAppId'];
      
      // Steam Page column
      const steamCell = document.createElement('td');
      if (oneGameInfo['steamPage']) {
        // Presence of 'steamPage' key implies Steam page has been parsed
        const link = document.createElement('a');
        link.href = oneGameInfo['steamPage'];
        link.textContent = title;
        steamCell.appendChild(link);
      } else if (steamAppId) {
        steamCell.textContent = title;
        steamCell.appendChild(document.createElement('br'));
        const link = document.createElement('a');
        link.href = `https://store.steampowered.com/app/${steamAppId}/`;
        const bold = document.createElement('b');
        bold.textContent = '⚠️Go⚠️';
        link.appendChild(bold);
        steamCell.appendChild(link);
      } else {
        steamCell.textContent = title;
        steamCell.appendChild(document.createElement('br'));
        const searchTerm = encodeURIComponent(title);
        const link = document.createElement('a');
        link.href = `https://store.steampowered.com/search/?term=${searchTerm}`;
        const bold = document.createElement('b');
        bold.textContent = '⚠️Search⚠️';
        link.appendChild(bold);
        steamCell.appendChild(link);
      }
      row.appendChild(steamCell);
      
      // OpenCritic column
      const opencriticCell = document.createElement('td');
      if (oneGameInfo['opencriticPage'] && oneGameInfo['opencriticScore']) {
        const link = document.createElement('a');
        link.href = oneGameInfo['opencriticPage'];
        link.textContent = oneGameInfo['opencriticScore'];
        opencriticCell.appendChild(link);
      } else {
        // Set URL fragment and use content-opencritic-search.js to fill in the search field
        const searchTerm = encodeURIComponent(title);
        const link = document.createElement('a');
        link.href = `https://opencritic.com/#humble-search-${searchTerm}`;
        const bold = document.createElement('b');
        bold.textContent = '⚠️Search⚠️';
        link.appendChild(bold);
        opencriticCell.appendChild(link);
      }
      row.appendChild(opencriticCell);
      
      // Steam Recent/All column
      const steamRecentAllCell = document.createElement('td');
      if (oneGameInfo['steamRecentAll']) {
        steamRecentAllCell.textContent = oneGameInfo['steamRecentAll'];
      }
      row.appendChild(steamRecentAllCell);
      
      // Operating Systems column
      const osCell = document.createElement('td');
      if (oneGameInfo['operatingSystems']) {
        osCell.textContent = oneGameInfo['operatingSystems'];
      }
      row.appendChild(osCell);
      
      // Steam Deck column
      const steamDeckCell = document.createElement('td');
      if (oneGameInfo['steamDeck']) {
        steamDeckCell.textContent = oneGameInfo['steamDeck'];
      }
      row.appendChild(steamDeckCell);
      
      // ProtonDB column
      const protondbCell = document.createElement('td');
      if (oneGameInfo['protonDBPage'] && oneGameInfo['protonDBRating']) {
        const link = document.createElement('a');
        link.href = oneGameInfo['protonDBPage'];
        link.textContent = oneGameInfo['protonDBRating'];
        protondbCell.appendChild(link);
      } else if (steamAppId) {
        const link = document.createElement('a');
        link.href = `https://www.protondb.com/app/${steamAppId}`;
        const bold = document.createElement('b');
        bold.textContent = '⚠️Go⚠️';
        link.appendChild(bold);
        protondbCell.appendChild(link);
      } else {
        const searchTerm = encodeURIComponent(title);
        const link = document.createElement('a');
        link.href = `https://www.protondb.com/search?q=${searchTerm}`;
        const bold = document.createElement('b');
        bold.textContent = '⚠️Search⚠️';
        link.appendChild(bold);
        protondbCell.appendChild(link);
      }
      row.appendChild(protondbCell);
      
      rows.push(row);
    }
  }
  
  return rows;
}

function buildCurrentMarkdown(updatedInfo) {
  let markdown = '| Steam Page | OpenCritic | Steam Recent/All | Operating Systems | Steam Deck | ProtonDB |\n';
  markdown += '| --- | --- | --- | --- | --- | --- |';
  
  if (!updatedInfo['__gameDisplayOrder__']) {
    return markdown + '\n| | | | | | |';
  }

  for (const key of updatedInfo['__gameDisplayOrder__']) {
    if (updatedInfo.hasOwnProperty(key)) {
      markdown += '\n| ';
      let oneGameInfo = updatedInfo[key];
      let title = key;
      
      if (oneGameInfo['steamPage']) {
        markdown += `[${title}](${oneGameInfo['steamPage']})`;
      } else {
        markdown += title;
      }
      markdown += ' | ';

      if (oneGameInfo['opencriticPage'] && oneGameInfo['opencriticScore']) {
        markdown += `[${oneGameInfo['opencriticScore']}](${oneGameInfo['opencriticPage']})`;
      }
      markdown += ' | ';

      if (oneGameInfo['steamRecentAll']) {
        markdown += oneGameInfo['steamRecentAll'];
      }
      markdown += ' | ';

      if (oneGameInfo['operatingSystems']) {
        markdown += oneGameInfo['operatingSystems'];
      }
      markdown += ' | ';

      if (oneGameInfo['steamDeck']) {
        markdown += oneGameInfo['steamDeck'];
      }
      markdown += ' | ';

      if (oneGameInfo['protonDBPage'] && oneGameInfo['protonDBRating']) {
        markdown += `[${oneGameInfo['protonDBRating']}](${oneGameInfo['protonDBPage']})`;
      }
      markdown += ' |';
    }
  }
  return markdown;
}