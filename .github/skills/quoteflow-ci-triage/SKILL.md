---
name: quoteflow-ci-triage
description: Diagnose a failed QuoteFlow CI run or identify the next Nx verification step.
---

1. Identify the first failing job step and record its visible error. Determine which subsequent steps never ran.
2. Check the workflow, package manifest, lockfile, and relevant Nx project configuration as needed. Separate dependency installation failures from source-code and test failures.
3. Recommend the smallest reproducible command or fix. Use the workspace package manager and named Nx targets. Report which checks ran and which remain pending.
