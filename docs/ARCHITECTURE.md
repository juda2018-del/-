# JODA OS Architecture

## Core loop
1. Observe portfolio and opportunities.
2. Score opportunities by upside, effort, risk and strategic fit.
3. Convert the best decision into an execution task queue.
4. Ask for owner approval before sensitive external side effects.
5. Record outcomes in operational memory.
6. Re-score and repeat.

## Current APIs
- `/api/agent` — master agent reasoning endpoint.
- `/api/context` — portfolio/opportunity/memory context.
- `/api/tasks` — execution queue.
- `/api/health` — service health.

## Safety boundary
JODA may analyze, plan and prepare actions. Publishing, spending money, deleting data, sending external messages, and production changes require explicit approval unless a future tool integration grants a narrower approved action.
