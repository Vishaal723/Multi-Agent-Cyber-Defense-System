"""
Network Monitoring Agent Module (PRD Section 10.2 & Section 27.1)
Represents the system's perception layer.
Implements:
- Breadth-First Search (BFS) for network topology exploration
- Depth-First Search (DFS) for reachable subnet traversal
- Live packet generation and metadata inspection
- Traffic rate & bandwidth calculation
- Rogue & unauthorized device discovery
"""
import uuid
import time
import random
from collections import deque
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

class NetworkMonitoringAgent:
    def __init__(self, db_conn_factory, coordinator):
        self.agent_id = "agent-netmon-002"
        self.name = "Network Monitoring Agent"
        self.type = "Perception"
        self.db_conn_factory = db_conn_factory
        self.coordinator = coordinator
        self.packet_buffer: List[Dict[str, Any]] = []
        self.traffic_history: List[Dict[str, Any]] = []
        self.current_packet_rate = 1450  # packets/sec
        self.current_bandwidth_mbps = 84.5  # Mbps
        self.init_topology()

    def init_topology(self):
        """Builds a realistic enterprise network graph representation"""
        self.topology_graph = {
            "Router-Core": ["Switch-DMZ", "Switch-Internal-LAN", "Switch-Secure-DB"],
            "Switch-DMZ": ["Router-Core", "Web-App-Gateway-01", "Public-DNS-Proxy"],
            "Switch-Internal-LAN": ["Router-Core", "Auth-ActiveDirectory-Svr", "Workstation-Finance-04", "Workstation-Dev-09", "Unknown-ESP32-Rogue"],
            "Switch-Secure-DB": ["Router-Core", "Database-Prod-Cluster", "Backup-Storage-Vault"],
            "Web-App-Gateway-01": ["Switch-DMZ"],
            "Public-DNS-Proxy": ["Switch-DMZ"],
            "Auth-ActiveDirectory-Svr": ["Switch-Internal-LAN"],
            "Workstation-Finance-04": ["Switch-Internal-LAN"],
            "Workstation-Dev-09": ["Switch-Internal-LAN"],
            "Unknown-ESP32-Rogue": ["Switch-Internal-LAN"],
            "Database-Prod-Cluster": ["Switch-Secure-DB"],
            "Backup-Storage-Vault": ["Switch-Secure-DB"]
        }
        
        self.node_metadata = {
            "Router-Core": {"ip": "192.168.1.1", "type": "Gateway", "status": "Secure"},
            "Switch-DMZ": {"ip": "192.168.1.2", "type": "Switch", "status": "Secure"},
            "Switch-Internal-LAN": {"ip": "192.168.1.3", "type": "Switch", "status": "Warning"},
            "Switch-Secure-DB": {"ip": "192.168.1.4", "type": "Switch", "status": "Secure"},
            "Web-App-Gateway-01": {"ip": "192.168.1.20", "type": "Web Server", "status": "Secure"},
            "Public-DNS-Proxy": {"ip": "192.168.1.53", "type": "DNS Server", "status": "Secure"},
            "Auth-ActiveDirectory-Svr": {"ip": "192.168.1.10", "type": "AD Server", "status": "Secure"},
            "Workstation-Finance-04": {"ip": "192.168.1.105", "type": "Workstation", "status": "Secure"},
            "Workstation-Dev-09": {"ip": "192.168.1.112", "type": "Workstation", "status": "Secure"},
            "Unknown-ESP32-Rogue": {"ip": "192.168.1.244", "type": "Rogue Device", "status": "Threat"},
            "Database-Prod-Cluster": {"ip": "192.168.1.15", "type": "Database", "status": "Secure"},
            "Backup-Storage-Vault": {"ip": "192.168.1.16", "type": "Storage", "status": "Secure"}
        }

    def run_bfs_discovery(self, start_node: str = "Router-Core") -> Dict[str, Any]:
        """
        AI Concept Unit I: Breadth First Search (BFS) for Network Discovery & Topology Exploration
        Traverses network level-by-level to detect reachable nodes, latency distance, and rogue components.
        """
        if start_node not in self.topology_graph:
            start_node = "Router-Core"

        visited = []
        queue = deque([(start_node, [start_node], 0)])
        visited_set = {start_node}
        traversal_steps = []
        discovered_devices = []

        while queue:
            current, path, depth = queue.popleft()
            meta = self.node_metadata.get(current, {"ip": "Unknown", "type": "Host", "status": "Online"})
            
            step_record = {
                "step": len(traversal_steps) + 1,
                "node": current,
                "depth": depth,
                "ip": meta["ip"],
                "device_type": meta["type"],
                "status": meta["status"],
                "path_from_root": path
            }
            traversal_steps.append(step_record)
            discovered_devices.append(meta)

            for neighbor in self.topology_graph.get(current, []):
                if neighbor not in visited_set:
                    visited_set.add(neighbor)
                    queue.append((neighbor, path + [neighbor], depth + 1))

        self.coordinator.register_message(
            sender=self.name,
            recipient="Coordinator Agent",
            message_type="TOPOLOGY_DISCOVERY_BFS",
            payload={"discovered_nodes_count": len(traversal_steps), "root": start_node}
        )

        return {
            "algorithm": "Breadth First Search (BFS)",
            "unit": "Unit I - Intelligent Agents & Uninformed Search",
            "root_node": start_node,
            "total_nodes_discovered": len(traversal_steps),
            "traversal_steps": traversal_steps,
            "graph": self.topology_graph,
            "nodes_metadata": self.node_metadata
        }

    def run_dfs_traversal(self, start_node: str = "Router-Core") -> Dict[str, Any]:
        """
        AI Concept Unit I: Depth First Search (DFS) for deep attack path and lateral movement tracing.
        """
        if start_node not in self.topology_graph:
            start_node = "Router-Core"

        visited_set = set()
        traversal_steps = []

        def dfs_visit(node, path, depth):
            visited_set.add(node)
            meta = self.node_metadata.get(node, {"ip": "Unknown", "type": "Host", "status": "Online"})
            traversal_steps.append({
                "step": len(traversal_steps) + 1,
                "node": node,
                "depth": depth,
                "ip": meta["ip"],
                "path": path
            })
            for neighbor in self.topology_graph.get(node, []):
                if neighbor not in visited_set:
                    dfs_visit(neighbor, path + [neighbor], depth + 1)

        dfs_visit(start_node, [start_node], 0)

        return {
            "algorithm": "Depth First Search (DFS)",
            "unit": "Unit I - Problem-Solving Agents",
            "root_node": start_node,
            "total_nodes_traversed": len(traversal_steps),
            "traversal_steps": traversal_steps
        }

    def generate_live_packet(self, custom_attributes: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Generates real-time packet telemetry with protocols, payload signatures, and anomaly flags"""
        protocols = ["TCP", "UDP", "HTTP", "HTTPS", "DNS", "SSH", "ICMP", "SMB"]
        sources = ["192.168.1.105", "192.168.1.112", "45.33.32.156", "185.220.101.5", "10.0.0.44", "192.168.1.244"]
        destinations = ["192.168.1.1", "192.168.1.15", "192.168.1.20", "8.8.8.8", "192.168.1.10"]

        pkt_id = str(uuid.uuid4())[:8]
        now = datetime.now(timezone.utc).isoformat()

        if custom_attributes:
            packet = {
                "packet_id": f"PKT-{pkt_id}",
                "timestamp": now,
                "source_ip": custom_attributes.get("source_ip", random.choice(sources)),
                "destination_ip": custom_attributes.get("destination_ip", random.choice(destinations)),
                "protocol": custom_attributes.get("protocol", "TCP"),
                "port": custom_attributes.get("port", 80),
                "payload_size": custom_attributes.get("payload_size", 1024),
                "payload_snippet": custom_attributes.get("payload_snippet", "GET / HTTP/1.1"),
                "flag": custom_attributes.get("flag", "NORMAL"),
                "is_suspicious": custom_attributes.get("is_suspicious", False)
            }
        else:
            is_suspicious = random.random() < 0.15
            proto = random.choice(protocols)
            src = random.choice(sources)
            dst = random.choice(destinations)
            port = 443 if proto == "HTTPS" else (80 if proto == "HTTP" else (53 if proto == "DNS" else (22 if proto == "SSH" else random.randint(1024, 65535))))
            
            payload_snippet = "Encrypted TLS payload" if proto in ["HTTPS", "SSH"] else "Standard network frame"
            flag = "NORMAL"
            if src in ["45.33.32.156", "185.220.101.5", "192.168.1.244"]:
                flag = "SUSPICIOUS"
                is_suspicious = True
                payload_snippet = "SYN scan / unauthorized probe detected"

            packet = {
                "packet_id": f"PKT-{pkt_id}",
                "timestamp": now,
                "source_ip": src,
                "destination_ip": dst,
                "protocol": proto,
                "port": port,
                "payload_size": random.randint(64, 4096),
                "payload_snippet": payload_snippet,
                "flag": flag,
                "is_suspicious": is_suspicious
            }

        self.packet_buffer.append(packet)
        if len(self.packet_buffer) > 100:
            self.packet_buffer.pop(0)

        return packet

    def get_traffic_statistics(self) -> Dict[str, Any]:
        """Calculates real-time packet rate, bandwidth, protocol usage and IP distribution (FR-010)"""
        # Dynamic variation
        self.current_packet_rate = max(200, min(10000, self.current_packet_rate + random.randint(-150, 180)))
        self.current_bandwidth_mbps = max(10.0, min(950.0, round(self.current_bandwidth_mbps + random.uniform(-5.0, 6.0), 2)))

        protocol_dist = {
            "HTTPS": 48.5,
            "TCP": 22.1,
            "DNS": 14.2,
            "HTTP": 8.4,
            "SSH": 4.1,
            "UDP/Other": 2.7
        }

        source_ip_dist = [
            {"ip": "192.168.1.0/24 (LAN)", "percentage": 64.2, "packets": int(self.current_packet_rate * 0.642)},
            {"ip": "45.33.32.156 (External)", "percentage": 18.5, "packets": int(self.current_packet_rate * 0.185)},
            {"ip": "185.220.101.5 (External)", "percentage": 11.3, "packets": int(self.current_packet_rate * 0.113)},
            {"ip": "192.168.1.244 (Rogue IoT)", "percentage": 6.0, "packets": int(self.current_packet_rate * 0.060)}
        ]

        stat_snapshot = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "packet_rate_pps": self.current_packet_rate,
            "bandwidth_mbps": self.current_bandwidth_mbps,
            "protocol_distribution": protocol_dist,
            "source_ip_distribution": source_ip_dist,
            "active_connections": random.randint(120, 280),
            "dropped_packets": random.randint(0, 12)
        }

        self.traffic_history.append(stat_snapshot)
        if len(self.traffic_history) > 30:
            self.traffic_history.pop(0)

        return stat_snapshot
