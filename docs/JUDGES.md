# Testing Handoff: notes for judges

Handoff checks whether a Jira issue is clear enough to give to a coding agent. The same verdict is
shown on the issue, used by a Rovo agent, and served to external coding agents over MCP.

Testing the panel and the Rovo agent takes about five minutes. The external MCP part takes five
more and needs an MCP client such as Claude Code.

## 1. Install

You need a Jira Cloud site where you are an admin, with Rovo enabled for part 4.

1. Open the installation link: **TODO: add link after production deploy**
2. Choose your site, select **Jira**, and accept the scopes:
   - `read:jira-work`, `read:jira-user`: read the issue, its links and comments
   - `write:jira-work`: post one comment with open questions, only when asked

The app makes no external network calls, stores nothing, and does not use Forge LLM.

## 2. Create two test issues

In any Jira project, create these two issues.

**Issue A (not ready).** Type: Task. Summary: `Implement live call monitoring`. Description:

```
We need live call monitoring for supervisors. Details TBD.
```

**Issue B (ready).** Type: Task. Summary: `Add CSV export to the call history page`. Description:

```
Supervisors need to download the call history they are looking at, so they can share it with
team leads who have no access to the dashboard.

Acceptance criteria
- An "Export CSV" button is shown above the call history table.
- The file contains the rows matching the current filters, with the same columns as the table.
- Exports above 10,000 rows show an error asking the user to narrow the filters.
```

## 3. Issue panel

1. Open issue A. Select the apps button under the issue title and choose **Handoff**.
2. The panel shows **Needs clarification**, with a cross next to the failed checks (description
   too short, no acceptance criteria, open questions) and the reason for each.
3. Open issue B and add the panel the same way. It shows **Ready for an agent**.
4. Edit the description of issue A while the panel is open: the panel updates without a reload.

To see **Blocked**, link issue B as "is blocked by" issue A. Issue B then reports the unfinished
blocker.

## 4. Rovo agent: Handoff Coach

1. On issue A, open Rovo chat and pick the agent **Handoff Coach**.
2. Select the starter **Is this issue ready for a coding agent?**
3. The agent calls the `get-work-brief` action and reports the same verdict as the panel, then asks
   the questions needed to fill the gaps. It does not judge readiness itself.
4. Answer the questions and it drafts a description to paste, or tell it someone else has to answer
   and it offers to post the questions on the issue. Rovo shows a confirmation card first; the
   comment is written as you.

## 5. External coding agent over MCP

1. In Atlassian Administration, go to **Apps > Sites > your site > Connected apps > Handoff** and
   select **Enable tools** under *Expose tools to MCP-compatible apps*.
2. Add the server to your client. For Claude Code:

   ```bash
   claude mcp add --transport http handoff https://mcp.atlassian.com/forge/0cee8d96-5d6d-4487-be78-3f66b6c778c2
   ```

3. Run `/mcp`, authenticate, and choose your site.
4. Ask: `Use handoff to get the work brief for <issue A key>. Should you start on it?`
   The tool returns the brief with `verdict: needs-clarification`, the missing items, and an
   instruction not to start.
5. Ask: `Post your open questions on the issue.` The agent calls `ask-for-clarification` and one
   comment appears on issue A.

## What is and is not verified

Verified on our development site: the panel, `get-work-brief` from Claude Code, and Handoff Coach
return the same verdict for the same issue; comments posted from Rovo and from Claude Code are
written as the user who confirmed or authorised.

Not yet verified: the comment written by the app itself (the path without a user session), and the
refusal for a caller who cannot see the issue. Both are implemented and described in the README
under *Access control for external MCP clients*.

## Bonus prize materials

- **Best Agents:** `rovo:agent` module `handoff-coach` with two `action` modules, in
  [`manifest.yml`](../manifest.yml); prompt in [`prompts/coach.txt`](../prompts/coach.txt).
- **Best app with Atlassian MCP:** `rovo:mcp` module `handoff-mcp` exposing `get-work-brief` and
  `ask-for-clarification`; part 5 above.
