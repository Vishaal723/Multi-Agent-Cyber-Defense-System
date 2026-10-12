"""
Verification script for active servers and API endpoints
"""
import urllib.request
import json

def verify():
    print("Checking Frontend (http://localhost:5173)...")
    try:
        req = urllib.request.urlopen("http://localhost:5173", timeout=5)
        html = req.read().decode('utf-8')
        print(f"  [PASS] Frontend is UP! Status: {req.status}, HTML length: {len(html)} bytes")
        assert "MACDS" in html or "root" in html
    except Exception as e:
        print(f"  [FAIL] Frontend check failed: {e}")

    print("\nChecking Backend API (http://127.0.0.1:8000/api/dashboard/stats)...")
    try:
        req = urllib.request.urlopen("http://127.0.0.1:8000/api/dashboard/stats", timeout=5)
        data = json.loads(req.read().decode('utf-8'))
        print(f"  [PASS] Backend API is UP! Status: {req.status}")
        print(f"  [DATA] Total Threats: {data['summary']['total_threats_detected']}, MTTD: {data['summary']['mttd_sec']}s")
    except Exception as e:
        print(f"  [FAIL] Backend check failed: {e}")

    print("\nChecking AI BFS Topology (http://127.0.0.1:8000/api/monitoring/topology/bfs)...")
    try:
        req = urllib.request.urlopen("http://127.0.0.1:8000/api/monitoring/topology/bfs", timeout=5)
        data = json.loads(req.read().decode('utf-8'))
        print(f"  [PASS] BFS Topology Endpoint OK! Discovered nodes: {data['total_nodes_discovered']}")
    except Exception as e:
        print(f"  [FAIL] BFS check failed: {e}")

    print("\nChecking Simulation Endpoint...")
    try:
        post_data = json.dumps({"scenario": "brute_force"}).encode('utf-8')
        req = urllib.request.Request("http://127.0.0.1:8000/api/simulation/run", data=post_data, headers={"Content-Type": "application/json"})
        resp = urllib.request.urlopen(req, timeout=5)
        data = json.loads(resp.read().decode('utf-8'))
        print(f"  [PASS] Simulation OK! Scenario: {data['scenario_title']}, Steps: {len(data['execution_steps'])}")
    except Exception as e:
        print(f"  [FAIL] Simulation check failed: {e}")

if __name__ == "__main__":
    verify()
