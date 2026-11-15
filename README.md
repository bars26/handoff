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
| **MCP tool `get-work-brief`** | For Claude Code, Cursor or any MCP client: summary, description as plain text, links, subtasks, recent comments, connected work from Teamwork Graph, the readiness verdict, what is missing, and whether to start. |
| **MCP tool `ask-for-clarification`** | Lets the agent post its open questions on the issue as one comment instead of guessing. |
| **Rovo agent "Handoff Coach"** | Inside Jira: reports what is missing, asks the questions needed to fill the gaps, drafts a description to paste, and can post open questions for the reporter. |

All four use the same rules in [`src/readiness.js`](src/readiness.js).

### The checks

| Check | Passes when |
|---|---|
| Has a description | At least 80 characters |
| States acceptance criteria | An "Acceptance criteria" / "Definition of done" section, a checklist, or When/Then lines |
| Has steps to reproduce *(bugs)* | A "Steps to reproduce" section or numbered steps |
| States expected and actual behaviour *(bugs)* | Both are mentioned |
| No open questions | No TBD, TODO, "unclear whether…", "???" and similar in the description (code blocks are ignored) |
| Is a single piece of work | Not an epic, initiative or theme |
| Not blocked by unfinished work | No "is blocked by" link to an issue that is not done |
| Still open | The issue is not in a done status |

The last three decide `blocked`; any other failure gives `needs-clarification`.

The rules are deterministic and use no LLM: the same issue always gets the same verdict, and every
failed check points at something a person can fix.

### Connected work from Teamwork Graph

The brief and the panel also show what Atlassian's Teamwork Graph connects to the issue: the goals
it contributes to, linked pull requests and linked designs. An agent sees why the work matters, and
is told when a pull request is already open or merged so it does not redo work in progress.

Connected work is context, not a check. It never changes the verdict, and when the graph cannot be
read the brief says so and still returns everything else.

## How it is built

- **Forge modules:** `rovo:mcp` (two tools), `rovo:agent`, `action`, `jira:issuePanel` (UI Kit).
- **Teamwork Graph API:** curated queries `jiraWorkItemGoals`, `jiraWorkItemLinkedExternalPullRequests`
  and `jiraWorkItemLinkedExternalDesigns`, in one request, read as the current user.
- **Runs on Atlassian:** no external egress, no external storage, no Forge LLM.
- **Scopes:** `read:jira-work`, `read:jira-user`, `write:jira-work` (comments only), and four read-only
  Teamwork Graph scopes (`read:graph:issue:jira`, `read:graph:goal:atlassian`,
  `read:graph:pull-request:external`, `read:graph:design:external`).
- **Bounded output:** description capped at 6,000 characters, 5 recent comments, 20 links, 20
  subtasks, 10 questions per comment, 10 goals, pull requests and designs each.

### Access control for external MCP clients

Inside Jira and Rovo, Handoff reads and writes as the current user (`asUser()`), so Jira's own
permissions apply.

A call from an external MCP client can reach a Forge function without a user session; `asUser()`
then throws `Authentication Required`. On our development site this happened on the first calls from
Claude Code and stopped after the same user had used the app inside Jira and re-authorised the
client, so it appears to depend on whether that user has already granted the app access. Forge passes
the caller's account ID either way.

When there is no user session, Handoff acts as the app, but only after asking Jira whether that
account may browse (and, for comments, comment on) that exact issue. If not, the caller gets the same
answer as for an issue that does not exist. A comment posted this way names the person whose agent
asked.

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

Verified on a development site:

- The issue panel, `get-work-brief` from Claude Code, and Handoff Coach calling the same tool in Rovo
  all return the same verdict for the same issue.
- Handoff Coach posting open questions with `ask-for-clarification`: Rovo shows a confirmation card
  first, and the comment is written as the user who confirmed.

- `ask-for-clarification` from Claude Code: the comment is written as the user who authorised the
  client.

- Connected work: an issue with two linked goals shows both in the panel, and Handoff Coach reports
  the same two from `get-work-brief`. Linked pull requests and designs are not yet verified, because
  the development site has none in Teamwork Graph. Teamwork Graph is only readable with a user
  session, so a call that arrives without one gets the brief without connected work.

- A second user without a session, from Claude Code: `get-work-brief` returned the brief for an issue
  they can browse and "does not exist or you do not have permission to see it" for an issue in a
  private space they are not a member of. `ask-for-clarification` posted the comment as the app,
  naming that user as the one who asked.

- Installation on a fresh site: a different account installed the production app through the
  installation link on a new Free plan Jira site, and the panel gave the expected verdicts for the
  two sample issues in [`docs/JUDGES.md`](docs/JUDGES.md). That site showed no Rovo chat, so the
  agent was not tried there.

## License

MIT
