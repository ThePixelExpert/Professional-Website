import React, { useState, useEffect } from 'react';
import { 
  FaCog, FaEnvelope, FaBuilding, FaSave, FaUndo, FaDownload,
  FaUpload, FaEye, FaEdit, FaExclamationTriangle,
  FaBell, FaShieldAlt, FaDatabase
} from 'react-icons/fa';
import './AdminSettings.css';

function AdminSettings({ token }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('business');
  const [settings, setSettings] = useState({
    business: {
      company_name: 'Edwards Tech Solutions',
      company_email: 'lmedwards.professional@gmail.com',
      company_phone: '+1 (555) 123-4567',
      company_address: '123 Innovation Drive, New York, NY 10001',
      website_url: 'https://edwardstech.solutions',
      tax_rate: 8.25,
      currency: 'USD',
      timezone: 'America/New_York'
    },
    email: {
      smtp_host: 'smtp.gmail.com',
      smtp_port: 587,
      smtp_user: 'lmedwards.professional@gmail.com',
      smtp_secure: true,
      from_name: 'Edwards Tech Solutions',
      from_email: 'lmedwards.professional@gmail.com'
    },
    notifications: {
      new_order_admin: true,
      order_status_customer: true,
      payment_confirmation: true,
      shipping_updates: true,
      low_inventory: false,
      daily_reports: true
    },
    security: {
      session_timeout: 60,
      password_expiry: 90,
      two_factor_enabled: false,
      login_attempts: 5,
      ip_whitelist: []
    },
    system: {
      backup_frequency: 'daily',
      log_retention: 30,
      maintenance_mode: false,
      debug_mode: false,
      max_upload_size: 10
    }
  });

  const [emailTemplates, setEmailTemplates] = useState([
    {
      id: 'order_confirmation',
      name: 'Order Confirmation',
      subject: 'Order Confirmation - #{order_id}',
      template: `
<h2>Thank you for your order!</h2>
<p>Dear {customer_name},</p>
<p>We have received your order #{order_id} and it is being processed.</p>
<p><strong>Order Total: {total_amount}</strong></p>
<p>We will send you tracking information once your order ships.</p>
<p>Best regards,<br>{company_name}</p>
      `.trim(),
      variables: ['customer_name', 'order_id', 'total_amount', 'company_name']
    },
    {
      id: 'order_shipped',
      name: 'Order Shipped',
      subject: 'Your Order Has Shipped - #{order_id}',
      template: `
<h2>Your order is on its way!</h2>
<p>Dear {customer_name},</p>
<p>Great news! Your order #{order_id} has shipped.</p>
<p><strong>Tracking Number:</strong> {tracking_number}</p>
<p>You can track your package using the tracking number above.</p>
<p>Best regards,<br>{company_name}</p>
      `.trim(),
      variables: ['customer_name', 'order_id', 'tracking_number', 'company_name']
    }
  ]);

  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [previewTemplate, setPreviewTemplate] = useState(null);

  useEffect(() => {
    fetchSettings();
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchSettings = async () => {
    try {
      setLoading(true);
      // In development, we'll use the default settings
      // In production, this would fetch from the database
      setTimeout(() => {
        setLoading(false);
      }, 500);
    } catch (error) {
      console.error('Failed to load settings:', error);
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      
      // In development, simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In production, this would save to database:
      // await fetch('/api/admin/settings', {
      //   method: 'PUT',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${token}`
      //   },
      //   body: JSON.stringify(settings)
      // });
      
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const resetSettings = () => {
    if (window.confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
      fetchSettings();
    }
  };

  const exportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `settings-export-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const importSettings = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedSettings = JSON.parse(e.target.result);
        setSettings(importedSettings);
        alert('Settings imported successfully!');
      } catch (error) {
        alert('Invalid settings file. Please check the format.');
      }
    };
    reader.readAsText(file);
  };

  const handleSettingChange = (section, field, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const previewEmailTemplate = (template) => {
    const sampleData = {
      customer_name: 'John Doe',
      order_id: '12345',
      total_amount: '$449.99',
      tracking_number: 'UPS123456789',
      company_name: settings.business.company_name
    };
    
    let preview = template.template;
    template.variables.forEach(variable => {
      const regex = new RegExp(`{${variable}}`, 'g');
      preview = preview.replace(regex, sampleData[variable] || `{${variable}}`);
    });
    
    setPreviewTemplate({
      ...template,
      preview
    });
  };

  const BusinessSettings = () => (
    <div className="settings-section">
      <h3><FaBuilding /> Business Information</h3>
      
      <div className="form-grid">
        <div className="form-group">
          <label>Company Name</label>
          <input
            type="text"
            value={settings.business.company_name}
            onChange={(e) => handleSettingChange('business', 'company_name', e.target.value)}
          />
        </div>
        
        <div className="form-group">
          <label>Company Email</label>
          <input
            type="email"
            value={settings.business.company_email}
            onChange={(e) => handleSettingChange('business', 'company_email', e.target.value)}
          />
        </div>
        
        <div className="form-group">
          <label>Company Phone</label>
          <input
            type="tel"
            value={settings.business.company_phone}
            onChange={(e) => handleSettingChange('business', 'company_phone', e.target.value)}
          />
        </div>
        
        <div className="form-group">
          <label>Website URL</label>
          <input
            type="url"
            value={settings.business.website_url}
            onChange={(e) => handleSettingChange('business', 'website_url', e.target.value)}
          />
        </div>
        
        <div className="form-group full-width">
          <label>Company Address</label>
          <textarea
            value={settings.business.company_address}
            onChange={(e) => handleSettingChange('business', 'company_address', e.target.value)}
            rows={3}
          />
        </div>
        
        <div className="form-group">
          <label>Tax Rate (%)</label>
          <input
            type="number"
            step="0.01"
            value={settings.business.tax_rate}
            onChange={(e) => handleSettingChange('business', 'tax_rate', parseFloat(e.target.value))}
          />
        </div>
        
        <div className="form-group">
          <label>Currency</label>
          <select
            value={settings.business.currency}
            onChange={(e) => handleSettingChange('business', 'currency', e.target.value)}
          >
            <option value="USD">USD - US Dollar</option>
            <option value="EUR">EUR - Euro</option>
            <option value="GBP">GBP - British Pound</option>
            <option value="CAD">CAD - Canadian Dollar</option>
          </select>
        </div>
        
        <div className="form-group">
          <label>Timezone</label>
          <select
            value={settings.business.timezone}
            onChange={(e) => handleSettingChange('business', 'timezone', e.target.value)}
          >
            <option value="America/New_York">Eastern Time</option>
            <option value="America/Chicago">Central Time</option>
            <option value="America/Denver">Mountain Time</option>
            <option value="America/Los_Angeles">Pacific Time</option>
            <option value="UTC">UTC</option>
          </select>
        </div>
      </div>
    </div>
  );

  const EmailSettings = () => (
    <div className="settings-section">
      <h3><FaEnvelope /> Email Configuration</h3>
      
      <div className="form-grid">
        <div className="form-group">
          <label>SMTP Host</label>
          <input
            type="text"
            value={settings.email.smtp_host}
            onChange={(e) => handleSettingChange('email', 'smtp_host', e.target.value)}
          />
        </div>
        
        <div className="form-group">
          <label>SMTP Port</label>
          <input
            type="number"
            value={settings.email.smtp_port}
            onChange={(e) => handleSettingChange('email', 'smtp_port', parseInt(e.target.value))}
          />
        </div>
        
        <div className="form-group">
          <label>SMTP Username</label>
          <input
            type="email"
            value={settings.email.smtp_user}
            onChange={(e) => handleSettingChange('email', 'smtp_user', e.target.value)}
          />
        </div>
        
        <div className="form-group">
          <label>From Name</label>
          <input
            type="text"
            value={settings.email.from_name}
            onChange={(e) => handleSettingChange('email', 'from_name', e.target.value)}
          />
        </div>
        
        <div className="form-group">
          <label>From Email</label>
          <input
            type="email"
            value={settings.email.from_email}
            onChange={(e) => handleSettingChange('email', 'from_email', e.target.value)}
          />
        </div>
        
        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={settings.email.smtp_secure}
              onChange={(e) => handleSettingChange('email', 'smtp_secure', e.target.checked)}
            />
            Use SSL/TLS
          </label>
        </div>
      </div>
      
      <div className="email-templates">
        <h4>Email Templates</h4>
        <div className="templates-grid">
          {emailTemplates.map(template => (
            <div key={template.id} className="template-card">
              <h5>{template.name}</h5>
              <p>Subject: {template.subject}</p>
              <div className="template-actions">
                <button onClick={() => previewEmailTemplate(template)}>
                  <FaEye /> Preview
                </button>
                <button onClick={() => setSelectedTemplate(template)}>
                  <FaEdit /> Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const NotificationSettings = () => (
    <div className="settings-section">
      <h3><FaBell /> Notification Preferences</h3>
      
      <div className="notification-grid">
        {Object.entries(settings.notifications).map(([key, value]) => (
          <div key={key} className="notification-item">
            <label>
              <input
                type="checkbox"
                checked={value}
                onChange={(e) => handleSettingChange('notifications', key, e.target.checked)}
              />
              {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </label>
          </div>
        ))}
      </div>
    </div>
  );

  const SecuritySettings = () => (
    <div className="settings-section">
      <h3><FaShieldAlt /> Security Settings</h3>
      
      <div className="form-grid">
        <div className="form-group">
          <label>Session Timeout (minutes)</label>
          <input
            type="number"
            value={settings.security.session_timeout}
            onChange={(e) => handleSettingChange('security', 'session_timeout', parseInt(e.target.value))}
          />
        </div>
        
        <div className="form-group">
          <label>Password Expiry (days)</label>
          <input
            type="number"
            value={settings.security.password_expiry}
            onChange={(e) => handleSettingChange('security', 'password_expiry', parseInt(e.target.value))}
          />
        </div>
        
        <div className="form-group">
          <label>Max Login Attempts</label>
          <input
            type="number"
            value={settings.security.login_attempts}
            onChange={(e) => handleSettingChange('security', 'login_attempts', parseInt(e.target.value))}
          />
        </div>
        
        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={settings.security.two_factor_enabled}
              onChange={(e) => handleSettingChange('security', 'two_factor_enabled', e.target.checked)}
            />
            Enable Two-Factor Authentication
          </label>
        </div>
      </div>
    </div>
  );

  const SystemSettings = () => (
    <div className="settings-section">
      <h3><FaDatabase /> System Configuration</h3>
      
      <div className="form-grid">
        <div className="form-group">
          <label>Backup Frequency</label>
          <select
            value={settings.system.backup_frequency}
            onChange={(e) => handleSettingChange('system', 'backup_frequency', e.target.value)}
          >
            <option value="hourly">Hourly</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
        
        <div className="form-group">
          <label>Log Retention (days)</label>
          <input
            type="number"
            value={settings.system.log_retention}
            onChange={(e) => handleSettingChange('system', 'log_retention', parseInt(e.target.value))}
          />
        </div>
        
        <div className="form-group">
          <label>Max Upload Size (MB)</label>
          <input
            type="number"
            value={settings.system.max_upload_size}
            onChange={(e) => handleSettingChange('system', 'max_upload_size', parseInt(e.target.value))}
          />
        </div>
        
        <div className="form-group">
          <label className="danger-label">
            <input
              type="checkbox"
              checked={settings.system.maintenance_mode}
              onChange={(e) => handleSettingChange('system', 'maintenance_mode', e.target.checked)}
            />
            <FaExclamationTriangle />
            Maintenance Mode
          </label>
        </div>
        
        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={settings.system.debug_mode}
              onChange={(e) => handleSettingChange('system', 'debug_mode', e.target.checked)}
            />
            Debug Mode
          </label>
        </div>
      </div>
      
      <div className="system-actions">
        <h4>System Actions</h4>
        <div className="action-buttons">
          <button onClick={exportSettings} className="export-btn">
            <FaDownload />
            Export Settings
          </button>
          <label className="import-btn">
            <FaUpload />
            Import Settings
            <input type="file" accept=".json" onChange={importSettings} hidden />
          </label>
          <button onClick={resetSettings} className="reset-btn">
            <FaUndo />
            Reset to Defaults
          </button>
        </div>
      </div>
    </div>
  );

  if (loading) return <div className="loading">Loading settings...</div>;

  return (
    <div className="admin-settings">
      <div className="settings-header">
        <h2><FaCog /> System Settings</h2>
        <div className="header-actions">
          <button onClick={saveSettings} disabled={saving} className="save-btn">
            <FaSave />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="settings-navigation">
        <button 
          className={activeSection === 'business' ? 'active' : ''}
          onClick={() => setActiveSection('business')}
        >
          <FaBuilding />
          Business
        </button>
        <button 
          className={activeSection === 'email' ? 'active' : ''}
          onClick={() => setActiveSection('email')}
        >
          <FaEnvelope />
          Email
        </button>
        <button 
          className={activeSection === 'notifications' ? 'active' : ''}
          onClick={() => setActiveSection('notifications')}
        >
          <FaBell />
          Notifications
        </button>
        <button 
          className={activeSection === 'security' ? 'active' : ''}
          onClick={() => setActiveSection('security')}
        >
          <FaShieldAlt />
          Security
        </button>
        <button 
          className={activeSection === 'system' ? 'active' : ''}
          onClick={() => setActiveSection('system')}
        >
          <FaDatabase />
          System
        </button>
      </div>

      <div className="settings-content">
        {activeSection === 'business' && <BusinessSettings />}
        {activeSection === 'email' && <EmailSettings />}
        {activeSection === 'notifications' && <NotificationSettings />}
        {activeSection === 'security' && <SecuritySettings />}
        {activeSection === 'system' && <SystemSettings />}
      </div>

      {/* Email Template Preview Modal */}
      {previewTemplate && (
        <div className="modal-overlay" onClick={() => setPreviewTemplate(null)}>
          <div className="template-preview-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Template Preview: {previewTemplate.name}</h3>
              <button onClick={() => setPreviewTemplate(null)}>×</button>
            </div>
            <div className="preview-content">
              <div className="preview-subject">
                <strong>Subject:</strong> {previewTemplate.subject.replace(/{order_id}/g, '12345')}
              </div>
              <div className="preview-body" dangerouslySetInnerHTML={{ __html: previewTemplate.preview }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminSettings;