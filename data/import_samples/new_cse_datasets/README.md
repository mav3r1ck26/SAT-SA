# New CSE import samples

These are 10 manual-import files for testing new-entity registration and automatic ML inference. They have **not** been sent to the SAT-SA application.

Each organization has two files (one alerts file and one case file). Records provide `entityName` plus sector, region, and criticality, but deliberately omit `entityId`/`entity_id` and any assigned CSE code.
On first import, the ingestion service should assign the next available `CSE-###` ID from the entities already registered; importing the second file for that same organization should reuse the same ID.

| CSE name | Sector | Files |
|---|---|---|
| Aarohan Grid Transmission Corporation | Power | `Aarohan_Grid_Transmission_Corporation_alerts.csv`, `Aarohan_Grid_Transmission_Corporation_cases.csv` |
| Narmada Regional Banking Consortium | Banking | `Narmada_Regional_Banking_Consortium_alerts.csv`, `Narmada_Regional_Banking_Consortium_cases.csv` |
| Suryodaya Telecom Infrastructure | Telecom | `Suryodaya_Telecom_Infrastructure_alerts.csv`, `Suryodaya_Telecom_Infrastructure_cases.csv` |
| Kaveri Public Health Network | Health | `Kaveri_Public_Health_Network_alerts.csv`, `Kaveri_Public_Health_Network_cases.csv` |
| Dakshin Rail Logistics Authority | Transport | `Dakshin_Rail_Logistics_Authority_alerts.csv`, `Dakshin_Rail_Logistics_Authority_cases.csv` |

Each file is within the per-entity limit of three. CSV values are synthetic supervisory scenarios, with distinct event IDs for repeatable deduplication checks.
