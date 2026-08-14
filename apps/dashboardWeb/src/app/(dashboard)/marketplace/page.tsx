'use client';

import { getApiBaseUrl } from '@/lib/api-config';

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CustomSelect from "@/components/CustomSelect";

interface MarketplaceTemplate {
  id: string;
  name: string;
  description: string;
  logo?: string;
  categories: string[];
  compose_url: string;
}

interface Organization {
  id: string;
  name: string;
}

interface Project {
  id: string;
  name: string;
  slug: string;
}

// Simple parser to extract configuration fields or environment variables from compose content
function parseEnvVarsFromCompose(content: string): { key: string; defaultValue: string; label?: string }[] {
  const vars: { key: string; defaultValue: string; label?: string }[] = [];
  const seen = new Set<string>();

  const lines = content.split('\n');
  let inConfigFields = false;
  let currentField: { key: string; defaultValue: string; label?: string } = { key: '', defaultValue: '' };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('configFields:')) {
      inConfigFields = true;
      continue;
    }
    if (inConfigFields) {
      if (line !== '' && !line.startsWith('-') && !line.startsWith(' ') && line.includes(':') && !line.startsWith('key') && !line.startsWith('label') && !line.startsWith('type') && !line.startsWith('default') && !line.startsWith('required') && !line.startsWith('generated')) {
        inConfigFields = false;
      }
    }

    if (inConfigFields) {
      if (line.startsWith('- key:') || line.startsWith('key:')) {
        if (currentField.key) {
          vars.push(currentField);
          seen.add(currentField.key);
        }
        const keyVal = line.replace(/^-?\s*key:\s*/, '').replace(/['"]/g, '').trim();
        currentField = { key: keyVal, defaultValue: '', label: keyVal };
      } else if (line.startsWith('label:')) {
        currentField.label = line.replace(/^label:\s*/, '').replace(/['"]/g, '').trim();
      } else if (line.startsWith('default:')) {
        currentField.defaultValue = line.replace(/^default:\s*/, '').replace(/['"]/g, '').trim();
      } else if (line.startsWith('generated:') && line.includes('true')) {
        currentField.defaultValue = '(auto-generated)';
      }
    }
  }
  if (currentField.key && !seen.has(currentField.key)) {
    vars.push(currentField);
    seen.add(currentField.key);
  }

  // Fallback: scan environment block
  let inEnvironment = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('environment:')) {
      inEnvironment = true;
      continue;
    }
    if (inEnvironment) {
      if (line === '' || (line.includes(':') && !line.startsWith(' ') && !line.startsWith('-') && !line.startsWith('"') && !line.startsWith('\''))) {
        inEnvironment = false;
        continue;
      }
      const match = line.match(/^[-]?\s*([A-Za-z0-9_]+)\s*[:=]\s*(.*)$/);
      if (match) {
        const key = match[1];
        let val = match[2].trim().replace(/^['"]|['"]$/g, '');
        const placeholderMatch = val.match(/\$\{[A-Za-z0-9_]+:(.*)\}/);
        if (placeholderMatch) {
          val = placeholderMatch[1];
        } else if (val.startsWith('${') && val.endsWith('}')) {
          val = '';
        }
        if (!seen.has(key)) {
          vars.push({ key, defaultValue: val, label: key.replace(/_/g, ' ') });
          seen.add(key);
        }
      }
    }
  }

  return vars;
}

// GitHub raw URL resolver
function getRawUrl(url: string): string {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'github.com') {
      const parts = parsed.pathname.split('/').filter(Boolean);
      if (parts.length >= 4 && (parts[2] === 'blob' || parts[2] === 'raw')) {
        const owner = parts[0];
        const repo = parts[1];
        const branch = parts[3];
        const rest = parts.slice(4).join('/');
        return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${rest}`;
      }
    }
  } catch {
    // Return original if parsing fails
  }
  return url;
}

export default function MarketplacePage() {
  const router = useRouter();
  const [items, setItems] = useState<MarketplaceTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search and categories
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [allCategories, setAllCategories] = useState<string[]>([]);

  // Organization and Projects
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Modals state
  const [viewingItem, setViewingItem] = useState<MarketplaceTemplate | null>(null);
  const [deployingItem, setDeployingItem] = useState<MarketplaceTemplate | null>(null);
  const [composeContent, setComposeContent] = useState('');
  const [composeLoading, setComposeLoading] = useState(false);
  
  // Environment variables deployment state
  const [detectedEnvVars, setDetectedEnvVars] = useState<{ key: string; defaultValue: string; label?: string }[]>([]);
  const [formEnvValues, setFormEnvValues] = useState<Record<string, string>>({});
  const [customEnvVars, setCustomEnvVars] = useState<{ key: string; value: string }[]>([]);
  
  const [deployLoading, setDeployLoading] = useState(false);
  const [deployError, setDeployError] = useState<string | null>(null);
  const [deploySuccess, setDeploySuccess] = useState(false);

  const API_BASE = getApiBaseUrl();

  const getSessionToken = () => {
    if (typeof document === 'undefined') return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; aero_session=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
    return null;
  };

  // Fetch marketplace items
  const fetchMarketplaceItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    const token = getSessionToken();
    try {
      const res = await fetch(`${API_BASE}/marketplace/templates`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        throw new Error(`Server returned status: ${res.status}`);
      }
      const data = (await res.json()) as MarketplaceTemplate[];
      setItems(data);

      // Extract unique categories
      const categoriesSet = new Set<string>();
      data.forEach(item => {
        if (item.categories && Array.isArray(item.categories)) {
          item.categories.forEach(cat => categoriesSet.add(cat));
        }
      });
      setAllCategories(Array.from(categoriesSet));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  const fetchProjectsForOrg = useCallback(async (orgId: string) => {
    const token = getSessionToken();
    try {
      const res = await fetch(`${API_BASE}/projects?orgId=${orgId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (res.ok) {
        const projectsData = (await res.json()) as Project[];
        setProjects(projectsData);
        if (projectsData.length > 0) {
          const savedProjId = localStorage.getItem('aero_active_project_id');
          const exists = projectsData.some(p => p.id === savedProjId);
          const activeProjId = exists ? savedProjId : projectsData[0].id;
          setSelectedProjectId(activeProjId);
          if (activeProjId) {
            localStorage.setItem('aero_active_project_id', activeProjId);
          }
        } else {
          setSelectedProjectId(null);
        }
      }
    } catch (err) {
      console.error("Failed to load projects:", err);
    }
  }, [API_BASE]);

  // Fetch Organizations and Projects
  const fetchOrgsAndProjects = useCallback(async () => {
    const token = getSessionToken();
    try {
      const res = await fetch(`${API_BASE}/organizations`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (res.ok) {
        const orgsData = (await res.json()) as Organization[];
        setOrgs(orgsData);

        if (orgsData.length > 0) {
          const savedOrgId = localStorage.getItem('aero_active_org_id');
          const exists = orgsData.some(o => o.id === savedOrgId);
          const activeOrgId = exists ? savedOrgId : orgsData[0].id;
          setSelectedOrgId(activeOrgId);
          
          if (activeOrgId) {
            localStorage.setItem('aero_active_org_id', activeOrgId);
            fetchProjectsForOrg(activeOrgId);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load organizations:", err);
    }
  }, [API_BASE, fetchProjectsForOrg]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        fetchMarketplaceItems();
        fetchOrgsAndProjects();
      }
    });
    return () => {
      active = false;
    };
  }, [fetchMarketplaceItems, fetchOrgsAndProjects]);

  const handleOrgChange = (orgId: string) => {
    setSelectedOrgId(orgId);
    localStorage.setItem('aero_active_org_id', orgId);
    fetchProjectsForOrg(orgId);
  };

  const handleProjectChange = (projId: string) => {
    setSelectedProjectId(projId);
    localStorage.setItem('aero_active_project_id', projId);
  };

  // Fetch compose configuration and parse env vars when opening modal
  const fetchComposeConfig = async (url: string) => {
    setComposeLoading(true);
    setComposeContent('');
    setDetectedEnvVars([]);
    setFormEnvValues({});
    setCustomEnvVars([]);

    try {
      const rawUrl = getRawUrl(url);
      const res = await fetch(rawUrl);
      if (res.ok) {
        const text = await res.text();
        setComposeContent(text);
        
        // Parse variables
        const variables = parseEnvVarsFromCompose(text);
        setDetectedEnvVars(variables);

        // Prepopulate default form state values
        const defaults: Record<string, string> = {};
        variables.forEach(v => {
          if (v.defaultValue !== '(auto-generated)') {
            defaults[v.key] = v.defaultValue;
          } else {
            defaults[v.key] = '';
          }
        });
        setFormEnvValues(defaults);
      } else {
        setComposeContent(`# Failed to load YAML from:\n# ${rawUrl}\n# (HTTP Status: ${res.status})`);
      }
    } catch (err) {
      setComposeContent(`# Network error loading compose content from:\n# ${url}\n# Error: ${String(err)}`);
    } finally {
      setComposeLoading(false);
    }
  };

  const handleViewDetails = (item: MarketplaceTemplate) => {
    setViewingItem(item);
    fetchComposeConfig(item.compose_url);
  };

  const handleOpenDeploy = (item: MarketplaceTemplate) => {
    setDeployingItem(item);
    setDeployError(null);
    setDeploySuccess(false);
    fetchComposeConfig(item.compose_url);
  };

  const addCustomEnvVar = () => {
    setCustomEnvVars(prev => [...prev, { key: '', value: '' }]);
  };

  const removeCustomEnvVar = (idx: number) => {
    setCustomEnvVars(prev => prev.filter((_, i) => i !== idx));
  };

  const updateCustomEnvVar = (idx: number, field: 'key' | 'value', val: string) => {
    setCustomEnvVars(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  const handleDeployTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || !deployingItem) return;

    setDeployLoading(true);
    setDeployError(null);
    const token = getSessionToken();

    // Gather all environment variables
    const finalEnvVars: Record<string, string> = {};
    
    // Add parsed variables
    Object.entries(formEnvValues).forEach(([key, val]) => {
      if (val.trim()) {
        finalEnvVars[key] = val;
      }
    });

    // Add manual custom variables
    customEnvVars.forEach(item => {
      if (item.key.trim() && item.value.trim()) {
        finalEnvVars[item.key.trim()] = item.value;
      }
    });

    try {
      const res = await fetch(`${API_BASE}/projects/${selectedProjectId}/marketplace/deploy/${deployingItem.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          envVars: finalEnvVars
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to deploy template configuration.');
      }

      setDeploySuccess(true);
    } catch (err: unknown) {
      setDeployError(err instanceof Error ? err.message : String(err));
    } finally {
      setDeployLoading(false);
    }
  };

  // Generate beautiful icons matching standard templates
  const getTemplateIcon = (item: MarketplaceTemplate) => {
    if (item.logo) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img 
          src={item.logo} 
          alt={item.name} 
          style={{ width: '40px', height: '40px', objectFit: 'contain', borderRadius: '4px' }} 
        />
      );
    }

    const lowerId = item.id.toLowerCase();
    const initials = item.name.substring(0, 2).toUpperCase();

    let bgColor = 'rgba(56, 189, 248, 0.12)';
    let iconColor = 'var(--accent-cyan, #38bdf8)';

    if (lowerId.includes('postgres') || lowerId.includes('sql')) {
      bgColor = 'rgba(59, 130, 246, 0.15)';
      iconColor = '#3b82f6';
    } else if (lowerId.includes('redis') || lowerId.includes('cache')) {
      bgColor = 'rgba(239, 68, 68, 0.15)';
      iconColor = '#ef4444';
    } else if (lowerId.includes('mongo') || lowerId.includes('db')) {
      bgColor = 'rgba(16, 185, 129, 0.15)';
      iconColor = '#10b981';
    } else if (lowerId.includes('nginx') || lowerId.includes('proxy')) {
      bgColor = 'rgba(16, 185, 129, 0.15)';
      iconColor = '#10b981';
    } else if (lowerId.includes('node') || lowerId.includes('js')) {
      bgColor = 'rgba(132, 204, 22, 0.15)';
      iconColor = '#84cc16';
    } else if (lowerId.includes('rabbit') || lowerId.includes('queue')) {
      bgColor = 'rgba(249, 115, 22, 0.15)';
      iconColor = '#f97316';
    }

    return (
      <div style={{
        width: '40px',
        height: '40px',
        borderRadius: '8px',
        background: bgColor,
        color: iconColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: '14px',
        fontFamily: 'var(--font-mono)',
        border: `1px solid rgba(${iconColor === '#3b82f6' ? '59,130,246' : iconColor === '#ef4444' ? '239,68,68' : '56,189,248'}, 0.2)`
      }}>
        {initials}
      </div>
    );
  };

  // Filter items based on search query and category
  const filteredItems = items.filter(item => {
    const matchesSearch = 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = 
      selectedCategory === 'All' || 
      (item.categories && item.categories.includes(selectedCategory));

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="metrics-grid" style={{ gridTemplateColumns: '1fr', gap: '24px', animation: 'fadeIn 0.3s ease' }}>
      <div className="metric-card">
        
        {/* Header Console */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px', letterSpacing: '-0.02em', fontFamily: 'var(--font-title)' }}>
              AERO CLUSTER MARKETPLACE
            </h2>
            <p style={{ color: 'var(--text-dim)', fontSize: '13px', lineHeight: 1.4 }}>
              Explore and deploy pre-configured database engines, edge cache clusters, and container setups with a single click.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {orgs.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600, letterSpacing: '0.05em' }}>ORGANIZATION</span>
                <CustomSelect
                  value={selectedOrgId || ''}
                  onChange={handleOrgChange}
                  options={orgs.map(org => ({ value: org.id, label: org.name }))}
                  style={{ width: '180px' }}
                />
              </div>
            )}
            
            {projects.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600, letterSpacing: '0.05em' }}>PROJECT</span>
                <CustomSelect
                  value={selectedProjectId || ''}
                  onChange={handleProjectChange}
                  options={projects.map(p => ({ value: p.id, label: p.name }))}
                  style={{ width: '180px' }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Search & Filter pills console */}
        <div style={{
          display: 'flex',
          gap: '16px',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
          flexWrap: 'wrap',
          background: 'var(--bg-secondary)',
          padding: '16px',
          borderRadius: '8px',
          border: '1px solid var(--border-glass)'
        }}>
          {/* Search Field */}
          <div style={{ position: 'relative', width: '100%', maxWidth: '320px' }}>
            <input 
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search templates..."
              style={{
                width: '100%',
                paddingLeft: '36px',
                background: 'var(--bg-tertiary)',
                borderColor: 'var(--border-glass)',
                fontSize: '13px'
              }}
            />
            <svg 
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} 
              width="14" 
              height="14" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor" 
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Category Filter Pills */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setSelectedCategory('All')}
              className="nav-item"
              style={{
                width: 'auto',
                padding: '6px 14px',
                fontSize: '12px',
                background: selectedCategory === 'All' ? 'var(--bg-tertiary)' : 'transparent',
                color: selectedCategory === 'All' ? 'var(--accent-cyan)' : 'var(--text-dim)',
                borderColor: selectedCategory === 'All' ? 'var(--accent-cyan)' : 'var(--border-glass)',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderRadius: '20px',
                fontWeight: selectedCategory === 'All' ? 600 : 500
              }}
            >
              All
            </button>
            {allCategories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className="nav-item"
                style={{
                  width: 'auto',
                  padding: '6px 14px',
                  fontSize: '12px',
                  textTransform: 'capitalize',
                  background: selectedCategory === cat ? 'var(--bg-tertiary)' : 'transparent',
                  color: selectedCategory === cat ? 'var(--accent-cyan)' : 'var(--text-dim)',
                  borderColor: selectedCategory === cat ? 'var(--accent-cyan)' : 'var(--border-glass)',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderRadius: '20px',
                  fontWeight: selectedCategory === cat ? 600 : 500
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Content Container */}
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '100px 0' }}>
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
              .throbber {
                width: 36px;
                height: 36px;
                border: 3px solid rgba(56, 189, 248, 0.15);
                border-top: 3px solid var(--accent-cyan, #38bdf8);
                border-radius: 50%;
                animation: spin 0.8s linear infinite;
              }
            `}</style>
            <div className="throbber" />
          </div>
        ) : error ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '48px 24px',
            background: 'rgba(239, 68, 68, 0.02)',
            border: '1px dashed rgba(239, 68, 68, 0.2)',
            borderRadius: '8px',
            textAlign: 'center',
            maxWidth: '480px',
            margin: '40px auto',
          }}>
            <svg style={{ color: '#f87171', marginBottom: '16px' }} width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#f87171', marginBottom: '8px' }}>
              REGISTRY CONNECTION FAILED
            </h3>
            <p style={{ color: 'var(--text-dim)', fontSize: '13px', lineHeight: '1.5', marginBottom: '20px' }}>
              Could not retrieve templates from the registry server. {error}
            </p>
            <button 
              onClick={fetchMarketplaceItems}
              className="nav-item active" 
              style={{ width: 'auto', padding: '8px 20px', fontSize: '12px', cursor: 'pointer' }}
            >
              Retry Connection
            </button>
          </div>
        ) : filteredItems.length === 0 ? (
          <div style={{
            padding: '80px 20px',
            textAlign: 'center',
            color: 'var(--text-dim)',
            fontSize: '13px',
            border: '1px dashed var(--border-glass)',
            borderRadius: '8px'
          }}>
            No marketplace templates matched your search criteria.
          </div>
        ) : (
          /* Templates Grid */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
            {filteredItems.map((item) => (
              <div 
                key={item.id} 
                className="metric-card" 
                style={{ 
                  background: 'var(--bg-secondary)', 
                  border: '1px solid var(--border-glass)', 
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  height: '100%',
                  transition: 'transform 0.2s ease, border-color 0.2s ease',
                  position: 'relative'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    {getTemplateIcon(item)}
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {item.categories && item.categories.map(cat => (
                        <span 
                          key={cat} 
                          style={{ 
                            fontSize: '10px', 
                            padding: '2px 8px', 
                            borderRadius: '12px', 
                            background: 'var(--bg-tertiary)', 
                            color: 'var(--accent-cyan)', 
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            border: '1px solid rgba(56, 189, 248, 0.1)'
                          }}
                        >
                          {cat}
                        </span>
                      ))}
                    </div>
                  </div>

                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px', letterSpacing: '-0.01em' }}>
                    {item.name}
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '24px', opacity: 0.85 }}>
                    {item.description}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--border-glass)', paddingTop: '16px', marginTop: 'auto' }}>
                  <button 
                    onClick={() => handleViewDetails(item)}
                    className="nav-item" 
                    style={{ 
                      flex: 1, 
                      justifyContent: 'center', 
                      padding: '8px', 
                      fontSize: '12px', 
                      border: '1px solid var(--border-glass)', 
                      background: 'transparent', 
                      color: 'var(--text-secondary)', 
                      cursor: 'pointer' 
                    }}
                  >
                    DETAILS
                  </button>
                  <button 
                    onClick={() => handleOpenDeploy(item)}
                    disabled={!selectedProjectId}
                    className="nav-item active" 
                    style={{ 
                      flex: 1.5, 
                      justifyContent: 'center', 
                      padding: '8px', 
                      fontSize: '12px', 
                      border: '1px solid var(--border-glass)', 
                      background: selectedProjectId ? 'var(--bg-tertiary)' : 'rgba(255,255,255,0.02)', 
                      color: 'var(--text-primary)', 
                      cursor: selectedProjectId ? 'pointer' : 'not-allowed',
                      opacity: selectedProjectId ? 1 : 0.5
                    }}
                  >
                    DEPLOY
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── View Details Modal ── */}
      {viewingItem && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div className="metric-card" style={{
            width: '100%',
            maxWidth: '680px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-glass)',
            padding: '30px',
            borderRadius: '8px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {getTemplateIcon(viewingItem)}
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {viewingItem.name}
                  </h3>
                  <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                    ID: {viewingItem.id}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setViewingItem(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-dim)',
                  cursor: 'pointer',
                  padding: '4px',
                  width: 'auto'
                }}
              >
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable details */}
            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Description
                </h4>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {viewingItem.description}
                </p>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Categories
                </h4>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {viewingItem.categories.map(cat => (
                    <span 
                      key={cat} 
                      style={{ 
                        fontSize: '11px', 
                        padding: '2px 10px', 
                        borderRadius: '12px', 
                        background: 'var(--bg-tertiary)', 
                        color: 'var(--accent-cyan)', 
                        border: '1px solid rgba(56, 189, 248, 0.1)',
                        textTransform: 'capitalize'
                      }}
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Registry Source Configuration
                </h4>
                <a 
                  href={viewingItem.compose_url} 
                  target="_blank" 
                  rel="noreferrer"
                  style={{ 
                    fontSize: '12px', 
                    color: 'var(--accent-cyan)', 
                    textDecoration: 'none',
                    wordBreak: 'break-all',
                    fontFamily: 'var(--font-mono)'
                  }}
                >
                  {viewingItem.compose_url}
                </a>
              </div>

              <div>
                <h4 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Docker Compose Template Configuration
                </h4>
                <div style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: '6px',
                  padding: '16px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  lineHeight: '1.5',
                  color: 'var(--text-secondary)',
                  overflowX: 'auto',
                  whiteSpace: 'pre',
                  maxHeight: '260px'
                }}>
                  {composeLoading ? 'Loading configuration yaml file...' : composeContent}
                </div>
              </div>
            </div>

            {/* Footer buttons */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px', borderTop: '1px solid var(--border-glass)', paddingTop: '16px' }}>
              <button 
                type="button" 
                onClick={() => setViewingItem(null)}
                className="nav-item" 
                style={{ width: 'auto', padding: '8px 20px', fontSize: '12px', border: '1px solid var(--border-glass)', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer' }}
              >
                CLOSE
              </button>
              <button 
                type="button" 
                disabled={!selectedProjectId}
                onClick={() => {
                  const item = viewingItem;
                  setViewingItem(null);
                  handleOpenDeploy(item);
                }}
                className="nav-item active" 
                style={{ 
                  width: 'auto', 
                  padding: '8px 24px', 
                  fontSize: '12px', 
                  border: '1px solid var(--border-glass)', 
                  background: selectedProjectId ? 'var(--bg-tertiary)' : 'rgba(255,255,255,0.02)', 
                  color: 'var(--text-primary)', 
                  cursor: selectedProjectId ? 'pointer' : 'not-allowed',
                  opacity: selectedProjectId ? 1 : 0.5
                }}
              >
                PROCEED TO DEPLOY
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Deploy Template Modal ── */}
      {deployingItem && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div className="metric-card" style={{
            width: '100%',
            maxWidth: '520px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-glass)',
            padding: '30px',
            borderRadius: '8px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {getTemplateIcon(deployingItem)}
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    DEPLOY {deployingItem.name.toUpperCase()}
                  </h3>
                  <p style={{ color: 'var(--text-dim)', fontSize: '12px' }}>
                    Configure environment parameters for cluster setup.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDeployingItem(null)}
                disabled={deployLoading}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-dim)',
                  cursor: 'pointer',
                  padding: '4px',
                  width: 'auto'
                }}
              >
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {deploySuccess ? (
              /* Success panel */
              <div style={{ textAlign: 'center', padding: '24px 0', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'rgba(74, 222, 128, 0.1)',
                  color: 'var(--accent-green)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px',
                  border: '1px solid rgba(74, 222, 128, 0.2)'
                }}>
                  <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h4 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                  DEPLOYMENT INITIATED
                </h4>
                <p style={{ fontSize: '13px', color: 'var(--text-dim)', lineHeight: 1.5, marginBottom: '24px', maxWidth: '360px' }}>
                  Your service configuration has been successfully saved to project stack and deployment container build has been triggered.
                </p>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => { setDeployingItem(null); setDeploySuccess(false); }}
                    className="nav-item"
                    style={{ width: 'auto', padding: '8px 16px', fontSize: '12px', border: '1px solid var(--border-glass)', background: 'transparent', color: 'var(--text-dim)' }}
                  >
                    STAY HERE
                  </button>
                  <button
                    onClick={() => { setDeployingItem(null); setDeploySuccess(false); router.push('/services'); }}
                    className="nav-item active"
                    style={{ width: 'auto', padding: '8px 20px', fontSize: '12px' }}
                  >
                    GO TO SERVICES
                  </button>
                </div>
              </div>
            ) : (
              /* Configuration form */
              <form onSubmit={handleDeployTemplate} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                <div style={{ overflowY: 'auto', flex: 1, paddingRight: '4px', marginBottom: '20px' }}>
                  {/* Target Selectors */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase' }}>
                        Target Organization
                      </label>
                      <CustomSelect
                        value={selectedOrgId || ''}
                        onChange={handleOrgChange}
                        options={orgs.map(org => ({ value: org.id, label: org.name }))}
                        disabled={deployLoading}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase' }}>
                        Target Project Stack
                      </label>
                      <CustomSelect
                        value={selectedProjectId || ''}
                        onChange={handleProjectChange}
                        options={projects.map(p => ({ value: p.id, label: p.name }))}
                        disabled={deployLoading}
                      />
                    </div>
                  </div>

                  {/* Dynamic inputs */}
                  <h4 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '12px' }}>
                    Environment Variables Configuration
                  </h4>

                  {composeLoading ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', background: 'var(--bg-tertiary)', borderRadius: '4px', border: '1px solid var(--border-glass)' }}>
                      <div className="throbber" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />
                      <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Scanning template config parameters...</span>
                    </div>
                  ) : detectedEnvVars.length === 0 ? (
                    <p style={{ fontSize: '12px', color: 'var(--text-dim)', fontStyle: 'italic', marginBottom: '16px' }}>
                      No preset environment variables found. You can add custom ones below.
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
                      {detectedEnvVars.map(v => (
                        <div key={v.key}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                              {v.key}
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                              {v.label}
                            </span>
                          </div>
                          <input
                            type={v.key.toLowerCase().includes('password') || v.key.toLowerCase().includes('secret') || v.key.toLowerCase().includes('key') ? 'password' : 'text'}
                            value={formEnvValues[v.key] || ''}
                            onChange={e => setFormEnvValues(prev => ({ ...prev, [v.key]: e.target.value }))}
                            placeholder={v.defaultValue === '(auto-generated)' ? 'Auto-generated if left blank' : `Default: ${v.defaultValue || 'none'}`}
                            disabled={deployLoading}
                            style={{
                              background: 'var(--bg-tertiary)',
                              borderColor: 'var(--border-glass)',
                              fontSize: '13px'
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Manual/Custom variables builder */}
                  <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-glass)', paddingTop: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <h5 style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                        Custom Variables
                      </h5>
                      <button
                        type="button"
                        onClick={addCustomEnvVar}
                        disabled={deployLoading}
                        className="nav-item"
                        style={{
                          width: 'auto',
                          padding: '4px 10px',
                          fontSize: '11px',
                          border: '1px solid var(--border-glass)',
                          background: 'transparent',
                          color: 'var(--accent-cyan)'
                        }}
                      >
                        + ADD VARIABLE
                      </button>
                    </div>

                    {customEnvVars.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {customEnvVars.map((item, idx) => (
                          <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input
                              type="text"
                              placeholder="KEY"
                              value={item.key}
                              onChange={e => updateCustomEnvVar(idx, 'key', e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
                              disabled={deployLoading}
                              style={{
                                flex: 1,
                                background: 'var(--bg-tertiary)',
                                borderColor: 'var(--border-glass)',
                                fontSize: '12px',
                                fontFamily: 'var(--font-mono)',
                                padding: '6px 10px'
                              }}
                            />
                            <input
                              type="text"
                              placeholder="VALUE"
                              value={item.value}
                              onChange={e => updateCustomEnvVar(idx, 'value', e.target.value)}
                              disabled={deployLoading}
                              style={{
                                flex: 1,
                                background: 'var(--bg-tertiary)',
                                borderColor: 'var(--border-glass)',
                                fontSize: '12px',
                                padding: '6px 10px'
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => removeCustomEnvVar(idx)}
                              disabled={deployLoading}
                              style={{
                                width: '32px',
                                height: '32px',
                                background: 'rgba(248, 113, 113, 0.1)',
                                border: '1px solid rgba(248, 113, 113, 0.2)',
                                color: 'var(--accent-red)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: 0,
                                borderRadius: '4px',
                                cursor: 'pointer'
                              }}
                            >
                              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {deployError && (
                  <div style={{ padding: '10px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)', color: '#f87171', fontSize: '12px', marginBottom: '20px' }}>
                    {deployError}
                  </div>
                )}

                {/* Footer Buttons */}
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid var(--border-glass)', paddingTop: '16px' }}>
                  <button 
                    type="button" 
                    onClick={() => setDeployingItem(null)} 
                    disabled={deployLoading}
                    className="nav-item" 
                    style={{ width: 'auto', padding: '8px 20px', fontSize: '12px', border: '1px solid var(--border-glass)', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer' }}
                  >
                    CANCEL
                  </button>
                  <button 
                    type="submit" 
                    disabled={deployLoading || !selectedProjectId}
                    className="nav-item active" 
                    style={{ 
                      width: 'auto', 
                      padding: '8px 24px', 
                      fontSize: '12px', 
                      border: '1px solid var(--border-glass)', 
                      background: 'var(--bg-tertiary)', 
                      color: 'var(--text-primary)', 
                      cursor: 'pointer', 
                      opacity: (deployLoading || !selectedProjectId) ? 0.5 : 1 
                    }}
                  >
                    {deployLoading ? 'DEPLOYING...' : 'CONFIRM DEPLOY'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
