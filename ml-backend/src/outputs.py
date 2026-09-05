import pandas as pd
import numpy as np
from datetime import datetime
from typing import List, Dict, Any

try:
    from .models import EnsembleDetector
except ImportError:
    from models import EnsembleDetector

def clean_nan(obj):
    """Recursively replace NaN/None with empty string for JSON serialization"""
    if isinstance(obj, float) and (np.isnan(obj) or np.isinf(obj)):
        return ""
    if obj is None:
        return ""
    if isinstance(obj, dict):
        return {k: clean_nan(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [clean_nan(v) for v in obj]
    if isinstance(obj, pd.Timestamp):
        return str(obj) if not pd.isna(obj) else ""
    if hasattr(obj, '__class__') and 'NaT' in obj.__class__.__name__:
        return ""
    return obj

PLAYBOOKS = {
    'brute_force': {
        'name': 'Brute Force Detection Playbook',
        'trigger': 'Multiple failed authentication attempts from same source',
        'iocs': ['failed_login_count > 10', 'single_source_ip', 'short_time_window'],
        'services': ['SSH', 'RDP', 'VPN', 'Web Authentication', 'Database Auth']
    },
    'port_scan': {
        'name': 'Port Scanning Detection Playbook',
        'trigger': 'Connection attempts to multiple ports from single source',
        'iocs': ['multiple_dest_ports', 'syn_flag_only', 'low_packet_per_connection'],
        'services': ['Network Infrastructure', 'Firewall', 'IDS/IPS']
    },
    'malware_c2': {
        'name': 'Malware C2 Communication Playbook',
        'trigger': 'Beaconing pattern to known/suspicious C2 infrastructure',
        'iocs': ['regular_intervals', 'suspicious_domain', 'known_malware_hash', 'dga_domain'],
        'services': ['Endpoint', 'Proxy', 'DNS', 'Firewall']
    },
    'data_exfil': {
        'name': 'Data Exfiltration Playbook',
        'trigger': 'Unusual large data transfer to external destination',
        'iocs': ['high_byte_ratio', 'unusual_dest_ip', 'off_hours_transfer', 'compressed_encrypted'],
        'services': ['File Server', 'Database', 'Cloud Storage', 'Email', 'Web Proxy']
    },
    'privilege_esc': {
        'name': 'Privilege Escalation Playbook',
        'trigger': 'Successful admin access after failed attempts or unusual elevation',
        'iocs': ['sudo_su_success', 'token_manipulation', 'bypass_uac', 'golden_ticket'],
        'services': ['Active Directory', 'Linux Sudo', 'Windows UAC', 'IAM']
    },
    'lateral_movement': {
        'name': 'Lateral Movement Playbook',
        'trigger': 'Authentication from compromised host to other internal systems',
        'iocs': ['pass_the_hash', 'pass_the_ticket', 'psexec', 'wmi', 'smb_admin_shares'],
        'services': ['SMB', 'RPC', 'WMI', 'WinRM', 'SSH']
    },
    'web_attack': {
        'name': 'Web Application Attack Playbook',
        'trigger': 'SQLi, XSS, RCE, or path traversal attempts detected',
        'iocs': ['sql_keywords', 'script_tags', 'path_traversal', 'cmd_injection', 'xxe_payload'],
        'services': ['Web Application', 'WAF', 'API Gateway', 'Database']
    },
    'insider_threat': {
        'name': 'Insider Threat Playbook',
        'trigger': 'Authorized user accessing unusual resources or large data downloads',
        'iocs': ['off_hours_access', 'unusual_resource_access', 'bulk_download', 'privilege_abuse'],
        'services': ['File Server', 'Database', 'CRM', 'ERP', 'Source Control']
    }
}

RULE_MAPPING = {
    'failed_login': ('brute_force', 'Multiple failed login attempts', 'Authentication Service'),
    'port_scan': ('port_scan', 'Port scanning activity detected', 'Network Infrastructure'),
    'beaconing': ('malware_c2', 'C2 beaconing pattern detected', 'Endpoint/Network'),
    'large_transfer': ('data_exfil', 'Large data transfer to external IP', 'File/Database Server'),
    'priv_esc': ('privilege_esc', 'Privilege escalation attempt', 'Identity Management'),
    'lateral': ('lateral_movement', 'Lateral movement detected', 'Internal Services'),
    'web_attack': ('web_attack', 'Web application attack detected', 'Web Application'),
    'insider': ('insider_threat', 'Insider threat indicator', 'Business Applications')
}

def generate_reasoning(row: pd.Series, ensemble_result: Dict) -> str:
    reasons = []
    
    if ensemble_result['supervised_pred'] == 1:
        reasons.append("Supervised model (Random Forest) classified as attack based on learned patterns")
    else:
        reasons.append("Supervised model (Random Forest) classified as normal based on learned patterns")
    
    if ensemble_result['unsupervised_pred'] == 1:
        reasons.append(f"Unsupervised model (K-Means) clustered as attack (anomaly score: {ensemble_result['anomaly_score']:.3f})")
    else:
        reasons.append(f"Unsupervised model clustered as normal (anomaly score: {ensemble_result['anomaly_score']:.3f})")
    
    if row.get('keyword_match_count', 0) > 0:
        reasons.append(f"Attack keywords detected in description ({int(row['keyword_match_count'])} matches)")
    
    if row.get('high_volume', 0) == 1:
        reasons.append("Abnormally high data volume detected")
    
    if row.get('src_port_risk', 0) == 1 or row.get('dst_port_risk', 0) == 1:
        reasons.append("Connection involves high-risk port")
    
    if row.get('protocol_risk', 0) == 1:
        reasons.append("High-risk protocol detected")
    
    if row.get('suspicious_ua', 0) == 1:
        reasons.append("Suspicious user agent detected")
    
    if row.get('error_status', 0) == 1:
        reasons.append("HTTP error status codes observed")
    
    if row.get('src_ip_rare', 0) == 1:
        reasons.append("Source IP is rare/low frequency")
    
    if row.get('is_night', 0) == 1:
        reasons.append("Activity occurred during off-hours (22:00-05:00)")
    
    return " | ".join(reasons)

def determine_escalation(row: pd.Series, ensemble_result: Dict) -> tuple:
    confidence = ensemble_result['confidence']
    classification = ensemble_result['classification']
    
    if classification == 'Attack':
        if confidence >= 0.85:
            return ('Yes', 'High confidence attack detection - immediate escalation required')
        elif confidence >= 0.7:
            return ('Yes', 'Medium-high confidence - escalate for investigation')
        elif confidence >= 0.55:
            return ('Yes', 'Moderate confidence - recommend escalation and review')
        else:
            return ('Review', 'Low confidence - manual review recommended before escalation')
    else:
        if confidence <= 0.3:
            return ('Review', 'Low confidence normal classification - verify with analyst')
        return ('No', 'Classified as normal with sufficient confidence')

def determine_tp_fp(row: pd.Series, ensemble_result: Dict, ground_truth: int = None) -> str:
    if ground_truth is not None:
        pred = 1 if ensemble_result['classification'] == 'Attack' else 0
        if pred == 1 and ground_truth == 1:
            return 'TP'
        elif pred == 1 and ground_truth == 0:
            return 'FP'
        elif pred == 0 and ground_truth == 1:
            return 'FN'
        else:
            return 'TN'
    return 'Unknown'

def identify_triggered_playbook(row: pd.Series) -> List[str]:
    triggered = []
    desc = str(row.get('alert_description', '')).lower()
    
    if any(kw in desc for kw in ['failed login', 'brute force', 'password guess', 'authentication failure']):
        triggered.append('brute_force')
    if row.get('dst_port_risk', 0) == 1 and row.get('src_port_risk', 0) == 0:
        triggered.append('port_scan')
    if row.get('keyword_match_count', 0) > 0:
        malware_kws = ['malware', 'trojan', 'c2', 'beacon', 'backdoor', 'rootkit', 'apt']
        if any(kw in desc for kw in malware_kws):
            triggered.append('malware_c2')
    if row.get('high_volume', 0) == 1 and row.get('byte_ratio', 0) > 10:
        triggered.append('data_exfil')
    if any(kw in desc for kw in ['privilege escalation', 'sudo', 'uac bypass', 'token']):
        triggered.append('privilege_esc')
    if any(kw in desc for kw in ['lateral', 'psexec', 'wmi', 'pass the hash', 'smb']):
        triggered.append('lateral_movement')
    if any(kw in desc for kw in ['sql injection', 'xss', 'path traversal', 'rce', 'command injection']):
        triggered.append('web_attack')
    if row.get('src_ip_rare', 0) == 1 and row.get('high_volume', 0) == 1:
        triggered.append('insider_threat')
    
    return triggered if triggered else ['brute_force']

def generate_file_a(df: pd.DataFrame, results: List[Dict], investigators: List[str] = None) -> pd.DataFrame:
    if investigators is None:
        investigators = [f'Analyst-{(i % 5) + 1:02d}' for i in range(len(df))]
    
    output_rows = []
    for i, (_, row) in enumerate(df.iterrows()):
        ensemble_result = results[i]
        classification = ensemble_result['classification']
        confidence = ensemble_result['confidence']
        
        escalation_needed, escalation_reason = determine_escalation(row, ensemble_result)
        tp_fp = determine_tp_fp(row, ensemble_result, row.get('label'))
        reasoning = generate_reasoning(row, ensemble_result)
        
        ticket_num = row.get('ticket_number', f'TKT-{datetime.now().strftime("%Y%m%d")}-{i+1:05d}')
        if pd.isna(ticket_num) or ticket_num == '':
            ticket_num = f'TKT-{datetime.now().strftime("%Y%m%d")}-{i+1:05d}'
        
        output_rows.append({
            'Investigator': investigators[i] if i < len(investigators) else f'Analyst-{(i % 5) + 1:02d}',
            'Ticket_Number': clean_nan(ticket_num),
            'Potential_Attack_Classification': clean_nan(classification),
            'TP_or_FP': clean_nan(tp_fp),
            'Escalation_Needed': clean_nan(escalation_needed),
            'Reasoning': clean_nan(reasoning)
        })
    
    return pd.DataFrame(output_rows)

def generate_file_b(df: pd.DataFrame, results: List[Dict]) -> pd.DataFrame:
    output_rows = []
    for i, (_, row) in enumerate(df.iterrows()):
        ensemble_result = results[i]
        triggered_playbooks = identify_triggered_playbook(row)
        
        for pb_key in triggered_playbooks:
            pb = PLAYBOOKS[pb_key]
            ioc_details = []
            if 'failed_login' in str(row.get('alert_description', '')).lower():
                ioc_details.append('Failed login count threshold exceeded')
            if row.get('dst_port_risk', 0) == 1:
                ioc_details.append(f"High-risk destination port: {row.get('dest_port', 'unknown')}")
            if row.get('keyword_match_count', 0) > 0:
                ioc_details.append(f"Attack keywords matched: {int(row['keyword_match_count'])}")
            if row.get('high_volume', 0) == 1:
                ioc_details.append(f"High volume transfer: {row.get('total_bytes', 0):,} bytes")
            if row.get('suspicious_ua', 0) == 1:
                ioc_details.append(f"Suspicious user agent: {row.get('user_agent', 'unknown')[:50]}")
            if row.get('src_ip_rare', 0) == 1:
                ioc_details.append(f"Rare source IP: {row.get('source_ip', 'unknown')}")
            
            ticket_num = row.get('ticket_number', f'TKT-{datetime.now().strftime("%Y%m%d")}-{i+1:05d}')
            if pd.isna(ticket_num) or ticket_num == '':
                ticket_num = f'TKT-{datetime.now().strftime("%Y%m%d")}-{i+1:05d}'
            
            timestamp = row.get('timestamp', datetime.now().isoformat())
            if pd.isna(timestamp):
                timestamp = datetime.now().isoformat()
            
            output_rows.append({
                'Ticket_Number': clean_nan(ticket_num),
                'Rule_Playbook_Triggered': clean_nan(pb['name']),
                'Rule_Triggering_Activity_IoC': clean_nan('; '.join(ioc_details) if ioc_details else pb['trigger']),
                'Timestamp_of_IoC': clean_nan(timestamp),
                'Service_Functionality_Affected_Potential': clean_nan('; '.join(pb['services']))
            })
    
    return pd.DataFrame(output_rows)

def run_full_pipeline(df: pd.DataFrame, investigators: List[str] = None) -> Dict[str, pd.DataFrame]:
    detector = EnsembleDetector()
    detector.train(df)
    results = detector.predict(df)
    
    file_a = generate_file_a(df, results, investigators)
    file_b = generate_file_b(df, results)
    
    return {'file_a': file_a, 'file_b': file_b, 'detector': detector, 'raw_results': results}