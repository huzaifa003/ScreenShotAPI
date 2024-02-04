const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Ensure the screenshots directory exists
const screenshotsDir = path.join(__dirname, 'screenshots');
fs.mkdirSync(screenshotsDir, { recursive: true });

app.get('/screenshot', async (req, res) => {
    const url = req.query.url;

    if (!url) {
        return res.status(400).send({ error: 'Please provide a URL as a query parameter' });
    }

    try {
        const browser = await puppeteer.launch({
            headless: "new", // Opt into the new headless mode
            // args: ['--no-sandbox', '--disable-setuid-sandbox'],
            // defaultViewport: { width: 1920, height: 1080 },
            // ignoreHTTPSErrors: true,
            // timeout: 0,
            // Optional: Set up a custom user agent
            // userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            "executablePath": 'C:/Program Files/Google/Chrome/Application/chrome.exe'
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

