# SOC Efficiency Evaluation & Scoring Parameters

This document defines the standard scoring framework for evaluating SOC (Security Operations Center) operational efficiency, detection capability, and analyst productivity. These parameters form the basis for the SAT-SA (Supervisory Analytics Tool for SOC Assessment) scoring engine.

---

## 1. Speed Metrics (Time-Based KPIs)

| Metric | Description | Target / Benchmark | Weight |
|--------|-------------|-------------------|--------|
| **Mean Time to Acknowledge (MTTA)** | Time from alert generation to analyst acknowledgment | < 5 minutes | 15% |
| **Mean Time to Investigate (MTTI)** | Time from acknowledgment to investigation start | < 15 minutes | 15% |
| **Mean Time to Detect (MTTD)** | Time from attack start to first alert | < 30 minutes | 10% |
| **Mean Time to Respond (MTTR)** | Time from detection to containment/remediation | < 60 minutes | 15% |
| **Mean Time to Close (MTTC)** | Time from investigation start to case closure | < 120 minutes | 10% |
| **Alert-to-Case Conversion Time** | Time for alert to be promoted to formal case | < 30 minutes | 5% |
| **Escalation Latency** | Time from critical alert to escalation trigger | < 10 minutes | 10% |

### Speed Scoring Formula
```
Speed_Score = Σ(metric_weight × min(1, target / actual_value)) × 100
```
*Lower actual values = higher scores. Capped at 100% per metric.*

---

## 2. Accuracy Metrics (Quality-Based KPIs)

| Metric | Description | Target / Benchmark | Weight |
|--------|-------------|-------------------|--------|
| **False Positive Rate (FPR)** | % of alerts classified as benign after investigation | < 10% | 20% |
| **False Negative Rate (FNR)** | % of actual attacks missed by detection | < 5% | 25% |
| **True Positive Rate (Recall)** | % of actual attacks correctly detected | > 95% | 20% |
| **Precision** | % of flagged alerts that are actual attacks | > 90% | 15% |
| **Alert Classification Accuracy** | Correct severity/categorization assignment | > 90% | 10% |
| **Investigation Depth Score** | Quality of evidence collection & documentation | > 80% | 10% |

### Accuracy Scoring Formula
```
Accuracy_Score = (1 - FPR) × 0.20 + (1 - FNR) × 0.25 + TPR × 0.20 + Precision × 0.15 + Classification_Acc × 0.10 + Depth_Score × 0.10
```

---

## 3. Productivity Metrics (Volume & Throughput KPIs)

| Metric | Description | Target / Benchmark | Weight |
|--------|-------------|-------------------|--------|
| **Alerts per Analyst per Shift** | Volume handled by each analyst | 50-80 | 15% |
| **Cases Closed per Analyst per Shift** | Completed investigations | 10-20 | 15% |
| **Investigation Automation Rate** | % of investigations with automated enrichment | > 60% | 15% |
| **Playbook Execution Rate** | % of applicable cases using playbooks | > 70% | 10% |
| **Evidence Attachment Rate** | Avg evidence items per case | > 3 | 10% |
| **Tool Utilization Rate** | % of available tooling actively used | > 80% | 10% |
| **Shift Handoff Completeness** | % of cases with proper handoff documentation | > 90% | 10% |
| **Knowledge Base Contribution** | New detection rules/playbooks created per month | > 2 | 5% |
| **Training Hours per Quarter** | Analyst skill development time | > 8 hrs | 5% |
| **Peer Review Participation** | % of cases reviewed by peers | > 30% | 5% |

### Productivity Scoring Formula
```
Productivity_Score = Σ(metric_weight × normalized_value) × 100
```
*Normalized against peer benchmarks and historical baselines.*

---

## 4. Composite SOC Efficiency Score

### Overall Scoring Weights
| Category | Weight | Description |
|----------|--------|-------------|
| **Speed** | 30% | Time-to-action metrics |
| **Accuracy** | 40% | Detection quality metrics |
| **Productivity** | 30% | Throughput & utilization metrics |

### Final Score Calculation
```
SOC_Efficiency_Score = (Speed_Score × 0.30) + (Accuracy_Score × 0.40) + (Productivity_Score × 0.30)
```

### Score Bands
| Score Range | Rating | Supervisory Action |
|-------------|--------|-------------------|
| 90-100 | **Exemplary** | Best practice recognition |
| 75-89 | **Proficient** | Standard monitoring |
| 60-74 | **Needs Improvement** | Targeted remediation plan |
| 40-59 | **Deficient** | Mandatory intervention |
| < 40 | **Critical** | Immediate supervisory action |

---

## 5. Entity-Level Scoring Breakdown

Each Critical Sector Entity (CSE) receives scores across 6 domains:

| Domain | Key Metrics | Weight |
|--------|-------------|--------|
| **Detection** | MTTD, Alert Coverage, Rule Effectiveness | 15% |
| **Investigation** | MTTI, Depth, Evidence Quality, Automation | 20% |
| **Escalation** | Escalation Rate, Latency, Path Correctness | 15% |
| **Incident Response** | MTTR, Containment Rate, Recovery Time | 20% |
| **Operations** | Uptime, Tool Availability, Process Adherence | 15% |
| **Governance** | Policy Compliance, Audit Readiness, Training | 15% |

### Risk Score = 100 - Domain_Weighted_Average
*Higher risk score = worse performance*

---

## 6. Negative Space / Blind Spot Indicators

| Indicator | Description | Threshold |
|-----------|-------------|-----------|
| **Telemetry Coverage Gap** | % of critical assets without logging | > 20% |
| **Alert Generation Gap** | Expected vs actual alert volume | > 30% deviation |
| **Investigation Evidence Gap** | Cases with < 2 evidence items | > 15% |
| **Escalation Evidence Gap** | Critical alerts without escalation record | > 5% |
| **Peer Deviation** | Entity metrics vs sector median | > 2σ |

---

## 7. Scoring Implementation Notes

### Data Sources
- SIEM alert logs (timestamp, severity, disposition)
- Case management system (investigation timeline, evidence)
- Analyst activity logs (acknowledgment, actions taken)
- Threat intelligence feeds (IOC matches)
- CMDB/asset inventory (criticality mapping)

### Calculation Frequency
- **Real-time**: MTTA, MTTI, active alert counts
- **Daily**: MTTC, closure rates, productivity
- **Weekly**: Accuracy metrics, trend analysis
- **Monthly**: Composite scores, peer benchmarking

### Adjustments
- **Criticality Weighting**: Critical/High criticality entities weighted 1.5x
- **Seasonal Normalization**: Adjust for known quiet/busy periods
- **New Analyst Ramp**: 90-day grace period with reduced productivity targets
- **Tool Changes**: 30-day adjustment period for new tooling

---

## 8. Mapping to SAT-SA ML Outputs

| SAT-SA Output | Scoring Parameter |
|---------------|-------------------|
| Supervised Prediction (Attack/Normal) | False Positive/Negative Rates |
| Unsupervised Anomaly Score | Blind Spot Detection |
| Escalation Needed (Yes/No/Review) | Escalation Latency & Rate |
| Playbook Triggered | Playbook Execution Rate |
| Reasoning Text | Investigation Depth Evidence |
| TP/FP Classification | Precision/Recall Calculation |
| Confidence Score | Alert Classification Accuracy |

---

*Document Version: 1.0 | Last Updated: 2026-09-05 | For NCIIPC Supervisory Use*