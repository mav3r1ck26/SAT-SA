import pandas as pd
import numpy as np
from typing import List, Dict, Any
from datetime import datetime

ATTACK_KEYWORDS = [
    'malware', 'ransomware', 'exploit', 'injection', 'brute force', 'ddos', 'phishing',
    'c2', 'command and control', 'lateral movement', 'privilege escalation', 'persistence',
    'exfiltration', 'credential theft', 'reconnaissance', 'scanning', 'enumeration',
    'backdoor', 'rootkit', 'trojan', 'worm', 'virus', 'apt', 'threat actor'
]

SUSPICIOUS_PORTS = {22, 23, 3389, 445, 135, 139, 1433, 3306, 5432, 6379, 27017, 5900, 5985, 5986}
HIGH_RISK_PROTOCOLS = {'smb', 'rdp', 'ssh', 'telnet', 'ftp', 'wmi', 'winrm', 'ldap', 'kerberos'}

def extract_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    
    df['hour'] = pd.to_datetime(df['timestamp']).dt.hour
    df['day_of_week'] = pd.to_datetime(df['timestamp']).dt.dayofweek
    df['is_weekend'] = df['day_of_week'].isin([5, 6]).astype(int)
    df['is_night'] = ((df['hour'] >= 22) | (df['hour'] <= 5)).astype(int)
    
    if 'source_port' in df.columns:
        df['src_port_risk'] = df['source_port'].apply(lambda x: 1 if x in SUSPICIOUS_PORTS else 0)
    if 'dest_port' in df.columns:
        df['dst_port_risk'] = df['dest_port'].apply(lambda x: 1 if x in SUSPICIOUS_PORTS else 0)
    
    if 'protocol' in df.columns:
        df['protocol_risk'] = df['protocol'].str.lower().apply(lambda x: 1 if x in HIGH_RISK_PROTOCOLS else 0)
    
    if 'bytes_sent' in df.columns and 'bytes_received' in df.columns:
        df['byte_ratio'] = df['bytes_sent'] / (df['bytes_received'] + 1)
        df['total_bytes'] = df['bytes_sent'] + df['bytes_received']
        df['high_volume'] = (df['total_bytes'] > df['total_bytes'].quantile(0.95)).astype(int)
    
    if 'packet_count' in df.columns:
        df['high_packet_count'] = (df['packet_count'] > df['packet_count'].quantile(0.95)).astype(int)
    
    if 'alert_description' in df.columns:
        df['keyword_match_count'] = df['alert_description'].str.lower().apply(
            lambda x: sum(1 for kw in ATTACK_KEYWORDS if kw in str(x))
        )
        df['has_attack_keyword'] = (df['keyword_match_count'] > 0).astype(int)
    
    if 'source_ip' in df.columns:
        ip_counts = df['source_ip'].value_counts()
        df['src_ip_frequency'] = df['source_ip'].map(ip_counts)
        df['src_ip_freq_ratio'] = df['src_ip_frequency'] / len(df)
        median_freq = df['src_ip_freq_ratio'].median()
        df['src_ip_rare'] = (df['src_ip_freq_ratio'] < median_freq * 0.5).astype(int)
    
    if 'dest_ip' in df.columns:
        ip_counts = df['dest_ip'].value_counts()
        df['dst_ip_frequency'] = df['dest_ip'].map(ip_counts)
        df['dst_ip_freq_ratio'] = df['dst_ip_frequency'] / len(df)
    
    if 'user_agent' in df.columns:
        df['suspicious_ua'] = df['user_agent'].str.lower().apply(
            lambda x: 1 if any(s in str(x) for s in ['sqlmap', 'nmap', 'nikto', 'dirb', 'gobuster', 'curl', 'wget', 'python', 'bot', 'scanner']) else 0
        )
    
    if 'http_status' in df.columns:
        df['error_status'] = df['http_status'].apply(lambda x: 1 if x in [400, 401, 403, 404, 500, 502, 503] else 0)
    
    feature_cols = [c for c in df.columns if c not in ['timestamp', 'alert_description', 'source_ip', 'dest_ip', 'user_agent', 'label', 'ticket_number', 'protocol']]
    X = df[feature_cols].fillna(0)
    return X.select_dtypes(include=[np.number])

def prepare_training_data(df: pd.DataFrame) -> tuple:
    X = extract_features(df)
    y = df['label'].astype(int) if 'label' in df.columns else None
    return X, y