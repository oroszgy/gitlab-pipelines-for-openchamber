# Issue tracker: GitHub Issues

Issues and tickets for this repo live in GitHub Issues:

<https://github.com/oroszgy/gitlab-pipelines-for-openchamber/issues>

Specs live in the repo at `docs/specs/<feature>.md`. The spec is authoritative: when a ticket and its
spec disagree, the **spec wins** — read its Problem, Solution and Implementation Decisions before
building a ticket, and treat a detail the checklist omits as still in scope.

## Conventions

- **Fetch a ticket:** `gh issue view <number>` (`--comments` for the conversation).
- **Publish a ticket:** `gh issue create --title "<feature>/<NN>: <title>" --body-file <file>
  --label <labels> --milestone <feature>`.
- **Titles** are prefixed `<feature>/<NN>` so the ticket's stable id survives GitHub renumbering;
  `docs/specs/README.md` maps each id to its GitHub issue number.
- **Triage** uses the five roles in [`triage-labels.md`](triage-labels.md); a ticket's state is its
  label plus open/closed. Closed tickets carry no triage label.
- **Blocking** is a `Blocked by #<n>` line near the top of the body. A ticket is unblocked when every
  issue it lists is closed.
- **Areas** are labelled `area:<feature>` and grouped under one milestone per feature.

## When a skill says "publish to the issue tracker"

Create a GitHub issue with `gh issue create`, using the `<feature>/<NN>` title prefix and the labels
and milestone above.

## When a skill says "fetch the relevant ticket"

Run `gh issue view <number>`. The user will normally pass the issue number or URL directly.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a tracking issue; each **child** is a GitHub issue that links
back to it.

- **Frontier**: list open issues, drop any whose body still has an open `Blocked by #<n>`; lowest
  `<feature>/<NN>` wins.
- **Claim**: assign yourself and set `Status: claimed` in the body.
- **Resolve**: comment the answer, set `Status: resolved`, close the issue, and link it from the map.
