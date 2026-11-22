const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { verifyProfile } = require('../scripts/browser-session.cjs');
const { claimSubmission, zhihuAccount } = require('../scripts/safety.cjs');

function tempDirectory(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'weekly-guard-test-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return fs.realpathSync(directory);
}

test('accepts the intended dedicated Chrome and rejects other launch configurations', async t => {
  const profile = tempDirectory(t);
  const context = {};
  const browser = args => ({
    newBrowserCDPSession: async () => ({
      send: async () => ({ arguments: args }),
      detach: async () => {},
    }),
    contexts: () => [context],
  });
  const profileArg = '--user-data-dir=' + profile;
  assert.equal(await verifyProfile(browser([profileArg, '--enable-automation']), profile), context);
  await assert.rejects(verifyProfile(browser([profileArg, '--no-sandbox']), profile), /--no-sandbox/);
  await assert.rejects(verifyProfile(browser([]), profile), /does not match/);
});

test('an earlier submission blocks another write but leaves draft inspection available', t => {
  const directory = tempDirectory(t);
  const manifest = path.join(directory, 'manifest.json');
  const receipt = path.join(directory, 'zhihu-receipt.json');
  fs.writeFileSync(manifest, JSON.stringify({ source_title: 'Fixture', blocks: [] }));
  claimSubmission(receipt);
  assert.throws(() => claimSubmission(receipt), /Earlier submission exists/);
  const script = path.join(__dirname, '../scripts/zhihu-draft-publish.cjs');
  const run = (...args) => spawnSync(process.execPath, [script, '--manifest', manifest, ...args], {
    env: { ...process.env, ZHIHU_PROFILE: '' },
    encoding: 'utf8',
  });

  const inspection = run();
  assert.equal(inspection.status, 1);
  assert.match(inspection.stderr, /absolute dedicated Chrome profile/);
  const write = run('--publish');
  assert.equal(write.status, 1);
  assert.match(write.stderr, /Earlier submission exists/);
});

test('Zhihu write requires the configured account ID', async t => {
  const before = process.env.ZHIHU_ACCOUNT_ID;
  t.after(() => {
    if (before === undefined) delete process.env.ZHIHU_ACCOUNT_ID;
    else process.env.ZHIHU_ACCOUNT_ID = before;
  });
  const page = id => ({ evaluate: async () => ({ id }) });
  delete process.env.ZHIHU_ACCOUNT_ID;
  await assert.rejects(zhihuAccount(page(42)), /Set ZHIHU_ACCOUNT_ID/);
  process.env.ZHIHU_ACCOUNT_ID = '42';
  await assert.rejects(zhihuAccount(page(12)), /Unexpected Zhihu account/);
  await zhihuAccount(page(42));
});

test('Zhihu validates the optimized image when its original is absent', t => {
  const directory = tempDirectory(t);
  const manifest = path.join(directory, 'manifest.json');
  const optimizedDir = path.join(directory, 'images-opt');
  fs.mkdirSync(optimizedDir);
  fs.writeFileSync(manifest, JSON.stringify({
    source_title: 'Fixture',
    blocks: [{ type: 'image', path: 'images/001.png' }],
  }));
  const image = path.join(optimizedDir, '001.jpg');
  fs.writeFileSync(image, Buffer.from([255, 216, 255]));
  const script = path.join(__dirname, '../scripts/zhihu-compose.cjs');
  const run = () => spawnSync(process.execPath, [script, '--manifest', manifest, '--optimized', optimizedDir], {
    env: { ...process.env, ZHIHU_PROFILE: '' },
    encoding: 'utf8',
  });

  const selected = run();
  assert.equal(selected.status, 1);
  assert.match(selected.stderr, /absolute dedicated Chrome profile/);
  fs.writeFileSync(image, 'invalid image');
  const invalid = run();
  assert.equal(invalid.status, 1);
  assert.match(invalid.stderr, /File is not a supported image/);
});
