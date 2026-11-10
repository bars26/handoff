import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adfToText } from '../src/adf.js';
import { buildBrief } from '../src/brief.js';

const p = (text) => ({ type: 'paragraph', content: [{ type: 'text', text }] });
const doc = (...content) => ({ type: 'doc', version: 1, content });
const status = (name, key) => ({ name, statusCategory: { key } });

function issue(fields) {
  return {
    key: 'CORE-7',
    fields: { summary: 'Thing', issuetype: { name: 'Story' }, status: status('To Do', 'new'), ...fields },
  };
}

const GOOD = doc(
  p('As a user I want to export my invoices as CSV so that I can load them into my accounting tool.'),
  { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Acceptance criteria' }] },
  {
    type: 'bulletList',
    content: [
      { type: 'listItem', content: [p('Export button on the invoices page')] },
      { type: 'listItem', content: [p('CSV has one row per invoice')] },
    ],
  }
);

test('adfToText flattens headings, lists and task lists', () => {
  const text = adfToText(
    doc(GOOD.content[1], GOOD.content[2], {
      type: 'taskList',
      content: [{ type: 'taskItem', attrs: { state: 'DONE' }, content: [{ type: 'text', text: 'done one' }] }],
    })
  );
  assert.equal(text, '## Acceptance criteria\n- Export button on the invoices page\n- CSV has one row per invoice\n- [x] done one');
});

test('adfToText accepts null and plain strings', () => {
  assert.equal(adfToText(null), '');
  assert.equal(adfToText('  hi '), 'hi');
});

test('a clear story is ready', () => {
  const brief = buildBrief(issue({ description: GOOD }));
  assert.equal(brief.readiness.verdict, 'ready');
  assert.deepEqual(brief.readiness.missing, []);
});

test('an empty issue needs clarification and says why', () => {
  const brief = buildBrief(issue({ description: null }));
  assert.equal(brief.readiness.verdict, 'needs-clarification');
  assert.ok(brief.readiness.missing.includes('The description is empty.'));
  assert.match(brief.guidance, /Do not start/);
});

test('a bug needs repro steps and expected/actual', () => {
  const brief = buildBrief(issue({ issuetype: { name: 'Bug' }, description: GOOD }));
  const failed = brief.readiness.checks.filter((c) => !c.ok).map((c) => c.id);
  assert.deepEqual(failed, ['repro', 'expected-actual']);
});

test('TBD in the description is flagged', () => {
  const brief = buildBrief(issue({ description: doc(...GOOD.content, p('Column order: TBD')) }));
  assert.equal(brief.readiness.verdict, 'needs-clarification');
  assert.match(brief.readiness.missing[0], /TBD/);
});

test('an unfinished blocker blocks, a finished one does not', () => {
  const link = (cat) => ({
    type: { name: 'Blocks', inward: 'is blocked by', outward: 'blocks' },
    inwardIssue: { key: 'CORE-1', fields: { summary: 'API', status: status('In Progress', cat) } },
  });
  assert.equal(buildBrief(issue({ description: GOOD, issuelinks: [link('indeterminate')] })).readiness.verdict, 'blocked');
  assert.equal(buildBrief(issue({ description: GOOD, issuelinks: [link('done')] })).readiness.verdict, 'ready');
});

test('blocking something else does not block this issue', () => {
  const link = {
    type: { name: 'Blocks', inward: 'is blocked by', outward: 'blocks' },
    outwardIssue: { key: 'CORE-9', fields: { summary: 'UI', status: status('To Do', 'new') } },
  };
  const brief = buildBrief(issue({ description: GOOD, issuelinks: [link] }));
  assert.equal(brief.readiness.verdict, 'ready');
  assert.equal(brief.links[0].relation, 'blocks');
});

test('epics and finished issues are not handed over', () => {
  assert.equal(buildBrief(issue({ description: GOOD, issuetype: { name: 'Epic' } })).readiness.verdict, 'blocked');
  assert.equal(buildBrief(issue({ description: GOOD, status: status('Done', 'done') })).readiness.verdict, 'blocked');
});

test('long descriptions and comment lists are capped', () => {
  const comments = Array.from({ length: 9 }, (_, i) => ({ author: { displayName: 'A' }, created: '2026-11-10T10:00:00.000+0000', body: doc(p(`c${i}`)) }));
  const brief = buildBrief(issue({ description: doc(p('x'.repeat(9000))), comment: { total: 9, comments } }));
  assert.match(brief.description, /\[truncated, 3000 more characters\]$/);
  assert.equal(brief.recentComments.length, 5);
  assert.equal(brief.recentComments[4].body, 'c8');
  assert.equal(brief.commentCount, 9);
});

import { buildClarificationComment, parseQuestions, MAX_QUESTIONS, MAX_QUESTION_CHARS } from '../src/clarify.js';

test('parseQuestions strips list markers, blanks and duplicates', () => {
  assert.deepEqual(parseQuestions('- Which roles?\n\n2) Which roles?\n* CSV or XLSX?\n3. Deadline?'), [
    'Which roles?',
    'CSV or XLSX?',
    'Deadline?',
  ]);
  assert.deepEqual(parseQuestions(null), []);
});

test('parseQuestions caps count and length', () => {
  const many = Array.from({ length: 30 }, (_, i) => `q${i} ${'x'.repeat(500)}`).join('\n');
  const parsed = parseQuestions(many);
  assert.equal(parsed.length, MAX_QUESTIONS);
  assert.ok(parsed.every((q) => q.length === MAX_QUESTION_CHARS));
});

test('clarification comment lists the questions and names the asker only when given', () => {
  const byUser = buildClarificationComment(['A?', 'B?'], null);
  assert.equal(byUser.content[1].content.length, 2);
  assert.ok(!JSON.stringify(byUser).includes('mention'));
  const byApp = buildClarificationComment(['A?'], 'acc-1');
  assert.deepEqual(byApp.content[0].content[2], { type: 'mention', attrs: { id: 'acc-1' } });
  assert.equal(adfToText(byApp).split('\n')[1], '- A?');
});
