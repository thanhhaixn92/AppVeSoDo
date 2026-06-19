# Playwright E2E Skill

Use for browser-level verification.

Commands:
```bash
npm ci
npx playwright install --with-deps
npm run test:e2e -- --project=chromium
```

Classify:
- PASS: tests run and pass.
- FAIL: browser runs but app/test fails.
- BLOCKED_BY_ENVIRONMENT: browser/deps cannot install or launch.
