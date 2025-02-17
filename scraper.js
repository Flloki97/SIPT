const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

chromium.use(stealth());

const urlsToScrape = [
    'https://bbvipal.net/', // First source
    'https://bbvipal.net/'  // Replace with second source URL
];

const m3uFilePath = 'docs/bigbrother.m3u'; // Save in docs/ for GitHub Pages

// Function to scrape an .m3u8 link from a given URL
async function getM3U8(url) {
    let browser;
    try {
        browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            ignoreDefaultArgs: ['--enable-automation']
        });

        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
        });

        const page = await context.newPage();
        console.log(`🚀 Scraping: ${url}`);
        await page.goto(url, { waitUntil: 'domcontentloaded' });

        let m3u8Url;

        // Capture network requests for .m3u8 links
        page.on('response', async (response) => {
            const resUrl = response.url();
            if (resUrl.includes('.m3u8')) {
                console.log(`🎯 Found .m3u8: ${resUrl}`);
                m3u8Url = resUrl;
            }
        });

        // Wait to capture requests
        await page.waitForTimeout(5000);
        return m3u8Url;
    } catch (error) {
        console.error(`❌ Error scraping ${url}:`, error);
        return null;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Function to scrape sources and update M3U file
async function updateM3UFile() {
    try {
        console.log("🔄 Updating M3U file...");
        const m3u8Links = await Promise.all(urlsToScrape.map(url => getM3U8(url)));
        const validLinks = m3u8Links.filter(link => link);

        if (validLinks.length === 0) {
            console.log("❌ No valid .m3u8 links found.");
            return;
        }

        // Create M3U content
        const m3uContent = `#EXTM3U\n` + validLinks.map((link, index) => `#EXTINF:-1, Stream ${index + 1}\n${link}`).join("\n");

        // Save to file
        fs.writeFileSync(m3uFilePath, m3uContent);
        console.log(`✅ M3U file updated: ${m3uFilePath}`);
    } catch (error) {
        console.error("❌ Error updating M3U file:", error);
    }
}

// Update M3U file every 3 minutes
setInterval(updateM3UFile, 3 * 60 * 1000); // 3 minutes
updateM3UFile(); // Run immediately on startup