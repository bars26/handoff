# Testing Handoff: notes for judges

Handoff checks whether a Jira issue is clear enough to give to a coding agent. The same verdict is
shown on the issue, used by a Rovo agent, and served to external coding agents over MCP.

Testing the panel and the Rovo agent takes about five minutes. The external MCP part takes five
more and needs an MCP client such as Claude Code.

## 1. Install

You need a Jira Cloud site where you are an admin. The panel (part 3) works on any site, including
a Free plan site. Part 4 needs Rovo: a site on the Free plan may not show Rovo chat, and without
it there is no agent picker to find Handoff Coach in.

1. Open the [installation link](https://developer.atlassian.com/console/install/0cee8d96-5d6d-4487-be78-3f66b6c778c2?signature=AYABeGtwiaAiBMZFMujvbfqiDk4AAAADAAdhd3Mta21zAEthcm46YXdzOmttczp1cy13ZXN0LTI6NzA5NTg3ODM1MjQzOmtleS83MDVlZDY3MC1mNTdjLTQxYjUtOWY5Yi1lM2YyZGNjMTQ2ZTcAuAECAQB4CxqLTo9l4lqXuFjNim1xJM%2Bp%2F3TVP9xHS2BrU5DRRucB6iGubc0AHcH5nSuNdvs5yQAAAH4wfAYJKoZIhvcNAQcGoG8wbQIBADBoBgkqhkiG9w0BBwEwHgYJYIZIAWUDBAEuMBEEDPGzisvzscylNAXirgIBEIA7JQlCwSK39DT7clEQJtp0Wfb8WmJcd4vSuHeUJ5Kul0md0X6IAOqzgQ3Wu2MUUUzWOQUZ2lvWEbd1ac0AB2F3cy1rbXMAS2Fybjphd3M6a21zOmV1LXdlc3QtMTo3MDk1ODc4MzUyNDM6a2V5LzQ2MzBjZTZiLTAwYzMtNGRlMi04NzdiLTYyN2UyMDYwZTVjYwC4AQICAHi9bVMAkme4qVQX1fQHo6ePw3H40A7cGfz7yrmSfBWMXgGGdZU9frQ8p%2F7ehHBLx6MxAAAAfjB8BgkqhkiG9w0BBwagbzBtAgEAMGgGCSqGSIb3DQEHATAeBglghkgBZQMEAS4wEQQMANEicxiihYBqNQhVAgEQgDsKps1Ho2M4YlnZdKlMV9Kym1EY9kPCS%2BAXFNhFHOHZuD1aBPortI0pcNonIleLPrwtSlfeEOJ9FPGaegAHYXdzLWttcwBLYXJuOmF3czprbXM6dXMtZWFzdC0xOjcwOTU4NzgzNTI0MzprZXkvNmMxMjBiYTAtNGNkNS00OTg1LWI4MmUtNDBhMDQ5NTJjYzU3ALgBAgIAeDYASx0XCjkny4iLV6vz%2BKtEGSGT6kdt0QRpkn6D%2FlVEAUm79KDmdRT3XXvCAWIv300AAAB%2BMHwGCSqGSIb3DQEHBqBvMG0CAQAwaAYJKoZIhvcNAQcBMB4GCWCGSAFlAwQBLjARBAwk0ZVnUj3T3CY1usMCARCAO4dotdcPhq4%2B9dVCOTr1RTJ1Vucgm8NFCl7%2BVQPCyGwXV%2FcXwsQVXRwOReUaKxVZ0kQR84VKexFYqtk1AgAAAAAMAAAQAAAAAAAAAAAAAAAAAMM56Vt59X74GOF17akA3Sj%2F%2F%2F%2F%2FAAAAAQAAAAAAAAAAAAAAAQAAADLkz7mJm3e%2Fzegotd2WjdSNR8Qt2E9UDEy7iQiCF7U1ygWgn%2Bl8gsQHyHupBPDcLXkV9S9KPjW4Sn6aCFi2kaCKVfw%3D&product=jira).
2. Choose your site, select **Jira**, and accept the scopes:
   - `read:jira-work`, `read:jira-user`: read the issue, its links and comments
   - `write:jira-work`: post one comment with open questions, only when asked
   - `read:graph:issue:jira`, `read:graph:goal:atlassian`, `read:graph:pull-request:external`,
     `read:graph:design:external`: read the goals, pull requests and designs linked to the issue in
     Teamwork Graph. These need an organization admin to install.

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

## 6. Teamwork Graph: connected work

1. Open an issue that is linked to a goal in Atlassian Goals, and add the Handoff panel.
2. Under the checks, **Connected work** lists each linked goal with a link to it. Linked pull
   requests and designs appear the same way, with their status.
3. Ask Handoff Coach `Which goals are connected to this issue?`. It answers from the same
   `get-work-brief` result.
4. When a linked pull request is open or merged, the brief's guidance tells the agent to review it
   before writing new code.

On an issue with nothing linked, the panel says so in one line.

## What is and is not verified

Verified on our development site: the panel, `get-work-brief` from Claude Code, and Handoff Coach
return the same verdict for the same issue; comments posted from Rovo and from Claude Code are
written as the user who confirmed or authorised.

Connected work was verified with linked goals in the panel and through Handoff Coach. Linked pull
requests and designs are not yet verified: our development site has none in Teamwork Graph.

The path without a user session was verified with a second user from Claude Code: the brief is
returned for an issue they can browse, an issue in a private space they are not a member of is
refused as "does not exist or you do not have permission to see it", and the clarification comment
is written by the app and names that user. See the README under *Access control for external MCP
clients*.

## Bonus prize materials

- **Best Agents:** `rovo:agent` module `handoff-coach` with two `action` modules, in
  [`manifest.yml`](../manifest.yml); prompt in [`prompts/coach.txt`](../prompts/coach.txt).
- **Best apps with Teamwork Graph integration:** consumes the Teamwork Graph API with three curated
  queries in [`src/graph.js`](../src/graph.js); part 6 above.
- **Best app with Atlassian MCP:** `rovo:mcp` module `handoff-mcp` exposing `get-work-brief` and
  `ask-for-clarification`; part 5 above.
