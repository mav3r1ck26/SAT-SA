# 🛡️ SAT-SA Supervisory Testing Datasets Repository

This directory contains production-grade, domain-specific testing datasets created explicitly for the **Supervisory Assessment Tool for Security Operations (SAT-SA)** in compliance with **NCIIPC / CERT-In** supervisory examination standards.

---

## 📂 Available Datasets & Specific Purposes

### 1. `01_siem_alerts_airgap_CSE014_scada.json`
- **Format**: JSON SIEM Alert Array (120 records)
- **Target Entity**: `CSE-014` (Central Power Authority - SCADA/OT Grid, Critical)
- **Use Case**:
  - Test the **Air-Gap Telemetry Ingestion Pipeline** (`/ingestion`) via UI file upload or API.
  - Injects deliberate operational execution gaps:
    - **Rapid Closure Without Investigation**: Critical ransomware & ICS command injection alerts closed in `< 3 minutes` with superficial notes.
    - **Critical Alert Without Escalation**: Critical exfiltration alerts resolved without incident response or CERT-In escalation.
  - Tests automatic gap detection in the **Execution Gaps Registry** (`/gaps`).

### 2. `02_syslog_cef_alerts_CSE027_corebanking.csv`
- **Format**: CEF/Syslog CSV (150 records)
- **Target Entity**: `CSE-027` (National Banking Services - Core Banking & SWIFT)
- **Use Case**:
  - Test **CEF/Syslog CSV Ingestion** and schema canonical mapping.
  - Tests **Statutory 6-Hour Escalation Violations**: Exfiltration alerts delayed up to 740 minutes (> 12 hours) exceeding the statutory 6-hour CERT-In deadline.
  - Tests **Repetitive Template Reuse Detection**: 65% of cases use identical canned closure notes.

### 3. `03_forensic_cases_audit_CSE001_powergrid.csv`
- **Format**: Forensic Investigation Case Log CSV (100 records)
- **Target Entity**: `CSE-001` (National Power Grid Op.)
- **Use Case**:
  - Test **Investigation Analytics** (`/investigations`), workload balance, and evidence attachment histograms.
  - Contains varying investigation depth (`0` to `6`), artifact attachment counts (`0` to `10`), and investigator workload metrics.

### 4. `04_soc_efficiency_ml_batch_test.csv`
- **Format**: Feature Matrix CSV (22 vectors covering all 11 CSEs × 2 quarters)
- **Target Entity**: Complete Critical Sector Fleet (`CSE-001` through `CSE-070`)
- **Use Case**:
  - Direct input to the **Python ML Backend** (`POST http://localhost:8000/evaluate-csv`).
  - Evaluates ML model inference for:
    - False Positive Rate (`false_positive_rate`)
    - Incorrect Attack Classification Ratio (`incorrect_classification_ratio`)
    - Analyst Efficiency (`analyst_efficiency`)
    - Insufficient Evidence Ratio (`insufficient_evidence_ratio`)
    - Signature Age (`signature_age_days`)
    - Playbook Gap Ratio (`playbook_gap_ratio`)

### 5. `05_negative_space_blindspot_matrix.json`
- **Format**: JSON Audit Specification (4 critical sectors)
- **Target Entities**: `CSE-014` (Power), `CSE-027` (Banking), `CSE-063` (Water)
- **Use Case**:
  - Validates **Negative Space Blind-Spot Matrix** (`/negative`), pinpointing unmonitored attack vectors in OT/ICS and Identity infrastructure.

---

## 🚀 How to Ingest & Test

### Option A: Via SAT-SA Frontend UI
1. Navigate to **`http://127.0.0.1:3000/`**
2. Click **Data Ingestion & QC** in the left sidebar.
3. Click **Ingest Telemetry Bundle** and select `01_siem_alerts_airgap_CSE014_scada.json` or `02_syslog_cef_alerts_CSE027_corebanking.csv`.
4. Observe the SHA-256 hash validation, ingestion quality score, and new records updating the live fleet.

### Option B: Via Automated Testing Script
Run the automated test runner:
```bash
python scripts/test_live_data_pipeline.py
```
