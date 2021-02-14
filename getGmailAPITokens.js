import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { google } from "googleapis";
import fs from "fs";
puppeteer.use(StealthPlugin());

const getGmailAPITokens = async (email, password) => {
  const browser = await puppeteer.launch({
    headless: false,
    slowMo: 20,
    args: ["--incognito"],
  });

  const page = await browser.newPage();

  const { clientID, clientSecret } = getClientAndAPIKey(page);

  await getCredentialsAndToken(page, {
    clientID,
    clientSecret,
    password,
    email,
  });
};

/* LMAO this is all broken - it needs to be the nodeJS API not the browser one */
const getClientAndAPIKey = async (page) => {
  await page.goto(`https://developers.google.com/gmail/api/quickstart/nodejs`, {
    waitUntil: "domcontentloaded",
  });

  // Login
  await page.click("[data-action='Enable']");
  await page.waitForNavigation();

  await page.type("input[type='email']", email);
  await page.click("button");

  await page.waitForSelector("input[type='password']");
  await page.type("input[type='password']", password);
  await page.click("button");

  await page.waitForNavigation();

  // Enable Gmail API
  await page.click("[data-action='Enable']");
  await page.waitForSelector(".hentest-enable-button");

  await page.click("[value='ACCEPTED']");
  await page.waitFor(500);
  await page.click(".hentest-enable-button");

  await page.waitForSelector(".hen-success-page-content");
  // Should now show Client ID & Secret
  let element = await page.$(".test-oauth-client-id .copy-bar-text");
  let clientID = await page.evaluate((el) => el.textContent, element);
  let element2 = await page.$(".test-oauth-client-secret .copy-bar-text");
  let clientSecret = await page.evaluate((el) => el.textContent, element2);

  await page.click(".hen-button-bar .md-button");

  // Create API Key
  await page.click('[data-henhouse-header-text="Create API key"] a');
  await page.waitForSelector(".hentest-enable-button");
  await page.click(".hentest-enable-button");
  await page.waitForSelector(".test-api-key-copy-bar");
  let element3 = await page.$(".test-api-key-copy-bar .copy-bar-text");
  let APIKey = await page.evaluate((el) => el.textContent, element3);

  return { clientID, clientSecret, APIKey };
};

const getCredentialsAndToken = async (
  page,
  { clientID, clientSecret, email, password }
) => {
  const oAuth2Client = new google.auth.OAuth2(
    clientID,
    clientSecret,
    "urn:ietf:wg:oauth:2.0:oob"
  );

  const authUrl = await oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/gmail.readonly"],
  });

  await page.goto(authUrl, { waitUntil: "domcontentloaded" });

  await page.type("input[type='email']", email);
  await page.click("[data-primary-action-label='Next'] button");

  await page.waitForTimeout(3000);
  await page.type("input[type='password']", password);
  await page.click("[data-primary-action-label='Next'] button");

  await page.waitForTimeout(3000);
  await page.click("#yDmH0d > div.JhUD8d.HWKDRd > div.gvYJzb > a");
  await page.waitForTimeout(1000);
  await page.click(
    "#yDmH0d > div.JhUD8d.HWKDRd > div:nth-child(5) > p:nth-child(2) > a"
  );
  await page.waitForTimeout(3000);

  await page.click("#oauthScopeDialog > div.XfpsVe.J9fJmf > div:nth-child(1)");
  await page.waitForTimeout(3000);

  await page.click("#submit_approve_access > div > button");
  await page.waitForTimeout(3000);

  let element = await page.$("textarea");
  const code = await page.evaluate((el) => el.textContent, element);

  await oAuth2Client.getToken(code, (err, token) => {
    if (err) return console.error("Error retrieving access token", err);
    oAuth2Client.setCredentials(token);
    // Store the token to disk for later progr'am executions
    fs.writeFile("./token.json", JSON.stringify(token), (err) => {
      if (err) return console.error(err);
      console.log("Token stored to ./token.json");
    });
  });
};

(async () => {})();
