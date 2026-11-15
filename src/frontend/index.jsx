// Issue panel: shows, on the Jira issue itself, the same readiness check a
// coding agent gets through the get-work-brief MCP tool. People fix the issue
// here; agents read the result there. Both use the code in ../readiness.js.

import React, { useCallback, useEffect, useState } from 'react';
import ForgeReconciler, {
  Box,
  Button,
  Code,
  Icon,
  Inline,
  Link,
  Lozenge,
  SectionMessage,
  Spinner,
  Stack,
  Text,
  useProductContext,
} from '@forge/react';
import { events, requestJira, requestTeamworkGraph } from '@forge/bridge';
import { BRIEF_FIELDS, normaliseIssue } from '../brief.js';
import { assessReadiness } from '../readiness.js';
import { CONNECTED_WORK_QUERY, issueAri, normaliseConnectedWork, unavailable } from '../graph.js';

const VERDICTS = {
  ready: {
    lozenge: 'success',
    label: 'Ready for an agent',
    message: 'success',
    title: 'Clear enough to hand over',
    body: 'An agent that asks Handoff for this issue is told it can start.',
  },
  'needs-clarification': {
    lozenge: 'moved',
    label: 'Needs clarification',
    message: 'warning',
    title: 'Not ready to hand over yet',
    body: 'An agent that asks Handoff for this issue is told not to start, and why. Fix the items marked above.',
  },
  blocked: {
    lozenge: 'removed',
    label: 'Blocked',
    message: 'error',
    title: 'Should not be handed over',
    body: 'An agent that asks Handoff for this issue is told not to start, and why.',
  },
};

// Reads the issue as the person viewing it, so the panel can never show more
// than they can already see on the page.
async function loadReadiness(issueKey) {
  const response = await requestJira(`/rest/api/3/issue/${issueKey}?fields=${BRIEF_FIELDS}`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Jira returned status ${response.status}`);
  }
  return assessReadiness(normaliseIssue(await response.json()));
}

// Connected work from Teamwork Graph, read as the person viewing the issue.
// It is extra context, so a failure shows as a note and never hides the check.
async function loadConnectedWork(cloudId, issueId) {
  const ari = issueAri(cloudId, issueId);
  if (!ari) return unavailable('The site could not be identified for a Teamwork Graph lookup.');
  try {
    return normaliseConnectedWork(await requestTeamworkGraph(CONNECTED_WORK_QUERY, { id: ari }));
  } catch (err) {
    return unavailable('The Teamwork Graph lookup failed.');
  }
}

function ConnectedRow({ kind, label, url, status }) {
  return (
    <Inline space="space.100" alignBlock="center">
      <Text size="small" color="color.text.subtle">{kind}</Text>
      {url ? <Link href={url} openNewTab>{label}</Link> : <Text>{label}</Text>}
      {status ? <Lozenge>{status}</Lozenge> : null}
    </Inline>
  );
}

function ConnectedWork({ work }) {
  if (!work) return null;
  if (!work.available) {
    return (
      <Text size="small" color="color.text.subtle">Connected work: {work.reason}</Text>
    );
  }
  const total = work.goals.length + work.pullRequests.length + work.designs.length;
  if (!total) {
    return (
      <Text size="small" color="color.text.subtle">
        Connected work: no goals, pull requests or designs are linked to this issue in Teamwork Graph.
      </Text>
    );
  }
  return (
    <Stack space="space.100">
      <Text weight="medium">Connected work</Text>
      {work.goals.map((g) => (
        <ConnectedRow key={`g-${g.key || g.name}`} kind="Goal" label={g.name || g.key} url={g.url} />
      ))}
      {work.pullRequests.map((p) => (
        <ConnectedRow key={`p-${p.url || p.title}`} kind="Pull request" label={p.title || p.id} url={p.url} status={p.status} />
      ))}
      {work.designs.map((d) => (
        <ConnectedRow key={`d-${d.url || d.name}`} kind="Design" label={d.name} url={d.url} status={d.status} />
      ))}
      {work.notes.map((note) => (
        <Text key={note} size="small" color="color.text.subtle">{note}</Text>
      ))}
    </Stack>
  );
}

function CheckRow({ check }) {
  return (
    <Inline space="space.100" alignBlock="start">
      <Icon
        glyph={check.ok ? 'check-circle' : 'cross-circle'}
        label={check.ok ? 'Passed' : 'Failed'}
        color={check.ok ? 'color.icon.success' : 'color.icon.danger'}
      />
      <Stack space="space.0">
        <Text>{check.label}</Text>
        {!check.ok && check.detail ? <Text size="small" color="color.text.subtle">{check.detail}</Text> : null}
      </Stack>
    </Inline>
  );
}

function App() {
  const context = useProductContext();
  const issueKey = context?.extension?.issue?.key;
  const issueId = context?.extension?.issue?.id;
  const cloudId = context?.cloudId;
  const [state, setState] = useState({ status: 'loading' });

  const refresh = useCallback(async () => {
    if (!issueKey) return;
    try {
      const [readiness, connectedWork] = await Promise.all([
        loadReadiness(issueKey),
        loadConnectedWork(cloudId, issueId),
      ]);
      setState({ status: 'done', readiness, connectedWork });
    } catch (err) {
      setState({ status: 'error', message: err?.message || 'Unknown error' });
    }
  }, [issueKey, issueId, cloudId]);

  // Load once the issue key is known, and again whenever the issue is edited
  // on this page, so the verdict follows the description as it is fixed.
  useEffect(() => {
    refresh();
    const subscription = events.on('JIRA_ISSUE_CHANGED', refresh);
    return () => {
      subscription.then((s) => s.unsubscribe()).catch(() => {});
    };
  }, [refresh]);

  if (state.status === 'loading') {
    return <Spinner label="Checking the issue" />;
  }
  if (state.status === 'error') {
    return (
      <SectionMessage appearance="error" title="Handoff could not check this issue">
        <Text>{state.message}</Text>
      </SectionMessage>
    );
  }

  const { readiness } = state;
  const verdict = VERDICTS[readiness.verdict];
  const [passed, total] = readiness.score.split('/');

  return (
    <Stack space="space.200">
      <Inline space="space.100" alignBlock="center" spread="space-between">
        <Inline space="space.100" alignBlock="center">
          <Lozenge appearance={verdict.lozenge} isBold>
            {verdict.label}
          </Lozenge>
          <Text color="color.text.subtle">
            {passed} of {total} checks passed
          </Text>
        </Inline>
        <Button appearance="subtle" spacing="compact" iconBefore="refresh" onClick={refresh}>
          Check again
        </Button>
      </Inline>

      <Stack space="space.100">
        {readiness.checks.map((check) => (
          <CheckRow key={check.id} check={check} />
        ))}
      </Stack>

      <SectionMessage appearance={verdict.message} title={verdict.title}>
        <Text>{verdict.body}</Text>
      </SectionMessage>

      <ConnectedWork work={state.connectedWork} />

      <Box>
        <Text size="small" color="color.text.subtle">
          Agents get this through the Handoff MCP tool <Code>get-work-brief</Code> with issue key <Code>{issueKey}</Code>.
        </Text>
      </Box>
    </Stack>
  );
}

ForgeReconciler.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
