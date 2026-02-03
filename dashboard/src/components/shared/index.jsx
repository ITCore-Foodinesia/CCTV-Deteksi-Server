/**
 * Shared UI Components for Admin Pages
 * Reusable table, modal, filters, and status components
 */

import React, { useState } from 'react';
import { X, Search, ChevronLeft, ChevronRight } from 'lucide-react';

// Status badge colors matching new_theme
export const STATUS_BADGE_CLASSES = {
  active: 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200',
  pending_approval: 'bg-amber-100 text-amber-800 ring-1 ring-amber-200',
  suspended: 'bg-red-100 text-red-800 ring-1 ring-red-200',
  inactive: 'bg-gray-100 text-gray-800 ring-1 ring-gray-200',
  waiting: 'bg-blue-100 text-blue-800 ring-1 ring-blue-200',
  loading: 'bg-orange-100 text-orange-800 ring-1 ring-orange-200',
  unloading: 'bg-orange-100 text-orange-800 ring-1 ring-orange-200',
  completed: 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200',
  cancelled: 'bg-gray-100 text-gray-800 ring-1 ring-gray-200',
  online: 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200',
  offline: 'bg-gray-100 text-gray-800 ring-1 ring-gray-200',
};

// Dock status colors
export const DOCK_STATUS_CLASSES = {
  available: 'border-emerald-500 bg-emerald-50 text-emerald-900',
  loading: 'border-orange-500 bg-orange-50 text-orange-900',
  unloading: 'border-orange-500 bg-orange-50 text-orange-900',
  maintenance: 'border-red-500 bg-red-50 text-red-900',
  reserved: 'border-blue-500 bg-blue-50 text-blue-900',
  closed: 'border-gray-500 bg-gray-50 text-gray-900',
};

/**
 * Status Badge Component
 */
export const StatusBadge = ({ status, className = '' }) => {
  const statusClass = STATUS_BADGE_CLASSES[status] || STATUS_BADGE_CLASSES.inactive;
  const label = String(status).replace(/_/g, ' ');
  
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusClass} ${className}`}>
      {label}
    </span>
  );
};

/**
 * Page Header Component
 */
export const PageHeader = ({ title, subtitle, children }) => {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-gray-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
};

/**
 * Search Input Component
 */
export const SearchInput = ({ value, onChange, placeholder = 'Search...' }) => {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
      />
    </div>
  );
};

/**
 * Select Filter Component
 */
export const SelectFilter = ({ value, onChange, options, placeholder = 'All' }) => {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
    >
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
};

/**
 * Primary Button Component
 */
export const PrimaryButton = ({ children, onClick, disabled, className = '' }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl bg-[#84CC16] px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm hover:bg-[#65a30d] disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
};

/**
 * Secondary Button Component
 */
export const SecondaryButton = ({ children, onClick, disabled, className = '' }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
};

/**
 * Card Component
 */
export const Card = ({ children, className = '' }) => {
  return (
    <div className={`rounded-2xl border border-gray-200 bg-white p-4 shadow-sm ${className}`}>
      {children}
    </div>
  );
};

/**
 * Data Table Component
 */
export const DataTable = ({ columns, data, onRowClick, emptyMessage = 'No data available' }) => {
  if (!data || data.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
        <div className="text-3xl">🧩</div>
        <div className="mt-3 text-base font-semibold text-gray-900">{emptyMessage}</div>
        <div className="mt-1 text-sm text-gray-500">No records to display</div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {data.map((row, idx) => (
              <tr
                key={row.id || idx}
                onClick={() => onRowClick?.(row)}
                className={onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''}
              >
                {columns.map((col) => (
                  <td key={col.key} className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/**
 * Pagination Component
 */
export const Pagination = ({ page, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-4 flex items-center justify-between">
      <div className="text-sm text-gray-500">
        Page {page} of {totalPages}
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="rounded-xl border border-gray-200 bg-white p-2 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="rounded-xl border border-gray-200 bg-white p-2 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

/**
 * Modal Component
 */
export const Modal = ({ open, onClose, title, children, size = 'md' }) => {
  if (!open) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      
      {/* Modal Content */}
      <div className={`relative w-full ${sizeClasses[size]} rounded-2xl bg-white p-6 shadow-xl`}>
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        {children}
      </div>
    </div>
  );
};

/**
 * Form Input Component
 */
export const FormInput = ({ label, name, value, onChange, type = 'text', placeholder, required, disabled }) => {
  return (
    <div className="mb-4">
      <label htmlFor={name} className="mb-1 block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:bg-gray-50 disabled:text-gray-500"
      />
    </div>
  );
};

/**
 * Form Select Component
 */
export const FormSelect = ({ label, name, value, onChange, options, required, disabled }) => {
  return (
    <div className="mb-4">
      <label htmlFor={name} className="mb-1 block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:bg-gray-50 disabled:text-gray-500"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
};

/**
 * Empty State Component
 */
export const EmptyState = ({ icon = '🧩', title, description, action }) => {
  return (
    <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
      <div className="text-4xl">{icon}</div>
      <div className="mt-3 text-base font-semibold text-gray-900">{title}</div>
      {description && <div className="mt-1 text-sm text-gray-500">{description}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};

/**
 * Stats Card Component (for KPIs)
 */
export const StatsCard = ({ label, value, icon, trend, trendLabel }) => {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-500">{label}</div>
          <div className="mt-1 text-2xl font-semibold text-gray-900">{value}</div>
          {trend && (
            <div className={`mt-1 text-xs ${trend > 0 ? 'text-emerald-600' : 'text-gray-500'}`}>
              {trend > 0 ? '↗' : '→'} {trendLabel}
            </div>
          )}
        </div>
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gray-100 text-xl">
          {icon}
        </div>
      </div>
    </div>
  );
};

export default {
  StatusBadge,
  PageHeader,
  SearchInput,
  SelectFilter,
  PrimaryButton,
  SecondaryButton,
  Card,
  DataTable,
  Pagination,
  Modal,
  FormInput,
  FormSelect,
  EmptyState,
  StatsCard,
};
