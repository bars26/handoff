# Demo video script

Working script for the Codegeist 2026 demo video. Target length 4:15 (limit: under 5:00).

## What the rules ask for

From the official rules (read 2026-11-15):

- Under five minutes; judges need not watch beyond that.
- Footage that shows the project functioning on the device it was built for.
- Public on YouTube, link on the submission form.
- No third-party trademarks and no copyrighted music without permission.
- English, or an English translation.
- Sound is not required.
- The project must function as depicted in the video.

Presentation is one of five equally weighted criteria: does the video show the project working end
to end, and does it say what problem is solved, who it is for and why it matters.

## Decisions that follow

- Every claim in the narration is shown on screen or already verified; nothing is mocked.
- The coding agent in scene 4 is called "a coding agent". The terminal is cropped to the prompt and
  the answer so no third-party product name or logo is on screen.
- No music, or a track we generate ourselves.
- Captions are burned in, so the video works without sound.

## Demo data

| Issue | State at the start | Used in |
|---|---|---|
| New issue V1, "Implement live call monitoring", description `We need live call monitoring for supervisors. Details TBD.` | needs-clarification 3/6 | scenes 1 to 4 |
| SALES-13 (two linked goals) | has connected work | scene 5 |
| GT-1 (private space) | not visible to the second user | scene 6 |

## Scenes

| # | Time | On screen | Narration |
|---|---|---|---|
| 1 | 0:00–0:25 | Title card "Handoff", then issue V1 with its one-line description. | Coding agents are fast. Give one a vague Jira issue and it will quickly build the wrong thing. "Details TBD" is not something an agent can raise in standup. Handoff is a Forge app that checks whether an issue is ready to hand to a coding agent, and tells the agent itself when it is not. |
| 2 | 0:25–1:00 | Scroll to the Handoff panel on V1: Needs clarification, 3 of 6, the three failed checks with their reasons. | This is the Handoff panel on a Jira issue. Six checks and no LLM: the same issue always gets the same verdict, and every failed check says why. Here the description is too short, there are no acceptance criteria, and it still says TBD. |
| 3 | 1:00–2:00 | Open Rovo chat, pick Handoff Coach, select "Is this issue ready for a coding agent?". It reports the verdict and asks its questions. Answer in two lines. It drafts a description. Paste it into the issue. The panel turns to Ready for an agent without a reload. | Handoff Coach is a Rovo agent that uses the same check. It does not judge readiness itself: it calls the tool and asks only for what is missing. I answer, it drafts a description, I paste it in, and the panel updates on its own. Ready for an agent. If someone else has the answers, the coach posts the open questions on the issue, after I confirm. |
| 4 | 2:00–3:00 | Terminal, cropped. First on a not-ready issue: "Use handoff to get the work brief for <key>. Should you start on it?" The answer: do not start, with the missing items. Then the same question for V1: the brief and a go-ahead. | Now the other side. The same check is exposed through Atlassian's MCP server with the rovo:mcp module, so any coding agent can call it. I ask my agent to start on an issue that is not ready. It gets the brief, sees needs-clarification, and stops. On the issue we just fixed it gets a compact brief: description, links, recent comments, and a green light. |
| 5 | 3:00–3:30 | SALES-13 panel, Connected work with two goals; click one goal. Then the `connectedWork` part of the brief. | Handoff also reads Teamwork Graph. The panel and the brief show the goals connected to the issue, so the agent knows why the work matters. Linked pull requests and designs appear the same way. |
| 6 | 3:30–3:55 | Terminal, second user: the brief for GT-1 is refused. Then the app-authored comment on an issue, naming who asked. | Access follows Jira. A caller who cannot see an issue gets the same answer as for one that does not exist. The app stores nothing and makes no external calls. |
| 7 | 3:55–4:15 | End card: Handoff, the three surfaces, repo URL. | Handoff: a readiness gate between your backlog and your agents. A panel for people, a Rovo agent for the fix, MCP for the agents. Built on Forge. |

Narration is about 350 words, roughly 2:45 of speech, which leaves room for the screen actions.

## Who records what

- Scenes 1, 2, 3, 5: browser recording in the main account's Jira session.
- Scenes 4 and 6: screen recording of the terminal (about 30 seconds each), cropped to the text.
- Title card, end card, captions, cut: assembled afterwards into one MP4.

## Open choices

- Voice: generated English voice, the author's own voice, or captions only.
- Whether scene 3 also shows the comment confirmation card (adds about 15 seconds).

## YouTube

Title:

```
Handoff: is this Jira issue ready for a coding agent? (Codegeist 2026)
```

Description:

```
Handoff is a Forge app for Jira that checks whether an issue is clear enough to hand to a coding agent, and tells the agent itself when it is not.

One check, three surfaces:
- An issue panel shows the verdict and the reason for every failed check.
- Handoff Coach, a Rovo agent, asks only for what is missing and drafts a better description.
- Any coding agent can call the same check over Atlassian's MCP server (rovo:mcp) and gets a compact work brief, or a clear "do not start yet".

The brief also carries connected work from Teamwork Graph. The rules are deterministic and use no LLM. The app stores nothing and makes no external calls.

Everything in this video is the production app running on a Jira Cloud site.

Chapters
0:00 The problem
0:24 The issue panel
0:46 Handoff Coach, the Rovo agent
1:47 Coding agents over MCP
2:21 Connected work from Teamwork Graph
2:34 Access control
2:56 Summary

Source, install link and test steps: https://github.com/bars26/handoff

Built for Codegeist 2026 (Apps for Software Teams).
```

Settings: visibility Public, not made for kids, category Science & Technology.
