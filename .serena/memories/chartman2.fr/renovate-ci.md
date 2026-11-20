# Renovate PRs and the CI

- pnpm 11 enforces `minimumReleaseAge` (24 h) in CI: a Renovate PR for a package published less than 24 h ago fails in the Build stage with `ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION`. Not a code issue: rebuild `develop` once the newest package listed in the log is 24 h old.
- Merge Renovate PRs one at a time and wait for the `develop` build: lockfile PRs conflict with each other on `pnpm-lock.yaml`; Renovate (CronJob in k3s, every 6 h at :17) rebases conflicted PRs on its next run. Manual run: `kubectl -n <ns> create job --from=cronjob/renovate renovate-manual-HHMM`.
- While a `develop` → `main` PR is open, Jenkins only builds `PR-N`, not `develop`.
- A SonarQube JS analysis crash (`grpc UNAVAILABLE`, `EXECUTION FAILURE`) is infra flakiness: rebuild.
- Suggested, not done: `minimumReleaseAge: "1 day"` in `lab-iac/k8s/renovate/configmap.yaml` so Renovate stops opening PRs the CI cannot install yet.
- SonarQube "New Code" is in *Previous version* mode: the Jenkinsfile passes `-Dsonar.projectVersion` from `calver('current')` (last CalVer tag). Without it every file counts as new code and `new_coverage` fails the gate. Same in candlekeep-frontend and -backend; `.ci/calver.sh` is identical in the 3 repos.
