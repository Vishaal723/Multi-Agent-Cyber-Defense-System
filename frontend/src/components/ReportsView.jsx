import React, { useCallback, useEffect, useState } from 'react';
import { Download, FileText, Sparkles } from 'lucide-react';
import { api } from '../api/client';

const value = (v, suffix = '') => v === null || v === undefined || v === '' ? 'No data available' : `${v}${suffix}`;

export default function ReportsView() {
  const [activeReport, setActiveReport] = useState('daily');
  const [dailyData, setDailyData] = useState(null);
  const [weeklyData, setWeeklyData] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    setDailyData(null);
    setWeeklyData(null);
    try {
      const [daily, weekly, recs] = await Promise.all([
        api.getDailyReport(), api.getWeeklyReport(), api.getRecommendations()
      ]);
      setDailyData(daily);
      setWeeklyData(weekly);
      setRecommendations(recs);
    } catch (err) {
      setError(err?.message || 'Unable to load reports.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  return <div className="reports-layout">
    <header className="dashboard-heading">
      <div><p className="eyebrow">REPORTING</p><h1>Security reports</h1>
        <p>Counts come from persisted local database records. Performance measures without stored observations are shown as unavailable.</p></div>
      <button onClick={() => api.exportCsv()} className="btn-cyber-outline"><Download size={15} /> Export CSV</button>
    </header>

    <nav className="report-tabs" aria-label="Report type">{[['daily', 'Daily summary'], ['weekly', '7-day trend'], ['recommendations', 'Reference recommendations']].map(([id, label]) =>
      <button key={id} onClick={() => setActiveReport(id)} aria-pressed={activeReport === id}>{label}</button>)}</nav>

    {error && <div role="alert" className="dashboard-error">Reports could not be loaded: {error} <button onClick={fetchReports}>Retry</button></div>}
    {loading && <p className="empty-state" role="status">Loading reports…</p>}

    {!loading && !error && activeReport === 'daily' && dailyData && <>
      <section className="dashboard-metrics">
        <div className="glass-panel dashboard-metric"><span>Threat records · 24h</span><strong>{value(dailyData.metrics?.threats_detected)}</strong><small>{dailyData.data_source || 'Persisted records'}</small></div>
        <div className="glass-panel dashboard-metric"><span>Incidents · 24h</span><strong>{value(dailyData.metrics?.incidents_triaged)}</strong><small>Persisted incident records</small></div>
        <div className="glass-panel dashboard-metric"><span>Recorded response actions</span><strong>{value(dailyData.metrics?.automated_actions_executed)}</strong><small>Persisted response records</small></div>
        <div className="glass-panel dashboard-metric"><span>Incident resolution rate · all records</span><strong>{value(dailyData.metrics?.success_rate_percent, '%')}</strong><small>{dailyData.metrics?.success_rate_percent === null || dailyData.metrics?.success_rate_percent === undefined ? 'Unavailable: no incidents are recorded to calculate this rate.' : 'Mitigated or closed incidents divided by all persisted incidents.'}</small></div>
      </section>
      <section className="glass-panel dashboard-panel"><h2>Attack categories · last 24 hours</h2>
        {dailyData.top_attack_categories?.length ? <ul className="report-category-list">{dailyData.top_attack_categories.map((cat) => <li key={cat.attack_type}><span>{cat.attack_type.replaceAll('_', ' ')}</span><b>{cat.count}</b></li>)}</ul> : <p className="empty-state">No data available for this period.</p>}
      </section>
    </>}

    {!loading && !error && activeReport === 'weekly' && weeklyData && <>
      <section className="glass-panel dashboard-panel"><h2>Persisted threat and incident records · 7 days</h2>
        <p className="panel-note">{weeklyData.data_source || 'Counts from persisted local database records.'} · Total threats: {value(weeklyData.weekly_threats_total)} · Incidents: {value(weeklyData.weekly_incident_total)} · Mitigation rate: {value(weeklyData.autonomous_resolution_percent, '%')}</p>
        <div className="weekly-chart">{weeklyData.daily_trend?.map((day) => <div key={day.date || day.day} className="weekly-day"><b>{day.threats}</b><i style={{ height: `${Number(day.threats) ? Math.max(2, (Number(day.threats) / Math.max(1, ...weeklyData.daily_trend.map((item) => Number(item.threats) || 0))) * 110) : 0}px` }} /><span>{day.day}</span></div>)}</div>
        {weeklyData.daily_trend?.every((day) => !Number(day.threats)) && <p className="empty-state">No threat records are available for this period.</p>}
      </section>
      <section className="glass-panel dashboard-panel"><h2>Agent performance history</h2>
        {weeklyData.agent_performance?.length ? <ul className="report-category-list">{weeklyData.agent_performance.map((agent) => <li key={agent.agent}><span>{agent.agent}</span><b>{value(agent.accuracy)}</b></li>)}</ul> : <p className="empty-state">No historical agent performance measurements are stored.</p>}
      </section>
    </>}

    {!loading && !error && activeReport === 'recommendations' && <section className="glass-panel dashboard-panel">
      <div className="panel-heading"><div><Sparkles /><h2>Reference recommendations</h2></div><span className="demo-label">Static examples</span></div>
      <p className="panel-note">These are demonstration recommendations, not generated from measured historical patterns. Confidence scores are omitted.</p>
      {recommendations.length ? recommendations.map((rec) => <article className="recommendation-card" key={rec.recommendation_id}>
        <h3>{rec.title}</h3><p><b>Example pattern:</b> {rec.pattern_observed}</p><p><b>Suggested rule:</b> <code>{rec.suggested_rule}</code></p><p>{rec.benefit}</p>
      </article>) : <p className="empty-state">No reference recommendations available.</p>}
    </section>}

    {!loading && !error && ((activeReport === 'daily' && !dailyData) || (activeReport === 'weekly' && !weeklyData)) && <p className="empty-state"><FileText /> No data available.</p>}
  </div>;
}
