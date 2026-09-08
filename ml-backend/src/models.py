import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional, Tuple
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.multioutput import MultiOutputRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import joblib
from typing import Dict, Any
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from features import SOC_FEATURES, EFFICIENCY_TARGETS, prepare_training_data


class SOCEfficiencyRegressor:
    """
    Multi-output regressor for SOC efficiency evaluation.
    Predicts 6 efficiency metrics simultaneously.
    """
    
    def __init__(self, 
                 model_type: str = 'ensemble',
                 n_estimators: int = 200,
                 max_depth: int = 10,
                 min_samples_split: int = 5,
                 min_samples_leaf: int = 2,
                 random_state: int = 42):
        
        self.model_type = model_type
        self.random_state = random_state
        self.feature_names = SOC_FEATURES
        self.target_names = EFFICIENCY_TARGETS
        self.scaler = StandardScaler()
        self.is_trained = False
        
        # Base estimators
        rf = RandomForestRegressor(
            n_estimators=n_estimators,
            max_depth=max_depth,
            min_samples_split=min_samples_split,
            min_samples_leaf=min_samples_leaf,
            random_state=random_state,
            n_jobs=-1
        )
        
        gbr = GradientBoostingRegressor(
            n_estimators=n_estimators,
            max_depth=max_depth,
            min_samples_split=min_samples_split,
            min_samples_leaf=min_samples_leaf,
            random_state=random_state
        )
        
        if model_type == 'rf':
            self.base_model = rf
        elif model_type == 'gbr':
            self.base_model = gbr
        else:  # ensemble
            self.base_model = MultiOutputRegressor(rf)
            self.gbr_model = MultiOutputRegressor(gbr)
    
    def train(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Train the model on SOC efficiency data."""
        # Prepare features and targets
        X = df[self.feature_names].fillna(0)
        y = df[self.target_names].fillna(0)
        
        # Scale features
        X_scaled = self.scaler.fit_transform(X)
        
        # Train/test split
        X_train, X_test, y_train, y_test = train_test_split(
            X_scaled, y, test_size=0.2, random_state=42
        )
        
        if hasattr(self, 'gbr_model'):
            # Train ensemble
            self.base_model.fit(X_train, y_train)
            self.gbr_model.fit(X_train, y_train)
            
            # Ensemble predictions (average)
            y_pred_rf = self.base_model.predict(X_test)
            y_pred_gbr = self.gbr_model.predict(X_test)
            y_pred = (y_pred_rf + y_pred_gbr) / 2
        else:
            self.base_model.fit(X_train, y_train)
            y_pred = self.base_model.predict(X_test)
        
        self.is_trained = True
        
        # Calculate metrics per target
        metrics = {}
        for i, target in enumerate(self.target_names):
            y_true = y_test.iloc[:, i].values
            y_pred_i = y_pred[:, i] if y_pred.ndim > 1 else y_pred
            
            metrics[target] = {
                'mse': mean_squared_error(y_true, y_pred_i),
                'rmse': np.sqrt(mean_squared_error(y_true, y_pred_i)),
                'mae': mean_absolute_error(y_true, y_pred_i),
                'r2': r2_score(y_true, y_pred_i)
            }
        
        # Feature importance (from RF)
        if hasattr(self.base_model, 'estimators_'):
            # MultiOutputRegressor
            importances = np.mean([est.feature_importances_ for est in self.base_model.estimators_], axis=0)
        else:
            importances = self.base_model.feature_importances_
        
        feature_importance = dict(zip(self.feature_names, importances))
        
        return {
            'metrics': metrics,
            'feature_importance': feature_importance,
            'train_samples': len(X_train),
            'test_samples': len(X_test)
        }
    
    def predict(self, df: pd.DataFrame) -> np.ndarray:
        """Predict efficiency metrics for new data."""
        if not self.is_trained:
            raise ValueError("Model not trained yet")
        
        X = df[self.feature_names].fillna(0)
        X = X.reindex(columns=self.feature_names, fill_value=0)
        X_scaled = self.scaler.transform(X)
        
        if hasattr(self, 'gbr_model') and self.gbr_model is not None:
            y_pred_rf = self.base_model.predict(X_scaled)
            y_pred_gbr = self.gbr_model.predict(X_scaled)
            return (y_pred_rf + y_pred_gbr) / 2
        else:
            return self.base_model.predict(X_scaled)
    
    def predict_with_confidence(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Predict with confidence intervals using tree variance."""
        if not self.is_trained:
            raise ValueError("Model not trained yet")
        
        X = df[self.feature_names].fillna(0)
        X = X.reindex(columns=self.feature_names, fill_value=0)
        X_scaled = self.scaler.transform(X)
        
        # Get predictions from all trees for confidence
        if hasattr(self.base_model, 'estimators_') and isinstance(self.base_model.estimators_, np.ndarray):
            # RandomForest (not MultiOutputRegressor) - estimators_ is array of trees
            all_preds = []
            for estimator in self.base_model.estimators_.ravel():
                all_preds.append(estimator.predict(self.scaler.transform(X)))
            all_preds = np.array(all_preds)  # (n_trees, n_samples, n_targets)
            
            mean_pred = np.mean(all_preds, axis=0)
            std_pred = np.std(all_preds, axis=0)
            
            # Confidence based on prediction variance
            confidence = 1 / (1 + std_pred)
        elif hasattr(self.base_model, 'estimators_'):
            # MultiOutputRegressor - estimators_ is list of estimators per target
            # Use single model prediction with default confidence
            mean_pred = self.base_model.predict(self.scaler.transform(X))
            # Ensure 2D
            if mean_pred.ndim == 1:
                mean_pred = mean_pred.reshape(-1, 1)
            confidence = np.ones_like(mean_pred) * 0.8
        else:
            # Single model (RF or GBR) - prediction is (n_samples, n_targets)
            mean_pred = self.base_model.predict(self.scaler.transform(X))
            # Ensure 2D
            if mean_pred.ndim == 1:
                mean_pred = mean_pred.reshape(-1, 1)
            confidence = np.ones_like(mean_pred) * 0.8
        
        # Ensure 2D for consistent indexing
        if mean_pred.ndim == 1:
            mean_pred = mean_pred.reshape(-1, 1)
        if confidence.ndim == 1:
            confidence = confidence.reshape(-1, 1)
        
        results = []
        for i in range(len(X)):
            result = {}
            for j, target in enumerate(self.target_names):
                result[target] = {
                    'prediction': float(mean_pred[i, j]),
                    'confidence': float(confidence[i, j]),
                    'interpretation': self._interpret_efficiency(target, mean_pred[i, j])
                }
            results.append(result)
        
        return results
    
    def _interpret_efficiency(self, metric: str, value: float) -> str:
        """Provide human-readable interpretation of efficiency score."""
        interpretations = {
            'false_positive_rate': lambda v: f"FPR: {v:.1%} - {'Excellent' if v < 0.05 else 'Good' if v < 0.15 else 'Needs Improvement' if v < 0.3 else 'Critical'}",
            'incorrect_classification_ratio': lambda v: f"Misclassification: {v:.1%} - {'Excellent' if v < 0.05 else 'Good' if v < 0.1 else 'Needs Improvement' if v < 0.2 else 'Critical'}",
            'analyst_efficiency': lambda v: f"Efficiency: {v:.1f} cases/hr - {'Excellent' if v > 3 else 'Good' if v > 2 else 'Needs Improvement' if v > 1 else 'Critical'}",
            'insufficient_evidence_ratio': lambda v: f"Insufficient Evidence: {v:.1%} - {'Excellent' if v < 0.05 else 'Good' if v < 0.15 else 'Needs Improvement' if v < 0.3 else 'Critical'}",
            'signature_age_days': lambda v: f"Avg Signature Age: {v:.0f} days - {'Current' if v < 30 else 'Aging' if v < 90 else 'Stale' if v < 180 else 'Critical'}",
            'playbook_gap_ratio': lambda v: f"Playbook Gaps: {v:.1%} - {'Complete' if v < 0.1 else 'Minor Gaps' if v < 0.3 else 'Significant Gaps' if v < 0.5 else 'Critical'}"
        }
        return interpretations.get(metric, lambda v: f"Score: {v:.2f}")(value)
    
    def save(self, path: str):
        joblib.dump({
            'model': self.base_model,
            'gbr_model': getattr(self, 'gbr_model', None),
            'scaler': self.scaler,
            'feature_names': self.feature_names,
            'target_names': self.target_names,
            'model_type': self.model_type
        }, path)
    
    def load(self, path: str):
        data = joblib.load(path)
        self.base_model = data['model']
        self.gbr_model = data.get('gbr_model')
        self.scaler = data['scaler']
        self.feature_names = data['feature_names']
        self.target_names = data['target_names']
        self.model_type = data.get('model_type', 'ensemble')
        self.is_trained = True


class SOCEfficiencyEvaluator:
    """
    High-level evaluator that combines ML predictions with rule-based analysis
    to produce comprehensive SOC efficiency assessments.
    """
    
    def __init__(self, model_path: Optional[str] = None):
        self.model = SOCEfficiencyRegressor()
        if model_path:
            self.model.load(model_path)
        self.rules_engine = RulesEngine()
    
    def evaluate(self, soc_data: pd.DataFrame) -> Dict[str, Any]:
        """
        Evaluate SOC efficiency for given data.
        Returns comprehensive assessment with ML predictions + rule-based findings.
        """
        # ML Predictions
        ml_results = self.model.predict_with_confidence(soc_data)
        
        # Rule-based findings
        rule_findings = self.rules_engine.analyze(soc_data)
        
        # Combine
        return {
            'ml_predictions': ml_results,
            'rule_findings': rule_findings,
            'overall_assessment': self._generate_overall_assessment(ml_results, rule_findings)
        }
    
    def _generate_overall_assessment(self, ml_results, rule_findings) -> Dict[str, Any]:
        # Aggregate risk from ML predictions
        avg_risk = 0
        critical_count = 0
        for result in ml_results:
            for target, pred in result.items():
                pred_val = pred['prediction']
                # Normalize to risk (higher = worse for most metrics)
                if target in ['analyst_efficiency']:
                    risk = 1 - min(pred_val / 5, 1)  # invert for efficiency
                else:
                    risk = min(pred_val * 2, 1)  # scale 0-0.5 to 0-1
                avg_risk += risk
                if risk > 0.7:
                    critical_count += 1
        
        return {
            'overall_risk_score': round(avg_risk / max(1, len(ml_results) * 6), 2),
            'critical_issues': critical_count,
            'recommendation': 'Immediate review required' if critical_count > 3 else 'Monitor' if critical_count > 0 else 'Acceptable'
        }


class RulesEngine:
    """Deterministic rules for SOC efficiency evaluation."""
    
    def __init__(self):
        self.thresholds = {
            'fpr_critical': 0.3,
            'fpr_high': 0.15,
            'misclass_critical': 0.2,
            'misclass_high': 0.1,
            'efficiency_critical': 1.0,
            'efficiency_low': 2.0,
            'evidence_critical': 0.3,
            'evidence_high': 0.15,
            'signature_stale': 180,
            'signature_aging': 90,
            'playbook_gap_critical': 0.5,
            'playbook_gap_high': 0.3
        }
    
    def analyze(self, df: pd.DataFrame) -> List[Dict]:
        findings = []
        
        for _, row in df.iterrows():
            entity_id = row.get('entity_id', 'Unknown')
            
            # Rule 1: False Positive Rate
            fpr = row.get('false_positive_rate_current', 0)
            if fpr > self.thresholds['fpr_critical']:
                findings.append(self._make_finding(entity_id, 'False Positive Rate', 'Critical',
                    f'FPR at {fpr:.1%} exceeds critical threshold ({self.thresholds["fpr_critical"]:.0%})',
                    fpr, 'Reduce alert noise, tune detection rules'))
            elif fpr > self.thresholds['fpr_high']:
                findings.append(self._make_finding(entity_id, 'False Positive Rate', 'High',
                    f'FPR at {fpr:.1%} above threshold ({self.thresholds["fpr_high"]:.0%})',
                    fpr, 'Review and tune high-volume detection rules'))
            
            # Rule 2: Incorrect Classification
            # Proxy: template reuse + superficial investigations
            misclass_proxy = row.get('template_reuse_rate', 0) + row.get('superficial_investigation_rate', 0)
            if misclass_proxy > self.thresholds['misclass_critical']:
                findings.append(self._make_finding(entity_id, 'Incorrect Classification', 'Critical',
                    f'Template reuse + superficial investigations at {misclass_proxy:.1%}',
                    misclass_proxy, 'Review investigation templates and depth requirements'))
            elif misclass_proxy > self.thresholds['misclass_high']:
                findings.append(self._make_finding(entity_id, 'Incorrect Classification', 'High',
                    f'Classification quality indicators elevated ({misclass_proxy:.1%})',
                    misclass_proxy, 'Review investigation quality controls'))
            
            # Rule 3: Analyst Efficiency
            eff = row.get('cases_per_analyst_per_shift', 0) * 3  # per hour estimate
            if eff < self.thresholds['efficiency_critical']:
                findings.append(self._make_finding(entity_id, 'Analyst Efficiency', 'Critical',
                    f'Analyst handling only {eff:.1f} cases/hr (critical threshold: {self.thresholds["efficiency_critical"]})',
                    eff, 'Review workload distribution, automation opportunities'))
            elif eff < self.thresholds['efficiency_low']:
                findings.append(self._make_finding(entity_id, 'Analyst Efficiency', 'Low',
                    f'Analyst efficiency at {eff:.1f} cases/hr (below target: {self.thresholds["efficiency_low"]})',
                    eff, 'Review workload distribution, consider automation'))
            
            # Rule 4: Insufficient Evidence
            insuff_evidence = row.get('cases_with_insufficient_iocs_pct', 0)
            if insuff_evidence > self.thresholds['evidence_critical']:
                findings.append(self._make_finding(entity_id, 'Insufficient Evidence', 'Critical',
                    f'{insuff_evidence:.1%} of high-severity cases lack sufficient IOCs',
                    insuff_evidence, 'Mandate minimum evidence standards for high-severity cases'))
            elif insuff_evidence > self.thresholds['evidence_high']:
                findings.append(self._make_finding(entity_id, 'Insufficient Evidence', 'High',
                    f'{insuff_evidence:.1%} of high-severity cases lack sufficient IOCs',
                    insuff_evidence, 'Review evidence collection procedures'))
            
            # Rule 5: Signature Age
            sig_age = row.get('signature_age_avg_days', 365)
            if sig_age > self.thresholds['signature_stale']:
                findings.append(self._make_finding(entity_id, 'Stale Signatures', 'Critical',
                    f'Average signature age {sig_age:.0f} days (stale threshold: {self.thresholds["signature_stale"]} days)',
                    sig_age, 'Immediate signature update required'))
            elif sig_age > self.thresholds['signature_aging']:
                findings.append(self._make_finding(entity_id, 'Aging Signatures', 'High',
                    f'Average signature age {sig_age:.0f} days (aging threshold: {self.thresholds["signature_aging"]} days)',
                    sig_age, 'Schedule signature updates'))
            
            # Rule 6: Playbook Gaps
            pgap = row.get('playbook_gap_ratio', 0)
            if pgap > self.thresholds['playbook_gap_critical']:
                findings.append(self._make_finding(entity_id, 'Playbook Gaps', 'Critical',
                    f'Playbook coverage gap at {pgap:.1%} (critical threshold: {self.thresholds["playbook_gap_critical"]:.0%})',
                    pgap, 'Develop missing playbooks for high-risk scenarios'))
            elif pgap > self.thresholds['playbook_gap_high']:
                findings.append(self._make_finding(entity_id, 'Playbook Gaps', 'High',
                    f'Playbook coverage gap at {pgap:.1%} (threshold: {self.thresholds["playbook_gap_high"]:.0%})',
                    pgap, 'Prioritize playbook development for uncovered scenarios'))
        
        return findings
    
    def _make_finding(self, entity_id, category, severity, description, evidence_value, recommendation):
        return {
            'entity_id': entity_id,
            'category': category,
            'severity': severity,
            'description': description,
            'evidence_value': evidence_value,
            'recommendation': recommendation,
            'type': 'RULE_BASED'
        }


# ────────────────────────────────────────────────────────────────
# TRAINING PIPELINE
# ────────────────────────────────────────────────────────────────
def train_efficiency_model(
    training_data: List[Dict],
    model_path: str = 'models/soc_efficiency_model.pkl'
) -> Dict[str, Any]:
    """Train the SOC efficiency model from historical data."""
    
    df = prepare_training_data(training_data)
    
    # Check we have enough data
    if len(df) < 10:
        raise ValueError(f"Insufficient training data: {len(df)} samples (minimum 10)")
    
    # Check target coverage
    target_coverage = df[EFFICIENCY_TARGETS].notna().sum()
    print(f"Training samples: {len(df)}")
    for t in EFFICIENCY_TARGETS:
        print(f"  {t}: {target_coverage[t]}/{len(df)} labeled")
    
    # Train model
    model = SOCEfficiencyRegressor(model_type='ensemble', n_estimators=200)
    results = model.train(df.dropna(subset=EFFICIENCY_TARGETS))
    
    # Save model
    import os
    os.makedirs(os.path.dirname(model_path), exist_ok=True)
    model.save(model_path)
    
    print(f"Model saved to {model_path}")
    return results


def evaluate_model(model_path: str, test_data: List[Dict]) -> Dict[str, Any]:
    """Evaluate trained model on test data."""
    df = prepare_training_data(test_data)
    model = SOCEfficiencyRegressor()
    model.load(model_path)
    
    df_test = df.dropna(subset=EFFICIENCY_TARGETS)
    if len(df_test) == 0:
        return {'error': 'No test samples with all targets labeled'}
    
    X = df_test[SOC_FEATURES].fillna(0)
    y_true = df_test[EFFICIENCY_TARGETS].values
    
    y_pred = model.predict(df_test)
    
    results = {}
    for i, target in enumerate(EFFICIENCY_TARGETS):
        results[target] = {
            'mse': mean_squared_error(y_true[:, i], y_pred[:, i]),
            'rmse': np.sqrt(mean_squared_error(y_true[:, i], y_pred[:, i])),
            'mae': mean_absolute_error(y_true[:, i], y_pred[:, i]),
            'r2': r2_score(y_true[:, i], y_pred[:, i])
        }
    
    return results