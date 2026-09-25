// Renders the 10 hook carousels: 1080x1350 (Instagram) and 1080x1920 (TikTok).
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const rows = JSON.parse(fs.readFileSync(path.join(__dirname, 'rows.json'), 'utf8'));
const OUT = process.argv[2];
const F = (n) => 'file://' + path.join(__dirname, 'fonts', n);

// One field colour per slide, cycling; CTA is always ink.
const FIELDS = [
  { bg: '#E8664A', fg: '#1F1B16', accent: '#F6EFE3' }, // coral
  { bg: '#F6EFE3', fg: '#1F1B16', accent: '#E8664A' }, // cream
  { bg: '#F2C94C', fg: '#1F1B16', accent: '#F6EFE3' }, // yellow
  { bg: '#A9CFE8', fg: '#1F1B16', accent: '#F6EFE3' }, // sky
  { bg: '#8DB872', fg: '#1F1B16', accent: '#F6EFE3' }, // green
];
const INK = { bg: '#1F1B16', fg: '#F6EFE3', accent: '#F2C94C' };

const STICKERS = {
  'recD5rWbCEXlbkjQj': 'swipe. then argue.',
  'recAwSBBSV6trNP8d': 'save for the weekend',
  'recFD14c7a3pXVGo8': 'save this one',
  'recRG74CMwjrd8Z4p': 'save before you bake',
  'recdPDhajx84NozzU': 'flip the loaf over',
  'recgL3D89dMh518Uc': 'the fridge is not your friend',
  'rec5WV7wMMJ2CYQtC': 'breakfast, sorted',
  'recvA3LadkxHNKSOg': 'nothing wasted',
  'recZvxvge1JgraySV': 'soft for days',
  'recK0aEhHWT6k0PAp': 'for café owners',
};

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Split a slide line into {kind, num, head, body}.
function parse(text, i, n) {
  let kind = i === 0 ? 'hook' : i === n - 1 ? 'cta' : 'mid';
  let t = text.replace(/^HOOK:\s*/, '').replace(/^CTA:\s*/, '');
  let num = '';
  const m = t.match(/^(#?\d+(?:\s*\+\s*\d+)?\.?)\s+(.*)$/s);
  if (m && kind !== 'hook') { num = m[1].replace(/\.$/, ''); t = m[2]; }
  let head = t, body = '';
  if (kind === 'hook') {
    const p = t.match(/^(.*?)\s*(\(.*\))$/);
    if (p) { head = p[1]; body = p[2]; }
  } else {
    const dash = t.indexOf(' — ');
    const colon = t.indexOf(': ');
    const dot = t.search(/\.\s/);
    const c = [];
    if (dash > 0 && dash < 70) c.push([dash, t.slice(0, dash), t.slice(dash + 3)]);
    if (colon > 0 && colon < 60) c.push([colon, t.slice(0, colon + 1), t.slice(colon + 2)]);
    if (dot > 0 && dot < 90) c.push([dot, t.slice(0, dot + 1), t.slice(dot + 2)]);
    if (c.length) { c.sort((a, b) => a[0] - b[0]); head = c[0][1]; body = c[0][2]; }
    body = body.charAt(0).toUpperCase() + body.slice(1);
  }
  return { kind, num, head, body };
}

function html(slide, i, n, rec, H) {
  const tall = H > 1500;
  const c = slide.kind === 'cta' ? INK : FIELDS[i % FIELDS.length];
  const headSize = slide.kind === 'hook' ? (slide.head.length > 60 ? 104 : 124) : slide.head.length > 70 ? 76 : 88;
  const bodySize = slide.body.length > 170 ? 52 : 58;
  const sticker = slide.kind === 'hook' ? `<div class="sticker">${esc(STICKERS[rec] || 'swipe →')} →</div>` : '';
  const num = slide.num ? `<div class="num">${esc(slide.num)}</div>` : '';
  const url = slide.kind === 'cta' ? '<div class="pill">lagomberry.store</div>' : '';
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:AB;src:url(${F('archivo-black.woff2')})}
@font-face{font-family:IN;font-weight:500;src:url(${F('inter-500.woff2')})}
@font-face{font-family:IN;font-weight:700;src:url(${F('inter-700.woff2')})}
@font-face{font-family:CV;src:url(${F('caveat-700.woff2')})}
@font-face{font-family:PM;src:url(${F('plexmono-500.woff2')})}
@font-face{font-family:FR;src:url(${F('fraunces-600.woff2')})}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1080px;height:${H}px;overflow:hidden}
body{background:${c.bg};color:${c.fg};font-family:IN,'Noto Color Emoji',sans-serif;position:relative}
.wrap{position:absolute;inset:${tall ? '220px 96px 260px' : '110px 96px 170px'};display:flex;flex-direction:column;justify-content:center;gap:40px}
.eyebrow{font-family:PM;font-size:30px;letter-spacing:.14em;text-transform:uppercase;opacity:.75}
.num{font-family:AB;font-size:${tall ? 260 : 210}px;line-height:.85;color:transparent;-webkit-text-stroke:5px ${c.fg};margin-bottom:-6px}
.head{font-family:AB;font-size:${headSize}px;line-height:1.02;letter-spacing:-.01em}
.body{font-weight:500;font-size:${bodySize}px;line-height:1.22}
.hook .body{font-family:CV;font-size:72px;line-height:1.05}
.sticker{align-self:flex-end;margin-top:${tall ? 60 : 10}px;transform:rotate(-5deg);background:${c.accent};color:${c.fg === '#F6EFE3' ? '#1F1B16' : c.fg};font-family:CV;font-size:60px;padding:14px 34px;box-shadow:10px 10px 0 ${c.fg}}
.pill{align-self:flex-start;font-family:AB;font-size:52px;background:${c.accent};color:#1F1B16;padding:16px 36px;border-radius:999px}
.foot{position:absolute;left:96px;bottom:${tall ? 120 : 70}px;font-family:PM;font-size:28px;letter-spacing:.12em;opacity:.8}
.logo{position:absolute;right:88px;bottom:${tall ? 104 : 54}px;text-align:right;color:#B8956A;line-height:1;
  ${c.bg === '#1F1B16' ? 'text-shadow:0 0 18px rgba(184,149,106,.35)' : 'text-shadow:0 1px 1px rgba(0,0,0,.45),0 0 14px rgba(31,27,22,.45)'}}
.logo b{display:block;font-family:FR;font-size:52px;letter-spacing:.06em}
.logo i{display:block;font-style:normal;font-family:PM;font-size:18px;letter-spacing:.5em;margin-top:6px;margin-right:-.5em}
</style></head><body class="${slide.kind}">
<div class="wrap">
${slide.kind === 'hook' ? '<div class="eyebrow">Lagomberry · New Windsor, NY</div>' : ''}
${num}
<div class="head">${esc(slide.head)}</div>
${slide.body ? `<div class="body">${esc(slide.body).replace(/(\d{3}-\d{3}-\d{4})/g, '<span style="white-space:nowrap">$1</span>')}</div>` : ''}
${url}
${sticker}
</div>
<div class="foot">${i + 1} of ${n} · LAGOMBERRY</div>
<div class="logo"><b>LAGOMBERRY</b><i>BAKERY</i></div>
</body></html>`;
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const manifest = {};
  for (const r of rows) {
    const rec = r[0];
    const slides = r[13].split('\n').filter((l) => /^Slide \d+: /.test(l)).map((l) => l.replace(/^Slide \d+: /, ''));
    const n = slides.length;
    fs.mkdirSync(path.join(OUT, rec), { recursive: true });
    manifest[rec] = { ig: [], tt: [] };
    for (const [fmt, H] of [['ig', 1350], ['tt', 1920]]) {
      const page = await browser.newPage({ viewport: { width: 1080, height: H } });
      for (let i = 0; i < n; i++) {
        const tmp = path.join(__dirname, 'tmp.html');
        fs.writeFileSync(tmp, html(parse(slides[i], i, n), i, n, rec, H));
        await page.goto('file://' + tmp, { waitUntil: 'load' });
        await page.evaluate(() => document.fonts.ready);
        const file = `${fmt}-${i + 1}.jpg`;
        await page.screenshot({ path: path.join(OUT, rec, file), type: 'jpeg', quality: 90 });
        manifest[rec][fmt].push(file);
      }
      await page.close();
    }
  }
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1));
  await browser.close();
})();
