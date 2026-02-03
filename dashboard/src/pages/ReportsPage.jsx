/**
 * ReportsPage - Generate and export reports
 * Based on new_theme/app.js design patterns
 */

import React, { useState } from 'react';
import { BarChart3, Download, FileText, Calendar, Filter, Loader2 } from 'lucide-react';
import {
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  Card,
  FormSelect,
  FormInput,
} from '../components/shared';

// Report types
const REPORT_TYPES = [
  {
    id: 'daily-summary',
    title: 'Daily Summary',
    description: 'Overview of daily operations including sessions, wait times, and dock utilization',
    icon: '📊',
    category: 'operations',
  },
  {
    id: 'session-history',
    title: 'Session History',
    description: 'Detailed list of all loading/unloading sessions within date range',
    icon: '📋',
    category: 'operations',
  },
  {
    id: 'driver-performance',
    title: 'Driver Performance',
    description: 'Driver activity, session counts, and average loading times',
    icon: '👤',
    category: 'performance',
  },
  {
    id: 'dock-utilization',
    title: 'Dock Utilization',
    description: 'Dock usage statistics, availability, and maintenance history',
    icon: '🏗️',
    category: 'performance',
  },
  {
    id: 'queue-analysis',
    title: 'Queue Analysis',
    description: 'Wait time trends, queue length, and bottleneck identification',
    icon: '⏱️',
    category: 'performance',
  },
  {
    id: 'staff-activity',
    title: 'Staff Activity',
    description: 'Helper and loader assignments, shift coverage, and productivity',
    icon: '👷',
    category: 'hr',
  },
  {
    id: 'camera-status',
    title: 'Camera Status',
    description: 'Camera uptime, offline events, and recording statistics',
    icon: '📹',
    category: 'system',
  },
  {
    id: 'user-audit',
    title: 'User Audit Log',
    description: 'User login activity, actions performed, and security events',
    icon: '🔐',
    category: 'system',
  },
];

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'All Categories' },
  { value: 'operations', label: 'Operations' },
  { value: 'performance', label: 'Performance' },
  { value: 'hr', label: 'Human Resources' },
  { value: 'system', label: 'System' },
];

const FORMAT_OPTIONS = [
  { value: 'pdf', label: 'PDF Document' },
  { value: 'csv', label: 'CSV Spreadsheet' },
  { value: 'xlsx', label: 'Excel Spreadsheet' },
];

const PERIOD_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'quarter', label: 'This Quarter' },
  { value: 'custom', label: 'Custom Range' },
];

const ReportsPage = () => {
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedReport, setSelectedReport] = useState(null);
  const [exportFormat, setExportFormat] = useState('pdf');
  const [period, setPeriod] = useState('month');
  const [customDateStart, setCustomDateStart] = useState('');
  const [customDateEnd, setCustomDateEnd] = useState('');
  const [generating, setGenerating] = useState(false);

  // Filter reports by category
  const filteredReports = REPORT_TYPES.filter(
    (report) => categoryFilter === 'all' || report.category === categoryFilter
  );

  // Handlers
  const handleSelectReport = (report) => {
    setSelectedReport(report);
  };

  const handleGenerate = async () => {
    if (!selectedReport) return;
    
    setGenerating(true);
    
    // Simulate report generation
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    setGenerating(false);
    alert(`Report "${selectedReport.title}" generated in ${exportFormat.toUpperCase()} format!`);
  };

  const handleQuickExport = (report, format) => {
    alert(`Quick export: "${report.title}" as ${format.toUpperCase()}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Reports"
        subtitle="Generate and export operational reports"
      />

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <div className="text-sm text-gray-500">Available Reports</div>
          <div className="mt-1 text-2xl font-semibold">{REPORT_TYPES.length}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500">Generated This Month</div>
          <div className="mt-1 text-2xl font-semibold text-emerald-600">24</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500">Scheduled Reports</div>
          <div className="mt-1 text-2xl font-semibold text-blue-600">3</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500">Last Generated</div>
          <div className="mt-1 text-lg font-semibold text-gray-600">Today 09:15</div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Report Selection */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filter */}
          <div className="flex items-center gap-4">
            <Filter className="h-5 w-5 text-gray-400" />
            <FormSelect
              label=""
              name="category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              options={CATEGORY_OPTIONS}
            />
          </div>

          {/* Report Grid */}
          <div className="grid gap-4 sm:grid-cols-2">
            {filteredReports.map((report) => (
              <div
                key={report.id}
                onClick={() => handleSelectReport(report)}
                className={`cursor-pointer rounded-2xl border-2 p-4 transition-all hover:shadow-md ${
                  selectedReport?.id === report.id
                    ? 'border-[#84CC16] bg-lime-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl">{report.icon}</div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{report.title}</h3>
                    <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                      {report.description}
                    </p>
                  </div>
                </div>
                
                {/* Quick Export Buttons */}
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleQuickExport(report, 'pdf');
                    }}
                    className="rounded-lg bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200"
                  >
                    PDF
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleQuickExport(report, 'csv');
                    }}
                    className="rounded-lg bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200"
                  >
                    CSV
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleQuickExport(report, 'xlsx');
                    }}
                    className="rounded-lg bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200"
                  >
                    Excel
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Report Configuration */}
        <div className="space-y-4">
          <Card className="sticky top-4">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Generate Report</h3>
            
            {selectedReport ? (
              <div className="space-y-4">
                {/* Selected Report */}
                <div className="rounded-xl bg-lime-50 p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{selectedReport.icon}</span>
                    <span className="font-semibold">{selectedReport.title}</span>
                  </div>
                </div>

                {/* Date Range */}
                <FormSelect
                  label="Time Period"
                  name="period"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  options={PERIOD_OPTIONS}
                />

                {period === 'custom' && (
                  <div className="grid grid-cols-2 gap-2">
                    <FormInput
                      label="Start Date"
                      name="start"
                      type="date"
                      value={customDateStart}
                      onChange={(e) => setCustomDateStart(e.target.value)}
                    />
                    <FormInput
                      label="End Date"
                      name="end"
                      type="date"
                      value={customDateEnd}
                      onChange={(e) => setCustomDateEnd(e.target.value)}
                    />
                  </div>
                )}

                {/* Export Format */}
                <FormSelect
                  label="Export Format"
                  name="format"
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value)}
                  options={FORMAT_OPTIONS}
                />

                {/* Generate Button */}
                <PrimaryButton
                  onClick={handleGenerate}
                  disabled={generating}
                  className="w-full"
                >
                  {generating ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Download className="h-4 w-4" />
                      Generate & Download
                    </span>
                  )}
                </PrimaryButton>

                {/* Schedule Option */}
                <button className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  <span className="flex items-center justify-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Schedule This Report
                  </span>
                </button>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center">
                <FileText className="mx-auto h-10 w-10 text-gray-300" />
                <p className="mt-2 text-sm text-gray-500">
                  Select a report type to configure and generate
                </p>
              </div>
            )}
          </Card>

          {/* Recent Reports */}
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Recent Downloads</h3>
            <div className="space-y-2">
              {[
                { name: 'Daily Summary - Mar 14', format: 'PDF', time: '2h ago' },
                { name: 'Session History - Mar', format: 'CSV', time: '1d ago' },
                { name: 'Dock Utilization - Q1', format: 'Excel', time: '3d ago' },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{item.name}</div>
                    <div className="text-xs text-gray-500">{item.time}</div>
                  </div>
                  <span className="rounded bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600">
                    {item.format}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
