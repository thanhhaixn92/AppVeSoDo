# Agent Boundary Rules

## Implementation agent
May edit files within scope.

## Audit-only agent
May read and run commands only. Must not edit files.

## Corrective agent
May fix only audit-confirmed blockers.

## Checkpoint agent
May package/report only. Must not change source.

## Subagents
Use for inspection/triage. Do not allow multiple subagents to edit overlapping files.
