# JODA Command Center

The command center is the single operational surface for the owner.

## Sections
- **Today:** one primary decision, why it matters, expected result, and approvals.
- **Portfolio:** current projects and next actions.
- **Decisions:** ranked allocation recommendations.
- **Tasks:** execution queue.
- **Opportunities:** new-company and spinout pipeline.
- **Policy:** actions that require explicit approval.

## API
`GET /api/command-center`

The endpoint aggregates the current agent core, portfolio, decision engine, tasks, and opportunity pipeline into one response so a frontend can render the whole operating picture without duplicating business logic.
