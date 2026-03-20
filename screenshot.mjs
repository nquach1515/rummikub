import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });

// Screenshot lobby
await page.goto('http://localhost:5174', { waitUntil: 'networkidle0' });
await page.screenshot({ path: '/tmp/rummikub-lobby.png', fullPage: false });
console.log('Lobby screenshot saved');

await browser.close();
