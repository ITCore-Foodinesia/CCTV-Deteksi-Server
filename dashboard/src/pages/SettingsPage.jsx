/**
 * SettingsPage - Tenant and operational settings (owner only)
 * Based on new_theme/app.js design patterns
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Settings, Building, Clock, Bell, Shield, Database, Save, Zap } from 'lucide-react';
import {
  PageHeader,
  PrimaryButton,
  Card,
  FormInput,
  FormSelect,
} from '../components/shared';
import QuickActionsSettings from '../components/QuickActionsSettings';

// Mock settings data
const INITIAL_SETTINGS = {
  // Company Info
  company_name: 'PT. Gudang Driver Indonesia',
  company_address: 'Jl. Raya Industri No. 123, Jakarta',
  company_phone: '+62 21 1234 5678',
  company_email: 'info@gudangdriver.com',
  
  // Operational
  operating_hours_start: '06:00',
  operating_hours_end: '22:00',
  max_wait_time_minutes: 30,
  session_timeout_minutes: 240,
  queue_auto_assign: true,
  
  // Notifications
  notify_long_wait: true,
  notify_session_complete: true,
  notify_maintenance: true,
  notification_email: 'alerts@gudangdriver.com',
  
  // Security
  session_expiry_hours: 24,
  require_2fa: false,
  password_min_length: 8,
  
  // Data
  data_retention_days: 365,
  auto_backup: true,
  backup_frequency: 'daily',
};

const BACKUP_FREQUENCY_OPTIONS = [
  { value: 'hourly', label: 'Hourly' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
];

const SettingsPage = () => {
  const [searchParams] = useSearchParams();
  const [settings, setSettings] = useState(INITIAL_SETTINGS);
  const [activeTab, setActiveTab] = useState('company');
  const [hasChanges, setHasChanges] = useState(false);

  // Handle URL query param for tab (e.g., /settings?tab=quick-actions)
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const tabs = [
    { id: 'company', label: 'Company', icon: Building },
    { id: 'operational', label: 'Operational', icon: Clock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'quick-actions', label: 'Quick Actions', icon: Zap },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'data', label: 'Data & Backup', icon: Database },
  ];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    // In real app, would save to API
    alert('Settings saved successfully!');
    setHasChanges(false);
  };

  const handleReset = () => {
    if (window.confirm('Reset all settings to default?')) {
      setSettings(INITIAL_SETTINGS);
      setHasChanges(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Settings"
        subtitle="Configure system and operational settings"
      >
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Reset to Default
          </button>
          <PrimaryButton onClick={handleSave} disabled={!hasChanges}>
            <span className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              Save Changes
            </span>
          </PrimaryButton>
        </div>
      </PageHeader>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-[#84CC16] text-gray-900'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        {/* Company Settings */}
        {activeTab === 'company' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Company Information</h3>
              <p className="mt-1 text-sm text-gray-500">Basic information about your organization</p>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <FormInput
                label="Company Name"
                name="company_name"
                value={settings.company_name}
                onChange={handleChange}
                placeholder="Your company name"
              />
              <FormInput
                label="Contact Email"
                name="company_email"
                type="email"
                value={settings.company_email}
                onChange={handleChange}
                placeholder="info@company.com"
              />
              <FormInput
                label="Phone Number"
                name="company_phone"
                value={settings.company_phone}
                onChange={handleChange}
                placeholder="+62 xxx xxxx xxxx"
              />
              <div className="sm:col-span-2">
                <FormInput
                  label="Address"
                  name="company_address"
                  value={settings.company_address}
                  onChange={handleChange}
                  placeholder="Full address"
                />
              </div>
            </div>
          </div>
        )}

        {/* Operational Settings */}
        {activeTab === 'operational' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Operational Settings</h3>
              <p className="mt-1 text-sm text-gray-500">Configure daily operations parameters</p>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <FormInput
                label="Operating Hours Start"
                name="operating_hours_start"
                type="time"
                value={settings.operating_hours_start}
                onChange={handleChange}
              />
              <FormInput
                label="Operating Hours End"
                name="operating_hours_end"
                type="time"
                value={settings.operating_hours_end}
                onChange={handleChange}
              />
              <FormInput
                label="Max Wait Time (minutes)"
                name="max_wait_time_minutes"
                type="number"
                value={settings.max_wait_time_minutes}
                onChange={handleChange}
              />
              <FormInput
                label="Session Timeout (minutes)"
                name="session_timeout_minutes"
                type="number"
                value={settings.session_timeout_minutes}
                onChange={handleChange}
              />
            </div>

            <div className="border-t border-gray-100 pt-4">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  name="queue_auto_assign"
                  checked={settings.queue_auto_assign}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <div className="text-sm font-medium text-gray-900">Auto-assign Queue</div>
                  <div className="text-xs text-gray-500">Automatically assign available docks to waiting trucks</div>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Notification Settings */}
        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Notification Settings</h3>
              <p className="mt-1 text-sm text-gray-500">Configure when and how to receive alerts</p>
            </div>
            
            <div className="space-y-4">
              <FormInput
                label="Notification Email"
                name="notification_email"
                type="email"
                value={settings.notification_email}
                onChange={handleChange}
                placeholder="alerts@company.com"
              />

              <div className="space-y-3 rounded-xl bg-gray-50 p-4">
                <div className="text-sm font-medium text-gray-900">Alert Triggers</div>
                
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    name="notify_long_wait"
                    checked={settings.notify_long_wait}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <div className="text-sm text-gray-900">Long Wait Time</div>
                    <div className="text-xs text-gray-500">Alert when truck waits longer than configured max time</div>
                  </div>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    name="notify_session_complete"
                    checked={settings.notify_session_complete}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <div className="text-sm text-gray-900">Session Complete</div>
                    <div className="text-xs text-gray-500">Notify when a loading/unloading session is completed</div>
                  </div>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    name="notify_maintenance"
                    checked={settings.notify_maintenance}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <div className="text-sm text-gray-900">Maintenance Alerts</div>
                    <div className="text-xs text-gray-500">Notify when dock is set to/from maintenance mode</div>
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions Settings */}
        {activeTab === 'quick-actions' && (
          <QuickActionsSettings />
        )}

        {/* Security Settings */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Security Settings</h3>
              <p className="mt-1 text-sm text-gray-500">Configure authentication and security options</p>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <FormInput
                label="Session Expiry (hours)"
                name="session_expiry_hours"
                type="number"
                value={settings.session_expiry_hours}
                onChange={handleChange}
              />
              <FormInput
                label="Minimum Password Length"
                name="password_min_length"
                type="number"
                value={settings.password_min_length}
                onChange={handleChange}
              />
            </div>

            <div className="border-t border-gray-100 pt-4">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  name="require_2fa"
                  checked={settings.require_2fa}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <div className="text-sm font-medium text-gray-900">Require Two-Factor Authentication</div>
                  <div className="text-xs text-gray-500">All users must set up 2FA to access the system</div>
                </div>
              </label>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex gap-3">
                <Shield className="h-5 w-5 text-amber-600" />
                <div>
                  <div className="text-sm font-medium text-amber-800">Security Recommendation</div>
                  <div className="mt-1 text-xs text-amber-700">
                    Enable 2FA and set password minimum length to at least 12 characters for better security.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Data & Backup Settings */}
        {activeTab === 'data' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Data & Backup</h3>
              <p className="mt-1 text-sm text-gray-500">Configure data retention and backup settings</p>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <FormInput
                label="Data Retention Period (days)"
                name="data_retention_days"
                type="number"
                value={settings.data_retention_days}
                onChange={handleChange}
              />
              <FormSelect
                label="Backup Frequency"
                name="backup_frequency"
                value={settings.backup_frequency}
                onChange={handleChange}
                options={BACKUP_FREQUENCY_OPTIONS}
              />
            </div>

            <div className="border-t border-gray-100 pt-4">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  name="auto_backup"
                  checked={settings.auto_backup}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <div className="text-sm font-medium text-gray-900">Automatic Backup</div>
                  <div className="text-xs text-gray-500">Automatically backup data according to the schedule</div>
                </div>
              </label>
            </div>

            <div className="rounded-xl bg-gray-50 p-4">
              <div className="text-sm font-medium text-gray-900">Backup Status</div>
              <div className="mt-2 space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Last Backup:</span>
                  <span className="font-medium">Today, 03:00 AM</span>
                </div>
                <div className="flex justify-between">
                  <span>Backup Size:</span>
                  <span className="font-medium">2.4 GB</span>
                </div>
                <div className="flex justify-between">
                  <span>Next Scheduled:</span>
                  <span className="font-medium">Tomorrow, 03:00 AM</span>
                </div>
              </div>
              <button className="mt-3 w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Run Manual Backup
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Unsaved Changes Warning */}
      {hasChanges && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-xl bg-gray-900 px-4 py-3 text-sm text-white shadow-lg">
          <span className="flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            You have unsaved changes
            <button
              onClick={handleSave}
              className="ml-2 rounded-lg bg-[#84CC16] px-3 py-1 text-xs font-semibold text-gray-900"
            >
              Save Now
            </button>
          </span>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
