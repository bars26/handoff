// Turns a raw Jira issue (REST API v3) into the compact brief an agent reads.
// Pure functions only: no network calls here, so this can be unit tested.

import { adfToText } from './adf.js';
import { assessReadiness } from './readiness.js';

// The Jira fields a brief needs. Shared by the MCP tool and the issue panel so
// both always look at the same data.
export const BRIEF_FIELDS = [
  'summary',
  'description',
  'issuetype',
  'status',
  'priority',
  'assignee',
  'labels',
  'components',
  'parent',
  'issuelinks',
  'subtasks',
  'comment',
].join(',');

// Hard caps keep a brief small enough for an agent's context window, however
// large the issue is.
const MAX_DESCRIPTION_CHARS = 6000;
const MAX_COMMENT_CHARS = 800;
const MAX_COMMENTS = 5;
const MAX_LINKS = 20;
const MAX_SUBTASKS = 20;

function clip(text, max) {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n[truncated, ${text.length - max} more characters]`;
}

function isDone(status) {
  return status?.statusCategory?.key === 'done';
}

// Jira describes a link from both ends ("blocks" / "is blocked by"). Only the
// inward side of a Blocks link means *this* issue is waiting on the other one.
function normaliseLink(link) {
  const other = link.inwardIssue || link.outwardIssue;
  if (!other) return null;
  const relation = link.inwardIssue ? link.type?.inward : link.type?.outward;
  return {
    key: other.key,
    relation: relation || link.type?.name || 'relates to',
    summary: other.fields?.summary || '',
    status: other.fields?.status?.name || 'Unknown',
    done: isDone(other.fields?.status),
    blocking: Boolean(link.inwardIssue) && /blocked by/i.test(link.type?.inward || ''),
  };
}

export function normaliseIssue(raw) {
  const f = raw.fields || {};
  const comments = (f.comment?.comments || []).slice(-MAX_COMMENTS).map((c) => ({
    author: c.author?.displayName || 'Unknown',
    created: (c.created || '').slice(0, 10),
    body: clip(adfToText(c.body), MAX_COMMENT_CHARS),
  }));

  return {
    key: raw.key,
    summary: f.summary || '',
    type: f.issuetype?.name || '',
    status: f.status?.name || '',
    done: isDone(f.status),
    priority: f.priority?.name || null,
    assignee: f.assignee?.displayName || null,
    labels: f.labels || [],
    components: (f.components || []).map((c) => c.name),
    parent: f.parent ? { key: f.parent.key, summary: f.parent.fields?.summary || '' } : null,
    description: adfToText(f.description),
    links: (f.issuelinks || []).slice(0, MAX_LINKS).map(normaliseLink).filter(Boolean),
    subtasks: (f.subtasks || []).slice(0, MAX_SUBTASKS).map((s) => ({
      key: s.key,
      summary: s.fields?.summary || '',
      status: s.fields?.status?.name || 'Unknown',
    })),
    commentCount: f.comment?.total ?? comments.length,
    recentComments: comments,
  };
}

export function buildBrief(raw) {
  const issue = normaliseIssue(raw);
  const assessed = assessReadiness(issue);
  // `missing` already carries the details, so the per-check list stays short.
  const readiness = { ...assessed, checks: assessed.checks.map(({ id, label, ok }) => ({ id, label, ok })) };

  return {
    issue: issue.key,
    summary: issue.summary,
    type: issue.type,
    status: issue.status,
    priority: issue.priority,
    assignee: issue.assignee,
    labels: issue.labels,
    components: issue.components,
    parent: issue.parent,
    readiness,
    description: clip(issue.description, MAX_DESCRIPTION_CHARS),
    links: issue.links.map(({ key, relation, summary, status }) => ({ key, relation, summary, status })),
    subtasks: issue.subtasks,
    commentCount: issue.commentCount,
    recentComments: issue.recentComments,
    guidance:
      readiness.verdict === 'ready'
        ? 'The issue passes the readiness check. Work against the description and acceptance criteria above.'
        : 'Do not start implementation yet. Report what is missing (see readiness.missing) and ask for it to be resolved in Jira first.',
  };
}
