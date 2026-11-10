<img src="assets/handoff.svg" width="72" alt="Handoff logo">

# Handoff

Hand Jira issues to coding agents only when they are ready.

Handoff is an Atlassian Forge app for Jira. It checks whether an issue is clear enough to give to a
coding agent, shows the result on the issue, and serves the same verdict to the agent together with
a compact brief of the issue. An agent that asks about an unclear issue is told not to start, and why.

Built for [Codegeist 2026](https://codegeist2026.devpost.com/), *Apps for Software Teams*. Work in
progress.

## Why

Coding agents will start on anything. Given an issue that says "Implement live call monitoring" and
nothing else, an agent does not push back, it guesses. The cost shows up later as a pull request that
solves a different problem.

People already know what a workable issue needs: a description, acceptance criteria, steps to
reproduce for a bug, no open questions, no unfinished blocker. Handoff checks those things in one
place and gives the same answer to the person writing the issue and to the agent about to work on it.

## What it does

| Where | What you get |
|---|---|
| **Issue panel** in Jira | Verdict (`Ready for an agent`, `Needs clarification`, `Blocked`), each check with a tick or a cross, and the reason for every failed check. Updates when the issue is edited. |
| **MCP tool `get-work-brief`** | For Claude Code, Cursor or any MCP client: summary, description as plain text, links, subtasks, recent comments, the readiness verdict, what is missing, and whether to start. |
| **MCP tool `ask-for-clarification`** | Lets the agent post its open questions on the issue as one comment instead of guessing. |
| **Rovo agent "Handoff Coach"** | Inside Jira: reports what is missing, asks the questions needed to fill the gaps, drafts a description to paste, and can post open questions for the reporter. |

All four use the same rules in [`src/readiness.js`](src/readiness.js).

### The checks

| Check | Passes when |
|---|---|
| Has a description | At least 80 characters |
| States acceptance criteria | An "Acceptance criteria" / "Definition of done" section, a checklist, or Given/When/Then |
| Has steps to reproduce *(bugs)* | A "Steps to reproduce" section or numbered steps |
| States expected and actual behaviour *(bugs)* | Both are mentioned |
| No open questions | No TBD, TODO, "unclear" and similar in the description |
| Is a single piece of work | Not an epic, initiative or theme |
| Not blocked by unfinished work | No "is blocked by" link to an issue that is not done |
| Still open | The issue is not in a done status |

The last three decide `blocked`; any other failure gives `needs-clarification`.

The rules are deterministic and use no LLM: the same issue always gets the same verdict, and every
failed check points at something a person can fix.

## How it is built

- **Forge modules:** `rovo:mcp` (two tools), `rovo:agent`, `action`, `jira:issuePanel` (UI Kit).
- **Runs on Atlassian:** no external egress, no external storage, no Forge LLM.
- **Scopes:** `read:jira-work`, `read:jira-user`, `write:jira-work` (comments only).
- **Bounded output:** description capped at 6,000 characters, 5 recent comments, 20 links, 20
  subtasks, 10 questions per comment.

### Access control for external MCP clients

Inside Jira and Rovo, Handoff reads and writes as the current user (`asUser()`), so Jira's own
permissions apply.

A call from an external MCP client reaches a Forge function without a user session: `asUser()`
throws `Authentication Required`. Forge does pass the caller's account ID. In that case Handoff acts
as the app, but only after asking Jira whether that account may browse (and, for comments, comment
on) that exact issue. If not, the caller gets the same answer as for an issue that does not exist. A
comment posted this way names the person whose agent asked.

## Develop

```bash
git clone https://github.com/bars26/handoff && cd handoff
npm install
npm test
```

To run your own copy you need the [Forge CLI](https://developer.atlassian.com/platform/forge/getting-started/)
and an Atlassian site with Rovo:

```bash
forge register            # gives the app your own app ID
forge deploy
forge install             # choose Jira
```

### Use it in Jira

Open an issue, select the apps button under the issue title and choose **Handoff**. For the agent,
open Rovo chat and pick **Handoff Coach**.

### Connect a coding agent

1. In Atlassian Administration, go to **Apps > Sites > your site > Connected apps > handoff** and
   select **Enable tools** under *Expose tools to MCP-compatible apps*.
2. Add the endpoint to your client, using the UUID from `app.id` in `manifest.yml`. For Claude Code:

   ```bash
   claude mcp add --transport http handoff https://mcp.atlassian.com/forge/<app-uuid>
   ```

3. Run `/mcp` in Claude Code, authenticate, choose your site, then ask for a brief:
   `Use handoff to get the work brief for PROJ-123`.

## Status

Verified on a development site: the issue panel, `get-work-brief` from Claude Code, and Handoff Coach
calling the same tool in Rovo all return the same verdict for the same issue.

Not yet verified: `ask-for-clarification` posting on a real issue, and the refusal path for a caller
without access to the issue.

## License

MIT
