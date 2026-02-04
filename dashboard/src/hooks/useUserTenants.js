/**
 * useUserTenants - Hook for managing user-tenant relationships
 *
 * Features:
 * - Fetch users in a tenant
 * - User role management (owner/admin/operator/viewer)
 * - Invite/remove users
 * - User status management
 *
 * @example
 * const { users, inviteUser, updateRole, removeUser } = useUserTenants();
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

/**
 * User role enum (from database)
 */
export const USER_ROLE = {
  OWNER: 'owner',
  ADMIN: 'admin',
  OPERATOR: 'operator',
  VIEWER: 'viewer',
};

/**
 * Role descriptions
 */
export const ROLE_DESCRIPTIONS = {
  [USER_ROLE.OWNER]: 'Full access to all features including user management and settings',
  [USER_ROLE.ADMIN]: 'Can manage users, view reports, and configure most settings',
  [USER_ROLE.OPERATOR]: 'Can manage drivers, trucks, docks, sessions, and view reports',
  [USER_ROLE.VIEWER]: 'Read-only access to dashboard and reports',
};

/**
 * Hook for user_tenants table operations
 *
 * @param {object} options - Options
 * @param {string} options.tenantId - Tenant ID to filter by
 * @returns {object} Users data and operations
 */
export const useUserTenants = (options = {}) => {
  const { tenantId = null } = options;

  const [userTenants, setUserTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isMounted = useRef(true);

  /**
   * Fetch user-tenant relationships
   */
  const fetchData = useCallback(async () => {
    if (!isMounted.current) return;

    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('user_tenants')
        .select(`
          id,
          user_id,
          tenant_id,
          role,
          is_active,
          invited_by,
          invited_at,
          accepted_at,
          created_at
        `)
        .order('created_at', { ascending: false });

      // Filter by tenant if provided
      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      if (isMounted.current) {
        setUserTenants(data || []);
      }
    } catch (err) {
      console.error('[useUserTenants] Error fetching data:', err);
      if (isMounted.current) {
        setError(err.message || 'Failed to fetch users');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [tenantId]);

  /**
   * Handle realtime updates
   */
  const handleRealtimeEvent = useCallback((payload) => {
    if (!isMounted.current) return;

    console.log('[useUserTenants] Realtime event:', payload);

    const { eventType, new: newRecord, old: oldRecord } = payload;

    switch (eventType) {
      case 'INSERT':
        setUserTenants((prev) => [newRecord, ...prev]);
        break;
      case 'UPDATE':
        setUserTenants((prev) =>
          prev.map((item) => (item.id === newRecord.id ? newRecord : item))
        );
        break;
      case 'DELETE':
        setUserTenants((prev) => prev.filter((item) => item.id !== oldRecord.id));
        break;
      default:
        break;
    }
  }, []);

  /**
   * Setup effect
   */
  useEffect(() => {
    isMounted.current = true;
    fetchData();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('realtime-user-tenants')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_tenants',
        },
        handleRealtimeEvent
      )
      .subscribe();

    return () => {
      isMounted.current = false;
      supabase.removeChannel(channel);
    };
  }, [fetchData, handleRealtimeEvent]);

  /**
   * Filter by role
   */
  const byRole = useMemo(() => {
    return userTenants.reduce((acc, ut) => {
      acc[ut.role] = acc[ut.role] || [];
      acc[ut.role].push(ut);
      return acc;
    }, {});
  }, [userTenants]);

  /**
   * Active users only
   */
  const activeUsers = useMemo(() => {
    return userTenants.filter((ut) => ut.is_active);
  }, [userTenants]);

  /**
   * Inactive users
   */
  const inactiveUsers = useMemo(() => {
    return userTenants.filter((ut) => !ut.is_active);
  }, [userTenants]);

  /**
   * Stats
   */
  const stats = useMemo(() => ({
    total: userTenants.length,
    active: activeUsers.length,
    inactive: inactiveUsers.length,
    owners: (byRole[USER_ROLE.OWNER] || []).length,
    admins: (byRole[USER_ROLE.ADMIN] || []).length,
    operators: (byRole[USER_ROLE.OPERATOR] || []).length,
    viewers: (byRole[USER_ROLE.VIEWER] || []).length,
  }), [userTenants.length, activeUsers.length, inactiveUsers.length, byRole]);

  /**
   * Invite a new user to the tenant
   * Note: This creates the user_tenants record. The actual Supabase Auth user
   * should already exist or be created separately.
   */
  const inviteUser = useCallback(
    async (userData) => {
      try {
        const newUserTenant = {
          user_id: userData.userId,
          tenant_id: userData.tenantId || tenantId,
          role: userData.role || USER_ROLE.VIEWER,
          is_active: true,
          invited_by: userData.invitedBy || null,
          invited_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        };

        const { data, error: insertError } = await supabase
          .from('user_tenants')
          .insert(newUserTenant)
          .select()
          .single();

        if (insertError) throw insertError;
        return data;
      } catch (err) {
        console.error('[useUserTenants] Error inviting user:', err);
        throw err;
      }
    },
    [tenantId]
  );

  /**
   * Update user role
   */
  const updateRole = useCallback(async (userTenantId, newRole) => {
    try {
      const { data, error: updateError } = await supabase
        .from('user_tenants')
        .update({ role: newRole })
        .eq('id', userTenantId)
        .select()
        .single();

      if (updateError) throw updateError;
      return data;
    } catch (err) {
      console.error('[useUserTenants] Error updating role:', err);
      throw err;
    }
  }, []);

  /**
   * Toggle user active status
   */
  const toggleActive = useCallback(async (userTenantId, isActive) => {
    try {
      const { data, error: updateError } = await supabase
        .from('user_tenants')
        .update({ is_active: isActive })
        .eq('id', userTenantId)
        .select()
        .single();

      if (updateError) throw updateError;
      return data;
    } catch (err) {
      console.error('[useUserTenants] Error toggling active:', err);
      throw err;
    }
  }, []);

  /**
   * Activate a user
   */
  const activateUser = useCallback(
    (userTenantId) => toggleActive(userTenantId, true),
    [toggleActive]
  );

  /**
   * Deactivate a user
   */
  const deactivateUser = useCallback(
    (userTenantId) => toggleActive(userTenantId, false),
    [toggleActive]
  );

  /**
   * Remove user from tenant
   */
  const removeUser = useCallback(async (userTenantId) => {
    try {
      const { error: deleteError } = await supabase
        .from('user_tenants')
        .delete()
        .eq('id', userTenantId);

      if (deleteError) throw deleteError;
    } catch (err) {
      console.error('[useUserTenants] Error removing user:', err);
      throw err;
    }
  }, []);

  /**
   * Get user by ID
   */
  const getById = useCallback(
    (id) => userTenants.find((ut) => ut.id === id),
    [userTenants]
  );

  /**
   * Get user by user_id
   */
  const getByUserId = useCallback(
    (userId) => userTenants.find((ut) => ut.user_id === userId),
    [userTenants]
  );

  /**
   * Check if user is owner
   */
  const isOwner = useCallback(
    (userTenantId) => {
      const ut = getById(userTenantId);
      return ut?.role === USER_ROLE.OWNER;
    },
    [getById]
  );

  return {
    // Data
    users: userTenants,
    activeUsers,
    inactiveUsers,
    byRole,
    loading,
    error,
    stats,

    // Actions
    inviteUser,
    updateRole,
    toggleActive,
    activateUser,
    deactivateUser,
    removeUser,
    getById,
    getByUserId,
    isOwner,
    refetch: fetchData,
  };
};

export default useUserTenants;
