import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import random
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from .models import EnsembleDetector
    from .features import extract_features
except ImportError:
    from models import EnsembleDetector
    from features import extract_features

ATTACK_DESCRIPTIONS = [
    "Brute force attack detected on SSH port 22 from 192.168.1.100",
    "Multiple failed login attempts for admin account",
    "SQL injection attempt in login parameter",
    "Suspicious PowerShell execution with encoded command",
    "C2 beaconing to known malicious domain evil.com",
    "Large data transfer to external IP 203.0.113.50",
    "Privilege escalation via sudo exploitation",
    "Lateral movement using PsExec to WORKSTATION-05",
    "Port scanning activity from 10.0.0.50",
    "Malware detected: Trojan.Win32.Emotet",
    "Ransomware encryption activity on file server",
    "Credential dumping using Mimikatz",
    "Pass-the-hash attack on domain controller",
    "DNS tunneling detected to suspicious domain",
    "Web shell uploaded to /var/www/html/shell.php",
    "Unauthorized admin account creation",
    "Suspicious scheduled task creation",
    "Registry modification for persistence",
    "WMI remote command execution",
    "SMB relay attack detected"
]

NORMAL_DESCRIPTIONS = [
    "Regular SSH login from authorized admin workstation",
    "Scheduled database backup completed successfully",
    "Windows update downloaded and installed",
    "User accessed SharePoint document library",
    "Email sent via Exchange server",
    "VPN connection from corporate laptop",
    "Print job sent to network printer",
    "DNS query for internal domain",
    "HTTP request to company intranet",
    "File sync with OneDrive completed",
    "Teams meeting recording saved to Stream",
    "Outlook sync with Exchange Online",
    "Antivirus definition update downloaded",
    "Group policy refresh completed",
    "Certificate renewal for internal CA",
    "DHCP lease renewal for workstation",
    "NTP time synchronization successful",
    "WSUS update scan completed",
    "Inventory scan by SCCM client",
    "Log rotation performed on syslog server"
]

ATTACK_IPS = [
    '192.168.1.100', '10.0.0.50', '172.16.0.25', '203.0.113.50',
    '198.51.100.10', '45.33.32.156', '185.220.101.1', '91.219.194.10'
]

NORMAL_IPS = [
    '192.168.1.10', '192.168.1.25', '192.168.10.5', '192.168.10.12',
    '10.0.1.50', '10.0.1.75', '10.0.2.10', '10.0.2.20',
    '172.16.1.100', '172.16.1.105', '172.16.2.50', '172.16.2.55'
]

USER_AGENTS_NORMAL = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Microsoft-Exchange/15.01', 'MSOffice/16.0', 'OneDrive/23.0',
    'Teams/1.5.0', 'SCCM/5.0', 'WSUS/10.0'
]

USER_AGENTS_SUSPICIOUS = [
    'sqlmap/1.6', 'nmap/7.93', 'Nikto/2.1.6', 'dirb/2.22',
    'gobuster/3.1', 'curl/7.68', 'wget/1.20', 'python-requests/2.28',
    'Mozilla/5.0 (compatible; bot)', 'masscan/1.3'
]

PROTOCOLS = ['tcp', 'udp', 'http', 'https', 'ssh', 'rdp', 'smb', 'dns', 'ldap', 'kerberos', 'ftp', 'smtp']
PORTS = [22, 23, 25, 53, 80, 135, 139, 389, 443, 445, 465, 587, 636, 1433, 3306, 3389, 5432, 5900, 5985, 5986, 8080, 8443]

def generate_training_data(n_samples: int = 5000, attack_ratio: float = 0.3) -> pd.DataFrame:
    n_attack = int(n_samples * attack_ratio)
    n_normal = n_samples - n_attack
    
    rows = []
    base_time = datetime.now() - timedelta(days=30)
    
    for i in range(n_attack):
        desc = random.choice(ATTACK_DESCRIPTIONS)
        src_ip = random.choice(ATTACK_IPS + NORMAL_IPS[:4])
        dst_ip = random.choice(NORMAL_IPS + ATTACK_IPS[:4])
        protocol = random.choice(['ssh', 'rdp', 'smb', 'http', 'https', 'ldap', 'kerberos', 'dns'])
        port = random.choice([22, 3389, 445, 80, 443, 389, 88, 53, 135, 139, 5985, 5986])
        
        hour = random.choices(range(24), weights=[0.5]*6 + [1]*10 + [0.5]*8)[0]
        timestamp = base_time + timedelta(days=random.randint(0, 29), hours=hour, minutes=random.randint(0, 59))
        
        rows.append({
            'timestamp': timestamp.isoformat(),
            'source_ip': src_ip,
            'dest_ip': dst_ip,
            'source_port': random.randint(1024, 65535),
            'dest_port': port,
            'protocol': protocol,
            'bytes_sent': random.randint(1000, 1000000) if 'exfil' in desc.lower() or 'transfer' in desc.lower() else random.randint(100, 50000),
            'bytes_received': random.randint(100, 50000),
            'packet_count': random.randint(10, 5000),
            'alert_description': desc,
            'user_agent': random.choice(USER_AGENTS_SUSPICIOUS) if random.random() < 0.3 else random.choice(USER_AGENTS_NORMAL),
            'http_status': random.choice([200, 401, 403, 404, 500]) if protocol in ['http', 'https'] else None,
            'ticket_number': f'TKT-{(base_time + timedelta(days=random.randint(0, 29))).strftime("%Y%m%d")}-{i+1:05d}',
            'label': 1
        })
    
    for i in range(n_normal):
        desc = random.choice(NORMAL_DESCRIPTIONS)
        src_ip = random.choice(NORMAL_IPS)
        dst_ip = random.choice(NORMAL_IPS)
        protocol = random.choice(['http', 'https', 'dns', 'tcp', 'udp', 'ssh', 'rdp', 'smb'])
        port = random.choice([80, 443, 53, 22, 3389, 445, 135, 389])
        
        hour = random.choices(range(24), weights=[0.3]*6 + [1]*12 + [0.3]*6)[0]
        timestamp = base_time + timedelta(days=random.randint(0, 29), hours=hour, minutes=random.randint(0, 59))
        
        rows.append({
            'timestamp': timestamp.isoformat(),
            'source_ip': src_ip,
            'dest_ip': dst_ip,
            'source_port': random.randint(1024, 65535),
            'dest_port': port,
            'protocol': protocol,
            'bytes_sent': random.randint(100, 50000),
            'bytes_received': random.randint(100, 100000),
            'packet_count': random.randint(1, 1000),
            'alert_description': desc,
            'user_agent': random.choice(USER_AGENTS_NORMAL),
            'http_status': random.choice([200, 301, 302, 304]) if protocol in ['http', 'https'] else None,
            'ticket_number': f'TKT-{(base_time + timedelta(days=random.randint(0, 29))).strftime("%Y%m%d")}-{n_attack+i+1:05d}',
            'label': 0
        })
    
    df = pd.DataFrame(rows)
    return df.sample(frac=1, random_state=42).reset_index(drop=True)

def generate_inference_data(n_samples: int = 100) -> pd.DataFrame:
    return generate_training_data(n_samples, attack_ratio=0.4).drop(columns=['label'])

if __name__ == "__main__":
    df = generate_training_data(5000)
    df.to_csv('training_data.csv', index=False)
    print(f"Generated {len(df)} training samples")
    print(f"Attack: {(df['label']==1).sum()}, Normal: {(df['label']==0).sum()}")
    
    test_df = generate_inference_data(100)
    test_df.to_csv('inference_data.csv', index=False)
    print(f"Generated {len(test_df)} inference samples")