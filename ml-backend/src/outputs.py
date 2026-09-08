import pandas as pd
import numpy as np
from datetime import datetime
from typing import List, Dict, Any
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from features import EFFICIENCY_TARGETS

# ────────────────────────────────────────────────────────────────
# EFFICIENCY INTERPRETATIONS
# ────────────────────────────────────────────────────────────────
EFFICIENCY_INTERPRETATIONS = {
    'false_positive_rate': {
        'thresholds': [(0.05, 'Excellent'), (0.15, 'Good'), (0.30, 'Needs Improvement'), (1.0, 'Critical')],
        'unit': '%',
        'direction': 'lower_better'
    },
    'incorrect_classification_ratio': {
        'thresholds': [(0.05, 'Excellent'), (0.10, 'Good'), (0.20, 'Needs Improvement'), (1.0, 'Critical')],
        'unit': '%',
        'direction': 'lower_better'
    },
    'analyst_efficiency': {
        'thresholds': [(3.0, 'Excellent'), (2.0, 'Good'), (1.0, 'Needs Improvement'), (0.0, 'Critical')],
        'unit': 'cases/hr',
        'direction': 'higher_better'
    },
    'insufficient_evidence_ratio': {
        'thresholds': [(0.05, 'Excellent'), (0.15, 'Good'), (0.30, 'Needs Improvement'), (1.0, 'Critical')],
        'unit': '%',
        'direction': 'lower_better'
    },
    'signature_age_days': {
        'thresholds': [(30, 'Excellent'), (90, 'Good'), (180, 'Needs Improvement'), (9999, 'Critical')],
        'unit': 'days',
        'direction': 'lower_better'
    },
    'playbook_gap_ratio': {
        'thresholds': [(0.10, 'Excellent'), (0.30, 'Good'), (0.50, 'Needs Improvement'), (1.0, 'Critical')],
        'unit': '%',
        'direction': 'lower_better'
    }
}

TARGET_LABELS = {
    'false_positive_rate': 'False Positive Rate',
    'incorrect_classification_ratio': 'Incorrect Classification Ratio',
    'analyst_efficiency': 'Analyst Efficiency',
    'insufficient_evidence_ratio': 'Insufficient Evidence Ratio',
    'signature_age_days': 'Signature Age',
    'playbook_gap_ratio': 'Playbook Gap Ratio'
}

IMPROVEMENT_RECOMMENDATIONS = {
    'false_positive_rate': [
        'Tune high-volume detection rules to reduce noise',
        'Implement alert suppression for known benign patterns',
        'Add context enrichment before alert generation'
    ],
    'incorrect_classification_ratio': [
        'Review and update investigation templates',
        'Implement mandatory peer review for high-severity cases',
        'Add mandatory classification justification fields'
    ],
    'analyst_efficiency': [
        'Automate routine triage with SOAR playbooks',
        'Implement alert grouping and deduplication',
        'Cross-train analysts for workload balancing'
    ],
    'insufficient_evidence_ratio': [
        'Mandate minimum evidence standards for Critical/High cases',
        'Implement automated evidence collection playbooks',
        'Add evidence completeness check at case closure'
    ],
    'signature_age_days': [
        'Establish signature review cycle (monthly for Critical, quarterly for others)',
        'Automate signature currency monitoring',
        'Integrate threat intel feeds for signature updates'
    ],
    'playbook_gap_ratio': [
        'Prioritize playbook development for top 10 uncovered MITRE techniques',
        'Implement playbook review cycle (quarterly)',
        'Create playbook template for rapid development'
    ]
}

# ────────────────────────────────────────────────────────────────
# RATING HELPERS
# ────────────────────────────────────────────────────────────────
def get_rating(target: str, value: float) -> str:
    """Get qualitative rating for a metric value."""
    config = EFFICIENCY_INTERPRETATIONS.get(target, {})
    thresholds = config.get('thresholds', [])
    direction = config.get('direction', 'lower_better')
    
    if direction == 'lower_better':
        for threshold, rating in thresholds:
            if value <= threshold:
                return rating
        return 'Critical'
    else:  # higher_better
        for threshold, rating in reversed(thresholds):
            if value >= threshold:
                return rating
        return 'Critical'


def get_confidence_label(confidence: float) -> str:
    if confidence >= 0.9: return 'Very High'
    if confidence >= 0.75: return 'High'
    if confidence >= 0.6: return 'Medium'
    return 'Low'


def format_value(target: str, value: float) -> str:
    """Format value with appropriate unit."""
    config = EFFICIENCY_INTERPRETATIONS.get(target, {})
    unit = config.get('unit', '')
    if unit == '%':
        return f"{value:.1%}"
    elif unit == 'days':
        return f"{value:.0f} days"
    elif unit == 'cases/hr':
        return f"{value:.1f} cases/hr"
    return f"{value:.2f}"


# ────────────────────────────────────────────────────────────────
# FILE A: EFFICIENCY EVALUATION REPORT (for Examiners)
# ────────────────────────────────────────────────────────────────
def generate_file_a_efficiency(
    entities_df: pd.DataFrame,
    ml_predictions: List[Dict],
    rule_findings: List[Dict]
) -> pd.DataFrame:
    """
    Generate File A: SOC Efficiency Evaluation Report
    For examiner review - contains efficiency scores, ratings, and findings.
    """
    output_rows = []
    
    for idx, entity_row in entities_df.iterrows():
        entity_id = entity_row.get('entity_id', f'ENTITY-{idx}')
        period = entity_row.get('period', 'Unknown')
        
        # Get ML predictions for this entity (assuming ml_predictions aligned)
        pred_idx = min(idx, len(ml_predictions) - 1)
        ml_pred = ml_predictions[min(idx, len(ml_predictions) - 1)] if ml_predictions else {}
        
        # Get rule findings for this entity
        entity_findings = [f for f in rule_findings if f.get('entity_id') == entity_row.get('entity_id', '')]
        
        # Build efficiency scores row
        row = {
            'Entity_ID': entity_row.get('entity_id', f'ENTITY-{idx}'),
            'Period': period,
            'Sector': entity_row.get('sector', 'Unknown'),
            'Criticality': entity_row.get('criticality', 'Unknown'),
            'Assessment_Date': datetime.now().strftime('%Y-%m-%d')
        }
        
        # Add efficiency scores
        for target in EFFICIENCY_TARGETS:
            label = TARGET_LABELS.get(target, target)
            # Extract from ML predictions
            pred_val = 0
            confidence = 0
            interpretation = ""
            
            # Try to get from ml_predictions structure
            if isinstance(ml_predictions, list) and pred_idx < len(ml_predictions):
                pred = ml_predictions[pred_idx]
                if isinstance(pred, dict) and target in pred:
                    pred_data = pred[target]
                    if isinstance(pred_data, dict):
                        ml_pred = pred_data.get('prediction', 0)
                        confidence = pred_data.get('confidence', 0)
                        interpretation = pred_data.get('interpretation', '')
                    else:
                        ml_pred = pred_data if isinstance(pred_data, (int, float)) else 0
                        confidence = 0.8
                        interpretation = ""
                else:
                    ml_pred = 0
                    confidence = 0.5
                    interpretation = ""
                
                rating = get_rating(target, ml_pred)
                confidence_label = get_confidence_label(confidence)
                formatted_val = format_value(target, ml_pred)
                
                row[f'{label}_Score'] = round(ml_pred, 4)
                row[f'{label}_Rating'] = rating
                row[f'{label}_Confidence'] = f"{confidence:.0%} ({confidence_label})"
                row[f'{label}_Interpretation'] = interpretation or f"Value: {formatted_val}"
        
        # Add rule-based findings summary
        entity_findings = [f for f in rule_findings if f.get('entity_id') == entity_row.get('entity_id', '')]
        critical_count = sum(1 for f in entity_findings if f.get('severity') == 'Critical')
        high_count = sum(1 for f in entity_findings if f.get('severity') == 'High')
        medium_count = sum(1 for f in entity_findings if f.get('severity') == 'Medium')
        
        row['Rule_Findings_Critical'] = critical_count
        row['Rule_Findings_High'] = high_count
        row['Rule_Findings_Medium'] = medium_count
        row['Total_Rule_Findings'] = len(entity_findings)
        
        # Top finding summary
        if entity_findings:
            top_finding = max(entity_findings, key=lambda f: {'Critical': 3, 'High': 2, 'Medium': 1, 'Low': 0}.get(f.get('severity', ''), 0))
            row['Top_Finding'] = f"[{top_finding['severity']}] {top_finding['category']}: {top_finding['description'][:100]}"
        else:
            row['Top_Finding'] = 'No rule-based findings'
        
        # Overall recommendation
        if critical_count > 0:
            row['Examiner_Action'] = 'IMMEDIATE REVIEW REQUIRED'
        elif high_count > 0:
            row['Examiner_Action'] = 'Priority Review Recommended'
        elif medium_count > 0:
            row['Examiner_Action'] = 'Standard Review'
        else:
            row['Examiner_Action'] = 'No Action Required'
        
        output_rows.append(row)
    
    return pd.DataFrame(output_rows)


# ────────────────────────────────────────────────────────────────
# FILE B: IMPROVEMENT RECOMMENDATIONS (for SOC Management)
# ────────────────────────────────────────────────────────────────
def generate_file_b_recommendations(
    entities_df: pd.DataFrame,
    ml_predictions: List[Dict],
    rule_findings: List[Dict]
) -> pd.DataFrame:
    """
    Generate File B: SOC Improvement Recommendations
    For SOC Management - prioritized actionable recommendations.
    """
    output_rows = []
    
    for idx, entity_row in entities_df.iterrows():
        entity_id = entity_row.get('entity_id', f'ENTITY-{idx}')
        period = entity_row.get('period', 'Unknown')
        
        # Collect all issues for this entity
        entity_findings = [f for f in rule_findings if f.get('entity_id') == entity_row.get('entity_id', '')]
        
        # Also check ML predictions for issues
        pred_idx = min(idx, len(ml_predictions) - 1) if ml_predictions else 0
        
        recommendations = []
        
        # From rule findings
        for finding in rule_findings:
            if finding.get('entity_id') == entity_row.get('entity_id', ''):
                recommendations.append({
                    'Priority': 1 if finding['severity'] == 'Critical' else 2,
                    'Category': finding['category'],
                    'Issue': finding['description'],
                    'Evidence_Value': finding.get('evidence_value', 'N/A'),
                    'Recommendation': finding['recommendation'],
                    'Source': 'RULE_BASED',
                    'Target_Metric': finding['category']
                })
        
        # From ML predictions - check for poor scores
        if ml_predictions and pred_idx < len(ml_predictions):
            preds = ml_predictions[pred_idx]
            for target in EFFICIENCY_TARGETS:
                if target in preds:
                    pred = preds[target]
                    if isinstance(pred, dict):
                        score = pred.get('prediction', 0)
                        confidence = pred.get('confidence', 0)
                    else:
                        score = pred
                        confidence = 0.5
                    
                    rating = get_rating(target, score)
                    if rating in ['Critical', 'Needs Improvement'] and confidence > 0.5:
                        recs = IMPROVEMENT_RECOMMENDATIONS.get(target, [])
                        for rec in recs:
                            recommendations.append({
                                'Priority': 1 if rating == 'Critical' else 2,
                                'Category': TARGET_LABELS.get(target, target),
                                'Issue': f"{TARGET_LABELS.get(target, target)} rated {rating} ({format_value(target, score)})",
                                'Evidence_Value': format_value(target, score),
                                'Recommendation': rec,
                                'Source': 'ML_PREDICTED',
                                'Target_Metric': target
                            })
        
        # Deduplicate recommendations
        seen = set()
        unique_recs = []
        for rec in recommendations:
            key = (rec['Category'], rec['Recommendation'])
            if key not in seen:
                seen.add(key)
                unique_recs.append(rec)
        
        # Sort by priority
        unique_recs.sort(key=lambda x: x['Priority'])
        
        # Create rows (one per recommendation)
        for priority_idx, rec in enumerate(unique_recs):
            output_rows.append({
                'Entity_ID': entity_row.get('entity_id', f'ENTITY-{idx}'),
                'Period': entity_row.get('period', 'Unknown'),
                'Sector': entity_row.get('sector', 'Unknown'),
                'Criticality': entity_row.get('criticality', 'Unknown'),
                'Recommendation_Priority': rec['Priority'],
                'Category': rec['Category'],
                'Issue_Description': rec['Issue'],
                'Evidence_Value': rec['Evidence_Value'],
                'Recommended_Action': rec['Recommendation'],
                'Source': rec['Source'],
                'Target_Metric': rec.get('Target_Metric', ''),
                'Implementation_Priority': 'Immediate' if rec['Priority'] == 1 else 'High' if rec['Priority'] == 2 else 'Medium',
                'Estimated_Effort': _estimate_effort(rec['Recommendation']),
                'Responsible_Role': _assign_role(rec['Category'])
            })
    
    return pd.DataFrame(output_rows)


def _estimate_effort(recommendation: str) -> str:
    """Estimate implementation effort for a recommendation."""
    recommendation = recommendation.lower()
    if any(kw in recommendation for kw in ['mandate', 'implement', 'develop', 'establish']):
        return 'High (2-4 weeks)'
    elif any(kw in recommendation for kw in ['review', 'update', 'tune', 'adjust']):
        return 'Medium (1-2 weeks)'
    else:
        return 'Low (1-3 days)'


def _assign_role(category: str) -> str:
    """Assign responsible role based on category."""
    category = category.lower()
    if any(kw in category for kw in ['playbook', 'escalation', 'workflow']):
        return 'SOC Manager / Playbook Engineer'
    elif any(kw in category for kw in ['signature', 'detection', 'rule']):
        return 'Detection Engineer / Threat Intel'
    elif any(kw in category for kw in ['evidence', 'investigation', 'classification']):
        return 'Senior Analyst / Investigation Lead'
    elif any(kw in category for kw in ['efficiency', 'workload', 'automation']):
        return 'SOC Manager / Automation Engineer'
    elif any(kw in category for kw in ['signature', 'detection']):
        return 'Detection Engineer'
    elif any(kw in category for kw in ['training', 'analyst', 'certification']):
        return 'HR / Training Coordinator'
    return 'SOC Manager'


def run_full_evaluation_pipeline(
    entities_df: pd.DataFrame,
    evaluator: Any
) -> Dict[str, pd.DataFrame]:
    """
    Run complete evaluation pipeline and generate both output files.
    """
    results = []
    for _, entity_row in entities_df.iterrows():
        row_df = pd.DataFrame([entity_row.to_dict()])
        eval_result = evaluator.evaluate(pd.DataFrame([entity_row.to_dict()]))
        results.append({
            'entity_row': entity_row,
            'ml_predictions': evaluator.model.predict_with_confidence(pd.DataFrame([entity_row.to_dict()])),
            'rule_findings': evaluator.rules_engine.analyze(pd.DataFrame([entity_row.to_dict()])),
            'overall': eval_result.get('overall_assessment', {})
        })
    
    # Generate File A
    file_a = generate_file_a_efficiency(
        entities_df,
        [r['ml_predictions'] for r in results],
        [f for r in results for f in r['rule_findings']]
    )
    
    # Generate File B
    file_b = generate_file_b_recommendations(
        entities_df,
        [r['ml_predictions'] for r in results],
        [f for r in results for f in r['rule_findings']]
    )
    
    return {
        'file_a_efficiency_report': file_a,
        'file_b_recommendations': file_b,
        'detailed_results': results
    }


def export_to_csv(file_a: pd.DataFrame, file_b: pd.DataFrame, output_dir: str = 'output'):
    """Export both files to CSV."""
    os.makedirs(output_dir, exist_ok=True)
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    
    file_a_path = os.path.join(output_dir, f'File_A_Efficiency_Report_{timestamp}.csv')
    file_b_path = os.path.join(output_dir, f'File_B_Recommendations_{timestamp}.csv')
    
    file_a.to_csv(file_a_path, index=False)
    file_b.to_csv(file_b_path, index=False)
    
    return file_a_path, file_b_path