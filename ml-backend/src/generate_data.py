import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import random
import os
import sys
from typing import List, Dict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from features import SOC_FEATURES, EFFICIENCY_TARGETS

def generate_soc_efficiency_data(n_entities: int = 50, periods_per_entity: int = 4) -> List[Dict]:
    """Generate synthetic SOC efficiency training data."""
    records = []
    
    for e in range(n_entities):
        entity_id = f'CSE-{str(1000 + e).zfill(3)}'
        sector = random.choice(['Power', 'Telecom', 'Banking', 'Transport', 'Energy', 'Government', 'Health', 'Water', 'Defence', 'Transport'])
        criticality = random.choice(['Critical', 'High', 'Medium', 'Low'])
        
        for p in range(periods_per_entity):
            period = f'Q{p+1} FY 202{p//4 + 23}-{str((p//4 + 24) % 100).zfill(2)}'
            
            maturity = 0.3 + (p / max(1, periods_per_entity)) * 0.4 + np.random.uniform(-0.1, 0.1)
            maturity = np.clip(maturity, 0, 1)
            
            is_critical = criticality in ['Critical', 'High']
            features = _generate_features_for_maturity(maturity, is_critical)
            targets = _generate_efficiency_targets(features)
            
            record = {
                'entity_id': f'CSE-{str(1000 + e).zfill(3)}',
                'period': period,
                'sector': sector,
                'criticality': criticality,
                'maturity': maturity
            }
            record.update(features)
            record.update(targets)
            
            records.append(record)
    
    return records


def _generate_features_for_maturity(maturity: float, is_critical: bool) -> Dict[str, float]:
    inv = 1 - maturity
    features = {}
    
    features['total_alerts_per_period'] = max(100, np.random.normal(5000, 1500))
    features['alerts_per_analyst_per_shift'] = np.random.normal(20, 5) * (1 + inv * 0.5)
    features['cases_per_analyst_per_shift'] = np.random.normal(3, 1) * (1 + inv * 0.3)
    features['alert_to_case_ratio'] = np.random.beta(2, 8)
    
    features['mean_acknowledgment_time_min'] = max(1, np.random.normal(5 * (1 + inv * 2), 2))
    features['mean_investigation_time_min'] = max(10, np.random.normal(45 * (1 + inv), 15))
    features['mean_closure_time_min'] = max(30, np.random.normal(60 * (1 + inv * 0.5), 20))
    features['pct_cases_closed_under_1hr'] = np.random.beta(2 + maturity * 3, 5)
    features['pct_cases_closed_under_4hr'] = np.random.beta(3 + maturity * 2, 4)
    features['pct_cases_closed_under_24hr'] = np.random.beta(5 + maturity * 2, 2)
    
    features['false_positive_rate_current'] = np.random.beta(2, 8 + maturity * 10)
    features['true_positive_rate_current'] = 1 - np.random.beta(2, 5 + maturity * 5)
    features['escalation_rate'] = np.random.beta(3 + maturity * 2, 5)
    features['reopened_case_rate'] = np.random.beta(1, 10 + maturity * 5)
    
    features['evidence_per_case_avg'] = np.random.gamma(2 + maturity * 2, 1.5)
    features['cases_with_zero_evidence_pct'] = np.random.beta(2, 8 + maturity * 5)
    features['cases_with_insufficient_iocs_pct'] = np.random.beta(2, 10 + maturity * 8)
    features['classification_changes_per_case'] = np.random.beta(1, 10 + maturity * 5)
    
    features['analyst_count'] = np.random.randint(3, 15)
    features['workload_balance_index'] = np.random.beta(2, 5)
    features['template_reuse_rate'] = np.random.beta(2, 8 + maturity * 5)
    features['superficial_investigation_rate'] = np.random.beta(1.5, 8 + maturity * 5)
    features['unusually_fast_closure_rate'] = np.random.beta(1.5, 10 + maturity * 5)
    
    features['critical_escalation_rate'] = np.random.beta(3 + maturity * 3, 4)
    features['escalation_delay_avg_min'] = max(5, np.random.normal(45 * (1 + (1-maturity) * 0.5), 20))
    features['playbook_execution_rate'] = np.random.beta(2 + maturity * 4, 3)
    features['playbook_coverage_ratio'] = np.random.beta(3 + maturity * 3, 3)
    features['playbook_adherence_rate'] = np.random.beta(3 + maturity * 2, 3)
    
    features['signature_age_avg_days'] = max(1, np.random.normal(180 * (1 + (1-maturity) * 2), 60))
    features['signature_age_max_days'] = np.random.normal(365 * (1 + (1-maturity)), 100)
    features['rules_updated_last_30d'] = np.random.randint(0, 10 + int(maturity * 10))
    features['rules_updated_last_90d'] = np.random.randint(0, 30 + int(maturity * 30))
    features['detection_coverage_ratio'] = np.random.beta(2 + maturity * 4, 3)
    
    features['threat_intel_feeds_active'] = np.random.randint(2, 10)
    features['ioc_enrichment_rate'] = np.random.beta(3 + maturity * 2, 4)
    features['context_enrichment_rate'] = np.random.beta(2 + maturity * 2, 4)
    
    features['telemetry_coverage_pct'] = np.random.beta(4 + maturity * 3, 3) * 100
    features['log_source_count'] = np.random.randint(5, 30)
    features['critical_asset_coverage_pct'] = np.random.beta(3 + maturity * 3, 3) * 100
    
    features['senior_analyst_ratio'] = np.random.beta(2 + maturity * 2, 3)
    features['certifications_per_analyst'] = np.random.gamma(1.5 + maturity, 1)
    features['training_hours_per_analyst_qtr'] = np.random.gamma(2 + maturity, 4)
    
    features['prev_period_fpr'] = np.random.beta(3, 10)
    features['prev_period_efficiency'] = np.random.beta(4, 3)
    features['trend_fpr_3m'] = np.random.normal(0, 0.05)
    features['trend_efficiency_3m'] = np.random.normal(0, 0.05)
    
    return features


def _generate_efficiency_targets(features: Dict[str, float]) -> Dict[str, float]:
    fpr = features['false_positive_rate_current'] + np.random.normal(0, 0.02)
    
    misclass = (features.get('template_reuse_rate', 0) + features.get('superficial_investigation_rate', 0)) / 2
    misclass = np.clip(misclass + np.random.normal(0, 0.03), 0, 1)
    
    base_eff = features.get('cases_per_analyst_per_shift', 2) * 3
    eff = max(0.5, base_eff * (1 + np.random.normal(0, 0.15)))
    
    insuff = features.get('cases_with_insufficient_iocs_pct', 0.15)
    insuff = np.clip(insuff + np.random.normal(0, 0.03), 0, 1)
    
    sig_age = features.get('signature_age_avg_days', 180)
    sig_age = max(1, sig_age + np.random.normal(0, 20))
    
    pgap = 1 - features.get('playbook_coverage_ratio', 0.5)
    pgap = np.clip(pgap + np.random.normal(0, 0.05), 0, 1)
    
    return {
        'false_positive_rate': np.clip(fpr, 0, 1),
        'incorrect_classification_ratio': np.clip(misclass, 0, 1),
        'analyst_efficiency': max(0.1, eff),
        'insufficient_evidence_ratio': np.clip(insuff, 0, 1),
        'signature_age_days': max(1, sig_age),
        'playbook_gap_ratio': np.clip(pgap, 0, 1)
    }


def prepare_training_data(soc_data: List[Dict]) -> pd.DataFrame:
    from .features import SOC_FEATURES, EFFICIENCY_TARGETS
    
    rows = []
    for record in soc_data:
        row = {}
        for f in SOC_FEATURES:
            row[f] = record.get(f, 0)
        for t in EFFICIENCY_TARGETS:
            row[t] = record.get(t, np.nan)
        rows.append(row)
    
    return pd.DataFrame(rows)


def generate_training_csv(n_entities: int = 100, periods_per_entity: int = 6, output_path: str = 'data/soc_efficiency_training.csv'):
    """Generate and save training data to CSV."""
    data = []
    for e in range(n_entities):
        sector = random.choice(['Power', 'Telecom', 'Banking', 'Transport', 'Energy', 'Government', 'Health', 'Water', 'Defence', 'Transport'])
        criticality = random.choice(['Critical', 'High', 'Medium', 'Low'])
        
        for p in range(periods_per_entity):
            period = f'Q{p+1} FY 202{p//4 + 23}-{str((p//4 + 24) % 100).zfill(2)}'
            maturity = 0.3 + (p / max(1, periods_per_entity)) * 0.4 + np.random.uniform(-0.1, 0.1)
            maturity = np.clip(maturity, 0, 1)
            is_critical = criticality in ['Critical', 'High']
            features = _generate_features_for_maturity(maturity, is_critical)
            targets = _generate_efficiency_targets(features)
            
            record = {
                'entity_id': f'CSE-{str(1000 + e).zfill(3)}',
                'period': period,
                'sector': sector,
                'criticality': criticality,
                'maturity': maturity
            }
            record.update(features)
            record.update(targets)
            data.append(record)
    
    df = pd.DataFrame(data)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    df.to_csv(output_path, index=False)
    print(f"Generated {len(df)} samples")
    print(f"Targets: {list(EFFICIENCY_TARGETS)}")
    for t in EFFICIENCY_TARGETS:
        if t in df.columns:
            print(f"  {t}: mean={df[t].mean():.3f}, std={df[t].std():.3f}, range=[{df[t].min():.3f}, {df[t].max():.3f}]")
    return df


if __name__ == '__main__':
    print("Generating SOC efficiency training data...")
    df = generate_training_csv(100, 6, 'data/soc_efficiency_training.csv')
    print("Done!")