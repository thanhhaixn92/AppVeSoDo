# Project Commands

Install:
```bash
npm ci
```

Lint:
```bash
npm run lint
```

Build:
```bash
npm run build
```

Unit tests:
```bash
npm test
```

Targeted tests:
```bash
npm test -- candidateModel
npm test -- documentWorkflow
```

E2E:
```bash
npx playwright install --with-deps
npm run test:e2e -- --project=chromium
```

If E2E browser install is blocked by proxy/APT/system dependency, report:
`BLOCKED_BY_ENVIRONMENT`.
