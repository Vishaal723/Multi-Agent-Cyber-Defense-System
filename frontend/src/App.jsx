import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import LoginModal from './components/LoginModal';
import DashboardView from './components/DashboardView';
import LiveMonitoringView from './components/LiveMonitoringView';
import ThreatsView from './components/ThreatsView';
import IncidentsView from './components/IncidentsView';
import AIAlgorithmsLabView from './components/AIAlgorithmsLabView';
import KnowledgeBaseView from './components/KnowledgeBaseView';
import RuleManagementView from './components/RuleManagementView';
import AgentsView from './components/AgentsView';
import AttackSimulatorView from './components/AttackSimulatorView';
import ReportsView from './components/ReportsView';
import AuditLogsView from './components/AuditLogsView';
import UserManagementView from './components/UserManagementView';
import SettingsView from './components/SettingsView';
import { api, LiveTelemetrySocket, removeAuthToken } from './api/client';

export default function App() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [currentUser, setCurrentUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [wsStatus, setWsStatus] = useState('connecting');
  const [telemetryData, setTelemetryData] = useState(null);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [dashboardError, setDashboardError] = useState(null);
  const [preselectedIncidentId, setPreselectedIncidentId] = useState(null);

  // Validate the HttpOnly session cookie before loading any protected data.
  useEffect(() => {
    let active = true;
    api.getMe().then((user) => {
      if (active) setCurrentUser(user);
    }).catch(() => {
      removeAuthToken();
      localStorage.removeItem('macds_user');
      if (active) setCurrentUser(null);
    }).finally(() => { if (active) setAuthReady(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const onUnauthorized = () => {
      setCurrentUser(null);
      setIsLoginOpen(true);
    };
    window.addEventListener('macds:unauthorized', onUnauthorized);
    return () => window.removeEventListener('macds:unauthorized', onUnauthorized);
  }, []);

  // Fetch initial dashboard metrics
  const fetchDashboardStats = async () => {
    try {
      const data = await api.getDashboardStats();
      setDashboardStats(data);
      setDashboardError(null);
    } catch (e) {
      console.error('Error loading dashboard stats:', e);
      setDashboardError(e?.message || 'Unable to load dashboard metrics.');
      setDashboardStats(null);
    }
  };

  useEffect(() => {
    if (!currentUser) return undefined;
    fetchDashboardStats();
    const interval = setInterval(fetchDashboardStats, 5000);
    return () => clearInterval(interval);
  }, [currentUser]);

  // WebSocket Live Telemetry Subscriber
  useEffect(() => {
    if (!currentUser) return undefined;
    const socket = new LiveTelemetrySocket(
      (msg) => {
        if (msg.type === 'TELEMETRY_UPDATE') {
          setTelemetryData(msg);
        }
      },
      (status) => {
        setWsStatus(status);
      }
    );

    return () => socket.destroy();
  }, [currentUser]);

  const handleLogout = async () => {
    try { await api.logout(); } catch { /* The local view still clears if the server session expired. */ }
    removeAuthToken();
    localStorage.removeItem('macds_user');
    setCurrentUser(null);
    setIsLoginOpen(true);
  };

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    setIsLoginOpen(false);
    fetchDashboardStats();
  };

  const handleOpenIncident = (incidentId) => {
    setPreselectedIncidentId(incidentId);
    setCurrentTab('incidents');
  };

  return (
    <div className="app-container">
      {/* Navigation Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          setPreselectedIncidentId(null);
        }}
        currentUser={currentUser}
      />

      {/* Main View Area */}
      <div className="main-content">
        {/* Top SOC Header */}
        <Header
          currentTab={currentTab}
          currentUser={currentUser}
          onOpenLogin={() => setIsLoginOpen(true)}
          onLogout={handleLogout}
          wsStatus={wsStatus}
          telemetryData={telemetryData}
        />

        {/* Page Content Router */}
        <main className="page-body">
          {!authReady && <div className="glass-panel" role="status">Checking secure session…</div>}
          {authReady && !currentUser && <div className="glass-panel">Sign in to access the security console.</div>}
          {authReady && currentUser && <>
          {currentTab === 'dashboard' && (
            <DashboardView
              dashboardStats={dashboardStats}
              dashboardError={dashboardError}
              telemetryData={telemetryData}
              onSelectTab={setCurrentTab}
              onOpenIncident={handleOpenIncident}
            />
          )}

          {currentTab === 'monitoring' && (
            <LiveMonitoringView telemetryData={telemetryData} />
          )}

          {currentTab === 'threats' && (
            <ThreatsView onSelectIncident={handleOpenIncident} />
          )}

          {currentTab === 'incidents' && (
            <IncidentsView preselectedIncidentId={preselectedIncidentId} />
          )}

          {currentTab === 'ai-lab' && (
            <AIAlgorithmsLabView />
          )}

          {currentTab === 'simulator' && (
            <AttackSimulatorView onNavigateToIncident={handleOpenIncident} onNavigateToTab={setCurrentTab} />
          )}

          {currentTab === 'knowledge-base' && (
            <KnowledgeBaseView />
          )}

          {currentTab === 'rules' && (
            <RuleManagementView />
          )}

          {currentTab === 'agents' && (
            <AgentsView telemetryData={telemetryData} />
          )}

          {currentTab === 'reports' && (
            <ReportsView />
          )}

          {currentTab === 'logs' && (
            <AuditLogsView />
          )}

          {currentTab === 'settings' && (
            <SettingsView />
          )}

          {currentTab === 'users' && (
            <UserManagementView />
          )}
          </>}
        </main>
      </div>

      {/* Login & Role Switcher Modal */}
      <LoginModal
        isOpen={isLoginOpen || (authReady && !currentUser)}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
}
