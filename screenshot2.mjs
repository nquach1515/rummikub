import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({ headless: true });

// Player 1 creates room
const page1 = await browser.newPage();
await page1.setViewport({ width: 1280, height: 800 });
await page1.goto('http://localhost:5174', { waitUntil: 'networkidle0' });

await page1.type('input[placeholder="Your name"]', 'Nick');

// Click Create Room
let buttons = await page1.$$('button');
for (const btn of buttons) {
  const text = await btn.evaluate(el => el.textContent);
  if (text?.includes('Create Room')) { await btn.click(); break; }
}
await new Promise(r => setTimeout(r, 2000));
await page1.screenshot({ path: '/tmp/rummikub-waiting.png' });
console.log('Waiting room screenshot saved');

// Get room code
const roomCode = await page1.evaluate(() => {
  const els = document.querySelectorAll('p');
  for (const el of els) {
    if (el.textContent && el.textContent.length === 5 && /^[A-Z0-9]+$/.test(el.textContent.trim())) {
      return el.textContent.trim();
    }
  }
  return null;
});
console.log('Room code:', roomCode);

if (!roomCode) {
  console.log('Could not find room code, taking debug screenshot');
  await page1.screenshot({ path: '/tmp/rummikub-debug.png' });
  await browser.close();
  process.exit(1);
}

// Player 2 joins
const page2 = await browser.newPage();
await page2.setViewport({ width: 1280, height: 800 });
await page2.goto('http://localhost:5174', { waitUntil: 'networkidle0' });
await page2.type('input[placeholder="Your name"]', 'Alex');

buttons = await page2.$$('button');
for (const btn of buttons) {
  const text = await btn.evaluate(el => el.textContent);
  if (text?.includes('Join Room')) { await btn.click(); break; }
}
await new Promise(r => setTimeout(r, 500));

const codeInput = await page2.$('input[maxlength="5"]');
if (codeInput) {
  await codeInput.type(roomCode);
  buttons = await page2.$$('button');
  for (const btn of buttons) {
    const text = await btn.evaluate(el => el.textContent);
    if (text?.includes('Join Game')) { await btn.click(); break; }
  }
  await new Promise(r => setTimeout(r, 1000));
}

await page1.screenshot({ path: '/tmp/rummikub-waiting2.png' });
console.log('Waiting room with 2 players saved');

// Start game
buttons = await page1.$$('button');
for (const btn of buttons) {
  const text = await btn.evaluate(el => el.textContent);
  if (text?.includes('Start Game')) { await btn.click(); break; }
}
await new Promise(r => setTimeout(r, 1500));

await page1.screenshot({ path: '/tmp/rummikub-game.png' });
console.log('Game board screenshot saved');

await browser.close();
