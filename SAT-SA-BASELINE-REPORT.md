# SAT-SA Enterprise Enhancement Project — Baseline

**Review date:** 2026-11-11  
**Mode:** Preparation only; no source files or environment configurations changed.

## Executive summary

The root project is the primary application. It contains a React/Vite frontend, an Express/Mongoose API, a FastAPI ML service, and a Docker Compose MongoDB service. The checked-in scripts describe ports 5173, 3500, 8000, and 27017 respectively.

The frontend production build and backend TypeScript compilation were attempted, but both stopped because the project-local Node dependencies are absent (`tsc` is unavailable). Python source parsing, dependency checks, and ML API import all passed. The ML model artifact is absent, so the service imports but has no trained model loaded. There is no root test script or conventional automated test/spec suite. The live integration script was not run because it posts ingestion data and therefore changes database state.

## Git and working-tree baseline

- `git rev-parse --show-toplevel` from the project resolves to `C:/Users/Raveena`, not the SAT-SA project directory.
- Current branch: `main`.
- No `.git` directory exists in the SAT-SA project itself.
- At baseline, the project path had **0 tracked changes and 167 untracked files**; the project files are not tracked by the Git repository that currently encloses them.
- This report is the only file created for this task and is also untracked. No source files were modified.
- The wider home-directory Git worktree contains unrelated untracked content; it was not enumerated in this report.

**Implication:** Establish the intended SAT-SA repository boundary and tracked baseline before making or reviewing implementation changes.

## Primary frontend and services

| Component | Source of truth / entry point | Port | Configuration |
|---|---|---:|---|
| Primary React/Vite frontend | Root `src/`; root `package.json` `dev` and `build` scripts | 5173 | Root `vite.config.ts`; `/api` proxies to `127.0.0.1:3500` |
| Secondary frontend copy | `sat-sa-frontend/`; separate package and React Router app | 5173 | Not invoked by root scripts; its README/config describe a different API port |
| Node.js / Express API | `server/index.ts` | 3500 by default | `API_PORT` can override; listens on `0.0.0.0` |
| Python / FastAPI ML API | `ml-backend/src/api.py` | 8000 | Listens on `0.0.0.0` |
| MongoDB | `docker-compose.yml` | 27017 | Only service started by the checked-in Compose file |

The root build script is `tsc -b && vite build`; the root TypeScript project includes `src`. The nested frontend has a separate package, build, and lint script, but the root package does not declare it as a workspace or call its scripts.

## Build and static-check results

| Check | Result | Details |
|---|---|---|
| Root frontend production build (`npm.cmd run build`) | **Blocked** | `tsc` not recognized. Root `node_modules` and local TypeScript/Vite executables are absent. Vite build did not run. No dependencies were installed. |
| Backend TypeScript compilation (`npm.cmd run build:server`) | **Blocked** | `tsc` not recognized; backend compilation did not run. |
| Python syntax check | **Passed** | AST parsing completed for 9 Python files under `ml-backend/src` and `scripts`; 0 syntax errors. No bytecode or cache files were written. |
| ML dependency check | **Passed in current Python environment** | All declared requirements were present: pandas, NumPy, scikit-learn, joblib, FastAPI, Uvicorn, Pydantic, and python-multipart. `pip check` reported no broken requirements. |
| ML service import | **Passed, model unavailable** | `src.api` imports and constructs its FastAPI app. The configured model artifact does not exist, so inference reports the model as not trained until training occurs. |

Runtime versions observed: Node.js 24.15.0, npm 11.12.1, Python 3.13.14.

## Scripts, tests, and coverage

- Root scripts include frontend `dev`/`build`, API start/watch, `dev:full`, ML API start, seed tasks, and `build:server`.
- The root package has **no `test` or `lint` script**. Running `npm.cmd test` confirmed `Missing script: "test"`.
- `sat-sa-frontend/package.json` has a lint script (`oxlint`) and build script, but no test script; its dependencies are not installed either.
- No conventional `*.test.*` or `*.spec.*` source files were found. Test-oriented assets include generated datasets and `scripts/test_live_data_pipeline.py`.
- The live integration script is not wired to an npm test command, targets Node API port **3001** rather than the configured default **3500**, and performs JSON/file ingestion. It was intentionally not run to avoid changing database contents.
- As a result, there is no completed application test suite or runtime integration result in this baseline.

## Environment and credential-file check

- No project `.env`, `.env.*`, or `.envrc` files were found.
- No credential/secrets-named files were found in the project.
- Credential values were not printed. Static development MongoDB root credential settings are present in `docker-compose.yml`; `server/config/db.ts` also has a fallback MongoDB URI. These should be replaced or externally managed for an enterprise deployment.

## Existing baseline blockers and gaps

1. **Repository boundary:** The SAT-SA project is untracked under the user's home-directory Git root.
2. **Node validation:** No project-local Node dependencies, so the requested frontend and backend builds cannot reach compilation.
3. **ML readiness:** Python checks pass, but no trained model artifact is available.
4. **Automated regression coverage:** No root test command or conventional test suite; the live ingestion script is unsafe to run as a read-only check and has a stale API port.
5. **Deployment claims/configuration:** The Compose file starts MongoDB only; application ports are broadly bound, and development database credentials are statically configured.

## Recommended next implementation step

Before code changes, establish the intended Git repository root and a tracked, reviewable SAT-SA baseline without disturbing unrelated home-directory content. Once that foundation is approved, make the first implementation phase **authentication/RBAC and service-boundary hardening**, with tests for authorization and configuration writes. Build validation should be re-run once dependencies are made available through the approved environment; do not treat the blocked build as a code failure.
