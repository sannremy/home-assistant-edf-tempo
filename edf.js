const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const log = (...args) => {
  return console.log(`[${(new Date()).toISOString()}]`, ...args);
};

const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

const addToState = (name, state, attributes) => {
  return fetch(`http://supervisor/core/api/states/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + process.env.SUPERVISOR_TOKEN,
    },
    body: JSON.stringify({
      state,
      attributes,
    }),
  });
};

const getTempoData = async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/usr/bin/chromium-browser',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--headless',
      '--disable-gpu',
      '--disable-dev-shm-usage',
    ],
  });

  // Open new tab
  const page = await browser.newPage();

  page.on("framenavigated", frame => {
    const url = frame.url(); // the new url
    log('Frame navigated', url);
  });

  page.setDefaultNavigationTimeout(5 * 60 * 1000); // 5 minutes

  // Set viewport
  await page.setViewport({
    width: 1168,
    height: 687,
  });

  const getContentFromAPI = async (url) => {
    return await new Promise(async resolve => {
      log('Set event on response for API call', page.url());
      page.on('response', async response => {
        if (
          response.request().resourceType() === 'xhr' &&
          response.ok() &&
          response.url().includes(url)
        ) {
          log('Get: ' + response.url());
          const json = await response.json();

          if (json.content) {
            return resolve(json.content);
          }
        }
      });
    });
  };

  // Get tempo JSON data
  const tempoPromise = getContentFromAPI('https://api-commerce.edf.fr/commerce/activet/v1/calendrier-jours-effacement');

  // Get remaining tempo days
  const remainingTempoDaysPromise = getContentFromAPI('https://api-commerce.edf.fr/commerce/activet/v1/saisons/search');

  // Tempo page
  await page.goto('https://particulier.edf.fr/fr/accueil/gestion-contrat/options/tempo.html#/');

  // Wait for the page to load
  await page.waitForSelector('#a11y-today');

  // Wait for the API calls to finish
  await sleep(10000);

  const tempoJson = await tempoPromise;

  const date = new Date();
  const dateTempoToday = date.toISOString().split('T')[0];

  const dateTomorrow = new Date();
  dateTomorrow.setDate(dateTomorrow.getDate() + 1);
  const dateTempoTomorrow = dateTomorrow.toISOString().split('T')[0];

  const calendrier = tempoJson.options[0].calendrier;

  let todayFound = false;
  let tomorrowFound = false;
  let remainingDaysFound = false;

  const calDateToday = calendrier.find((cal) => { return cal.dateApplication === dateTempoToday; });
  if (calDateToday.statut) {
    await addToState(
      'sensor.tempo_today',
      calDateToday.statut,
      {
        friendly_name: 'EDF - Tempo today',
        date: tempoJson.dateHeureTraitementActivET,
      }
    );

    todayFound = true;
  }

  const calDateTomorrow = calendrier.find((cal) => { return cal.dateApplication === dateTempoTomorrow; });
  if (calDateTomorrow.statut) {
    await addToState(
      'sensor.tempo_tomorrow',
      calDateTomorrow.statut,
      {
        friendly_name: 'EDF - Tempo tomorrow',
        date: tempoJson.dateHeureTraitementActivET,
      }
    );

    tomorrowFound = true;
  }

  const remainingTempoDaysJson = await remainingTempoDaysPromise;

  remainingTempoDaysJson.forEach(async (color) => {
    if (color.typeJourEff) {
      await addToState(
        `sensor.remaining_${color.typeJourEff.toLowerCase().replace('tempo_', '')}_days`,
        color.nombreJours - color.nombreJoursTires,
        color
      );

      remainingDaysFound = true;
    }
  });

  // Loop for 30 seconds to ensure all states are set or gracefully exit if not found
  let attempts = 0;
  const interval = setInterval(async () => {
    if (todayFound && tomorrowFound && remainingDaysFound) {
      // Close browser
      log('Close browser');
      await browser.close();

      clearInterval(interval);
    }

    if (attempts > 30) {
      log('Timeout reached, stopping the script.');

      // Close browser
      log('Close browser');
      await browser.close();

      clearInterval(interval);
    }

    attempts++;
  }, 1000);
};

getTempoData();
