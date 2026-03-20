import puppeteer from 'puppeteer';
const b = await puppeteer.launch({ headless: true });
const p = await b.newPage();
await p.setViewport({ width: 1400, height: 900, deviceScaleFactor: 2 });
await p.goto('http://localhost:5174', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 1000));
await p.screenshot({ path: '/tmp/rk2-lobby.png' });
console.log('lobby done');

// Create room
await p.type('input', 'Nick');
const btns = await p.$$('button');
for (const btn of btns) { if ((await btn.evaluate(e => e.textContent))?.includes('Create')) { await btn.click(); break; } }
await new Promise(r => setTimeout(r, 2500));
await p.screenshot({ path: '/tmp/rk2-waiting.png' });
console.log('waiting done');

// get code
const code = await p.evaluate(() => {
  const spans = document.querySelectorAll('.rounded-xl.text-2xl');
  if (spans.length === 5) return Array.from(spans).map(s => s.textContent).join('');
  return null;
});
console.log('code:', code);

// p2 joins
const p2 = await b.newPage();
await p2.setViewport({ width: 1400, height: 900, deviceScaleFactor: 2 });
await p2.goto('http://localhost:5174', { waitUntil: 'networkidle0' });
await p2.type('input', 'Alex');
let b2 = await p2.$$('button');
for (const btn of b2) { if ((await btn.evaluate(e => e.textContent))?.includes('Join Room')) { await btn.click(); break; } }
await new Promise(r => setTimeout(r, 500));
if (code) {
  const ci = await p2.$('input[maxlength="5"]');
  if (ci) await ci.type(code);
  b2 = await p2.$$('button');
  for (const btn of b2) { if ((await btn.evaluate(e => e.textContent))?.includes('Join Game')) { await btn.click(); break; } }
}
await new Promise(r => setTimeout(r, 1500));
await p.screenshot({ path: '/tmp/rk2-waiting2.png' });
console.log('waiting2 done');

await b.close();
process.exit(0);
