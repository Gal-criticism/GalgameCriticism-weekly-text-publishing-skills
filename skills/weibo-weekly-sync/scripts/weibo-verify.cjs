const { attach, sleep } = require('./browser-session.cjs');

const urlIndex = process.argv.indexOf('--url', 2);
const url = urlIndex === -1 ? process.env.URL : process.argv[urlIndex + 1];
if (!url) throw new Error('--url <public Weibo article URL> is required');

(async () => {
  const { browser, ctx } = await attach(process.env.WEIBO_PROFILE, process.env.CHROME_DEBUG_PORT || 9333);
  try {
    const page = await ctx.newPage();
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await sleep(6000);
      const state = await page.evaluate(() => ({
        url: location.href,
        title: document.title,
        h1: (document.querySelector('h1') || {}).innerText || null,
        author: (document.querySelector('.W_autocut, .art_author, [class*="author"]') || {}).innerText || null,
        imgs: document.querySelectorAll('.WB_editor_iframe_new img, .art_content img, article img').length,
        textLen: ((document.querySelector('.art_content, article, .WB_editor_iframe_new') || {}).innerText || '').length,
      }));
      console.log(JSON.stringify(state));
      if (process.env.WEIBO_VERIFY_SCREENSHOT) {
        await page.screenshot({ path: process.env.WEIBO_VERIFY_SCREENSHOT, fullPage: false });
      }
    } finally {
      await page.close();
    }
  } finally {
    // A connected Playwright client disconnects without stopping the Chrome process.
    await browser.close();
  }
})().catch(e => { console.error('ERR', e && e.message); process.exit(1); });
