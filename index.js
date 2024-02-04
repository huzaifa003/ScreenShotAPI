const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;
require("dotenv").config();

// Ensure the screenshots directory exists
const screenshotsDir = path.join(__dirname, 'screenshots');
fs.mkdirSync(screenshotsDir, { recursive: true });

app.get('/screenshot', async (req, res) => {
    const url = req.query.url;

    if (!url) {
        return res.status(400).send({ error: 'Please provide a URL as a query parameter' });
    }

    try {
        console.log(process.env.PUPPETEER_EXECUTABLE_PATH);
        const browser = await puppeteer.launch({
            args: [
              "--disable-setuid-sandbox",
              "--no-sandbox",
              "--single-process",
              "--no-zygote",
            ],
            executablePath:
              process.env.NODE_ENV === "production"
                ? process.env.PUPPETEER_EXECUTABLE_PATH
                : puppeteer.executablePath(),
          });

    

        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'networkidle2' });

        // Attempt to find and click the accept cookies button
        async function clickAcceptCookies() {
            const cookieSelectors = [
                'button[aria-label="Accept cookies"]',
                'button[id="accept-cookies"]',
                'button[class*="CookieConsent"]',
                'button[class*="cookieAccept"]',
                'button[class*="cookie-agree"]',
                'button[class*="accept"]',
                'button[class*="agree"]',
                'button[id*="jix-cookie-consent-accept-all"]',
                // Add more selectors as you encounter different cookie consent implementations
            ];

            // Try clicking each selector until one works or all fail
            for (const selector of cookieSelectors) {
                if (await page.$(selector)) { // Check if the selector exists on the page
                    console.log(`Found cookie button with selector: ${selector}. Clicking now...`);
                    await page.click(selector).catch(e => console.error(`Failed to click selector: ${selector}`, e));
                    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 5000 }).catch(() => console.log('No navigation after click, continuing...'));
                    break; // Exit the loop if a click is successfully performed
                }
            }
        }

        await clickAcceptCookies();
        
        // Generate a filename based on the current timestamp and the domain name
        const timestamp = new Date().getTime();
        const filename = `screenshot-${timestamp}.png`;
        const filepath = path.join(screenshotsDir, filename);

        await page.screenshot({ path: filepath, fullPage: true });
        await browser.close();

        res.send({ message: 'Screenshot saved', filename: filename, url: "http://localhost:3000/screenshots/" + filename });
    } catch (error) {
        console.error('Error capturing screenshot:', error);
        res.status(500).send({ error: 'Failed to capture the screenshot' });
    }
});

// Optional: Serve the screenshots directly
app.use('/screenshots', express.static(screenshotsDir));

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

