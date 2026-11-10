// Forge function handlers. Each exported function backs one `action` in
// manifest.yml. The rovo:mcp module exposes those actions as MCP tools and the
// rovo:agent module lets the Handoff Coach agent call them inside Rovo.

import api, { route } from '@forge/api';
import { buildBrief, BRIEF_FIELDS as FIELDS } from './brief.js';
import { buildClarificationComment, parseQuestions } from './clarify.js';

// Jira issue keys look like ABC-123. Validating before the request keeps
// whatever an LLM passes in from reaching the URL.
const ISSUE_KEY = /^[A-Za-z][A-Za-z0-9_]{1,19}-[1-9][0-9]{0,8}$/;

const JSON_HEADERS = { Accept: 'application/json', 'Content-Type': 'application/json' };

// Wraps a handler so it logs one line per call (names only, never issue
// content) and never throws to the agent: a thrown error reaches it as an
// opaque failure, a returned one tells it what went wrong.
function tool(name, handler) {
  return async (payload, context) => {
    console.log(`${name} called: key=${payload?.issueKey} hasPrincipal=${Boolean(context?.principal?.accountId)}`);
    try {
      return await handler(payload, context);
    } catch (err) {
      console.error(`${name} failed: ${err?.message}`);
      return { error: `Handoff failed: ${err?.message || 'unknown error'}` };
    }
  };
}

function readIssueKey(payload) {
  const issueKey = String(payload?.issueKey || '').trim().toUpperCase();
  return ISSUE_KEY.test(issueKey) ? issueKey : null;
}

function callerId(payload, context) {
  return context?.principal?.accountId || payload?.context?.accountId || null;
}

// Forge gives a function a user session when it is called from inside an
// Atlassian product (Rovo, the issue panel). External MCP clients (Claude
// Code, Cursor…) arrive without one, and asUser() then throws
// "Authentication Required".
function isNoUserSession(err) {
  return /authentication required/i.test(err?.message || '');
}

// Asks Jira whether `accountId` holds `permission` on this exact issue.
// "Find users with permissions" returns the account only if it does, with
// project permissions and issue security both applied.
async function callerCan(permission, issueKey, accountId) {
  if (!accountId) {
    throw new Error('the caller could not be identified, so access to the issue cannot be verified');
  }
  const check = await api
    .asApp()
    .requestJira(
      route`/rest/api/3/user/permission/search?accountId=${accountId}&permissions=${permission}&issueKey=${issueKey}&maxResults=1`,
      { headers: { Accept: 'application/json' } }
    );
  if (!check.ok) {
    throw new Error(`permission check returned status ${check.status}`);
  }
  const users = await check.json();
  return Array.isArray(users) && users.some((u) => u.accountId === accountId);
}

// Reads the issue as the calling user when there is a user session. Without
// one it is read as the app, but only after Jira confirms that the caller may
// browse that issue, so the tool never shows anyone an issue they could not
// open themselves.
async function fetchIssue(issueKey, accountId) {
  const path = route`/rest/api/3/issue/${issueKey}?fields=${FIELDS}`;
  const options = { headers: { Accept: 'application/json' } };

  try {
    return await api.asUser().requestJira(path, options);
  } catch (err) {
    if (!isNoUserSession(err)) throw err;
  }

  // "Missing" and "not allowed" look the same to the caller, as in Jira.
  if (!(await callerCan('BROWSE', issueKey, accountId))) return { ok: false, status: 404 };
  return api.asApp().requestJira(path, options);
}

export const getWorkBrief = tool('get-work-brief', async (payload, context) => {
  const issueKey = readIssueKey(payload);
  if (!issueKey) {
    return { error: `"${payload?.issueKey}" is not a Jira issue key. Expected something like PROJ-123.` };
  }

  const response = await fetchIssue(issueKey, callerId(payload, context));
  if (response.status === 404) {
    return { error: `Issue ${issueKey} does not exist or you do not have permission to see it.` };
  }
  if (!response.ok) {
    return { error: `Jira returned status ${response.status} for ${issueKey}.` };
  }
  return buildBrief(await response.json());
});

// Posts the questions as one comment on the issue. With a user session the
// comment is written by that user. Without one it is written by the app, only
// if Jira confirms the caller may browse and comment on the issue, and it
// names the caller so it is clear who asked.
export const askForClarification = tool('ask-for-clarification', async (payload, context) => {
  const issueKey = readIssueKey(payload);
  if (!issueKey) {
    return { error: `"${payload?.issueKey}" is not a Jira issue key. Expected something like PROJ-123.` };
  }
  const questions = parseQuestions(payload?.questions);
  if (!questions.length) {
    return { error: 'No questions given. Pass one question per line.' };
  }

  const path = route`/rest/api/3/issue/${issueKey}/comment`;
  const post = (client, askedBy) =>
    client.requestJira(path, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ body: buildClarificationComment(questions, askedBy) }),
    });

  let response;
  try {
    response = await post(api.asUser(), null);
  } catch (err) {
    if (!isNoUserSession(err)) throw err;
    const accountId = callerId(payload, context);
    const allowed =
      (await callerCan('BROWSE', issueKey, accountId)) && (await callerCan('COMMENT_ISSUE', issueKey, accountId));
    response = allowed ? await post(api.asApp(), accountId) : { ok: false, status: 404 };
  }

  if (response.status === 404) {
    return { error: `Issue ${issueKey} does not exist or you do not have permission to comment on it.` };
  }
  if (!response.ok) {
    return { error: `Jira returned status ${response.status} when commenting on ${issueKey}.` };
  }
  return { issue: issueKey, posted: questions.length, questions };
});
