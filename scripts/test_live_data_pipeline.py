"""
test_live_data_pipeline.py
Performs end-to-end integration testing of the generated testing datasets
against the running SAT-SA Node API and FastAPI ML Backend.
"""

import os
import json
import urllib.request
import urllib.error
import urllib.parse
import mimetypes

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "testing_datasets")
API_BASE = "http://localhost:3001/api"
ML_BASE = "http://localhost:8000"

def log(msg, status="INFO"):
    colors = {
        "INFO": "\033[94m",
        "PASS": "\033[92m",
        "FAIL": "\033[91m",
        "WARN": "\033[93m"
    }
    reset = "\033[0m"
    print(f"{colors.get(status, '')}[{status}] {msg}{reset}")

def test_ml_backend_batch_evaluation():
    log("Testing Dataset 4 with ML Backend (/evaluate-csv)...")
    csv_path = os.path.join(DATA_DIR, "04_soc_efficiency_ml_batch_test.csv")
    if not os.path.exists(csv_path):
        log(f"File not found: {csv_path}", "FAIL")
        return False

    with open(csv_path, "rb") as f:
        file_bytes = f.read()

    boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="file"; filename="04_soc_efficiency_ml_batch_test.csv"\r\n'
        f"Content-Type: text/csv\r\n\r\n"
    ).encode("utf-8") + file_bytes + f"\r\n--{boundary}--\r\n".encode("utf-8")

    req = urllib.request.Request(
        f"{ML_BASE}/evaluate-csv",
        data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
        method="POST"
    )

    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            if data.get("success"):
                log(f"ML evaluation successful for {data.get('evaluated_entities')} entity-periods", "PASS")
                sample = data["results"][0]
                log(f"Sample entity: {sample.get('entity_id')} ({sample.get('period')})", "INFO")
                log(f"Rule findings generated: {len(sample.get('rule_findings', []))}", "INFO")
                return True
            else:
                log(f"ML evaluation response error: {data}", "FAIL")
                return False
    except Exception as e:
        log(f"Failed to call ML backend: {e}", "FAIL")
        return False

def test_node_api_json_ingestion():
    log("Testing Dataset 1 with Node API (/api/ingestion/api)...")
    json_path = os.path.join(DATA_DIR, "01_siem_alerts_airgap_CSE014_scada.json")
    if not os.path.exists(json_path):
        log(f"File not found: {json_path}", "FAIL")
        return False

    with open(json_path, "r", encoding="utf-8") as f:
        records = json.load(f)

    # Ingest the first 30 alerts as a live batch
    batch_records = records[:30]
    payload = json.dumps({"records": batch_records}).encode("utf-8")

    req = urllib.request.Request(
        f"{API_BASE}/ingestion/api",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            if data.get("success"):
                inserted = data.get("data", {}).get("inserted")
                total = data.get("data", {}).get("total")
                quality = data.get("data", {}).get("batch", {}).get("qualityPct")
                log(f"Successfully ingested {inserted}/{total} alerts (Quality: {quality}%)", "PASS")
                return True
            else:
                log(f"Ingestion API error: {data}", "FAIL")
                return False
    except Exception as e:
        log(f"Failed to ingest via Node API: {e}", "FAIL")
        return False

def test_node_api_csv_upload():
    log("Testing Dataset 2 with Node API Multipart Upload (/api/ingestion/upload)...")
    csv_path = os.path.join(DATA_DIR, "02_syslog_cef_alerts_CSE027_corebanking.csv")
    if not os.path.exists(csv_path):
        log(f"File not found: {csv_path}", "FAIL")
        return False

    with open(csv_path, "rb") as f:
        file_bytes = f.read()

    boundary = "----WebKitFormBoundarySupervisoryTest"
    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="file"; filename="02_syslog_cef_alerts_CSE027_corebanking.csv"\r\n'
        f"Content-Type: text/csv\r\n\r\n"
    ).encode("utf-8") + file_bytes + f"\r\n--{boundary}--\r\n".encode("utf-8")

    req = urllib.request.Request(
        f"{API_BASE}/ingestion/upload",
        data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
        method="POST"
    )

    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            if data.get("success"):
                inserted = data.get("data", {}).get("inserted")
                total = data.get("data", {}).get("total")
                quality = data.get("data", {}).get("batch", {}).get("qualityPct")
                log(f"Uploaded and ingested {inserted}/{total} CSV alerts (Quality: {quality}%)", "PASS")
                return True
            else:
                log(f"Upload API error: {data}", "FAIL")
                return False
    except Exception as e:
        log(f"Failed to upload via Node API: {e}", "FAIL")
        return False

def test_supervisory_detection_triggers():
    log("Verifying Execution Gaps and Anomaly detection on ingested test data...")
    try:
        # Check gaps for CSE-014
        req = urllib.request.Request(f"{API_BASE}/analytics/gaps?entityId=CSE-014")
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            gaps = data.get("data", [])
            log(f"Detected {len(gaps)} execution gaps for CSE-014", "PASS")
            for g in gaps[:2]:
                log(f"  Gap: {g.get('title')} (Severity: {g.get('severity')}, Confidence: {g.get('confidence')}%)", "INFO")

        # Check anomalies for CSE-027
        req = urllib.request.Request(f"{API_BASE}/analytics/anomalies?entityId=CSE-027")
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            anomalies = data.get("data", [])
            log(f"Detected {len(anomalies)} anomalies for CSE-027", "PASS")

        return True
    except Exception as e:
        log(f"Error checking analytics triggers: {e}", "FAIL")
        return False

def main():
    print("=" * 70)
    print("RUNNING LIVE END-TO-END DATA PIPELINE VALIDATION")
    print("=" * 70)

    results = []
    results.append(("ML Backend Batch Evaluation", test_ml_backend_batch_evaluation()))
    results.append(("Air-Gap SIEM JSON Ingestion", test_node_api_json_ingestion()))
    results.append(("Syslog/CEF CSV Ingestion", test_node_api_csv_upload()))
    results.append(("Supervisory Gap Detection Triggers", test_supervisory_detection_triggers()))

    print("=" * 70)
    print("TEST EXECUTION SUMMARY:")
    all_passed = True
    for name, success in results:
        status_str = "PASSED" if success else "FAILED"
        print(f"  - {name}: {status_str}")
        if not success:
            all_passed = False
    print("=" * 70)

    if all_passed:
        log("ALL TEST DATASETS SUCCESSFULLY VALIDATED IN LIVE APPLICATION!", "PASS")
    else:
        log("One or more tests failed.", "FAIL")

if __name__ == "__main__":
    main()
