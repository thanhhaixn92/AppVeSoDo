# E2E Classification

## PASS
Use only when:
- Playwright browser installs or already exists;
- E2E command runs;
- all tests pass.

## FAIL
Use when:
- browser launches;
- E2E command runs;
- test fails due to application/test logic.

## BLOCKED_BY_ENVIRONMENT
Use when:
- browser dependency installation is blocked;
- APT/proxy/network prevents install;
- Chromium executable is missing and cannot be installed;
- system permission/capability prevents browser launch.

## SKIPPED
Use only when:
- repo has no E2E command;
- task policy explicitly forbids install/run.

Never report E2E PASS if Chromium E2E did not actually run.
