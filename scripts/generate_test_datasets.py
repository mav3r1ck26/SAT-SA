"""
generate_test_datasets.py
Generates comprehensive, realistic, cybersecurity industry-grade test datasets for SAT-SA.
Specifically tailored for:
1. Air-gap SIEM Alert Ingestion (JSON) - Testing execution gaps & premature closures (CSE-014 SCADA Grid)
2. CEF / Syslog Alert Ingestion (CSV) - Testing repetitive templates & statutory 6-hour CERT-In escalation breaches (CSE-027 Core Banking)
3. Forensic Case Investigations (CSV) - Testing investigation depth, evidence attachment, and investigator workload (CSE-001 Power Grid)
4. ML Backend SOC Efficiency Scoring Matrix (CSV) - Testing /evaluate-csv & /evaluate endpoints for all 11 CSE fleet entities
5. Negative Space Telemetry Blind-Spot Matrix (JSON) - Testing MITRE ATT&CK coverage drop-offs across OT/ICS, Cloud, and Identity
"""

import os
import json
import csv
import random
from datetime import datetime, timedelta

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "testing_datasets")
os.makedirs(DATA_DIR, exist_ok=True)

# Random seed for reproducible, high-fidelity datasets
random.seed(42)

def iso_time(days_ago=5, hours_ago=0, minutes_ago=0):
    base = datetime.now() - timedelta(days=days_ago, hours=hours_ago, minutes=minutes_ago)
    return base.strftime("%Y-%m-%dT%H:%M:%S.000Z")

# ==============================================================================
# 1. SIEM ALERTS JSON: CSE-014 (Central Power Authority - SCADA/OT Grid)
# Deliberate Execution Gaps:
# - Premature closure (< 3 mins) on Critical Ransomware (T1059 / T1190)
# - Critical alert with NO escalation (T1041 Exfiltration)
# ==============================================================================
def generate_siem_alerts_cse014():
    print("Generating Dataset 1: SIEM Alerts JSON (CSE-014)...")
    scenarios = [
        {
            "category": "Malware",
            "subcategory": "BlackCat/ALPHV ICS Staging",
            "asset": "SCADA-HMI-WEST-01",
            "assetCriticality": "Critical",
            "severity": "Critical",
            "mitre": "T1059.001",
            "closureNote": "False positive - flagged scheduled maintenance powershell script",
            "closureReason": "False positive",
            "investigationDepth": 0,
            "durationMin": 2,
            "escalated": False,
            "escalationRequired": True,
            "escalationPath": None,
            "escalationDelayMin": 0
        },
        {
            "category": "Privilege Escalation",
            "subcategory": "Mimikatz LSASS Memory Dump",
            "asset": "DC-PRIMARY-CORP",
            "assetCriticality": "Critical",
            "severity": "Critical",
            "mitre": "T1003.001",
            "closureNote": "Closed after password reset was requested via ticket #9821",
            "closureReason": "Resolved",
            "investigationDepth": 1,
            "durationMin": 8,
            "escalated": False,
            "escalationRequired": True,
            "escalationPath": None,
            "escalationDelayMin": 0
        },
        {
            "category": "Data Exfiltration",
            "subcategory": "C2 Channel Data Transfer (14.2 GB)",
            "asset": "OT-HISTORIAN-SVR",
            "assetCriticality": "Critical",
            "severity": "Critical",
            "mitre": "T1041",
            "closureNote": "Vendor telemetry sync confirmed by operator",
            "closureReason": "False positive",
            "investigationDepth": 0,
            "durationMin": 4,
            "escalated": False,
            "escalationRequired": True,
            "escalationPath": None,
            "escalationDelayMin": 0
        },
        {
            "category": "Command and Control",
            "subcategory": "Cobalt Strike HTTPS Beaconing",
            "asset": "EMS-DISPATCH-CON",
            "assetCriticality": "Critical",
            "severity": "High",
            "mitre": "T1071.001",
            "closureNote": "Host quarantined via EDR agent and image re-flashed",
            "closureReason": "Resolved",
            "investigationDepth": 4,
            "durationMin": 95,
            "escalated": True,
            "escalationRequired": True,
            "escalationPath": "Analyst -> L2 -> CERT-In",
            "escalationDelayMin": 140
        },
        {
            "category": "Lateral Movement",
            "subcategory": "PsExec Service Creation",
            "asset": "SUBSTATION-RTU-12",
            "assetCriticality": "High",
            "severity": "High",
            "mitre": "T1021.002",
            "closureNote": "Technician remote diagnostic session",
            "closureReason": "Resolved",
            "investigationDepth": 2,
            "durationMin": 40,
            "escalated": False,
            "escalationRequired": False,
            "escalationPath": "Analyst -> Team Lead",
            "escalationDelayMin": 45
        },
        {
            "category": "Initial Access",
            "subcategory": "VPN Gateway Brute Force",
            "asset": "FW-PERIMETER-01",
            "assetCriticality": "High",
            "severity": "Medium",
            "mitre": "T1110.001",
            "closureNote": "Source IP block applied at upstream perimeter router",
            "closureReason": "Resolved",
            "investigationDepth": 3,
            "durationMin": 30,
            "escalated": False,
            "escalationRequired": False,
            "escalationPath": None,
            "escalationDelayMin": 0
        },
        {
            "category": "OT/ICS Anomaly",
            "subcategory": "Modbus Function Code 0x05 Unauthorized Write",
            "asset": "PLC-FEEDER-LINE-A",
            "assetCriticality": "Critical",
            "severity": "Critical",
            "mitre": "T0855",
            "closureNote": "Immediate breaker tripped; manual bypass established",
            "closureReason": "Escalated to Incident",
            "investigationDepth": 5,
            "durationMin": 220,
            "escalated": True,
            "escalationRequired": True,
            "escalationPath": "Analyst -> OT Security Lead -> NCIIPC Desk",
            "escalationDelayMin": 55
        }
    ]

    records = []
    base_id = 914000
    for i in range(120):
        scenario = scenarios[i % len(scenarios)]
        days_ago = random.randint(1, 45)
        created = iso_time(days_ago, random.randint(1, 23), random.randint(0, 59))
        ack_min = random.randint(1, 15)
        ack_time = iso_time(days_ago, 0, ack_min)
        closed_min = ack_min + scenario["durationMin"]
        closed_time = iso_time(days_ago, 0, closed_min)

        record = {
            "id": f"ALERT-CSE014-{base_id + i}",
            "entityId": "CSE-014",
            "category": scenario["category"],
            "subcategory": scenario["subcategory"],
            "asset": scenario["asset"],
            "assetCriticality": scenario["assetCriticality"],
            "severity": scenario["severity"],
            "status": "closed",
            "createdAt": created,
            "acknowledgedAt": ack_time,
            "investigationStartedAt": ack_time,
            "closedAt": closed_time,
            "escalationPath": scenario["escalationPath"],
            "escalationDelayMin": scenario["escalationDelayMin"],
            "escalationRequired": scenario["escalationRequired"],
            "escalated": scenario["escalated"],
            "closureReason": scenario["closureReason"],
            "closureNote": scenario["closureNote"],
            "mitreTechnique": scenario["mitre"],
            "acknowledgementTimeMin": ack_min,
            "investigationTimeMin": scenario["durationMin"],
            "closureTimeMin": closed_min,
            "source": "SIEM",
            "period": "Q2 FY 2026-27"
        }
        records.append(record)

    output_path = os.path.join(DATA_DIR, "01_siem_alerts_airgap_CSE014_scada.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(records, f, indent=2)
    print(f"  -> Created {output_path} ({len(records)} alerts)")
    return output_path

# ==============================================================================
# 2. CEF / SYSLOG CSV: CSE-027 (National Banking Services - Core Banking & SWIFT)
# Deliberate Execution Gaps:
# - Repetitive template reuse across investigations
# - Delayed escalation exceeding statutory 6-hour (360 min) CERT-In window
# ==============================================================================
def generate_syslog_cef_cse027():
    print("Generating Dataset 2: Syslog/CEF Alerts CSV (CSE-027)...")
    headers = [
        "id", "entityId", "category", "subcategory", "asset", "assetCriticality", 
        "severity", "status", "createdAt", "acknowledgedAt", "closedAt", 
        "escalationPath", "escalationDelayMin", "escalationRequired", "escalated", 
        "closureReason", "closureNote", "mitreTechnique"
    ]

    templates = [
        "Standard noise verified against baseline IP. No malicious payload detected.",
        "Routine automated maintenance script execution. Account authorized for off-hours batch job.",
        "Security rule threshold triggered due to high transaction volume. Verified benign.",
        "Transient network glitch causing connection reset. Telemetry re-established."
    ]

    categories = [
        ("Financial Transaction Anomaly", "SWIFT MT103 High-Value Deviation", "SWIFT-ALLIANCE-GW", "Critical", "Critical", "T1078"),
        ("Credential Access", "Kerberoasting SPN Query Flood", "DC-BANK-PRIMARY", "Critical", "High", "T1558.003"),
        ("Web Application Attack", "SQL Injection against NetBanking API", "WAF-CORE-NETBANK", "High", "High", "T1190"),
        ("Data Exfiltration", "Staging of Credit Card Transaction Table", "DB-FIN-REPLICA-02", "Critical", "Critical", "T1041"),
        ("Insider Threat", "Unauthorized Database Export by Off-Duty Admin", "CORE-ORACLE-RAC", "Critical", "Critical", "T1078.002"),
        ("Endpoint Detection", "Cobalt Strike Process Injection in explorer.exe", "ATM-SWITCH-HOST-01", "Critical", "Critical", "T1055")
    ]

    rows = []
    base_id = 827000
    for i in range(150):
        cat_info = categories[i % len(categories)]
        days_ago = random.randint(1, 30)
        created = iso_time(days_ago, random.randint(1, 20), random.randint(0, 59))
        ack = iso_time(days_ago, 0, random.randint(2, 10))
        
        # High delay on critical exfiltrations (> 360 mins, violating statutory 6h threshold)
        if cat_info[4] == "Critical":
            esc_delay = random.choice([390, 420, 510, 680, 740])
            is_esc = True
            esc_path = "Analyst -> L2 -> Compliance -> CERT-In"
        else:
            esc_delay = random.randint(30, 180)
            is_esc = random.random() < 0.4
            esc_path = "Analyst -> Team Lead" if is_esc else ""

        # Repetitive template reuse for 65% of rows
        if random.random() < 0.65:
            closure_note = templates[i % len(templates)]
        else:
            closure_note = f"Investigated by tier 2 on {created}. Incident remediated."

        closed = iso_time(days_ago, 0, esc_delay + 20)

        rows.append([
            f"ALERT-BNK-{base_id + i}",
            "CSE-027",
            cat_info[0],
            cat_info[1],
            cat_info[2],
            cat_info[3],
            cat_info[4],
            "closed",
            created,
            ack,
            closed,
            esc_path,
            esc_delay,
            "true" if is_esc else "false",
            "true" if is_esc else "false",
            "Resolved" if random.random() > 0.3 else "False positive",
            f'"{closure_note}"',
            cat_info[5]
        ])

    output_path = os.path.join(DATA_DIR, "02_syslog_cef_alerts_CSE027_corebanking.csv")
    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        writer.writerows(rows)
    print(f"  -> Created {output_path} ({len(rows)} alerts)")
    return output_path

# ==============================================================================
# 3. FORENSIC CASES AUDIT CSV: CSE-001 (National Power Grid Op.)
# Tests Investigation Depth, Evidence Count, and Analyst Workload Distribution
# ==============================================================================
def generate_cases_cse001():
    print("Generating Dataset 3: Forensic Cases Audit CSV (CSE-001)...")
    headers = [
        "id", "entityId", "alertId", "openedAt", "investigationStartedAt", 
        "investigationEndedAt", "closedAt", "durationMin", "investigationDepth", 
        "evidenceAttachments", "evidenceCount", "isTemplateReuse", "reopenedCount", 
        "closureReason", "investigator", "behaviour", "status", 
        "rootCauseIdentified", "remediationRecorded", "escalationRecorded"
    ]

    analysts = ["Analyst-Sharma", "Analyst-Verma", "Analyst-Patel", "Analyst-Rao", "Analyst-Nair"]
    behaviours = ["Normal", "Normal", "Normal", "Superficial", "Unusually Fast", "Requires Review"]
    closure_reasons = ["Resolved", "False Positive", "Escalated", "Duplicate", "Resolved"]

    rows = []
    base_id = 501000
    for i in range(100):
        days_ago = random.randint(1, 60)
        opened = iso_time(days_ago, random.randint(1, 18), 0)
        inv_start = iso_time(days_ago, 0, random.randint(5, 20))
        duration = random.randint(15, 360)
        inv_end = iso_time(days_ago, 0, duration)
        closed = inv_end
        
        depth = random.randint(1, 6)
        evidence = random.randint(0, 10)
        is_template = 1 if (random.random() < 0.12) else 0
        reopened = 1 if (random.random() < 0.08) else 0
        beh = random.choice(behaviours)
        if depth <= 1:
            beh = "Superficial"
        elif duration < 12:
            beh = "Unusually Fast"

        rows.append([
            f"CASE-NPG-{base_id + i}",
            "CSE-001",
            f"ALERT-NPG-{700000 + i}",
            opened,
            inv_start,
            inv_end,
            closed,
            duration,
            depth,
            evidence,
            evidence,
            is_template,
            reopened,
            random.choice(closure_reasons),
            random.choice(analysts),
            beh,
            "closed",
            "true" if random.random() < 0.75 else "false",
            "true" if random.random() < 0.70 else "false",
            "true" if random.random() < 0.40 else "false"
        ])

    output_path = os.path.join(DATA_DIR, "03_forensic_cases_audit_CSE001_powergrid.csv")
    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        writer.writerows(rows)
    print(f"  -> Created {output_path} ({len(rows)} cases)")
    return output_path

# ==============================================================================
# 4. SOC EFFICIENCY ML SCORING BATCH CSV
# Contains full feature vector for all 11 CSE Entities over 2 assessment periods.
# Directly usable by Python ML server (/evaluate-csv and /evaluate).
# ==============================================================================
def generate_soc_efficiency_ml_batch():
    print("Generating Dataset 4: SOC Efficiency ML Batch CSV...")
    entities = [
        {"id": "CSE-001", "sector": "Power", "criticality": "Critical", "maturity": 0.75},
        {"id": "CSE-008", "sector": "Telecom", "criticality": "High", "maturity": 0.68},
        {"id": "CSE-014", "sector": "Power", "criticality": "Critical", "maturity": 0.35}, # Troubled entity
        {"id": "CSE-021", "sector": "Transport", "criticality": "Medium", "maturity": 0.82},
        {"id": "CSE-027", "sector": "Banking", "criticality": "Critical", "maturity": 0.58}, # Execution gaps
        {"id": "CSE-034", "sector": "Energy", "criticality": "Medium", "maturity": 0.71},
        {"id": "CSE-041", "sector": "Defence", "criticality": "Critical", "maturity": 0.64},
        {"id": "CSE-050", "sector": "Government", "criticality": "High", "maturity": 0.60},
        {"id": "CSE-058", "sector": "Health", "criticality": "High", "maturity": 0.73},
        {"id": "CSE-063", "sector": "Water", "criticality": "High", "maturity": 0.55},
        {"id": "CSE-070", "sector": "Transport", "criticality": "Medium", "maturity": 0.88} # High maturity
    ]

    periods = ["Q1 FY 2026-27", "Q2 FY 2026-27"]
    rows = []

    for ent in entities:
        for period in periods:
            m = ent["maturity"] + (0.05 if period == "Q2 FY 2026-27" else 0.0)
            inv = 1.0 - m

            row = {
                "entity_id": ent["id"],
                "period": period,
                "sector": ent["sector"],
                "criticality": ent["criticality"],
                "total_alerts_per_period": int(4000 + (1 - m) * 3500 + random.randint(-200, 200)),
                "alerts_per_analyst_per_shift": round(15.0 * (1 + inv * 0.8), 2),
                "cases_per_analyst_per_shift": round(3.5 * (1 + inv * 0.3), 2),
                "alert_to_case_ratio": round(0.12 + (1 - m) * 0.15, 3),
                "mean_acknowledgment_time_min": round(4.0 * (1 + inv * 2.0), 2),
                "mean_investigation_time_min": round(35.0 * (1 + inv * 1.5), 2),
                "mean_closure_time_min": round(50.0 * (1 + inv * 0.8), 2),
                "pct_cases_closed_under_1hr": round(0.40 + m * 0.3, 3),
                "pct_cases_closed_under_4hr": round(0.70 + m * 0.2, 3),
                "pct_cases_closed_under_24hr": round(0.85 + m * 0.1, 3),
                "false_positive_rate_current": round(0.15 + inv * 0.35, 3),
                "true_positive_rate_current": round(0.60 + m * 0.35, 3),
                "escalation_rate": round(0.20 + m * 0.25, 3),
                "reopened_case_rate": round(0.02 + inv * 0.08, 3),
                "evidence_per_case_avg": round(2.5 + m * 4.0, 2),
                "cases_with_zero_evidence_pct": round(0.04 + inv * 0.25, 3),
                "cases_with_insufficient_iocs_pct": round(0.05 + inv * 0.30, 3),
                "classification_changes_per_case": round(0.05 + inv * 0.15, 3),
                "analyst_count": random.randint(6, 14),
                "workload_balance_index": round(0.20 + inv * 0.40, 3),
                "template_reuse_rate": round(0.05 + inv * 0.45, 3),
                "superficial_investigation_rate": round(0.04 + inv * 0.40, 3),
                "unusually_fast_closure_rate": round(0.03 + inv * 0.35, 3),
                "critical_escalation_rate": round(0.50 + m * 0.45, 3),
                "escalation_delay_avg_min": round(30.0 + inv * 120.0, 2),
                "playbook_execution_rate": round(0.40 + m * 0.55, 3),
                "playbook_coverage_ratio": round(0.50 + m * 0.45, 3),
                "playbook_adherence_rate": round(0.45 + m * 0.50, 3),
                "signature_age_avg_days": round(30.0 + inv * 180.0, 1),
                "signature_age_max_days": round(90.0 + inv * 300.0, 1),
                "rules_updated_last_30d": int(5 + m * 20),
                "rules_updated_last_90d": int(15 + m * 50),
                "detection_coverage_ratio": round(0.45 + m * 0.50, 3),
                "threat_intel_feeds_active": int(3 + m * 7),
                "ioc_enrichment_rate": round(0.40 + m * 0.55, 3),
                "context_enrichment_rate": round(0.35 + m * 0.60, 3),
                "telemetry_coverage_pct": round(50.0 + m * 45.0, 1),
                "log_source_count": int(8 + m * 24),
                "critical_asset_coverage_pct": round(55.0 + m * 42.0, 1),
                "senior_analyst_ratio": round(0.20 + m * 0.40, 3),
                "certifications_per_analyst": round(1.0 + m * 2.0, 2),
                "training_hours_per_analyst_qtr": round(8.0 + m * 25.0, 1),
                "prev_period_fpr": round(0.20 + inv * 0.25, 3),
                "prev_period_efficiency": round(0.50 + m * 0.40, 3),
                "trend_fpr_3m": round(-0.02 * m, 3),
                "trend_efficiency_3m": round(0.04 * m, 3)
            }
            rows.append(row)

    output_path = os.path.join(DATA_DIR, "04_soc_efficiency_ml_batch_test.csv")
    keys = list(rows[0].keys())
    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=keys)
        writer.writeheader()
        writer.writerows(rows)
    print(f"  -> Created {output_path} ({len(rows)} entity-period vectors)")
    return output_path

# ==============================================================================
# 5. NEGATIVE SPACE BLIND-SPOT MATRIX JSON
# Detailed asset group vs telemetry coverage audit for testing blind spots
# ==============================================================================
def generate_negative_space_matrix():
    print("Generating Dataset 5: Negative Space Telemetry Audit JSON...")
    matrix_records = [
        {
            "entityId": "CSE-014",
            "entityName": "Central Power Authority",
            "sector": "Power",
            "assetGroup": "OT/ICS SCADA Segment",
            "mitreTactic": "Lateral Movement & Inhibit Response",
            "expectedTelemetry": "Full Modbus/DNP3 Deep Packet Inspection & RTU Syslog",
            "observedTelemetry": "Edge Firewall NetFlow only (Packet payload stripped)",
            "coveragePct": 38,
            "blindSpotSeverity": "Critical",
            "statutoryImpact": "Violation of NCIIPC Rule 8.2 (Continuous Industrial Control Telemetry)",
            "auditRecommendation": "Deploy air-gapped passive industrial network TAP sensors across Substation Bus 1 & 2."
        },
        {
            "entityId": "CSE-014",
            "entityName": "Central Power Authority",
            "sector": "Power",
            "assetGroup": "Identity & Kerberos Domain Controllers",
            "mitreTactic": "Credential Access (T1003) & Privilege Escalation",
            "expectedTelemetry": "Microsoft Defender for Identity + Windows Event 4624/4672/4768/4769",
            "observedTelemetry": "Basic Event 4624 only (Kerberos ticket requests unlogged)",
            "coveragePct": 54,
            "blindSpotSeverity": "High",
            "statutoryImpact": "Inability to detect Golden Ticket & Overpass-the-Hash attacks",
            "auditRecommendation": "Enable Advanced Audit Policy Configuration for Kerberos Authentication Service."
        },
        {
            "entityId": "CSE-027",
            "entityName": "National Banking Services",
            "sector": "Banking",
            "assetGroup": "SWIFT Alliance Lite2 Gateway",
            "mitreTactic": "Defense Evasion & Exfiltration (T1041)",
            "expectedTelemetry": "Encrypted HSM Session Audit, File Integrity Monitoring on /swift/bin",
            "observedTelemetry": "OS Heartbeat ping only",
            "coveragePct": 42,
            "blindSpotSeverity": "Critical",
            "statutoryImpact": "RBI Cyber Security Framework Mandate Section 4 (Critical Banking Systems Integrity)",
            "auditRecommendation": "Install kernel-level eBPF integrity agent on SWIFT Linux appliances."
        },
        {
            "entityId": "CSE-063",
            "entityName": "Metropolitan Water Board",
            "sector": "Water",
            "assetGroup": "Chemical Dosing PLC Network",
            "mitreTactic": "Impact (T0831 - Manipulation of Control)",
            "expectedTelemetry": "Serial RS-485 Bus Monitoring & Water Quality Sensor Thresholds",
            "observedTelemetry": "Manual paper log entry once per 12 hours",
            "coveragePct": 28,
            "blindSpotSeverity": "Critical",
            "statutoryImpact": "Zero real-time telemetry for chemical treatment facilities",
            "auditRecommendation": "Integrate IoT Modbus-to-Syslog converter gateways across all 4 water treatment nodes."
        }
    ]

    output_path = os.path.join(DATA_DIR, "05_negative_space_blindspot_matrix.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(matrix_records, f, indent=2)
    print(f"  -> Created {output_path} ({len(matrix_records)} audit assessments)")
    return output_path

def main():
    print("=" * 70)
    print("BUILDING SAT-SA SUPERVISORY TESTING DATASETS")
    print(f"Target Directory: {DATA_DIR}")
    print("=" * 70)
    
    generate_siem_alerts_cse014()
    generate_syslog_cef_cse027()
    generate_cases_cse001()
    generate_soc_efficiency_ml_batch()
    generate_negative_space_matrix()

    # Generate README for examiners
    readme_path = os.path.join(DATA_DIR, "README.md")
    with open(readme_path, "w", encoding="utf-8") as f:
        f.write("""# 🛡️ SAT-SA Supervisory Testing Datasets Repository

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
""")
    print("=" * 70)
    print("SUCCESS: All 5 supervisory test datasets & README generated successfully!")
    print("=" * 70)

if __name__ == "__main__":
    main()
