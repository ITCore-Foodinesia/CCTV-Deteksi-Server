# Rencana Implementasi: Integrasi Dashboard React ↔ Supabase

## Executive Summary

Dokumen ini menjabarkan rencana implementasi teknis untuk mengintegrasikan Dashboard React yang sudah ada dengan Supabase database, mengadopsi pola interaksi realtime dari Mock Admin.

**Status Saat Ini:**
- ✅ Struktur navigasi & routing lengkap
- ✅ Komponen UI (tables, modals, cards) tersedia
- ✅ Halaman: Drivers, Trucks, Docks, Helpers, Loaders, Sessions, dll
- ⚠️ Masih menggunakan `MOCK_DATA` (useState hardcoded)
- ❌ Belum ada integrasi Supabase Realtime
- ❌ Belum ada sync dengan Flutter App

**Target:**
- ✅ Data dari Supabase PostgreSQL
- ✅ Realtime updates (CRUD langsung terefleksi)
- ✅ Sinkronisasi dengan Flutter App
- ✅ Tenant-scoped data (multi-tenancy ready)

---

## 1. Overview Arsitektur Integrasi

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       DASHBOARD REACT                                   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  PRESENTATION LAYER (sudah ada)                                 │   │
│  │  • DriversPage.jsx, DocksPage.jsx, SessionsPage.jsx, dll        │   │
│  └────────────────────────────┬────────────────────────────────────┘   │
│                               │                                         │
│                               ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  CUSTOM HOOKS (akan dibuat)                                     │   │
│  │  • useSupabaseTable()  - Fetch + Realtime subscription          │   │
│  │  • useDrivers()        - Wrapper spesifik untuk drivers         │   │
│  │  • useDocks()          - Wrapper spesifik untuk docks           │   │
│  │  • useSessions()       - Wrapper spesifik untuk sessions        │   │
│  └────────────────────────────┬────────────────────────────────────┘   │
│                               │                                         │
│                               ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  SUPABASE CLIENT (sudah ada di src/lib/supabase.js)             │   │
│  └────────────────────────────┬────────────────────────────────────┘   │
│                               │                                         │
└───────────────────────────────┼─────────────────────────────────────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │   SUPABASE CLOUD      │
                    │   PostgreSQL +        │
                    │   Realtime + Auth     │
                    └───────────────────────┘
```

---

## 2. File & Komponen yang Perlu Dibuat/Dimodifikasi

### 2.1 Hooks Baru (Prioritas Tinggi)

| File | Deskripsi | Dependensi |
|------|-----------|------------|
| `src/hooks/useSupabaseTable.js` | Hook generik untuk fetch + realtime | supabase client |
| `src/hooks/useDrivers.js` | Hook untuk tabel `drivers` | useSupabaseTable |
| `src/hooks/useTrucks.js` | Hook untuk tabel `trucks` | useSupabaseTable |
| `src/hooks/useDocks.js` | Hook untuk tabel `docks` | useSupabaseTable |
| `src/hooks/useSessions.js` | Hook untuk tabel `loading_sessions` | useSupabaseTable |
| `src/hooks/useHelpers.js` | Hook untuk tabel `helpers` | useSupabaseTable |
| `src/hooks/useLoaders.js` | Hook untuk tabel `loaders` | useSupabaseTable |

### 2.2 Halaman yang Perlu Diupdate

| File | Perubahan | Kompleksitas |
|------|-----------|--------------|
| `DriversPage.jsx` | Ganti `MOCK_DRIVERS` dengan `useDrivers()` | Medium |
| `DocksPage.jsx` | Ganti `MOCK_DOCKS` dengan `useDocks()` | Medium |
| `SessionsPage.jsx` | Ganti `MOCK_SESSIONS` dengan `useSessions()` | High (realtime kritis) |
| `TrucksPage.jsx` | Ganti mock dengan `useTrucks()` | Medium |
| `HelpersPage.jsx` | Ganti mock dengan `useHelpers()` | Medium |
| `LoadersPage.jsx` | Ganti mock dengan `useLoaders()` | Medium |
| `DashboardOverview.jsx` | Agregasi stats dari semua hooks | High |

---

## 3. Implementasi Hook Generik: `useSupabaseTable`

```javascript
// src/hooks/useSupabaseTable.js

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Hook generik untuk operasi CRUD + Realtime subscription
 * 
 * @param {string} tableName - Nama tabel di Supabase
 * @param {object} options - Opsi tambahan
 * @param {string} options.select - Kolom yang di-select (default: '*')
 * @param {object} options.filter - Filter tambahan
 * @param {string} options.orderBy - Kolom untuk ordering
 * @param {boolean} options.ascending - Arah ordering
 */
export const useSupabaseTable = (tableName, options = {}) => {
  const {
    select = '*',
    filter = {},
    orderBy = 'created_at',
    ascending = false,
  } = options;

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch initial data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from(tableName).select(select);
      
      // Apply filters
      Object.entries(filter).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
      
      // Apply ordering
      query = query.order(orderBy, { ascending });

      const { data: result, error: fetchError } = await query;
      
      if (fetchError) throw fetchError;
      setData(result || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tableName, select, JSON.stringify(filter), orderBy, ascending]);

  // Realtime subscription
  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel(`realtime-${tableName}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: tableName },
        (payload) => {
          switch (payload.eventType) {
            case 'INSERT':
              setData((prev) => [payload.new, ...prev]);
              break;
            case 'UPDATE':
              setData((prev) =>
                prev.map((item) =>
                  item.id === payload.new.id ? payload.new : item
                )
              );
              break;
            case 'DELETE':
              setData((prev) =>
                prev.filter((item) => item.id !== payload.old.id)
              );
              break;
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData, tableName]);

  // CRUD operations
  const create = async (newData) => {
    const { data: result, error } = await supabase
      .from(tableName)
      .insert(newData)
      .select()
      .single();
    if (error) throw error;
    return result;
  };

  const update = async (id, updates) => {
    const { data: result, error } = await supabase
      .from(tableName)
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return result;
  };

  const remove = async (id) => {
    const { error } = await supabase.from(tableName).delete().eq('id', id);
    if (error) throw error;
  };

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    create,
    update,
    remove,
  };
};

export default useSupabaseTable;
```

---

## 4. Implementasi Hook Spesifik: `useDrivers`

```javascript
// src/hooks/useDrivers.js

import { useMemo } from 'react';
import { useSupabaseTable } from './useSupabaseTable';

/**
 * Hook untuk mengelola data drivers
 */
export const useDrivers = () => {
  const { data, loading, error, create, update, remove, refetch } = 
    useSupabaseTable('drivers', {
      select: 'id, name, phone, email, driver_code, status, profile_data, created_at',
      orderBy: 'created_at',
      ascending: false,
    });

  // Computed stats
  const stats = useMemo(() => ({
    total: data.length,
    active: data.filter((d) => d.status === 'active').length,
    pending: data.filter((d) => d.status === 'pending_approval').length,
    suspended: data.filter((d) => d.status === 'suspended').length,
  }), [data]);

  // Custom actions
  const approveDriver = async (id) => {
    return update(id, { status: 'active' });
  };

  const suspendDriver = async (id) => {
    return update(id, { status: 'suspended' });
  };

  return {
    drivers: data,
    loading,
    error,
    stats,
    createDriver: create,
    updateDriver: update,
    deleteDriver: remove,
    approveDriver,
    suspendDriver,
    refetch,
  };
};

export default useDrivers;
```

---

## 5. Contoh Penggunaan di DriversPage.jsx

```jsx
// src/pages/DriversPage.jsx (setelah integrasi)

import React, { useState, useMemo } from 'react';
import { useDrivers } from '../hooks/useDrivers';
// ... import lainnya tetap sama

const DriversPage = () => {
  // GANTI INI:
  // const [drivers, setDrivers] = useState(MOCK_DRIVERS);
  
  // DENGAN INI:
  const { 
    drivers, 
    loading, 
    error, 
    stats, 
    createDriver, 
    updateDriver, 
    deleteDriver,
    approveDriver,
    suspendDriver 
  } = useDrivers();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);
  const [formData, setFormData] = useState({ /* ... */ });

  // Filter (sama seperti sebelumnya, tapi pakai `drivers` dari hook)
  const filteredDrivers = useMemo(() => {
    return drivers.filter((driver) => {
      // ... logic filter tetap sama
    });
  }, [drivers, searchQuery, statusFilter]);

  // Handlers - Ganti setState dengan API calls
  const handleDelete = async (id) => {
    if (window.confirm('Are you sure?')) {
      await deleteDriver(id);
      // Tidak perlu setDrivers - realtime akan auto-update!
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingDriver) {
      await updateDriver(editingDriver.id, formData);
    } else {
      await createDriver(formData);
    }
    setModalOpen(false);
  };

  // Loading state
  if (loading) {
    return <div>Loading drivers...</div>;
  }

  // Error state
  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    // ... render tetap sama, stats sudah dari hook
  );
};
```

---

## 6. Pemetaan Field: Mock → Database

### 6.1 Drivers

| Mock Field | Database Field | Catatan |
|------------|----------------|---------|
| `id` | `id` (UUID) | Sama |
| `name` | `name` | Sama |
| `phone` | `phone` | Sama |
| `license_plate` | - | **Tidak ada di drivers**, relasi via `trucks` |
| `truck_type` | - | **Tidak ada di drivers**, relasi via `trucks` |
| `status` | `status` (enum) | Sama, gunakan enum |
| `created_at` | `created_at` | Sama |

### 6.2 Docks

| Mock Field | Database Field | Catatan |
|------------|----------------|---------|
| `id` | `id` (UUID) | Sama |
| `code` | `dock_code` | Rename |
| `name` | `dock_name` | Rename |
| `type` | - | **Tambah kolom** atau gunakan `metadata` |
| `status` | `status` (enum) | Sama |
| `capacity` | `capacity` | Sama |
| `current_truck` | - | **Relasi via loading_sessions** |
| `current_driver` | - | **Relasi via loading_sessions** |
| `notes` | `maintenance_reason` | Rename |

### 6.3 Sessions

| Mock Field | Database Field | Catatan |
|------------|----------------|---------|
| `id` | `id` (UUID) | Sama |
| `dock_code` | Via JOIN `docks.dock_code` | Relasi |
| `truck_plate` | Via JOIN `trucks.plate_number` | Relasi |
| `driver_name` | Via JOIN `drivers.name` | Relasi |
| `status` | `status` (enum) | Sama |
| `started_at` | `started_at` | Sama |
| `progress` | - | **Tambah kolom** atau hitung dari `loading_events` |

---

## 7. Checklist Implementasi

### Fase 1: Foundation (Backend-Ready)
- [ ] Buat `src/hooks/useSupabaseTable.js`
- [ ] Buat `src/hooks/useDrivers.js`
- [ ] Buat `src/hooks/useDocks.js`
- [ ] Buat `src/hooks/useTrucks.js`
- [ ] Buat `src/hooks/useSessions.js`
- [ ] Buat `src/hooks/useHelpers.js`
- [ ] Buat `src/hooks/useLoaders.js`

### Fase 2: Page Integration
- [ ] Update `DriversPage.jsx` dengan `useDrivers()`
- [ ] Update `DocksPage.jsx` dengan `useDocks()`
- [ ] Update `TrucksPage.jsx` dengan `useTrucks()`
- [ ] Update `SessionsPage.jsx` dengan `useSessions()`
- [ ] Update `HelpersPage.jsx` dengan `useHelpers()`
- [ ] Update `LoadersPage.jsx` dengan `useLoaders()`

### Fase 3: Dashboard Overview
- [ ] Agregasi stats dari semua hooks di `DashboardOverview.jsx`
- [ ] Implementasi Activity Log dari `loading_events`
- [ ] Quick Actions dengan proper routing

### Fase 4: Testing & Polish
- [ ] Test sinkronisasi dengan Flutter App
- [ ] Test realtime updates (buka 2 browser)
- [ ] Handle edge cases (network error, RLS errors)
- [ ] Optimistic updates (optional)

---

## 8. Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
|--------|--------|----------|
| RLS Policy Blocking | Data tidak muncul | Test dengan anon key dulu, lalu konfigurasi RLS sesuai role |
| Schema Mismatch | Error saat fetch/mutate | Pastikan kolom di hook match dengan database |
| Realtime Lag | Data delay | Sudah handled oleh Supabase, monitor di production |
| Token Expired | Auth error | Implement token refresh di AuthContext |

---

## 9. Diagram Alur Implementasi

```
START
   │
   ▼
┌─────────────────────────────────┐
│ 1. Buat hooks di /src/hooks/   │
│    - useSupabaseTable.js       │
│    - useDrivers.js, dll        │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│ 2. Test hooks di console       │
│    - Fetch data berhasil?      │
│    - Realtime trigger?         │
└────────────────┬────────────────┘
                 │
       ┌─────────┴─────────┐
       │                   │
       ▼                   ▼
   [Berhasil]          [Gagal]
       │                   │
       │                   ▼
       │          ┌───────────────────┐
       │          │ Debug:            │
       │          │ - RLS policies    │
       │          │ - Schema match    │
       │          │ - Realtime config │
       │          └─────────┬─────────┘
       │                    │
       │◄───────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│ 3. Update Pages satu per satu  │
│    - Ganti MOCK_DATA dengan hook│
│    - Test CRUD operations      │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│ 4. Test Cross-Platform         │
│    - Dashboard + Flutter App   │
│    - Verifikasi sync realtime  │
└────────────────┬────────────────┘
                 │
                 ▼
               [DONE]
```

---

*Dokumen ini adalah panduan implementasi teknis untuk tim Frontend & Backend.*
*Dibuat berdasarkan analisis Mock Admin dan struktur Dashboard React yang ada.*
