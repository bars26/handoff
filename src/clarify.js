// Turns the questions an agent wants answered into a Jira comment.
// Pure functions only, so the limits can be unit tested without Jira.

// Bounds keep one call from posting a wall of text, whatever an LLM sends.
export const MAX_QUESTIONS = 10;
export const MAX_QUESTION_CHARS = 300;

// Agents send the questions as one string, one question per line. Leading
// list markers ("- ", "* ", "1. ", "2) ") are dropped; blank lines and
// duplicates are ignored.
export function parseQuestions(text) {
  const seen = new Set();
  const questions = [];
  for (const line of String(text || '').split(/\r?\n/)) {
    const question = line.replace(/^\s*(?:[-*•]|\d{1,2}[.)])\s+/, '').trim().slice(0, MAX_QUESTION_CHARS);
    if (!question || seen.has(question.toLowerCase())) continue;
    seen.add(question.toLowerCase());
    questions.push(question);
    if (questions.length === MAX_QUESTIONS) break;
  }
  return questions;
}

const text = (value) => ({ type: 'text', text: value });

// Builds the comment body in Atlassian Document Format. `askedBy` is the
// account id of the person whose agent asked; it is shown as a mention when
// the comment has to be posted by the app instead of by that person.
export function buildClarificationComment(questions, askedBy) {
  const intro = [text('Handoff: this issue is not ready to hand to a coding agent yet. ')];
  if (askedBy) {
    intro.push(text('Asked on behalf of '), { type: 'mention', attrs: { id: askedBy } }, text('. '));
  }
  intro.push(text('Please answer in the description:'));

  return {
    type: 'doc',
    version: 1,
    content: [
      { type: 'paragraph', content: intro },
      {
        type: 'bulletList',
        content: questions.map((q) => ({
          type: 'listItem',
          content: [{ type: 'paragraph', content: [text(q)] }],
        })),
      },
    ],
  };
}
