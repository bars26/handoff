# Handoff privacy policy

Last updated: 11 November 2026

Handoff is a Forge app for Jira. It runs entirely on Atlassian's Forge platform.

## What Handoff reads

When you open the Handoff panel, talk to Handoff Coach, or call a Handoff tool from an MCP client,
the app reads the Jira issue you asked about: its summary, description, type, status, links,
subtasks and recent comments. For calls that arrive without a user session it also asks Jira
whether the calling account may see or comment on that issue.

## What Handoff writes

Only when asked through the `ask-for-clarification` tool, Handoff posts one comment with the
questions on that issue.

## What Handoff stores and shares

Nothing. Handoff has no database and uses no Forge storage. It sends no data to any service outside
Atlassian, uses no analytics, and uses no LLM of its own. Issue data is processed in memory for the
duration of one request and returned to the person or agent who asked.

If you use Handoff Coach, the conversation is handled by Atlassian Rovo under Atlassian's terms. If
you connect an external MCP client, the brief is delivered to that client, and what it does with it
is governed by that client's terms.

## Logs

Handoff's function logs record the name of the tool that was called, the issue key, and error
messages. They are kept by Atlassian's Forge platform and do not contain the issue's text, comments
or account IDs.

## Contact

Questions and requests: https://github.com/bars26/handoff/issues
