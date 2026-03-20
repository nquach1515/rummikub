import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({ headless: true });
const page1 = await browser.newPage();
const page2 = await browser.newPage();
await page1.setViewport({ width: 1280, height: 800 });
await page2.setViewport({ width: 1280, height: 800 });

// P1 creates room
await page1.goto('http://localhost:5174', { waitUntil: 'networkidle0' });
await page1.type('input', 'Nick');
const btns1 = await page1.$$('button');
for (const b of btns1) { if ((await b.evaluate(e => e.textContent)).includes('Create')) { await b.click(); break; } }
await new Promise(r => setTimeout(r, 2000));

// Get room code
const code = await page1.evaluate(() => {
  for (const el of document.querySelectorAll('p')) {
    const t = el.textContent?.trim();
    if (t && t.length === 5 && /^[A-Z0-9]+$/.test(t)) return t;
  }
  return null;
});
console.log('Code:', code);

// P2 joins
await page2.goto('http://localhost:5174', { waitUntil: 'networkidle0' });
await page2.type('input', 'Alex');
const btns2 = await page2.$$('button');
for (const b of btns2) { if ((await b.evaluate(e => e.textContent)).includes('Join Room')) { await b.click(); break; } }
await new Promise(r => setTimeout(r, 500));
const ci = await page2.$('input[maxlength="5"]');
if (ci) await ci.type(code);
const btns3 = await page2.$$('button');
for (const b of btns3) { if ((await b.evaluate(e => e.textContent)).includes('Join Game')) { await b.click(); break; } }
await new Promise(r => setTimeout(r, 1500));

// P1 starts game
const btns4 = await page1.$$('button');
for (const b of btns4) { if ((await b.evaluate(e => e.textContent)).includes('Start Game')) { await b.click(); break; } }
await new Promise(r => setTimeout(r, 2000));

await page1.screenshot({ path: '/tmp/rummikub-game.png' });
console.log('Game board saved');

await browser.close();
process.exit(0);
