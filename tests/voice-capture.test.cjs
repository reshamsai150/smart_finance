const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const sourceHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', 'dist', 'index.html'), 'utf8');
test('deployed static page matches the maintained application source', () => {
  assert.equal(html, sourceHtml);
});
const captureSource = html.slice(html.indexOf('function bindQuickCapture'), html.indexOf('function renderAssistant'));
const actionGate = captureSource.match(/if\(parsed\.error\|\|!\/([^/]+)\/i\.test\(sentence\)\)/);
assert.ok(actionGate, 'voice submit must use a recognizable explicit-action check');
const actionPattern = new RegExp(actionGate[1], 'i');

const parserStart = html.indexOf('function quickCategory(');
const parserEnd = html.indexOf('function speechErrorMessage(', parserStart);
assert.ok(parserStart >= 0 && parserEnd > parserStart, 'production expense parser must exist');
const parserCode = html.slice(parserStart, parserEnd);
const errorStart = parserEnd;
const errorEnd = html.indexOf('function bindQuickCapture(', errorStart);
assert.ok(errorEnd > errorStart, 'production voice error classifier must exist');
const speechErrorCode = html.slice(errorStart, errorEnd);
const clock = new Date('2026-10-24T12:00:00Z');
const helpers = {
  today: clock,
  iso: date => date.toISOString().slice(0, 10),
  addDays: (date, amount) => {
    const result = new Date(`${date}T00:00:00Z`);
    result.setUTCDate(result.getUTCDate() + amount);
    return result.toISOString().slice(0, 10);
  },
};
const { parseQuickExpense } = vm.runInNewContext(`${parserCode};({ parseQuickExpense })`, helpers);
const { speechErrorMessage } = vm.runInNewContext(`${speechErrorCode};({ speechErrorMessage })`);

test('voice action gate contains no corrupted control characters', () => {
  assert.doesNotMatch(html, /[\x00-\x08\x0B\x0C\x0E-\x1F]/);
});

test('recognized expense examples pass the real voice gate and parser', () => {
  const cases = [
    ['I spent ₹30 on cutlet.', 30, 'cutlet', 'Food & Dining', 'expense'],
    ['I paid 1,250 rupees for electricity using UPI.', 1250, 'electricity', 'Utilities', 'expense'],
    ['I bought ₹499 shoes using card.', 499, 'shoes', 'Shopping', 'expense'],
    ['I received ₹5,000 salary.', 5000, 'salary', 'Salary', 'income'],
  ];
  for (const [sentence, amount, merchant, category, type] of cases) {
    assert.equal(actionPattern.test(sentence), true, `action phrase should pass: ${sentence}`);
    const parsed = parseQuickExpense(sentence);
    assert.equal(parsed.amount, amount, sentence);
    assert.equal(parsed.merchant.toLowerCase(), merchant, sentence);
    assert.equal(parsed.category, category, sentence);
    assert.equal(parsed.type, type, sentence);
  }
});

test('voice without a transaction verb is not auto-saved', () => {
  const sentence = '₹30 on cutlet';
  assert.equal(actionPattern.test(sentence), false);
});

test('speech-service denial after microphone access does not ask the user to regrant microphone permission', () => {
  const message = speechErrorMessage('not-allowed', true);
  assert.match(message, /Microphone access was granted/i);
  assert.match(message, /separate from site microphone permission/i);
  assert.doesNotMatch(message, /allow Microphone for this site/i);
});

test('actual microphone permission denial gives site and device recovery steps', () => {
  const message = speechErrorMessage('not-allowed', false);
  assert.match(message, /site microphone setting/i);
  assert.match(message, /device privacy setting/i);
});

test('missing microphone hardware is not mislabeled as permission denial', () => {
  const message = speechErrorMessage('NotFoundError');
  assert.match(message, /No microphone is available/i);
  assert.doesNotMatch(message, /permission/i);
});

test('voice onend still submits a valid final transcript through the quick-save form', () => {
  assert.match(captureSource, /form\.requestSubmit\(\)/);
  assert.match(captureSource, /if\(!finalTranscript\)[\s\S]*?Review the text and press Enter to save/);
});

test('incomplete speech is rejected without saving a guessed amount', () => {
  assert.match(parseQuickExpense('I spent money on lunch').error, /couldn’t find the amount/i);
  const phrase = 'lunch';
  assert.equal(actionPattern.test(phrase), false);
});

test('all supported voice action words route to the income or expense parser', () => {
  const cases = [
    ['I spent ₹30 on snacks', 'expense'],
    ['I paid ₹1,000 for water', 'expense'],
    ['I bought ₹500 shoes', 'expense'],
    ['I received ₹5,000 salary', 'income'],
    ['I earned ₹2,500 from freelance work', 'income'],
    ['income ₹5,000', 'income'],
    ['refund ₹499', 'income'],
  ];
  for (const [sentence, type] of cases) {
    assert.equal(actionPattern.test(sentence), true, sentence);
    const parsed = parseQuickExpense(sentence);
    assert.ok(parsed.amount > 0, sentence);
    assert.equal(parsed.type, type, sentence);
  }
});
