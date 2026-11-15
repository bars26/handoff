// Readiness check: is this issue clear enough to hand to a coding agent?
//
// Everything here is deterministic and runs on plain data, so the same issue
// always gets the same verdict and the rules can be unit tested without Jira.
// No LLM is involved: the agent reading the result does the reasoning, this
// module only reports facts it can point to.

const MIN_DESCRIPTION_CHARS = 80;

// "AC:" only counts in capitals, so ordinary words and issue keys do not match.
const ACCEPTANCE = /acceptance criteria|definition of done|\bdone when\b|- \[[ x]\]/i;
const ACCEPTANCE_SHORT = /\bACs?\s*:/;
// Given/When/Then counts when there is a When line and a Then line, as plain
// lines or list items. One sentence that happens to start with "When" does not.
const stepLine = (word) => new RegExp(`^\\s*(?:[-*]\\s+|\\d+\\.\\s+)?${word}\\b`, 'im');
const WHEN_LINE = stepLine('when');
const THEN_LINE = stepLine('then');
const REPRO = /steps to reproduce|repro(duction)? steps|how to reproduce|^\s*1\.\s+\S/im;
const EXPECTED_ACTUAL = /expected[\s\S]{0,400}actual|actual[\s\S]{0,400}expected/i;
// "unclear" only counts where it marks something undecided ("unclear whether…"),
// not where it describes the problem ("the error message is unclear").
const OPEN_QUESTION =
  /\b(?:TBD|TBC|TBA|TODO|to be (?:decided|defined|confirmed|determined|discussed)|not sure|open questions?|not yet clear|(?:still|it is|it's) unclear|unclear (?:whether|if|how|what|who|which|when|where|why))\b|\?{3,}/i;
// Code blocks (rendered as fenced blocks by adf.js) are quoted material: a
// TODO comment inside a snippet is not an open question about the issue.
const CODE_BLOCK = /```[\s\S]*?```/g;

function hasAcceptance(text) {
  return ACCEPTANCE.test(text) || ACCEPTANCE_SHORT.test(text) || (WHEN_LINE.test(text) && THEN_LINE.test(text));
}

// Issue types that describe a container of work rather than one piece of it.
const CONTAINER_TYPES = new Set(['epic', 'initiative', 'theme']);

function check(id, label, ok, detail) {
  return { id, label, ok, detail };
}

// `issue` is the normalised shape built in brief.js, not the raw REST payload.
export function assessReadiness(issue) {
  const text = issue.description || '';
  const type = (issue.type || '').toLowerCase();
  const isBug = type === 'bug';
  const checks = [];

  checks.push(
    check(
      'description',
      'Has a description',
      text.length >= MIN_DESCRIPTION_CHARS,
      text.length === 0
        ? 'The description is empty.'
        : text.length < MIN_DESCRIPTION_CHARS
          ? `The description is only ${text.length} characters.`
          : null
    )
  );

  checks.push(
    check(
      'acceptance',
      'States acceptance criteria',
      hasAcceptance(text),
      hasAcceptance(text)
        ? null
        : 'No acceptance criteria, definition of done, checklist or Given/When/Then found in the description.'
    )
  );

  if (isBug) {
    checks.push(
      check(
        'repro',
        'Has steps to reproduce',
        REPRO.test(text),
        REPRO.test(text) ? null : 'A bug needs steps to reproduce; none found.'
      )
    );
    checks.push(
      check(
        'expected-actual',
        'States expected and actual behaviour',
        EXPECTED_ACTUAL.test(text),
        EXPECTED_ACTUAL.test(text) ? null : 'Expected vs actual behaviour is not stated.'
      )
    );
  }

  const open = text.replace(CODE_BLOCK, '').match(OPEN_QUESTION);
  checks.push(
    check(
      'open-questions',
      'No open questions in the description',
      !open,
      open ? `The description still contains "${open[0]}".` : null
    )
  );

  checks.push(
    check(
      'scope',
      'Is a single piece of work',
      !CONTAINER_TYPES.has(type),
      CONTAINER_TYPES.has(type)
        ? `This is a ${issue.type}; hand over one of its child issues instead.`
        : null
    )
  );

  const blockers = (issue.links || []).filter((l) => l.blocking && !l.done);
  checks.push(
    check(
      'unblocked',
      'Not blocked by unfinished work',
      blockers.length === 0,
      blockers.length ? `Blocked by ${blockers.map((b) => `${b.key} (${b.status})`).join(', ')}.` : null
    )
  );

  checks.push(
    check(
      'not-done',
      'Still open',
      !issue.done,
      issue.done ? `The issue is already ${issue.status}.` : null
    )
  );

  const passed = checks.filter((c) => c.ok).length;
  const failed = checks.filter((c) => !c.ok);
  const hardStop = failed.some((c) => ['scope', 'unblocked', 'not-done'].includes(c.id));

  let verdict = 'ready';
  if (hardStop) verdict = 'blocked';
  else if (failed.length) verdict = 'needs-clarification';

  return {
    verdict,
    score: `${passed}/${checks.length}`,
    missing: failed.map((c) => c.detail),
    checks,
  };
}
