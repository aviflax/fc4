#!/usr/bin/env node

// NB: here’s how I’ve been testing this on my Mac:
// renderer $ cat ../test/data/structurizr/express/diagram_valid_formatted_snapped.yaml | time ./render.js | open -a Preview.app -f

const dataUriToBuffer = require('data-uri-to-buffer');
const {existsSync, readFileSync} = require('fs');
const Jimp = require('jimp');
const pageFunctions = require('./page-functions');
const path = require('path');
const puppeteer = require('puppeteer-core');

const STRUCTURIZR_EXPRESS_URL = 'https://structurizr.com/express';

// This program must log to stderr rather than stdout because it writes its
// output to stdout.
const logStream = process.stderr;

function parseArgs() {
  const args = process.argv.join();
  return {
    debugMode:   args.includes('--debug'),
    quietMode:   args.includes('--quiet'),
    verboseMode: args.includes('--verbose'),
  }
}

// top-level const so `log` can access it
const args = parseArgs();

// top-level const so we don’t have to thread it through everything.
const log = step => {
  if (!args.quietMode) {
    logStream.write(args.verboseMode ? `${step}...\n` : '.');
  }
};

log.finish = () => !args.quietMode && !args.verboseMode ? logStream.write('\n') : null;

function chromiumPath() {
  // TODO: accept a path as a command-line argument
  const possiblePaths = [
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/chromium', // Debian
    '/usr/bin/google-chrome', // Debian
    '/usr/bin/chromium-browser']; // Alpine

  return possiblePaths.find(path => existsSync(path)) || null;
}

function puppeteerOpts({ debugMode }) {
  const browserArgs = [
    // We used to include --disable-dev-shm-usage as recommended here:
    // https://github.com/GoogleChrome/puppeteer/blob/master/docs/troubleshooting.md#tips but when
    // we switched our CI jobs from a custom Debian Docker image to an image maintained by CircleCI
    // (with Chrome rather than Chromium, and a newer version of Chrome, and maybe even a different
    // version of Debian, I don’t know) the browser started crashing on launch. I then determined
    // that the crash did not occur when I removed --disable-dev-shm-usage. When I do so the tests
    // all still seem to pass, including the CI test of the distribution package, so it *seems* as
    // though we can do without this flag. (Interestingly, the crash did _not_ occur when running
    // the tests via the source code, rather only when testing the distribution packages. I don’t
    // have a clue as to why.)
  ];

  return {
    args: browserArgs,
    ignoreHTTPSErrors: true, // TODO: either document this or remove it.
    executablePath: chromiumPath(),
    headless: !debugMode
  };
}

async function loadStructurizrExpress(browser) {
  log(`loading Structurizr Express from ${STRUCTURIZR_EXPRESS_URL}`);
  const page = await browser.newPage();
  await page.goto(STRUCTURIZR_EXPRESS_URL);

  // I copied this step from
  // https://github.com/structurizr/puppeteer/blob/d8b625aef77b404de42199a1ff9a9f6730795913/export-express-diagram.js#L24
  await page.waitForXPath("//*[name()='svg']");

  return page;
}

// If successful, returns undefined. If unsuccessful or an error occurs, throws an exception. The
// value of the exception will be an Error object, as such it will have a broad error message in its
// `message` property; the more detailed errors will be in its property `errors`. The value of
// that property is described in the docs on `pageFunctions.getErrorMessages`.
async function setYamlAndUpdateDiagram(page, diagramYaml) {
  log('setting YAML and updating diagram');
  await page.evaluate(pageFunctions.renderExpressDefinition, diagramYaml);
  if (await page.evaluate(pageFunctions.hasErrorMessages)) {
    const err = new Error("Errors were found in the diagram definition");
    err.errors = await page.evaluate(pageFunctions.getErrorMessages);
    throw err;
  }
}

async function exportDiagram(page) {
  log('calling diagram export function');
  const diagramImageBase64DataURI = await page.evaluate(pageFunctions.exportCurrentDiagramToPNG);

  // TODO: add some error handling: e.g. check that it actually is a data URI, etc
  return dataUriToBuffer(diagramImageBase64DataURI);
}

async function exportKey(page) {
  log('calling key export function');
  const keyImageBase64DataURI = await page.evaluate(pageFunctions.exportCurrentDiagramKeyToPNG);

  // TODO: add some error handling: e.g. check that it actually is a data URI, etc
  return dataUriToBuffer(keyImageBase64DataURI);
}

async function conjoin(diagramImage, keyImage) {
  log('conjoining diagram and key');

  const diagram = await Jimp.read(diagramImage);
  const key = await Jimp.read(keyImage);

  // Constants
  const keyScale = 0.5;
  const separatorWidth = 1;
  const separatorColor = 'silver';

  // Key needs to be scaled down to look like a key
  const keyHeight = key.bitmap.height * keyScale;
  const keyWidth = key.bitmap.width * keyScale

  // Computations!
  const finalWidth = Math.max(diagram.bitmap.width, keyWidth);
  const finalHeight = diagram.bitmap.height + separatorWidth + keyHeight;
  const keyY = diagram.bitmap.height + separatorWidth;

  key.scale(keyScale);

  try {
    const font = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);
    key.print(font, 0, 5, 'Key');
  } catch (err) {
    console.error(`🚨 WARNING: could not render label “Key” above key: ${err}`);
  }

  key.background(Jimp.cssColorToHex('white'));
  key.contain(finalWidth, keyHeight);

  // Conjoin!
  const alignment = Jimp.HORIZONTAL_ALIGN_CENTER | Jimp.VERTICAL_ALIGN_TOP;
  diagram.background(Jimp.cssColorToHex(separatorColor));
  diagram.contain(finalWidth, finalHeight, alignment);
  diagram.composite(key, 0, keyY + separatorWidth);

  return await diagram.getBufferAsync(Jimp.MIME_PNG);
}

async function render(diagramYaml, browser, args) {
  const page = await loadStructurizrExpress(browser);
  await setYamlAndUpdateDiagram(page, diagramYaml);
  const diagramImage = await exportDiagram(page);

  try {
    const keyImage = await exportKey(page);
    return await conjoin(diagramImage, keyImage);
  } catch (err) {
    console.error(`🚨 WARNING: could not add key to diagram: ${err}`);
    return diagramImage;
  }
}

// On success: returns a Puppeteer browser object
// On failure: logs an error then returns null
async function launchBrowser(args) {
  try {
    const opts = puppeteerOpts(args);
    log('launching browser');
    return await puppeteer.launch(opts);
  } catch (err) {
    console.error(`Could not launch browser: ${err}\n${err.stack}`);
    return null;
  }
}

async function closeBrowser(browser, { debugMode }) {
  if (debugMode) {
    log('DEBUG MODE: leaving browser open; script may be blocked until the browser quits.');
  } else {
    log('closing browser');
    await browser.close();
  }
}

function prepYaml(yaml) {
  // Structurizr Express will only recognize the YAML as YAML and parse it if
  // it begins with the YAML document separator. If this isn’t present, it will
  // assume that the diagram definition string is JSON and will fail.
  const sepLoc = yaml.indexOf('---');
  return sepLoc >= 0 ? yaml.substring(sepLoc) : `---\n${yaml}`;
}

function printErrorMessages(err, preppedYaml) {
  let humanOutput;
  const machineOutput = { message: err.message };

  if (err.errors) {
    // If the error has a property `errors` then it’s probably an Error object that’s been thrown
    // within `render`.
    humanOutput = `RENDERING FAILED: ${err.message}:\n`
    humanOutput += err.errors.map(errErr => `  💀 ${errErr.message}`).join('\n');
    machineOutput.errors = err.errors;
  } else {
    // general failure
    humanOutput = `RENDERING FAILED: ${err.stack}\nPrepped YAML:\n${preppedYaml}`
  }

  console.error(`🚨🚨🚨\n${humanOutput}\n🚨🚨🚨`);
  console.error(`🤖🤖🤖\n${JSON.stringify(machineOutput)}\n🤖🤖🤖`);
}

async function main(args) {
  // Read stdin first; if it fails or blocks, no sense in launching the browser
  const rawYaml = readFileSync("/dev/stdin", "utf-8");
  const preppedYaml = prepYaml(rawYaml);

  // This is outside of the try block so that the binding will be visible to
  // both the try block below and the finally block, because if an error occurs
  // it’s really important to close the browser; if we don’t then the program
  // will hang and not exit, even though rendering failed.
  const browser = await launchBrowser(args);

  if (!browser) {
    // An error message will have been printed out by launchBrowser
    process.exitCode = 1;
    return;
  }

  try {
    const imageBuffer = await render(preppedYaml, browser, args);
    process.stdout.write(imageBuffer);
  } catch (err) {
    printErrorMessages(err, preppedYaml);
    process.exitCode = 1;
  } finally {
    closeBrowser(browser, args);
    log.finish();
  }
}

main(args);
