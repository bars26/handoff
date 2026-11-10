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
  Lozenge,
  SectionMessage,
  Spinner,
  Stack,
  Text,
  useProductContext,
} from '@forge/react';
import { events, requestJira } from '@forge/bridge';
import { BRIEF_FIELDS, normaliseIssue } from '../brief.js';
import { assessReadiness } from '../readiness.js';

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
  const [state, setState] = useState({ status: 'loading' });

  const refresh = useCallback(async () => {
    if (!issueKey) return;
    try {
      setState({ status: 'done', readiness: await loadReadiness(issueKey) });
    } catch (err) {
      setState({ status: 'error', message: err?.message || 'Unknown error' });
    }
  }, [issueKey]);

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
