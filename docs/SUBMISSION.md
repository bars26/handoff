# Devpost submission draft

Draft text for the Codegeist 2026 form. Items marked TODO are not done yet.

- **Project name:** Handoff
- **Tagline:** Hand Jira issues to coding agents only when they are ready.
- **Category:** Apps for Software Teams
- **Bonus prizes:** Best Agents (Rovo), Best app with Atlassian MCP. TODO: Teamwork Graph if the
  integration ships.
- **Repo:** https://github.com/bars26/handoff
- **Installation link:** TODO (after production deploy)
- **Testing instructions:** [docs/JUDGES.md](JUDGES.md)
- **Demo video:** TODO (YouTube, public, under 5 minutes)
- **Built with:** Atlassian Forge, Jira, Rovo, MCP, UI Kit, Node.js

## Inspiration

Coding agents will start on anything. Give one an issue that says "Implement live call monitoring"
and nothing else, and it does not push back. It guesses, and the cost shows up later as a pull
request that solves a different problem.

Teams already know what a workable issue needs: a description, acceptance criteria, steps to
reproduce for a bug, no open questions, no unfinished blocker. That knowledge lives in people's
heads and in review comments. Nothing checks it at the moment work is handed to an agent.

## What it does

Handoff is a Forge app for Jira that checks whether an issue is ready for a coding agent and gives
the same answer in three places:

- **Issue panel.** A verdict (Ready for an agent, Needs clarification, Blocked), each check with a
  tick or a cross, and the reason for every failed check. It updates as the issue is edited.
- **MCP tools for coding agents.** `get-work-brief` gives Claude Code, Cursor or any MCP client a
  compact brief of the issue (description as plain text, links, subtasks, recent comments) with the
  verdict, what is missing, and whether to start. `ask-for-clarification` lets the agent post its
  open questions on the issue as one comment instead of guessing.
- **Rovo agent "Handoff Coach".** Inside Jira it reports what is missing, asks the questions needed
  to fill the gaps, drafts a description to paste, and can post open questions for the reporter
  after the user confirms.

The checks are deterministic and use no LLM. The same issue always gets the same verdict, and every
failed check points at something a person can fix.

## How we built it

Everything runs on Forge, with no external egress and no external storage.

- `rovo:mcp` exposes two `action` modules as MCP tools at `mcp.atlassian.com/forge/<app-id>`.
- `rovo:agent` uses the same two actions. Its prompt forbids it from judging readiness itself: the
  verdict comes only from the action.
- `jira:issuePanel` (UI Kit) calls the same readiness code and refreshes on issue change events.
- The rules are plain JavaScript modules (ADF to text, readiness, brief) covered by 13 `node:test`
  tests that run in CI without Forge.
- Output is bounded: description capped at 6,000 characters, 5 comments, 20 links, 20 subtasks, 10
  questions per comment.

## How it meets the technology requirement

Handoff is built on Forge and integrates with Jira (issue panel, Jira REST API through
`@forge/api`) and Rovo (`rovo:agent`, `rovo:mcp`, `action`). The context it uses is the issue
itself plus its links, blockers, subtasks and comments.

## Challenges we ran into

External MCP calls do not always arrive with a user session. On our development site `asUser()`
threw `Authentication Required` on the first calls from Claude Code, and worked once the same user
had used the app inside Jira and re-authorised the client. Forge passes the caller's account ID
either way, so when there is no session Handoff acts as the app only after asking Jira whether that
account may browse (and, for comments, comment on) that exact issue. A caller without access gets
the same answer as for an issue that does not exist.

## Accomplishments that we're proud of

One set of rules, three surfaces, one verdict. The panel, the Rovo agent and an external coding
agent were checked against the same issue and agreed.

## What we learned

Keeping the rules as plain modules with no Forge imports paid off: the verdict logic is tested in
milliseconds without a tunnel or a site, and the panel, the agent and the MCP tools reuse it
unchanged.

## What's next

- Teamwork Graph: use connected work (pull requests, linked pages) in the brief. TODO
- Per-project rules, so teams can set their own definition of ready.
- Marketplace listing.
