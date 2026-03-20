import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({ headless: true });

// Screenshot 1: Lobby
const p1 = await browser.newPage();
await p1.setViewport({ width: 1280, height: 800 });
await p1.goto('http://localhost:5174', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 500));
await p1.screenshot({ path: '/tmp/rk-lobby.png' });
console.log('1/4 lobby');

// Create room
await p1.type('input', 'Nick');
let btns = await p1.$$('button');
for (const b of btns) { if ((await b.evaluate(e => e.textContent))?.includes('Create')) { await b.click(); break; } }
await new Promise(r => setTimeout(r, 2000));

// Screenshot 2: Waiting room
await p1.screenshot({ path: '/tmp/rk-waiting.png' });
console.log('2/4 waiting');

// Get code
const code = await p1.evaluate(() => {
  for (const el of document.querySelectorAll('span')) {
    const t = el.textContent?.trim();
    if (t && t.length === 1 && /^[A-Z0-9]$/.test(t)) {
      // Find the parent that has all the code chars
      const parent = el.parentElement;
      if (parent) {
        const chars = parent.querySelectorAll('span');
        if (chars.length === 5) {
          return Array.from(chars).map(c => c.textContent).join('');
        }
      }
    }
  }
  return null;
});
console.log('Code:', code);

if (!code) {
  await p1.screenshot({ path: '/tmp/rk-debug.png' });
  console.log('No code found');
  await browser.close();
  process.exit(0);
}

// Player 2 joins
const p2 = await browser.newPage();
await p2.setViewport({ width: 1280, height: 800 });
await p2.goto('http://localhost:5174', { waitUntil: 'networkidle0' });
await p2.type('input', 'Alex');
btns = await p2.$$('button');
for (const b of btns) { if ((await b.evaluate(e => e.textContent))?.includes('Join Room')) { await b.click(); break; } }
await new Promise(r => setTimeout(r, 500));
const ci = await p2.$('input[maxlength="5"]');
if (ci) await ci.type(code);
btns = await p2.$$('button');
for (const b of btns) { if ((await b.evaluate(e => e.textContent))?.includes('Join Game')) { await b.click(); break; } }
await new Promise(r => setTimeout(r, 1500));

// Screenshot 3: Waiting with 2
await p1.screenshot({ path: '/tmp/rk-waiting2.png' });
console.log('3/4 waiting2');

// Start game
btns = await p1.$$('button');
for (const b of btns) { if ((await b.evaluate(e => e.textContent))?.includes('Start Game')) { await b.click(); break; } }
await new Promise(r => setTimeout(r, 2000));

// Screenshot 4: Game board
await p1.screenshot({ path: '/tmp/rk-game.png' });
console.log('4/4 game');

await browser.close();
process.exit(0);
