const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { verifyProfile } = require('../scripts/browser-session.cjs');
const { claimSubmission, weiboAccount } = require('../scripts/safety.cjs');

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
  const receipt = path.join(directory, 'weibo-receipt.json');
  fs.writeFileSync(manifest, JSON.stringify({ source_title: 'Fixture', blocks: [] }));
  claimSubmission(receipt);
  assert.throws(() => claimSubmission(receipt), /Earlier submission exists/);
  const script = path.join(__dirname, '../scripts/weibo-finalize.cjs');
  const run = (...args) => spawnSync(process.execPath, [script, '--manifest', manifest, '--draft', '123', ...args], {
    env: { ...process.env, WEIBO_PROFILE: '' },
    encoding: 'utf8',
  });

  const inspection = run();
  assert.equal(inspection.status, 1);
  assert.match(inspection.stderr, /absolute dedicated Chrome profile/);
  const write = run('--publish');
  assert.equal(write.status, 1);
  assert.match(write.stderr, /Earlier submission exists/);
});

test('Weibo write requires the configured nickname in an account control', async t => {
  const before = process.env.WEIBO_ACCOUNT;
  t.after(() => {
    if (before === undefined) delete process.env.WEIBO_ACCOUNT;
    else process.env.WEIBO_ACCOUNT = before;
  });
  const page = name => ({ locator: () => ({ allTextContents: async () => [name] }) });
  delete process.env.WEIBO_ACCOUNT;
  await assert.rejects(weiboAccount(page('Expected')), /Set WEIBO_ACCOUNT/);
  process.env.WEIBO_ACCOUNT = 'Expected';
  await assert.rejects(weiboAccount(page('Different')), /Cannot establish/);
  await weiboAccount(page('Expected'));
});
