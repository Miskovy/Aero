'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getApiUrl } from '@/lib/api-config';
import GitHubIcon from '@/components/GitHubIcon';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar_url?: string | null;
  auth_provider?: string | null;
  created_at?: string;
  is_email_verified?: boolean;
  has_password?: boolean;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);

  // Password fields state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const API_BASE = '/api';

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const errorParam = params.get('error');
      if (errorParam) {
        Promise.resolve().then(() => {
          setOauthError(errorParam);
        });
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  const getToken = () => {
    if (typeof document === 'undefined') return null;
    const v = `; ${document.cookie}`;
    const p = v.split('; aero_session=');
    if (p.length === 2) return p.pop()?.split(';').shift() || null;
    return null;
  };

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    const token = getToken();
    try {
      const res = await fetch(`${API_BASE}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setEditName(data.name || '');
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) fetchProfile();
    });
    return () => { active = false; };
  }, [fetchProfile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;
    setSaveLoading(true);
    setSaveError(null);
    setSaveSuccess(false);
    const token = getToken();

    try {
      const res = await fetch(`${API_BASE}/users/me`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: editName.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to update profile');
      }
      const updated = await res.json();
      setProfile(updated);
      setEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaveLoading(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      setPasswordError('Please fill in all required fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }
    if (profile?.has_password && !currentPassword) {
      setPasswordError('Current password is required.');
      return;
    }

    setPasswordLoading(true);
    setPasswordError(null);
    setPasswordSuccess(false);
    const token = getToken();

    try {
      const res = await fetch(`${API_BASE}/users/me/password`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_password: currentPassword || undefined,
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to update password.');
      }

      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      // Refresh profile to update has_password state
      fetchProfile();
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleForgotPasswordTrigger = async () => {
    if (!profile?.email) return;
    setForgotPasswordLoading(true);
    setPasswordError(null);
    setForgotPasswordSuccess(false);

    try {
      const res = await fetch(getApiUrl('/auth/forgot-password'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: profile.email }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to request password reset.');
      }

      if (typeof window !== 'undefined') {
        sessionStorage.setItem('pwd_reset_email', profile.email);
        sessionStorage.setItem('pwd_reset_ready', 'true');
      }
      setForgotPasswordSuccess(true);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '100px 0' }}>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          .throbber {
            width: 36px;
            height: 36px;
            border: 3px solid rgba(56, 189, 248, 0.1);
            border-top: 3px solid var(--accent-cyan, #38bdf8);
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
        `}</style>
        <div className="throbber" />
      </div>
    );
  }

  return (
    <div style={{ animation: 'fadeIn 0.4s ease', maxWidth: '640px' }}>
      <h1 style={{ fontSize: '22px', fontWeight: 600, letterSpacing: '-0.5px', marginBottom: '6px' }}>Profile</h1>
      <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '32px' }}>
        Manage your account details and personal information.
      </p>

      {/* OAuth Error Box */}
      {oauthError && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          background: 'rgba(239, 68, 68, 0.05)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          color: '#ef4444',
          fontSize: '13px',
          fontWeight: 500,
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span style={{ flex: 1 }}>{oauthError}</span>
          <button
            onClick={() => setOauthError(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#ef4444',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 600,
              padding: '4px'
            }}
          >
            DISMISS
          </button>
        </div>
      )}

      {/* Success Toast */}
      {saveSuccess && (
        <div style={{
          padding: '10px 16px',
          borderRadius: '6px',
          background: 'rgba(34, 197, 94, 0.05)',
          border: '1px solid rgba(34, 197, 94, 0.2)',
          color: '#22c55e',
          fontSize: '12px',
          fontWeight: 600,
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Profile updated successfully.
        </div>
      )}

      {/* Profile Card */}
      <div className="metric-card" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-glass)', padding: '0', overflow: 'hidden' }}>

        {/* Gradient Banner */}
        <div style={{
          height: '80px',
          background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.15) 0%, rgba(167, 139, 250, 0.1) 50%, rgba(74, 222, 128, 0.08) 100%)',
          position: 'relative'
        }} />

        {/* Avatar + Identity */}
        <div style={{ padding: '0 24px 24px', marginTop: '-32px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', marginBottom: '24px' }}>
            {profile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt={profile.name}
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  border: '3px solid var(--bg-primary)',
                  objectFit: 'cover',
                  flexShrink: 0,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                }}
              />
            ) : (
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'var(--bg-elevated)',
                border: '3px solid var(--bg-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--font-title)',
                fontSize: '22px',
                fontWeight: 700,
                color: 'var(--accent-cyan)',
                flexShrink: 0,
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
              }}>
                {(profile?.name || 'U').charAt(0).toUpperCase()}
              </div>
            )}

            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>
                {profile?.name || 'Unknown User'}
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                {profile?.email || '—'}
              </p>
            </div>

            {/* Edit button */}
            {!editing && (
              <button
                onClick={() => { setEditing(true); setEditName(profile?.name || ''); setSaveError(null); }}
                style={{
                  padding: '6px 14px',
                  fontSize: '11px',
                  background: 'transparent',
                  border: '1px solid var(--border-glass)',
                  color: 'var(--text-secondary)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 500,
                  width: 'auto',
                  transition: 'border-color 0.2s ease, color 0.2s ease'
                }}
              >
                EDIT PROFILE
              </button>
            )}
          </div>

          {/* Info Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: '16px',
            padding: '20px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-glass)',
            borderRadius: '8px',
            marginBottom: editing ? '24px' : '0'
          }}>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>
                Email Verification
              </span>
              <span style={{
                fontSize: '12px',
                fontWeight: 600,
                color: profile?.is_email_verified ? '#22c55e' : 'var(--accent-orange)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <span style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: profile?.is_email_verified ? '#22c55e' : 'var(--accent-orange)',
                  display: 'inline-block'
                }} />
                {profile?.is_email_verified ? 'Verified' : 'Unverified'}
              </span>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>
                Account Created
              </span>
              <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
              </span>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>
                User ID
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>
                {profile?.id || '—'}
              </span>
            </div>
          </div>

          {/* Edit Form */}
          {editing && (
            <form onSubmit={handleSave} style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-glass)',
              borderRadius: '8px',
              padding: '20px'
            }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }}>
                EDIT PROFILE
              </h3>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Display Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  placeholder="Your display name"
                  required
                  disabled={saveLoading}
                  style={{
                    background: 'var(--bg-tertiary)',
                    borderColor: 'var(--border-glass)',
                    fontSize: '13px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={profile?.email || ''}
                  disabled
                  style={{
                    background: 'var(--bg-tertiary)',
                    borderColor: 'var(--border-glass)',
                    fontSize: '13px',
                    opacity: 0.5,
                    cursor: 'not-allowed'
                  }}
                />
                <p style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px', fontStyle: 'italic' }}>
                  Email cannot be changed for security reasons.
                </p>
              </div>

              {saveError && (
                <div style={{ padding: '10px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)', color: '#f87171', fontSize: '12px', marginBottom: '16px' }}>
                  {saveError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => { setEditing(false); setSaveError(null); }}
                  disabled={saveLoading}
                  style={{
                    padding: '8px 16px',
                    fontSize: '12px',
                    background: 'transparent',
                    border: '1px solid var(--border-glass)',
                    color: 'var(--text-dim)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    width: 'auto'
                  }}
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={saveLoading || !editName.trim()}
                  style={{
                    padding: '8px 20px',
                    fontSize: '12px',
                    background: 'rgba(56, 189, 248, 0.1)',
                    border: '1px solid rgba(56, 189, 248, 0.2)',
                    color: 'var(--accent-cyan)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    width: 'auto',
                    opacity: (saveLoading || !editName.trim()) ? 0.5 : 1
                  }}
                >
                  {saveLoading ? 'SAVING...' : 'SAVE CHANGES'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* GitHub Integration Card */}
      <div className="metric-card" style={{
        marginTop: '24px',
        background: 'var(--bg-primary)',
        border: '1px solid var(--border-glass)',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
            GitHub Integration
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
            Connect your GitHub account to enable repository deployment, automated webhooks, and direct single sign-on authentication.
          </p>
        </div>

        {profile?.auth_provider === 'github' ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px',
            background: 'var(--bg-secondary)',
            border: '1px solid rgba(34, 197, 94, 0.2)',
            borderRadius: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ color: '#22c55e', display: 'flex', alignItems: 'center' }}>
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>
                  Connected to GitHub
                </span>
                <span style={{ fontSize: '11px', color: '#22c55e', fontWeight: 500 }}>
                  Active OAuth connection established
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-dim)', gap: '6px', fontSize: '12px' }}>
              <GitHubIcon size={16} />
              <span style={{ fontFamily: 'var(--font-mono)' }}>{profile.name}</span>
            </div>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-glass)',
            borderRadius: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ color: 'var(--text-dim)', display: 'flex', alignItems: 'center' }}>
                <GitHubIcon size={22} />
              </div>
              <div>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>
                  Not Connected
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                  No GitHub account linked
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                window.location.href = getApiUrl(
                  `/auth/github?client=web&redirect_url=${encodeURIComponent(window.location.origin)}`,
                );
              }}
              style={{
                padding: '8px 16px',
                fontSize: '12px',
                background: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid rgba(56, 189, 248, 0.2)',
                color: 'var(--accent-cyan)',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 600,
                width: 'auto',
                transition: 'opacity 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              Link GitHub Account
            </button>
          </div>
        )}
      </div>

      {/* Change Password Card */}
      <div className="metric-card" style={{
        marginTop: '24px',
        background: 'var(--bg-primary)',
        border: '1px solid var(--border-glass)',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
            {profile?.has_password ? 'Change Password' : 'Set Account Password'}
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
            {profile?.has_password 
              ? 'Keep your account secure by updating your password periodically.'
              : 'Add a password to your account so you can log in with either your email address or your GitHub account.'
            }
          </p>
        </div>

        {passwordSuccess && (
          <div style={{
            padding: '12px',
            borderRadius: '6px',
            fontSize: '13px',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            color: '#22c55e',
            border: '1px solid rgba(34, 197, 94, 0.2)',
            display: 'flex',
            gap: '8px',
            alignItems: 'center'
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>Password updated successfully.</span>
          </div>
        )}

        {forgotPasswordSuccess && (
          <div style={{
            padding: '12px',
            borderRadius: '6px',
            fontSize: '13px',
            backgroundColor: 'rgba(56, 189, 248, 0.1)',
            color: 'var(--accent-cyan)',
            border: '1px solid rgba(56, 189, 248, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              <strong>Reset PIN Dispatched</strong>
            </div>
            <span style={{ fontSize: '12px' }}>
              A 6-digit recovery code has been sent to your email.{' '}
              <a 
                href={`/forgot-password?email=${encodeURIComponent(profile?.email || '')}`}
                style={{ color: 'var(--accent-cyan)', textDecoration: 'underline', fontWeight: 600 }}
              >
                Click here to complete password recovery
              </a>.
            </span>
          </div>
        )}

        {passwordError && (
          <div className="error-alert-box">
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7.49997 0.833313C3.81807 0.833313 0.833302 3.81808 0.833302 7.50001C0.833302 11.1819 3.81807 14.1667 7.49997 14.1667C11.1819 14.1667 14.1666 11.1819 14.1666 7.50001C14.1666 3.81808 11.1819 0.833313 7.49997 0.833313ZM8.12497 4.37501V8.12501H6.87497V4.37501H8.12497ZM8.12497 9.37501V10.625H6.87497V9.37501H8.12497Z" fill="currentColor" />
            </svg>
            <span>{passwordError}</span>
          </div>
        )}

        <form onSubmit={handlePasswordUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {profile?.has_password && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>
                  Current Password
                </label>
                <button
                  type="button"
                  onClick={handleForgotPasswordTrigger}
                  disabled={forgotPasswordLoading}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--accent-cyan)',
                    fontSize: '11px',
                    cursor: 'pointer',
                    padding: 0,
                    textDecoration: 'underline'
                  }}
                >
                  {forgotPasswordLoading ? 'Sending PIN...' : 'Forgot your password?'}
                </button>
              </div>
              <div style={{ position: 'relative', width: '100%' }}>
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 40px 10px 12px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    fontSize: '13px'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-dim)',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 'auto',
                  }}
                >
                  {showCurrentPassword ? (
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>
                New Password
              </label>
              <div style={{ position: 'relative', width: '100%' }}>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  style={{
                    width: '100%',
                    padding: '10px 40px 10px 12px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    fontSize: '13px'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-dim)',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 'auto',
                  }}
                >
                  {showNewPassword ? (
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>
                Confirm New Password
              </label>
              <div style={{ position: 'relative', width: '100%' }}>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  style={{
                    width: '100%',
                    padding: '10px 40px 10px 12px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    fontSize: '13px'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-dim)',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 'auto',
                  }}
                >
                  {showConfirmPassword ? (
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
            <button
              type="submit"
              disabled={passwordLoading}
              style={{
                padding: '8px 20px',
                fontSize: '12px',
                background: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid rgba(56, 189, 248, 0.2)',
                color: 'var(--accent-cyan)',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 600,
                width: 'auto',
                opacity: passwordLoading ? 0.5 : 1
              }}
            >
              {passwordLoading ? 'SAVING...' : profile?.has_password ? 'UPDATE PASSWORD' : 'SET PASSWORD'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
