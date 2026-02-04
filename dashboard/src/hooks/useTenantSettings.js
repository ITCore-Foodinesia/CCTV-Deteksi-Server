/**
 * useTenantSettings - Hook for managing tenant settings
 *
 * Features:
 * - Fetch tenant settings from tenants.settings JSONB
 * - Update/save settings
 * - Default settings fallback
 *
 * @example
 * const { settings, updateSettings, loading } = useTenantSettings();
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Default settings structure
 */
export const DEFAULT_SETTINGS = {
  // Company Info
  company_name: '',
  company_address: '',
  company_phone: '',
  company_email: '',

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
  notification_email: '',

  // Security
  session_expiry_hours: 24,
  require_2fa: false,
  password_min_length: 8,

  // Data
  data_retention_days: 365,
  auto_backup: true,
  backup_frequency: 'daily',
};

/**
 * Hook for tenant settings
 *
 * @param {string} tenantId - Optional tenant ID (uses first tenant if not provided)
 * @returns {object} Settings data and operations
 */
export const useTenantSettings = (tenantId = null) => {
  const [tenant, setTenant] = useState(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);

  const isMounted = useRef(true);
  const originalSettings = useRef(null);

  /**
   * Fetch tenant and settings
   */
  const fetchSettings = useCallback(async () => {
    if (!isMounted.current) return;

    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('tenants')
        .select('id, name, slug, settings, plan, is_active');

      // If tenant ID provided, filter by it
      if (tenantId) {
        query = query.eq('id', tenantId);
      }

      const { data: tenants, error: fetchError } = await query.limit(1).single();

      if (fetchError) throw fetchError;

      if (isMounted.current && tenants) {
        setTenant(tenants);
        // Merge with defaults to ensure all keys exist
        const mergedSettings = {
          ...DEFAULT_SETTINGS,
          ...(tenants.settings || {}),
        };
        setSettings(mergedSettings);
        originalSettings.current = mergedSettings;
        setHasChanges(false);
      }
    } catch (err) {
      console.error('[useTenantSettings] Error fetching settings:', err);
      if (isMounted.current) {
        setError(err.message || 'Failed to fetch settings');
        // Use defaults on error
        setSettings(DEFAULT_SETTINGS);
        originalSettings.current = DEFAULT_SETTINGS;
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [tenantId]);

  /**
   * Setup effect
   */
  useEffect(() => {
    isMounted.current = true;
    fetchSettings();

    return () => {
      isMounted.current = false;
    };
  }, [fetchSettings]);

  /**
   * Update a single setting (local state only)
   */
  const updateSetting = useCallback((key, value) => {
    setSettings((prev) => {
      const newSettings = { ...prev, [key]: value };
      setHasChanges(JSON.stringify(newSettings) !== JSON.stringify(originalSettings.current));
      return newSettings;
    });
  }, []);

  /**
   * Update multiple settings at once (local state only)
   */
  const updateSettings = useCallback((updates) => {
    setSettings((prev) => {
      const newSettings = { ...prev, ...updates };
      setHasChanges(JSON.stringify(newSettings) !== JSON.stringify(originalSettings.current));
      return newSettings;
    });
  }, []);

  /**
   * Save settings to database
   */
  const saveSettings = useCallback(async () => {
    if (!tenant?.id) {
      throw new Error('No tenant loaded');
    }

    setSaving(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('tenants')
        .update({
          settings,
          updated_at: new Date().toISOString(),
        })
        .eq('id', tenant.id);

      if (updateError) throw updateError;

      if (isMounted.current) {
        originalSettings.current = { ...settings };
        setHasChanges(false);
      }

      return true;
    } catch (err) {
      console.error('[useTenantSettings] Error saving settings:', err);
      if (isMounted.current) {
        setError(err.message || 'Failed to save settings');
      }
      throw err;
    } finally {
      if (isMounted.current) {
        setSaving(false);
      }
    }
  }, [tenant, settings]);

  /**
   * Reset settings to defaults
   */
  const resetToDefaults = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    setHasChanges(true);
  }, []);

  /**
   * Discard changes and revert to last saved
   */
  const discardChanges = useCallback(() => {
    if (originalSettings.current) {
      setSettings({ ...originalSettings.current });
      setHasChanges(false);
    }
  }, []);

  /**
   * Get a specific setting value
   */
  const getSetting = useCallback(
    (key, defaultValue = null) => {
      return settings[key] ?? defaultValue;
    },
    [settings]
  );

  return {
    // Data
    tenant,
    settings,
    loading,
    saving,
    error,
    hasChanges,

    // Actions
    updateSetting,
    updateSettings,
    saveSettings,
    resetToDefaults,
    discardChanges,
    getSetting,
    refetch: fetchSettings,
  };
};

export default useTenantSettings;
