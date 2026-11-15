// Connected work from Atlassian's Teamwork Graph: what the organisation already
// knows about an issue beyond its own fields. Pure functions only; the calls
// themselves are made in index.js (backend) and frontend/index.jsx (panel).
//
// Uses curated Teamwork Graph queries, so there is no Cypher to register and
// every row is already filtered to what the calling user may see.

// Curated queries allow at most 25 rows; a brief needs far fewer.
export const MAX_CONNECTED = 10;

export const CONNECTED_WORK_QUERY = `
query handoff_connectedWork($id: ID!) {
  goals: jiraWorkItemGoals(id: $id, first: ${MAX_CONNECTED}) {
    edges { node { ... on AtlassianGoal { key name url archived } } }
  }
  pullRequests: jiraWorkItemLinkedExternalPullRequests(id: $id, first: ${MAX_CONNECTED}) {
    edges { node { ... on ExternalPullRequest { displayId title displayName status url } } }
  }
  designs: jiraWorkItemLinkedExternalDesigns(id: $id, first: ${MAX_CONNECTED}) {
    edges { node { ... on ExternalDesign { displayName status url } } }
  }
}`;

const CLOUD_ID = /^[A-Za-z0-9-]{1,64}$/;
const ISSUE_ID = /^[0-9]{1,20}$/;

// Teamwork Graph addresses a Jira issue by ARI, built from the site's cloud ID
// and the issue's numeric ID. Returns null rather than a malformed ARI.
export function issueAri(cloudId, issueId) {
  const cloud = String(cloudId || '');
  const id = String(issueId || '');
  if (!CLOUD_ID.test(cloud) || !ISSUE_ID.test(id)) return null;
  return `ari:cloud:jira:${cloud}:issue/${id}`;
}

// Forge passes the site either as a cloud ID or inside an install context ARI
// (ari:cloud:jira::site/<cloudId>), depending on how the function was invoked.
export function cloudIdFrom(context) {
  if (context?.cloudId) return context.cloudId;
  const match = /site\/([A-Za-z0-9-]+)$/.exec(context?.installContext || '');
  return match ? match[1] : null;
}

function nodes(connection) {
  return (connection?.edges || [])
    .map((edge) => edge?.node)
    .filter((node) => node && Object.keys(node).length)
    .slice(0, MAX_CONNECTED);
}

function text(value) {
  return value == null ? null : String(value);
}

export function unavailable(reason) {
  return { available: false, reason };
}

// Turns the GraphQL response into the `connectedWork` part of a brief.
// A missing Teamwork Graph scope yields empty lists, not an error, so "none
// found" and "not allowed to look" cannot be told apart here; the note in
// `notes` only ever states what was actually returned.
export function normaliseConnectedWork(json) {
  const data = json?.data;
  if (!data) {
    const message = json?.errors?.[0]?.message;
    return unavailable(message ? `Teamwork Graph returned an error: ${message}` : 'Teamwork Graph returned no data.');
  }

  const goals = nodes(data.goals)
    .filter((g) => !g.archived)
    .map((g) => ({ key: text(g.key), name: text(g.name) || '', url: text(g.url) }));

  const pullRequests = nodes(data.pullRequests).map((p) => ({
    id: text(p.displayId),
    title: text(p.title) || text(p.displayName) || '',
    status: text(p.status) || 'UNKNOWN',
    url: text(p.url),
  }));

  const designs = nodes(data.designs).map((d) => ({
    name: text(d.displayName) || '',
    status: text(d.status) || 'UNKNOWN',
    url: text(d.url),
  }));

  const notes = [];
  const inFlight = pullRequests.filter((p) => p.status === 'OPEN' || p.status === 'DRAFT');
  if (inFlight.length) {
    notes.push(
      `Work may already be in progress: ${inFlight.length} linked pull request(s) are open or in draft. Review them before writing new code.`
    );
  }
  const merged = pullRequests.filter((p) => p.status === 'MERGED');
  if (merged.length) {
    notes.push(
      `${merged.length} linked pull request(s) are already merged. Check what they changed before starting.`
    );
  }
  if (designs.some((d) => d.status === 'READY_FOR_DEVELOPMENT')) {
    notes.push('A linked design is marked ready for development. Build against it.');
  }

  return { available: true, goals, pullRequests, designs, notes };
}
