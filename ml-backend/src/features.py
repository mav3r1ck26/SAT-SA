import pandas as pd
import numpy as np
from typing import List, Dict, Any
from datetime import datetime, timedelta

# ────────────────────────────────────────────────────────────────
# SOC EFFICIENCY TARGET DEFINITIONS
# These are the 6 efficiency metrics we want to PREDICT/EVALUATE
# ────────────────────────────────────────────────────────────────
EFFICIENCY_TARGETS = [
    'false_positive_rate',              # 1. False Positive Rate (0-1)
    'incorrect_classification_ratio',   # 2. Incorrect Attack Classification Ratio (0-1)
    'analyst_efficiency',               # 3. Analyst Efficiency (incidents handled per hour per analyst)
    'insufficient_evidence_ratio',      # 4. Insufficient Evidence/IOC Ratio (0-1)
    'signature_age_days',               # 5. Age of Most Recent Signatures (days)
    'playbook_gap_ratio'                # 6. Playbook Gap Ratio (0-1)
]

# ────────────────────────────────────────────────────────────────
# SOC OPERATIONAL FEATURES
# These are the INPUT features used to PREDICT the 6 efficiency targets
# ────────────────────────────────────────────────────────────────
SOC_FEATURES = [
    # Volume & Throughput
    'total_alerts_per_period',
    'alerts_per_analyst_per_shift',
    'cases_per_analyst_per_shift',
    'alert_to_case_ratio',
    
    # Timing Metrics
    'mean_acknowledgment_time_min',
    'mean_investigation_time_min',
    'mean_closure_time_min',
    'pct_cases_closed_under_1hr',
    'pct_cases_closed_under_4hr',
    'pct_cases_closed_under_24hr',
    
    # Disposition Quality
    'false_positive_rate_current',
    'true_positive_rate_current',
    'escalation_rate',
    'reopened_case_rate',
    
    # Evidence & Classification Quality
    'evidence_per_case_avg',
    'cases_with_zero_evidence_pct',
    'cases_with_insufficient_iocs_pct',
    'classification_changes_per_case',
    
    # Analyst Workload & Behavior
    'analyst_count',
    'workload_balance_index',          # std dev of cases per analyst / mean
    'template_reuse_rate',
    'superficial_investigation_rate',
    'unusually_fast_closure_rate',
    
    # Escalation & Playbook
    'critical_escalation_rate',
    'escalation_delay_avg_min',
    'playbook_execution_rate',
    'playbook_coverage_ratio',         # playbooks defined / incident types
    'playbook_adherence_rate',
    
    # Signature & Detection Currency
    'signature_age_avg_days',
    'signature_age_max_days',
    'rules_updated_last_30d',
    'rules_updated_last_90d',
    'detection_coverage_ratio',        # MITRE ATT&CK coverage
    
    # Threat Intel & Context
    'threat_intel_feeds_active',
    'ioc_enrichment_rate',
    'context_enrichment_rate',
    
    # Infrastructure
    'telemetry_coverage_pct',
    'log_source_count',
    'critical_asset_coverage_pct',
    
    # Team Composition
    'senior_analyst_ratio',
    'certifications_per_analyst',
    'training_hours_per_analyst_qtr',
    
    # Historical
    'prev_period_fpr',
    'prev_period_efficiency',
    'trend_fpr_3m',
    'trend_efficiency_3m'
]

# ────────────────────────────────────────────────────────────────
# FEATURE EXTRACTION FROM RAW SOC DATA
# ────────────────────────────────────────────────────────────────
def extract_soc_features(df_alerts: pd.DataFrame, 
                          df_cases: pd.DataFrame,
                          df_analysts: pd.DataFrame = None,
                          df_signatures: pd.DataFrame = None,
                          df_playbooks: pd.DataFrame = None,
                          df_telemetry: pd.DataFrame = None,
                          period_start: datetime = None,
                          period_end: datetime = None) -> Dict[str, float]:
    """
    Extract SOC operational features from raw data for a given period.
    Returns a flat dict of feature_name -> value.
    """
    if period_start is None:
        period_end = period_end or datetime.now()
        period_start = period_end - timedelta(days=90)
    
    # Filter to period
    alerts = df_alerts[
        (df_alerts['createdAt'] >= period_start) & 
        (df_alerts['createdAt'] <= period_end)
    ].copy() if len(df_alerts) > 0 else pd.DataFrame()
    
    cases = df_cases[
        (df_cases['openedAt'] >= period_start) & 
        (df_cases['openedAt'] <= period_end)
    ].copy() if len(df_cases) > 0 else pd.DataFrame()
    
    features = {}
    
    # ─── Volume & Throughput ───
    total_alerts = len(alerts)
    total_cases = len(cases)
    analyst_count = df_analysts['id'].nunique() if df_analysts is not None and len(df_analysts) > 0 else 5
    shifts_per_period = 90 * 3  # 90 days * 3 shifts
    
    features['total_alerts_per_period'] = total_alerts
    features['alerts_per_analyst_per_shift'] = total_alerts / (analyst_count * shifts_per_period) if analyst_count > 0 else 0
    features['cases_per_analyst_per_shift'] = total_cases / (analyst_count * shifts_per_period) if analyst_count > 0 else 0
    features['alert_to_case_ratio'] = total_cases / total_alerts if total_alerts > 0 else 0
    
    # ─── Timing Metrics ───
    if len(cases) > 0:
        features['mean_acknowledgment_time_min'] = cases['acknowledgmentTimeMin'].mean() if 'acknowledgmentTimeMin' in cases.columns else 0
        features['mean_investigation_time_min'] = cases['investigationTimeMin'].mean() if 'investigationTimeMin' in cases.columns else 0
        features['mean_closure_time_min'] = cases['closureTimeMin'].mean() if 'closureTimeMin' in cases.columns else 0
        
        duration_min = cases['durationMin'] if 'durationMin' in cases.columns else pd.Series([0]*len(cases))
        features['pct_cases_closed_under_1hr'] = (duration_min <= 60).mean()
        features['pct_cases_closed_under_4hr'] = (duration_min <= 240).mean()
        features['pct_cases_closed_under_24hr'] = (duration_min <= 1440).mean()
    else:
        features.update({
            'mean_acknowledgment_time_min': 0,
            'mean_investigation_time_min': 0,
            'mean_closure_time_min': 0,
            'pct_cases_closed_under_1hr': 0,
            'pct_cases_closed_under_4hr': 0,
            'pct_cases_closed_under_24hr': 0
        })
    
    # ─── Disposition Quality ───
    if len(alerts) > 0:
        fp = (alerts['disposition'] == 'False Positive').sum()
        tp = (alerts['disposition'] == 'True Positive').sum()
        escalated = alerts['escalated'].sum() if 'escalated' in alerts.columns else 0
        features['false_positive_rate_current'] = fp / len(alerts)
        features['true_positive_rate_current'] = tp / len(alerts) if len(alerts) > 0 else 0
        features['escalation_rate'] = escalated / len(alerts) if len(alerts) > 0 else 0
    else:
        features.update({'false_positive_rate_current': 0, 'true_positive_rate_current': 0, 'escalation_rate': 0})
    
    if len(cases) > 0:
        reopened = (cases['reopenedCount'] > 0).sum() if 'reopenedCount' in cases.columns else 0
        features['reopened_case_rate'] = reopened / len(cases)
    else:
        features['reopened_case_rate'] = 0
    
    # ─── Evidence & Classification Quality ───
    if len(cases) > 0:
        evidence_col = 'evidenceAttachments' if 'evidenceAttachments' in cases.columns else 'evidenceCount'
        features['evidence_per_case_avg'] = cases[evidence_col].mean() if evidence_col in cases.columns else 0
        features['cases_with_zero_evidence_pct'] = (cases[evidence_col] == 0).mean() if evidence_col in cases.columns else 1.0
        
        # Insufficient IOCs - cases with low evidence AND high severity
        high_sev_cases = cases[cases.get('severity', pd.Series(['Low']*len(cases))).isin(['Critical', 'High'])]
        low_evidence_high_sev = high_sev_cases[high_sev_cases[evidence_col] < 2] if evidence_col in high_sev_cases.columns else pd.DataFrame()
        features['cases_with_insufficient_iocs_pct'] = len(low_evidence_high_sev) / len(high_sev_cases) if len(high_sev_cases) > 0 else 0
        
        # Classification changes - proxy via template reuse or behavior
        features['classification_changes_per_case'] = cases.get('isTemplateReuse', pd.Series([0]*len(cases))).mean()
    else:
        features.update({
            'evidence_per_case_avg': 0,
            'cases_with_zero_evidence_pct': 1.0,
            'cases_with_insufficient_iocs_pct': 1.0,
            'classification_changes_per_case': 0
        })
    
    # ─── Analyst Workload & Behavior ───
    if len(cases) > 0 and 'investigator' in cases.columns:
        workload = cases.groupby('investigator').size()
        features['analyst_count'] = len(workload)
        features['workload_balance_index'] = workload.std() / workload.mean() if workload.mean() > 0 else 0
        
        features['template_reuse_rate'] = cases['isTemplateReuse'].mean() if 'isTemplateReuse' in cases.columns else 0
        
        # Behavior distribution
        behaviour = cases['behaviour'] if 'behaviour' in cases.columns else pd.Series(['Normal']*len(cases))
        features['superficial_investigation_rate'] = (behaviour == 'Superficial').mean()
        features['unusually_fast_closure_rate'] = (behaviour == 'Unusually Fast').mean()
    else:
        features.update({
            'analyst_count': 5,
            'workload_balance_index': 0,
            'template_reuse_rate': 0,
            'superficial_investigation_rate': 0,
            'unusually_fast_closure_rate': 0
        })
    
    # ─── Escalation & Playbook ───
    if len(alerts) > 0:
        crit_alerts = alerts[alerts['severity'] == 'Critical']
        features['critical_escalation_rate'] = (
            crit_alerts['escalated'].mean() if 'escalated' in crit_alerts.columns and len(crit_alerts) > 0 else 0
        )
        features['escalation_delay_avg_min'] = alerts['escalationDelayMin'].mean() if 'escalationDelayMin' in alerts.columns else 0
    else:
        features.update({'critical_escalation_rate': 0, 'escalation_delay_avg_min': 0})
    
    # Playbook metrics (need playbook data)
    if df_playbooks is not None and len(df_playbooks) > 0:
        features['playbook_execution_rate'] = df_playbooks.get('executed', pd.Series([0])).mean()
        features['playbook_coverage_ratio'] = len(df_playbooks) / 20  # assume 20 incident types
        features['playbook_adherence_rate'] = df_playbooks.get('adherence_rate', pd.Series([0.5])).mean()
    else:
        features.update({
            'playbook_execution_rate': 0,
            'playbook_coverage_ratio': 0,
            'playbook_adherence_rate': 0.5
        })
    
    # ─── Signature & Detection Currency ───
    if df_signatures is not None and len(df_signatures) > 0:
        if 'updatedAt' in df_signatures.columns:
            ages = (datetime.now() - pd.to_datetime(df_signatures['updatedAt'])).dt.days
            features['signature_age_avg_days'] = ages.mean()
            features['signature_age_max_days'] = ages.max()
            features['rules_updated_last_30d'] = (ages <= 30).sum()
            features['rules_updated_last_90d'] = (ages <= 90).sum()
        else:
            features.update({'signature_age_avg_days': 365, 'signature_age_max_days': 730, 
                           'rules_updated_last_30d': 0, 'rules_updated_last_90d': 0})
        
        # MITRE coverage
        if 'mitre_techniques_covered' in df_signatures.columns:
            features['detection_coverage_ratio'] = df_signatures['mitre_techniques_covered'].sum() / 500  # ~500 ATT&CK techniques
        else:
            features['detection_coverage_ratio'] = 0.3
    else:
        features.update({
            'signature_age_avg_days': 365, 'signature_age_max_days': 730,
            'rules_updated_last_30d': 0, 'rules_updated_last_90d': 0,
            'detection_coverage_ratio': 0.3
        })
    
    # ─── Threat Intel & Context ───
    features['threat_intel_feeds_active'] = 5  # default
    features['ioc_enrichment_rate'] = 0.6
    features['context_enrichment_rate'] = 0.5
    
    # ─── Infrastructure ───
    if df_telemetry is not None and len(df_telemetry) > 0:
        features['telemetry_coverage_pct'] = df_telemetry.get('observedCoverage', pd.Series([70])).mean()
        features['log_source_count'] = len(df_telemetry)
        features['critical_asset_coverage_pct'] = df_telemetry[df_telemetry.get('criticality') == 'Critical'].get('observedCoverage', pd.Series([50])).mean() if 'criticality' in df_telemetry.columns else 50
    else:
        features.update({'telemetry_coverage_pct': 70, 'log_source_count': 10, 'critical_asset_coverage_pct': 50})
    
    # ─── Team Composition ───
    if df_analysts is not None and len(df_analysts) > 0:
        features['senior_analyst_ratio'] = (df_analysts.get('level', pd.Series(['Junior'])).isin(['Senior', 'Lead'])).mean()
        features['certifications_per_analyst'] = df_analysts.get('certifications', pd.Series([1])).mean()
        features['training_hours_per_analyst_qtr'] = df_analysts.get('trainingHoursQtr', pd.Series([8])).mean()
    else:
        features.update({'senior_analyst_ratio': 0.3, 'certifications_per_analyst': 1.5, 'training_hours_per_analyst_qtr': 8})
    
    # ─── Historical Trends (placeholder - would need historical data) ───
    features.update({
        'prev_period_fpr': 0.15,
        'prev_period_efficiency': 0.7,
        'trend_fpr_3m': 0,
        'trend_efficiency_3m': 0
    })
    
    return features


def prepare_training_data(soc_data: List[Dict]) -> pd.DataFrame:
    """
    Convert list of period records into training DataFrame.
    Each record should contain all SOC_FEATURES + EFFICIENCY_TARGETS for one period/entity.
    """
    rows = []
    for record in soc_data:
        row = {}
        # Features
        for f in SOC_FEATURES:
            row[f] = record.get(f, 0)
        # Targets
        for t in EFFICIENCY_TARGETS:
            row[t] = record.get(t, np.nan)
        rows.append(row)
    return pd.DataFrame(rows)