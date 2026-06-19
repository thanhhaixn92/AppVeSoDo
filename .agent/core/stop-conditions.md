# Stop Conditions

Stop and report when:

- task would require protected-area changes outside scope;
- implementation would start the next phase implicitly;
- tests fail after 3 repair loops;
- root cause is unclear;
- E2E is blocked by environment;
- secrets/auth/infra/security behavior is involved without explicit approval;
- product decision is required;
- source behavior contradicts current roadmap/checkpoint.

Do not guess. Do not make broad rewrites to force tests to pass.
