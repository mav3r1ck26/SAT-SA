# SAT-SA demo ingestion data

Upload `SAT-SA-All-Tabs-Demo.json` for a combined demo with source alerts, cases, and coverage records. It contains 479 records: the original 374 plus 45 investigation scenarios and 60 critical-alert scenarios.

The scenario-only files are provided for focused uploads:
- `SAT-SA-Finding-Scenarios.json`: 45 cases and 60 critical alerts (105 records total).
- `SAT-SA-Critical-Alert-Scenarios.json`: 60 critical alerts.

With the matching demo entities already registered, the app surfaces multiple execution-gap findings, including three critical findings, instead of only the original single critical finding.
