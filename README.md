# SAT-SA: Supervisory Analytics Tool for SOC Assessment

> **NCIIPC-style supervisory analytics platform** — ML-powered SOC efficiency evaluation (not threat classification)

---

## Overview

SAT-SA is a **supervisory analytics platform** that evaluates SOC operational efficiency across Critical Sector Entities (CSEs). It analyzes periodic SOC alert and case-management submissions to produce supervisory risk indicators, execution-gap findings, negative-space detection, peer benchmarking, and evidence-backed review priorities.

> **Important**: SAT-SA is NOT a SOC, SIEM, real-time monitoring platform, or national cyber-monitoring platform. It evaluates SOC *efficiency*, not threat classification.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         React Frontend                              │
│        (TypeScript + Vite + Tailwind CSS + Lucide Icons)           │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Node.js + Express API                            │
│              (TypeScript + Mongoose + REST)                         │
└───────────┬───────────────────────────────────┬─────────────────────┘
            │                                   │
            ▼                                   ▼
┌─────────────────────────┐           ┌─────────────────────────┐
│      MongoDB            │           │    Python/FastAPI       │
│  (Operational Data +    │           │  (Analytics + ML Engine)│
│   Findings + Config)    │◄─────────►│  • Rule Engine          │
└─────────────────────────┘           │  • Random Forest        │
                                      │  • K-Means Clustering   │
                                      │  • Statistical Anomaly  │
                                      └───────────┬───────────────┘
                                                  │
                                                  ▼
                                         ┌─────────────────────┐
                                         │   MongoDB           │
                                         │ (Analytics Results) │
                                         └─────────────────────┘
```

---

## Technology Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | React 18, TypeScript, Vite 6, Tailwind CSS 3, Lucide React |
| **API Backend** | Node.js 20+, Express 5, TypeScript, Mongoose 9 |
| **Database** | MongoDB 7 (Docker) |
| **Analytics/ML** | Python 3.11+, FastAPI, pandas, NumPy, scikit-learn, joblib |
| **ML Models** | Random Forest Regressor, Gradient Boosting Regressor (ensemble) |
| **Auth** | JWT, bcrypt, Role-Based Access Control |

---

## Quick Start

### Prerequisites
- Node.js 20+
- Python 3.11+
- Docker & Docker Compose
- Git

### 1. Clone & Install
```bash
git clone https://github.com/mav3r1ck26/SAT-SA.git
cd SAT-SA

# Frontend + Node API dependencies
npm install

# Python ML dependencies
cd ml-backend
pip install -r requirements.txt
cd ..
```

### 2. Start MongoDB
```bash
docker-compose up -d
# Verifies: docker ps | findstr satsa-mongodb
```

### 3. Seed Database
```bash
# Node/Express seed (operational data)
npm run seed

# Python ML seed (training data + models)
cd ml-backend
python -m src.main --mode train --model-type ensemble --n-entities 200 --periods-per-entity 8
cd ..
```

### 4. Start Development Servers
```bash
# Terminal 1: Node API (port 3001)
npm run api:watch

# Terminal 2: Python ML API (port 8000)
cd ml-backend && python -m src.api

# Terminal 3: React Frontend (port 5173)
npm run dev
```

### 5. Access Application
- **Frontend**: http://localhost:5173
- **Node API**: http://localhost:3001/api/health
- **ML API**: http://localhost:8000/health

---

## API Reference

### Node/Express API (Port 3001)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/entities` | GET | List entities with risk metrics |
| `/api/entities/:id` | GET | Single entity + metrics |
| `/api/analytics/overview` | GET | KPIs + risk distribution |
| `/api/analytics/gaps` | GET | Execution gap findings |
| `/api/analytics/blind-spots` | GET | Negative space indicators |
| `/api/analytics/anomalies` | GET | Statistical anomaly detection |
| `/api/analytics/review-queue` | GET | Prioritized review queue |
| `/api/analytics/benchmark/:entityId` | GET | Peer benchmarking |
| `/api/analytics/data-quality` | GET | Data quality assessment |
| `/api/analytics/review-queue` | GET | Prioritized review queue |
| `/api/analytics/recompute` | POST | Recompute all risk scores |
| `/api/findings` | GET | List findings (filterable) |
| `/api/findings/detect` | POST | Run gap detection + persist |
| `/api/findings/:id/review` | POST | Review finding (confirm/reject) |
| `/api/evidence/case/:caseId` | GET | Evidence timeline for case |
| `/api/ingestion/quality` | GET | Data quality summary |
| `/api/ingestion/upload` | POST | Upload CSV/JSON |
| `/api/reports` | GET | List reports |
| `/api/reports/:id/generate` | POST | Generate report |
| `/api/audit` | GET | Audit trail |
| `/api/validation/summary` | GET | Validation metrics |
| `/api/ml/*` | * | ML proxy endpoints |

### Python/FastAPI ML API (Port 8000)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health + model status |
| `/train` | POST | Train models from CSV upload |
| `/analyze` | POST | Full analysis + File A + File B |
| `/analyze-csv` | POST | CSV upload for batch analysis |
| `/predict` | POST | Batch prediction |
| `/models` | GET | Model metadata |
| `/playbooks` | GET | Detection playbook definitions |

---

## ML Model: SOC Efficiency Evaluation

### Problem Statement
SAT-SA evaluates **SOC operational efficiency** — NOT threat classification. The model predicts 6 efficiency metrics:

| Target | Description | Direction |
|--------|-------------|-----------|
| `false_positive_rate` | FPR of alerts | Lower better |
| `incorrect_classification_ratio` | Misclassification rate | Lower better |
| `analyst_efficiency` | Cases/hr per analyst | Higher better |
| `insufficient_evidence_ratio` | Cases lacking IOCs | Lower better |
| `signature_age_days` | Avg detection rule age | Lower better |
| `playbook_gap_ratio` | Missing playbook coverage | Lower better |

### Model Architecture
- **Algorithm**: Ensemble (RandomForestRegressor + GradientBoostingRegressor)
- **Trees**: 200 each, max_depth=8, class_weight=balanced
- **Features**: 50 SOC operational metrics (alerts, cases, telemetry, signatures, playbooks, team)
- **Targets**: 6 continuous efficiency metrics
- **Confidence**: Tree variance (RF) + 0.8 default (GBR)

### Model Performance (1,200 samples / 150 entities × 8 periods)

| Target | R² | RMSE | MAE |
|--------|-----|------|-----|
| **false_positive_rate** | **0.949** | 0.021 | 0.017 |
| **incorrect_classification_ratio** | **0.851** | 0.033 | 0.026 |
| **analyst_efficiency** | **0.839** | 1.599 | 1.217 |
| **insufficient_evidence_ratio** | **0.856** | 0.033 | 0.026 |
| **signature_age_days** | **0.913** | 21.890 | 17.130 |
| **playbook_gap_ratio** | **0.914** | 0.052 | 0.041 |

**Average R²: 0.890** (excellent)

---

## Key Features

### 1. Analytics Engine (4 Layers)
```
Layer 1: Data Quality          → Completeness, Validity, Consistency, Duplicates
Layer 2: Deterministic Rules   → Configurable thresholds, explainable logic
Layer 3: Statistical Anomaly   → IQR, Z-score, Percentile deviation
Layer 4: Machine Learning      → Random Forest + K-Means + Ensemble
```

### 2. Execution Gap Detection (5 Types)
1. **Rapid Closure** — Cases closed below peer percentile
2. **Critical No Escalation** — High/critical alerts without escalation
3. **Template Reuse** — Near-identical investigation narratives
4. **Superficial Investigation** — Low depth + minimal evidence + rapid closure
5. **Recurring Unremediated** — Same asset/category repeats without root cause

### 3. Negative Space Detection (5 Signals)
- Missing expected telemetry activity
- Missing alert categories
- Missing investigation evidence
- Missing escalation evidence
- Monitoring blind spots

### 4. Peer Benchmarking
- Sector-aware peer groups
- Percentile ranking (0-100)
- Deviation classification: *Significantly Above/Below*, *Above/Below*, *In Range*
- Context-aware (doesn't penalize high volume alone)

### 5. Confidence Framework
```
Confidence = Σ(weight_i × factor_i)
Factors: Data Completeness (20%), Evidence Count (20%), Signal Consistency (20%),
         Model Confidence (15%), Peer Sample Size (10%), Historical Consistency (10%), Rule Reliability (5%)
```

### 6. Review Prioritisation Engine
```
Priority = Σ(weight_i × component_i)
Components: Severity (25%), Confidence (20%), Risk Contribution (20%),
            Evidence Strength (15%), Novelty (10%), Peer Deviation (5%), Supervisory Impact (5%)
```

---

## Output Files

### File A: Efficiency Report (Examiner View)
| Column | Description |
|--------|-------------|
| `Entity_ID` | CSE identifier |
| `Period` | Assessment period |
| `*_Score` | 0-1 normalized score per metric |
| `*_Rating` | Excellent/Good/Needs Improvement/Critical |
| `*_Confidence` | ML confidence with qualitative label |
| `*_Interpretation` | Human-readable explanation |
| `Rule_Findings_*` | Count of rule-based findings by severity |
| `Top_Finding` | Highest-severity rule finding |
| `Examiner_Action` | IMMEDIATE REVIEW / Priority Review / Standard Review / No Action |

### File B: Recommendations (SOC Management)
| Column | Description |
|--------|-------------|
| `Entity_ID` | CSE identifier |
| `Recommendation_Priority` | 1=Immediate, 2=High, 3=Medium |
| `Category` | Finding category |
| `Issue_Description` | Human-readable issue |
| `Evidence_Value` | Quantitative evidence |
| `Recommended_Action` | Specific actionable step |
| `Source` | RULE_BASED / ML_PREDICTED |
| `Implementation_Priority` | Immediate / High / Medium |
| `Estimated_Effort` | Low/Medium/High |
| `Responsible_Role` | Assigned role |

---

## Configuration

All thresholds and weights externalized in MongoDB `Configuration` collection:

```json
{
  "thresholds": {
    "rapidClosurePercentile": 10,
    "criticalNoEscalationThreshold": 0.15,
    "templateReuseThreshold": 0.10,
    "zeroDepthThreshold": 0.30,
    "telemetryCoverageWarning": 0.60,
    "anomalyZScoreThreshold": 3.0,
    "peerDeviationSignificant": 0.20
  },
  "weights": {
    "riskWeights": {
      "executionGaps": 0.25,
      "negativeSpace": 0.20,
      "peerDeviation": 0.15,
      "mlRiskProbability": 0.15,
      "anomalyIndicators": 0.15,
      "dataQuality": -0.10
    }
  }
}
```

---

## Security & Deployment

### Offline/Air-Gapped Requirements
- No external AI APIs (OpenAI, Gemini, Claude, etc.)
- No cloud ML APIs or SaaS analytics
- No Internet dependency
- All models served locally from `/ml_models/`
- No telemetry transmission outside environment

### RBAC Roles
| Role | Permissions |
|------|-------------|
| **Administrator** | Full access: users, config, models, all data |
| **Supervisor** | Analytics, reports, findings review, entity management |
| **Examiner** | Findings review, evidence exploration, audit trail |
| **Auditor** | Read-only: audit log, reports, validation metrics |
| **Viewer** | Read-only: dashboards, entity overview |

### Docker Deployment
```yaml
services:
  mongodb:
    image: mongo:7
    volumes: [mongo_data:/data/db]
    ports: ["27017:27017"]

  api:
    build: .
    ports: ["3001:3001"]
    environment:
      - MONGODB_URI=mongodb://mongodb:27017/satsa
      - ML_API_URL=http://ml:8000
    depends_on: [mongodb, ml]

  ml:
    build: ./ml-backend
    ports: ["8000:8000"]
    volumes: [./ml-backend/models:/ml_models]

  frontend:
    build: ./frontend
    ports: ["80:80"]
    depends_on: [api]
```

---

## Project Structure

```
SAT-SA/
├── README.md                          # This file
├── WORK_LOG.md                        # Detailed work log
├── package.json                       # Node.js dependencies & scripts
├── tsconfig.json                      # TypeScript config
├── vite.config.ts                     # Vite config with API proxy
├── tailwind.config.js                 # Tailwind design system
├── docker-compose.yml                 # MongoDB Docker
├── .gitignore
│
├── src/                               # React Frontend
│   ├── main.tsx                       # App entry point
│   ├── App.tsx                        # Root component with routing
│   ├── index.css                      # Global styles + Tailwind
│   ├── api/client.ts                  # API client (fetches from /api)
│   ├── context/AppContext.tsx         # Global state (entity, period, nav)
│   ├── components/                    # Reusable UI components
│   ├── pages/                         # 17 page components
│   └── data/mockData.ts               # Fallback mock data
│
├── server/                            # Node.js/Express Backend
│   ├── index.ts                       # Express app entry point
│   ├── tsconfig.json                  # Server TypeScript config
│   ├── config/db.ts                   # MongoDB connection
│   ├── models/                        # 14 Mongoose schemas
│   ├── routes/                        # 12 route files
│   ├── services/
│   │   ├── analytics.ts               # Core analytics engine (860 lines)
│   │   ├── configuration.ts           # Dynamic configuration system
│   │   └── reports.ts                 # Report generation + CSV export
│   └── seed.ts                        # Comprehensive seed data generator
│
└── ml-backend/                        # Python/FastAPI ML Service
    ├── requirements.txt
    ├── src/
    │   ├── api.py                     # FastAPI endpoints
    │   ├── features.py                # Feature engineering (50 features)
    │   ├── models.py                  # RandomForest + K-Means + Ensemble
    │   ├── outputs.py                 # File A + File B generators
    │   ├── generate_data.py           # Synthetic data generator
    │   ├── main.py                    # CLI entry point
    │   └── __init__.py
    ├── models/                        # Local model artifacts
    │   ├── risk_model.pkl
    │   ├── anomaly_model.pkl
    │   ├── cluster_model.pkl
    │   ├── scaler.pkl
    │   └── feature_schema.json
    └── output/                        # Generated CSV outputs
```

---

## Scripts

```bash
# Frontend
npm run dev          # Start Vite dev server
npm run build        # Type-check + production build
npm run preview      # Preview production build

# Node API
npm run api          # Start Express server
npm run api:watch    # Start with tsx watch (auto-reload)
npm run seed         # Seed MongoDB with synthetic data

# Python ML
cd ml-backend
python -m src.main --mode train --model-type ensemble --n-entities 200 --periods-per-entity 8
python -m src.main --mode infer --model-dir models --output-dir output
python -m src.api                                 # Start FastAPI server
```

---

## Documentation

| File | Description |
|------|-------------|
| `WORK_LOG.md` | Detailed chronological work log |
| `SOC_SCORING_PARAMETERS.md` | Complete scoring framework (Speed/Accuracy/Productivity) |
| `ml-backend/README.md` | ML backend architecture & API |

---

## License

For NCIIPC Supervisory Use Only — Controlled Environment

---

## Support

- **Issues**: GitHub Issues
- **Architecture Questions**: See `WORK_LOG.md` and inline code documentation
- **ML Model Details**: See `ml-backend/README.md`

---

**Built for NCIIPC Supervisory Assessment** | **Offline-First** | **Explainable by Design**