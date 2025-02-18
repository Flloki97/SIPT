const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

chromium.use(stealth());

const urlsToScrape = [
    'https://s1.bigliveal.xyz/p5.html' // First source
    // 'https://bigbrothervipalbania4.website/shiko-big-brother-vip-albania-4-live-kanali-2/'  // Replace with second source URL
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

// Function to read the existing .m3u file
function readExistingM3UFile() {
    if (fs.existsSync(m3uFilePath)) {
        const content = fs.readFileSync(m3uFilePath, 'utf8');
        return content;
    }
    return null;
}

// Function to scrape sources and update M3U file
async function updateM3UFile() {
    let attempts = 0;
    const maxAttempts = 10; // Maximum number of attempts before giving up

    while (attempts < maxAttempts) {
        attempts++;
        console.log(`🔄 Attempt ${attempts} to find .m3u8 links...`);

        try {
            const m3u8Links = await Promise.all(urlsToScrape.map(url => getM3U8(url)));
            const validLinks = m3u8Links.filter(link => link);

            if (validLinks.length === 0) {
                console.log("❌ No valid .m3u8 links found. Retrying...");
                continue; // Retry immediately
            }

            // Create M3U content
            const newM3UContent = `#EXTM3U\n` + validLinks.map((link, index) => `#EXTINF:-1, Stream ${index + 1}\n${link}`).join("\n");

            // Read existing M3U file
            const existingM3UContent = readExistingM3UFile();

            // Compare new content with existing content
            if (newM3UContent === existingM3UContent) {
                console.log("✅ No changes in .m3u8 links. Skipping update.");
                return false; // No changes
            }

            // Save to file
            fs.writeFileSync(m3uFilePath, newM3UContent);
            console.log(`✅ M3U file updated: ${m3uFilePath}`);
            return true; // Changes detected
        } catch (error) {
            console.error("❌ Error updating M3U file:", error);
        }
    }

    console.log(`❌ Failed to find .m3u8 links after ${maxAttempts} attempts.`);
    return false; // No changes after max attempts
}

// Update M3U file every 3 minutes
setInterval(async () => {
    const hasChanges = await updateM3UFile();
    if (hasChanges) {
        console.log("Changes detected. Triggering deployment...");
        // You can trigger a deployment here if needed
    }
}, 10 * 60 * 1000); // 10 minutes

// Run immediately on startup
updateM3UFile();
