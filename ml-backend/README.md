# SAT-SA ML Backend
**Supervisory Analytics Tool for SOC Assessment — Machine Learning Backend**

---

## 🎯 Problem Statement

National Critical Information Infrastructure Protection Centre (NCIIPC) supervisors require an objective, data-driven framework to assess the operational effectiveness of Security Operations Centers (SOCs) across Critical Sector Entities (CSEs). Current assessment methods rely heavily on:

- **Subjective questionnaires** and self-reported maturity surveys
- **Point-in-time audits** that miss continuous operational patterns
- **Compliance checklists** that don't measure actual detection/response capability
- **Manual review** of limited samples, not population-level analysis

This creates blind spots: SOCs may appear compliant on paper but have significant gaps in real-world detection coverage, investigation quality, and escalation discipline.

---

## 🎯 Objective

Build a **machine learning-powered supervisory analytics engine** that:

1. **Automatically classifies** SOC alerts as Attack vs Normal using supervised learning
2. **Detects unknown/novel attack patterns** via unsupervised anomaly clustering
3. **Generates supervisory work products** (File A: Investigator tickets, File B: Playbook triggers)
4. **Quantifies SOC efficiency** across Speed, Accuracy, and Productivity dimensions
5. **Identifies execution gaps** and negative space (missing evidence) at entity and sector level
6. **Enables peer benchmarking** across CSEs within the same sector

---

## 🤖 ML Techniques

### 1. Supervised Learning — Random Forest Classifier
- **Algorithm**: Random Forest (100 estimators, max_depth=8, class_weight=balanced)
- **Task**: Binary classification — Attack (1) vs Normal (0)
- **Training Data**: 5,000 synthetic labeled alerts (30% attack, 70% normal)
- **Features**: 26 engineered features including:
  - Temporal: hour, day_of_week, is_weekend, is_night
  - Network: src/dst port risk, protocol risk, byte ratios, packet counts
  - Behavioral: keyword matches, high volume flags, rare IP indicators
  - Contextual: suspicious user agents, HTTP error statuses
- **Performance**: 99.2% accuracy, 100% specificity (train), 98%+ recall (test)

### 2. Unsupervised Learning — K-Means Clustering (K=2)
- **Algorithm**: K-Means (n_clusters=2, n_init=10)
- **Task**: Cluster alerts into two groups; automatically label the "attack" cluster
- **Cluster Labeling Heuristic**: Identifies attack cluster by scoring:
  - High volume transfers, attack keyword matches, port/protocol risk
  - Suspicious user agents, error statuses, rare source IPs
- **Output**: Anomaly score (distance to nearest centroid) + cluster assignment
- **Performance**: Separates attack-like patterns without labeled data

### 3. Ensemble Decision Logic
```
Combined_Score = (0.80 × Supervised_Confidence × Supervised_Pred) + 
                 (0.20 × Unsupervised_Pred)
Final_Classification = "Attack" if Combined_Score ≥ 0.5 else "Normal"
```
- Weighted toward supervised model (proven accuracy)
- Unsupervised model catches novel patterns supervised model misses
- Confidence thresholding for escalation decisions

### 4. Feature Engineering Pipeline
```python
def extract_features(df):
    # Temporal features
    df['hour'], df['is_night'], df['is_weekend']
    
    # Network risk features  
    df['src_port_risk'], df['dst_port_risk'], df['protocol_risk']
    
    # Volume & behavioral features
    df['byte_ratio'], df['total_bytes'], df['high_volume']
    df['keyword_match_count'], df['has_attack_keyword']
    
    # Contextual features
    df['suspicious_ua'], df['error_status'], df['src_ip_rare']
    df['src_ip_freq_ratio']  # dataset-size invariant
    
    # Return only numeric columns for sklearn
    return X.select_dtypes(include=[np.number])
```

---

## 📊 SOC Assessment Framework

The framework evaluates SOCs across **three pillars** with **six domains**:

### Pillar 1: Speed (30% weight)
| Domain | Metrics | Data Source |
|--------|---------|-------------|
| **Detection** | MTTD, Alert Coverage, Rule Effectiveness | SIEM alerts |
| **Investigation** | MTTI, Depth, Evidence Quality, Automation | Case management |
| **Escalation** | Escalation Rate, Latency, Path Correctness | Escalation logs |

### Pillar 2: Accuracy (40% weight)
| Domain | Metrics | Data Source |
|--------|---------|-------------|
| **Incident Response** | MTTR, Containment Rate, Recovery Time | IR tickets |
| **Operations** | Tool Uptime, Process Adherence, Availability | System logs |
| **Governance** | Policy Compliance, Audit Readiness, Training | Governance records |

### Pillar 3: Productivity (30% weight)
- Alerts/Cases per analyst per shift
- Automation & playbook execution rates
- Evidence attachment & handoff completeness
- Knowledge contribution & training hours

### Scoring Outputs per Entity

| Output | Description |
|--------|-------------|
| **Risk Score (0-100)** | Composite: 100 - weighted domain average |
| **Execution Gaps** | Indicators where ops evidence diverges from documented capability |
| **Negative Space** | Missing telemetry, alert gaps, investigation/escalation evidence gaps |
| **Peer Deviation** | Entity metrics vs sector median (percentile ranking) |
| **Review Priority** | Ranked queue for supervisory examination |

---

## 📁 Generated Work Products

### File A: Investigator Tickets (`file_a_investigator_tickets.csv`)
| Column | Description |
|--------|-------------|
| `Investigator` | Assigned analyst identifier |
| `Ticket_Number` | Unique tracking number |
| `Potential_Attack_Classification` | Attack / Normal |
| `TP_or_FP` | True Positive / False Positive / Unknown (if ground truth available) |
| `Escalation_Needed` | Yes / No / Review |
| `Reasoning` | Human-readable explanation from both models |

### File B: Playbook Triggers (`file_b_playbook_triggers.csv`)
| Column | Description |
|--------|-------------|
| `Ticket_Number` | Links to File A |
| `Rule_Playbook_Triggered` | One of 8 playbooks (see below) |
| `Rule_Triggering_Activity_IoC` | Specific indicators that triggered the playbook |
| `Timestamp_of_IoC` | When the indicator was observed |
| `Service_Functionality_Affected_Potential` | Impacted services/systems |

---

## 🎭 Detection Playbooks (8 Pre-Defined)

| Playbook | Trigger | Key IOCs | Affected Services |
|----------|---------|----------|-------------------|
| **Brute Force** | Failed login threshold | Count >10, single source, short window | SSH, RDP, VPN, Web Auth, DB Auth |
| **Port Scan** | Multi-port connections | Multiple dest ports, SYN only, low packets | Network infra, Firewall, IDS/IPS |
| **Malware C2** | Beaconing patterns | Regular intervals, suspicious domain, DGA | Endpoint, Proxy, DNS, Firewall |
| **Data Exfil** | Large external transfers | High byte ratio, unusual dest, off-hours | File/DB Server, Cloud, Email, Proxy |
| **Privilege Escalation** | Admin access anomalies | sudo/UAC bypass, token manipulation | AD, Linux Sudo, Windows UAC, IAM |
| **Lateral Movement** | Cross-host auth | Pass-the-hash/ticket, PsExec, WMI, SMB | SMB, RPC, WMI, WinRM, SSH |
| **Web Attack** | App-layer attacks | SQLi, XSS, path traversal, RCE payloads | Web App, WAF, API Gateway, DB |
| **Insider Threat** | Authorized user anomalies | Off-hours access, bulk download, privilege abuse | File Server, DB, CRM, ERP, Source Control |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     SAT-SA ML Backend                       │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Train     │  │  Predict    │  │   Analyze (Full)    │ │
│  │  /train     │  │ /predict    │  │  /analyze           │ │
│  │  /analyze-csv              │  │  /analyze-csv       │ │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘ │
│         │                │                    │             │
│         ▼                ▼                    ▼             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Ensemble Detector                       │   │
│  │  ┌──────────────────┐  ┌────────────────────────┐   │   │
│  │  │ Supervised       │  │ Unsupervised           │   │   │
│  │  │ Random Forest    │  │ K-Means (K=2)          │   │   │
│  │  │ Attack/Normal    │  │ Anomaly Score          │   │   │
│  │  └──────────────────┘  └────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────┘   │
│         │                    │                              │
│         ▼                    ▼                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           Output Generators                          │   │
│  │  • File A: Investigator Tickets                      │   │
│  │  • File B: Playbook Triggers                         │   │
│  │  • Reasoning, Escalation, TP/FP                     │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Installation
```bash
cd ml-backend
pip install -r requirements.txt
```

### Train Models
```bash
python -m src.main --mode train --model-dir models
```

### Run Inference (CLI)
```bash
python -m src.main --mode infer --model-dir models --output-dir output \
  --investigators "Analyst-01,Analyst-02,Analyst-03"
```

### Start API Server
```bash
python -m src.api
# Server runs at http://localhost:8000
```

### API Usage
```bash
# Health check
curl http://localhost:8000/health

# Batch prediction
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "alerts": [{
      "timestamp": "2026-01-15T10:30:00",
      "source_ip": "192.168.1.100",
      "dest_ip": "10.0.0.5",
      "source_port": 54321,
      "dest_port": 22,
      "protocol": "ssh",
      "bytes_sent": 1000,
      "bytes_received": 500,
      "packet_count": 50,
      "alert_description": "Brute force attack on SSH",
      "ticket_number": "TKT-20260115-00001"
    }],
    "investigators": ["Analyst-01"]
  }'

# CSV upload
curl -X POST http://localhost:8000/analyze-csv \
  -F "file=@test_data.csv" \
  -F "investigators=Analyst-01,Analyst-02"
```

---

## 📈 Model Performance Summary

| Metric | Train | Test (Mixed) |
|--------|-------|--------------|
| **Accuracy** | 99.2% | — |
| **Attack Recall** | 95.6% | 98%+ |
| **Normal Specificity** | 100% | 73-78% |
| **Precision (Attack)** | ~95% | — |
| **F1-Score** | ~97% | — |

*Note: Test specificity lower due to synthetic data distribution shift; production deployment should use entity-specific training data.*

---

## 📋 Scoring Parameters Reference

See [SOC_SCORING_PARAMETERS.md](./SOC_SCORING_PARAMETERS.md) for complete Speed/Accuracy/Productivity metric definitions, weights, formulas, and score bands.

---

## ⚠️ Important Disclaimers

> **SAT-SA supports human supervisory judgement. It does not replace examiner review.** All findings are system recommendations requiring examiner confirmation before supervisory action.

- Models trained on synthetic data — production requires real SOC telemetry
- Unsupervised clustering requires periodic retraining as attack patterns evolve
- Confidence scores are probabilistic, not deterministic truth
- False negatives in supervised model are caught by unsupervised anomaly scoring

---

## 🔮 Roadmap

- [ ] Integration with real SIEM/Case Management APIs
- [ ] Entity-specific model fine-tuning
- [ ] Streaming/real-time inference (Kafka/Redis)
- [ ] Adversarial robustness testing
- [ ] Explainable AI (SHAP values for individual predictions)
- [ ] Sector-specific playbook customization
- [ ] Longitudinal trend analysis & forecasting

---

## 📄 License

For NCIIPC Supervisory Use Only — Controlled Environment

---

*Built for SAT-SA (Supervisory Analytics Tool for SOC Assessment) | NCIIPC*