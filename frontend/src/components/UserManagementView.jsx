import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  Trash2,
  Lock,
  Mail,
  User,
  CheckCircle2,
  X
} from 'lucide-react';
import { api } from '../api/client';

export default function UserManagementView() {
  const [users, setUsers] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Security Analyst');
  const [actionSuccess, setActionSuccess] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const data = await api.getUsers();
      setUsers(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setActionSuccess(null);
    try {
      await api.createUser({ username, password, email, role });
      setIsCreating(false);
      setUsername('');
      setPassword('');
      setEmail('');
      setActionSuccess(`User '${username}' created with role '${role}'.`);
      fetchUsers();
    } catch (err) {
      alert('Error creating user: ' + err.message);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('Are you sure you want to remove this user?')) return;
    try {
      await api.deleteUser(userId);
      fetchUsers();
    } catch (err) {
      alert('Error deleting user: ' + err.message);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px' }}>
      
      {/* LEFT: Users Table & Add User */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users style={{ color: '#00f0ff' }} />
              Operator Accounts & RBAC Permissions (PRD Module 1 FR-001 to FR-004)
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
              Manage access controls across Administrator, Security Analyst, Network Admin, and Auditor roles
            </p>
          </div>

          <button
            onClick={() => setIsCreating(true)}
            className="btn-cyber-primary"
            style={{ padding: '6px 14px', fontSize: '0.8rem' }}
          >
            <UserPlus style={{ width: '15px', height: '15px' }} />
            <span>Create User</span>
          </button>
        </div>

        {actionSuccess && (
          <div style={{ padding: '10px 14px', borderRadius: '6px', background: 'rgba(0, 255, 157, 0.15)', border: '1px solid rgba(0, 255, 157, 0.4)', color: '#00ff9d', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 style={{ width: '16px', height: '16px' }} />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* Create User Drawer */}
        {isCreating && (
          <div className="glass-panel-glow" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#00f0ff' }}>Add New Operator Account</h3>
              <button onClick={() => setIsCreating(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X style={{ width: '18px', height: '18px' }} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Username</label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-subtle)', color: '#fff', fontSize: '0.8rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-subtle)', color: '#fff', fontSize: '0.8rem' }}
                  >
                    <option value="Administrator">Administrator (Root)</option>
                    <option value="Security Analyst">Security Analyst</option>
                    <option value="Network Administrator">Network Administrator</option>
                    <option value="Read-Only Auditor">Read-Only Auditor</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-subtle)', color: '#fff', fontSize: '0.8rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-subtle)', color: '#fff', fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button type="button" onClick={() => setIsCreating(false)} className="btn-cyber-outline" style={{ padding: '6px 14px' }}>Cancel</button>
                <button type="submit" className="btn-cyber-primary" style={{ padding: '6px 16px' }}>Save User</button>
              </div>
            </form>
          </div>
        )}

        {/* Users Table */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#64748b', textAlign: 'left' }}>
                  <th style={{ padding: '10px' }}>Username</th>
                  <th style={{ padding: '10px' }}>Email</th>
                  <th style={{ padding: '10px' }}>RBAC Role</th>
                  <th style={{ padding: '10px' }}>Account Created</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.user_id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '10px', fontWeight: 600, color: '#f1f5f9' }}>{u.username}</td>
                    <td style={{ padding: '10px', color: '#94a3b8' }}>{u.email}</td>
                    <td style={{ padding: '10px' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        background: u.role === 'Administrator' ? 'rgba(0, 240, 255, 0.15)' : 'rgba(0, 255, 157, 0.15)',
                        color: u.role === 'Administrator' ? '#00f0ff' : '#00ff9d',
                        border: `1px solid ${u.role === 'Administrator' ? 'rgba(0, 240, 255, 0.3)' : 'rgba(0, 255, 157, 0.3)'}`
                      }}>
                        {u.role}
                      </span>
                    </td>
                    <td style={{ padding: '10px', color: '#64748b', fontSize: '0.72rem' }}>{u.created_at.slice(0, 10)}</td>
                    <td style={{ padding: '10px', textAlign: 'right' }}>
                      {u.username !== 'admin' && (
                        <button
                          onClick={() => handleDeleteUser(u.user_id)}
                          style={{ background: 'transparent', border: 'none', color: '#ff3366', cursor: 'pointer', padding: '4px' }}
                          title="Delete User"
                        >
                          <Trash2 style={{ width: '15px', height: '15px' }} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* RIGHT: Role Permission Matrix */}
      <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Shield style={{ width: '16px', height: '16px', color: '#00f0ff' }} />
          Role Permission Matrix (FR-002)
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.75rem' }}>
          <div style={{ padding: '10px', borderRadius: '6px', background: 'rgba(0, 240, 255, 0.08)', border: '1px solid rgba(0, 240, 255, 0.2)' }}>
            <b style={{ color: '#00f0ff' }}>Administrator:</b>
            <p style={{ color: '#cbd5e1', margin: '4px 0 0' }}>Full swarm lifecycle, modify AI agents, edit detection rules, execute mitigations, manage accounts.</p>
          </div>

          <div style={{ padding: '10px', borderRadius: '6px', background: 'rgba(0, 255, 157, 0.08)', border: '1px solid rgba(0, 255, 157, 0.2)' }}>
            <b style={{ color: '#00ff9d' }}>Security Analyst:</b>
            <p style={{ color: '#cbd5e1', margin: '4px 0 0' }}>Triage threats, investigate incidents, approve response actions, submit feedback.</p>
          </div>

          <div style={{ padding: '10px', borderRadius: '6px', background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
            <b style={{ color: '#60a5fa' }}>Network Administrator:</b>
            <p style={{ color: '#cbd5e1', margin: '4px 0 0' }}>Configure firewall ACLs, isolate network devices, monitor bandwidth.</p>
          </div>

          <div style={{ padding: '10px', borderRadius: '6px', background: 'rgba(148, 163, 184, 0.08)', border: '1px solid rgba(148, 163, 184, 0.2)' }}>
            <b style={{ color: '#94a3b8' }}>Read-Only Auditor:</b>
            <p style={{ color: '#cbd5e1', margin: '4px 0 0' }}>Export compliance reports, inspect audit trail, view metrics.</p>
          </div>
        </div>
      </div>

    </div>
  );
}
