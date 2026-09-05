import numpy as np
import pandas as pd
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
import joblib
from typing import Tuple, Dict, Any, List

try:
    from .features import extract_features, prepare_training_data
except ImportError:
    from features import extract_features, prepare_training_data
except ImportError:
    from features import extract_features, prepare_training_data

class SupervisedDetector:
    def __init__(self, n_estimators: int = 100, max_depth: int = 8, min_samples_split: int = 10, min_samples_leaf: int = 5, random_state: int = 42):
        self.model = RandomForestClassifier(
            n_estimators=n_estimators,
            max_depth=max_depth,
            min_samples_split=min_samples_split,
            min_samples_leaf=min_samples_leaf,
            random_state=random_state,
            class_weight='balanced',
            n_jobs=-1
        )
        self.scaler = StandardScaler()
        self.feature_names = None
        self.is_trained = False
    
    def train(self, df: pd.DataFrame) -> Dict[str, Any]:
        X, y = prepare_training_data(df)
        self.feature_names = X.columns.tolist()
        
        X_scaled = self.scaler.fit_transform(X)
        X_train, X_test, y_train, y_test = train_test_split(X_scaled, y, test_size=0.2, random_state=42, stratify=y)
        
        self.model.fit(X_train, y_train)
        self.is_trained = True
        
        y_pred = self.model.predict(X_test)
        
        return {
            'accuracy': accuracy_score(y_test, y_pred),
            'confusion_matrix': confusion_matrix(y_test, y_pred).tolist(),
            'classification_report': classification_report(y_test, y_pred, output_dict=True),
            'feature_importance': dict(zip(self.feature_names, self.model.feature_importances_.tolist()))
        }
    
    def predict(self, df: pd.DataFrame) -> np.ndarray:
        if not self.is_trained:
            raise ValueError("Model not trained yet")
        X = extract_features(df)
        X = X.reindex(columns=self.feature_names, fill_value=0)
        X_scaled = self.scaler.transform(X)
        return self.model.predict(X_scaled)
    
    def predict_proba(self, df: pd.DataFrame) -> np.ndarray:
        if not self.is_trained:
            raise ValueError("Model not trained yet")
        X = extract_features(df)
        X = X.reindex(columns=self.feature_names, fill_value=0)
        X_scaled = self.scaler.transform(X)
        return self.model.predict_proba(X_scaled)
    
    def save(self, path: str):
        joblib.dump({'model': self.model, 'scaler': self.scaler, 'feature_names': self.feature_names}, path)
    
    def load(self, path: str):
        data = joblib.load(path)
        self.model = data['model']
        self.scaler = data['scaler']
        self.feature_names = data['feature_names']
        self.is_trained = True

class UnsupervisedDetector:
    def __init__(self, n_clusters: int = 2, random_state: int = 42, n_init: int = 10):
        self.n_clusters = n_clusters
        self.kmeans = KMeans(n_clusters=n_clusters, random_state=random_state, n_init=n_init)
        self.scaler = StandardScaler()
        self.feature_names = None
        self.cluster_labels = {0: 'Normal', 1: 'Attack'}
        self.is_trained = False
    
    def train(self, df: pd.DataFrame) -> Dict[str, Any]:
        X = extract_features(df)
        self.feature_names = X.columns.tolist()
        
        X_scaled = self.scaler.fit_transform(X)
        self.kmeans.fit(X_scaled)
        self.is_trained = True
        
        cluster_centers = self.scaler.inverse_transform(self.kmeans.cluster_centers_)
        
        attack_cluster = self._identify_attack_cluster(X, self.kmeans.labels_)
        self.cluster_labels = {attack_cluster: 'Attack', 1 - attack_cluster: 'Normal'}
        
        return {
            'cluster_sizes': np.bincount(self.kmeans.labels_).tolist(),
            'cluster_labels': self.cluster_labels,
            'inertia': self.kmeans.inertia_,
            'cluster_centers': cluster_centers.tolist()
        }
    
    def _identify_attack_cluster(self, X: pd.DataFrame, labels: np.ndarray) -> int:
        cluster_stats = {}
        for cluster_id in range(self.n_clusters):
            mask = labels == cluster_id
            cluster_data = X[mask]
            stats = {
                'size': mask.sum(),
                'mean_high_volume': cluster_data.get('high_volume', pd.Series([0])).mean() if 'high_volume' in cluster_data.columns else 0,
                'mean_keyword_match': cluster_data.get('keyword_match_count', pd.Series([0])).mean() if 'keyword_match_count' in cluster_data.columns else 0,
                'mean_port_risk': (cluster_data.get('src_port_risk', pd.Series([0])).mean() + 
                                  cluster_data.get('dst_port_risk', pd.Series([0])).mean()) / 2
                                  if 'src_port_risk' in cluster_data.columns else 0,
                'mean_protocol_risk': cluster_data.get('protocol_risk', pd.Series([0])).mean() if 'protocol_risk' in cluster_data.columns else 0,
                'mean_suspicious_ua': cluster_data.get('suspicious_ua', pd.Series([0])).mean() if 'suspicious_ua' in cluster_data.columns else 0,
                'mean_error_status': cluster_data.get('error_status', pd.Series([0])).mean() if 'error_status' in cluster_data.columns else 0,
                'mean_src_ip_rare': cluster_data.get('src_ip_rare', pd.Series([0])).mean() if 'src_ip_rare' in cluster_data.columns else 0,
            }
            cluster_stats[cluster_id] = stats
        
        attack_scores = {}
        for cid, stats in cluster_stats.items():
            score = (stats['mean_high_volume'] * 2 + stats['mean_keyword_match'] * 3 + 
                    stats['mean_port_risk'] * 2 + stats['mean_protocol_risk'] * 2 +
                    stats['mean_suspicious_ua'] * 2 + stats['mean_error_status'] + 
                    stats['mean_src_ip_rare'] * 2)
            attack_scores[cid] = score
        
        return max(attack_scores, key=attack_scores.get)
    
    def predict(self, df: pd.DataFrame) -> np.ndarray:
        if not self.is_trained:
            raise ValueError("Model not trained yet")
        X = extract_features(df)
        X = X.reindex(columns=self.feature_names, fill_value=0)
        X_scaled = self.scaler.transform(X)
        raw_labels = self.kmeans.predict(X_scaled)
        return np.array([self.cluster_labels[label] for label in raw_labels])
    
    def predict_raw(self, df: pd.DataFrame) -> np.ndarray:
        if not self.is_trained:
            raise ValueError("Model not trained yet")
        X = extract_features(df)
        X = X.reindex(columns=self.feature_names, fill_value=0)
        X_scaled = self.scaler.transform(X)
        return self.kmeans.predict(X_scaled)
    
    def get_anomaly_scores(self, df: pd.DataFrame) -> np.ndarray:
        if not self.is_trained:
            raise ValueError("Model not trained yet")
        X = extract_features(df)
        X = X.reindex(columns=self.feature_names, fill_value=0)
        X_scaled = self.scaler.transform(X)
        distances = self.kmeans.transform(X_scaled)
        return distances.min(axis=1)
    
    def save(self, path: str):
        joblib.dump({'kmeans': self.kmeans, 'scaler': self.scaler, 'feature_names': self.feature_names, 'cluster_labels': self.cluster_labels}, path)
    
    def load(self, path: str):
        data = joblib.load(path)
        self.kmeans = data['kmeans']
        self.scaler = data['scaler']
        self.feature_names = data['feature_names']
        self.cluster_labels = data['cluster_labels']
        self.is_trained = True

class EnsembleDetector:
    def __init__(self, supervised_weight: float = 0.8, unsupervised_weight: float = 0.2):
        self.supervised = SupervisedDetector()
        self.unsupervised = UnsupervisedDetector()
        self.supervised_weight = supervised_weight
        self.unsupervised_weight = unsupervised_weight
    
    def train(self, df: pd.DataFrame) -> Dict[str, Any]:
        sup_results = self.supervised.train(df)
        unsup_results = self.unsupervised.train(df)
        return {'supervised': sup_results, 'unsupervised': unsup_results}
    
    def predict(self, df: pd.DataFrame) -> Dict[str, Any]:
        sup_preds = self.supervised.predict(df)
        sup_probs = self.supervised.predict_proba(df)
        unsup_preds = self.unsupervised.predict(df)
        anomaly_scores = self.unsupervised.get_anomaly_scores(df)
        
        results = []
        for i in range(len(df)):
            sup_confidence = max(sup_probs[i])
            unsup_is_attack = 1 if unsup_preds[i] == 'Attack' else 0
            combined_score = (self.supervised_weight * sup_confidence * sup_preds[i] + 
                            self.unsupervised_weight * unsup_is_attack)
            
            final_classification = 'Attack' if combined_score >= 0.5 else 'Normal'
            confidence = combined_score if final_classification == 'Attack' else 1 - combined_score
            
            results.append({
                'classification': final_classification,
                'confidence': float(confidence),
                'supervised_pred': int(sup_preds[i]),
                'unsupervised_pred': unsup_is_attack,
                'anomaly_score': float(anomaly_scores[i])
            })
        
        return results
    
    def save(self, sup_path: str, unsup_path: str):
        self.supervised.save(sup_path)
        self.unsupervised.save(unsup_path)
    
    def load(self, sup_path: str, unsup_path: str):
        self.supervised.load(sup_path)
        self.unsupervised.load(unsup_path)