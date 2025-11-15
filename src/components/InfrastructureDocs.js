import React, { useState } from 'react';
import Banner from './Banner';
import AdminLogin from './AdminLogin';
import AdminOrders from './AdminOrders';

function InfrastructureDocs() {
  const [token, setToken] = useState(null);

  return (
    <div className="infrastructure-docs-page">
      <Banner sections={[]} showBack={true} backHref="#/" />
      <div className="container" style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem' }}>
        <h1 style={{ color: '#1976d2', marginBottom: '2rem' }}>K3s Cluster Infrastructure Documentation</h1>
        
        <div style={{ background: '#fff', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', marginBottom: '2rem' }}>
          <h2 style={{ color: '#333', borderBottom: '2px solid #1976d2', paddingBottom: '0.5rem' }}>Architecture Overview</h2>
          <p style={{ lineHeight: '1.6', fontSize: '1.1rem', color: '#555' }}>
            Production-grade Kubernetes cluster built on 4 Raspberry Pi nodes with automated CI/CD pipeline, 
            container registry, and load balancing. This infrastructure powers the Edwards Engineering website 
            with zero-downtime deployments and enterprise-level reliability.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
          <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
            <h3 style={{ color: '#1976d2', marginTop: '0' }}>🏗️ Infrastructure Components</h3>
            <ul style={{ lineHeight: '1.8', color: '#555' }}>
              <li><strong>K3s Kubernetes:</strong> Lightweight Kubernetes distribution</li>
              <li><strong>MetalLB:</strong> Load balancer for bare metal</li>
              <li><strong>Docker Registry:</strong> Local container image storage</li>
              <li><strong>Let's Encrypt:</strong> Automated SSL certificate management</li>
              <li><strong>Ansible:</strong> Infrastructure automation and CI/CD</li>
            </ul>
          </div>

          <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
            <h3 style={{ color: '#1976d2', marginTop: '0' }}>🌐 Network Layout</h3>
            <ul style={{ lineHeight: '1.8', color: '#555' }}>
              <li><strong>Master Node:</strong> 192.168.0.40 (raspberrypi)</li>
              <li><strong>Worker Node 1:</strong> 192.168.0.41 (node1)</li>
              <li><strong>Worker Node 2:</strong> 192.168.0.42 (node2)</li>
              <li><strong>Worker Node 3:</strong> 192.168.0.43 (node3)</li>
              <li><strong>Registry:</strong> localhost:5000 (internal)</li>
            </ul>
          </div>
        </div>

        <div style={{ background: '#fff', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', marginBottom: '2rem' }}>
          <h2 style={{ color: '#333', borderBottom: '2px solid #1976d2', paddingBottom: '0.5rem' }}>Deployment Pipeline</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginTop: '1.5rem' }}>
            <div style={{ textAlign: 'center', padding: '1rem', background: '#f8f9fa', borderRadius: '8px' }}>
              <div style={{ background: '#1976d2', color: 'white', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', fontWeight: 'bold' }}>1</div>
              <strong>Build</strong>
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem', color: '#666' }}>Docker images built with proper Dockerfiles</p>
            </div>
            <div style={{ textAlign: 'center', padding: '1rem', background: '#f8f9fa', borderRadius: '8px' }}>
              <div style={{ background: '#1976d2', color: 'white', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', fontWeight: 'bold' }}>2</div>
              <strong>Push</strong>
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem', color: '#666' }}>Images pushed to local registry</p>
            </div>
            <div style={{ textAlign: 'center', padding: '1rem', background: '#f8f9fa', borderRadius: '8px' }}>
              <div style={{ background: '#1976d2', color: 'white', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', fontWeight: 'bold' }}>3</div>
              <strong>Deploy</strong>
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem', color: '#666' }}>Rolling updates via Kubernetes</p>
            </div>
            <div style={{ textAlign: 'center', padding: '1rem', background: '#f8f9fa', borderRadius: '8px' }}>
              <div style={{ background: '#1976d2', color: 'white', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', fontWeight: 'bold' }}>4</div>
              <strong>Verify</strong>
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem', color: '#666' }}>Health checks and monitoring</p>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
          <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
            <h3 style={{ color: '#1976d2', marginTop: '0' }}>📊 Performance Metrics</h3>
            <ul style={{ lineHeight: '1.8', color: '#555' }}>
              <li><strong>Deployment Time:</strong> ~6 minutes (down from 30 min manual)</li>
              <li><strong>Zero Downtime:</strong> Rolling updates with health checks</li>
              <li><strong>SSL Automation:</strong> Let's Encrypt with auto-renewal</li>
              <li><strong>Load Distribution:</strong> Traffic across 4 nodes</li>
              <li><strong>Container Registry:</strong> Local image caching</li>
            </ul>
          </div>

          <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
            <h3 style={{ color: '#1976d2', marginTop: '0' }}>🛠️ Technologies Used</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {['Kubernetes', 'Docker', 'Ansible', 'Raspberry Pi', 'Linux', 'MetalLB', 'Let\'s Encrypt', 'React', 'Node.js'].map(tech => (
                <span key={tech} style={{ 
                  background: '#e3f2fd', 
                  color: '#1976d2', 
                  padding: '0.3rem 0.8rem', 
                  borderRadius: '20px', 
                  fontSize: '0.9rem',
                  fontWeight: '500'
                }}>{tech}</span>
              ))}
            </div>
          </div>
        </div>

        <div style={{ background: '#fff', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', marginBottom: '2rem' }}>
          <h2 style={{ color: '#333', borderBottom: '2px solid #1976d2', paddingBottom: '0.5rem' }}>Key Commands</h2>
          <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '8px', marginTop: '1rem', fontFamily: 'monospace' }}>
            <div style={{ marginBottom: '1rem' }}>
              <strong style={{ color: '#1976d2' }}>Deploy website updates:</strong>
              <div style={{ background: '#333', color: '#fff', padding: '0.5rem', borderRadius: '4px', marginTop: '0.5rem' }}>
                ansible-playbook -i inventory/hosts.yml playbooks/deploy-website.yml
              </div>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <strong style={{ color: '#1976d2' }}>Check cluster health:</strong>
              <div style={{ background: '#333', color: '#fff', padding: '0.5rem', borderRadius: '4px', marginTop: '0.5rem' }}>
                ansible-playbook -i inventory/hosts.yml playbooks/health-check.yml
              </div>
            </div>
            <div>
              <strong style={{ color: '#1976d2' }}>Test connectivity:</strong>
              <div style={{ background: '#333', color: '#fff', padding: '0.5rem', borderRadius: '4px', marginTop: '0.5rem' }}>
                ansible all -m ping -i inventory/hosts.yml
              </div>
            </div>
          </div>
        </div>

        <div style={{ background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)', color: 'white', padding: '2rem', borderRadius: '12px', textAlign: 'center' }}>
          <h2 style={{ color: 'white', marginTop: '0' }}>🚀 Result</h2>
          <p style={{ fontSize: '1.2rem', lineHeight: '1.6', margin: '1rem 0' }}>
            Enterprise-grade infrastructure with professional CI/CD pipeline, automated deployments, 
            and high availability. Perfect foundation for scalable web applications.
          </p>
          <a 
            href="https://edwardstech.dev"
            target="_blank" 
            rel="noopener noreferrer"
            style={{ 
              background: 'white', 
              color: '#1976d2', 
              padding: '0.8rem 2rem', 
              borderRadius: '25px', 
              textDecoration: 'none', 
              fontWeight: 'bold',
              display: 'inline-block',
              marginTop: '1rem'
            }}
          >
            View Live Site →
          </a>
        </div>

        {/* Example usage:
        const [token, setToken] = useState(null);
        {!token ? <AdminLogin onLogin={setToken} /> : <AdminOrders token={token} />}
        */}
        <AdminLogin onLogin={setToken} />
        <AdminOrders token={token} />
      </div>
    </div>
  );
}

export default InfrastructureDocs;