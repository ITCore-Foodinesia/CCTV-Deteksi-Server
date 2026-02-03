/**
 * AnalyticsPage - Dashboard analytics with charts and KPIs
 * Based on new_theme/app.js design patterns
 */

import React, { useState } from 'react';
import { TrendingUp, TrendingDown, ArrowRight, Clock, Truck, Building2, Users, BarChart3 } from 'lucide-react';
import {
  PageHeader,
  Card,
  FormSelect,
} from '../components/shared';

// Mock analytics data
const MOCK_KPIS = {
  dailySessions: { value: 24, change: 12, trend: 'up' },
  avgWaitTime: { value: 18, unit: 'min', change: -15, trend: 'down' },
  dockUtilization: { value: 78, unit: '%', change: 5, trend: 'up' },
  avgSessionDuration: { value: 95, unit: 'min', change: -8, trend: 'down' },
};

const MOCK_HOURLY_DATA = [
  { hour: '06:00', sessions: 2, waitTime: 12 },
  { hour: '07:00', sessions: 4, waitTime: 15 },
  { hour: '08:00', sessions: 6, waitTime: 22 },
  { hour: '09:00', sessions: 5, waitTime: 18 },
  { hour: '10:00', sessions: 4, waitTime: 14 },
  { hour: '11:00', sessions: 3, waitTime: 10 },
  { hour: '12:00', sessions: 2, waitTime: 8 },
  { hour: '13:00', sessions: 3, waitTime: 12 },
  { hour: '14:00', sessions: 5, waitTime: 20 },
  { hour: '15:00', sessions: 6, waitTime: 25 },
  { hour: '16:00', sessions: 4, waitTime: 18 },
  { hour: '17:00', sessions: 3, waitTime: 15 },
];

const MOCK_DOCK_STATS = [
  { code: 'D-01', sessions: 45, avgDuration: 92, utilization: 82 },
  { code: 'D-02', sessions: 38, avgDuration: 88, utilization: 75 },
  { code: 'D-03', sessions: 32, avgDuration: 105, utilization: 68 },
  { code: 'D-05', sessions: 28, avgDuration: 95, utilization: 62 },
];

const MOCK_DRIVER_STATS = [
  { name: 'Budi Santoso', sessions: 12, avgDuration: 88 },
  { name: 'Ahmad Wijaya', sessions: 10, avgDuration: 92 },
  { name: 'Dedi Kurniawan', sessions: 8, avgDuration: 85 },
  { name: 'Eko Prasetyo', sessions: 7, avgDuration: 98 },
  { name: 'Fajar Hidayat', sessions: 6, avgDuration: 90 },
];

const PERIOD_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'quarter', label: 'This Quarter' },
];

const AnalyticsPage = () => {
  const [period, setPeriod] = useState('month');

  // Simple bar chart renderer (CSS-based)
  const renderBarChart = (data, valueKey, maxValue) => {
    const max = maxValue || Math.max(...data.map((d) => d[valueKey]));
    return (
      <div className="flex items-end gap-1 h-32">
        {data.map((item, idx) => (
          <div key={idx} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full bg-[#84CC16] rounded-t transition-all hover:bg-[#65a30d]"
              style={{ height: `${(item[valueKey] / max) * 100}%`, minHeight: '4px' }}
              title={`${item.hour}: ${item[valueKey]}`}
            />
            <span className="text-[10px] text-gray-400 -rotate-45 origin-left translate-y-2">
              {item.hour?.slice(0, 2)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Analytics"
        subtitle="Operational insights and performance metrics"
      >
        <FormSelect
          label=""
          name="period"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          options={PERIOD_OPTIONS}
        />
      </PageHeader>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Daily Sessions */}
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm text-gray-500">Daily Sessions</div>
              <div className="mt-1 text-3xl font-bold text-gray-900">
                {MOCK_KPIS.dailySessions.value}
              </div>
              <div className={`mt-1 flex items-center gap-1 text-sm ${
                MOCK_KPIS.dailySessions.trend === 'up' ? 'text-emerald-600' : 'text-red-600'
              }`}>
                {MOCK_KPIS.dailySessions.trend === 'up' ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                {Math.abs(MOCK_KPIS.dailySessions.change)}% vs last period
              </div>
            </div>
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-100">
              <Truck className="h-6 w-6 text-emerald-600" />
            </div>
          </div>
        </Card>

        {/* Avg Wait Time */}
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm text-gray-500">Avg Wait Time</div>
              <div className="mt-1 text-3xl font-bold text-gray-900">
                {MOCK_KPIS.avgWaitTime.value}
                <span className="text-lg font-normal text-gray-400">min</span>
              </div>
              <div className={`mt-1 flex items-center gap-1 text-sm ${
                MOCK_KPIS.avgWaitTime.trend === 'down' ? 'text-emerald-600' : 'text-red-600'
              }`}>
                {MOCK_KPIS.avgWaitTime.trend === 'down' ? (
                  <TrendingDown className="h-4 w-4" />
                ) : (
                  <TrendingUp className="h-4 w-4" />
                )}
                {Math.abs(MOCK_KPIS.avgWaitTime.change)}% improved
              </div>
            </div>
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-100">
              <Clock className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>

        {/* Dock Utilization */}
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm text-gray-500">Dock Utilization</div>
              <div className="mt-1 text-3xl font-bold text-gray-900">
                {MOCK_KPIS.dockUtilization.value}
                <span className="text-lg font-normal text-gray-400">%</span>
              </div>
              <div className={`mt-1 flex items-center gap-1 text-sm ${
                MOCK_KPIS.dockUtilization.trend === 'up' ? 'text-emerald-600' : 'text-red-600'
              }`}>
                {MOCK_KPIS.dockUtilization.trend === 'up' ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                {Math.abs(MOCK_KPIS.dockUtilization.change)}% vs last period
              </div>
            </div>
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-purple-100">
              <Building2 className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </Card>

        {/* Avg Session Duration */}
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm text-gray-500">Avg Session Duration</div>
              <div className="mt-1 text-3xl font-bold text-gray-900">
                {MOCK_KPIS.avgSessionDuration.value}
                <span className="text-lg font-normal text-gray-400">min</span>
              </div>
              <div className={`mt-1 flex items-center gap-1 text-sm ${
                MOCK_KPIS.avgSessionDuration.trend === 'down' ? 'text-emerald-600' : 'text-red-600'
              }`}>
                {MOCK_KPIS.avgSessionDuration.trend === 'down' ? (
                  <TrendingDown className="h-4 w-4" />
                ) : (
                  <TrendingUp className="h-4 w-4" />
                )}
                {Math.abs(MOCK_KPIS.avgSessionDuration.change)}% faster
              </div>
            </div>
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-orange-100">
              <BarChart3 className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Hourly Sessions Chart */}
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Sessions by Hour</h3>
            <span className="text-sm text-gray-500">Today</span>
          </div>
          {renderBarChart(MOCK_HOURLY_DATA, 'sessions')}
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-gray-500">Peak: 08:00 & 15:00</span>
            <span className="font-medium text-emerald-600">Total: 47 sessions</span>
          </div>
        </Card>

        {/* Wait Time Trend */}
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Wait Time by Hour</h3>
            <span className="text-sm text-gray-500">Today</span>
          </div>
          <div className="flex items-end gap-1 h-32">
            {MOCK_HOURLY_DATA.map((item, idx) => {
              const max = Math.max(...MOCK_HOURLY_DATA.map((d) => d.waitTime));
              const height = (item.waitTime / max) * 100;
              const isHigh = item.waitTime > 20;
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className={`w-full rounded-t transition-all ${
                      isHigh ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-500 hover:bg-blue-600'
                    }`}
                    style={{ height: `${height}%`, minHeight: '4px' }}
                    title={`${item.hour}: ${item.waitTime} min`}
                  />
                  <span className="text-[10px] text-gray-400 -rotate-45 origin-left translate-y-2">
                    {item.hour?.slice(0, 2)}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <span className="h-3 w-3 rounded bg-blue-500" /> Normal
              </span>
              <span className="flex items-center gap-1">
                <span className="h-3 w-3 rounded bg-orange-500" /> High (&gt;20min)
              </span>
            </div>
            <span className="font-medium">Avg: 15.75 min</span>
          </div>
        </Card>
      </div>

      {/* Tables Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Dock Performance */}
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Dock Performance</h3>
            <button className="flex items-center gap-1 text-sm text-[#84CC16] hover:underline">
              View All <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="pb-2 text-left text-xs font-semibold text-gray-500">Dock</th>
                  <th className="pb-2 text-right text-xs font-semibold text-gray-500">Sessions</th>
                  <th className="pb-2 text-right text-xs font-semibold text-gray-500">Avg Duration</th>
                  <th className="pb-2 text-right text-xs font-semibold text-gray-500">Utilization</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {MOCK_DOCK_STATS.map((dock) => (
                  <tr key={dock.code}>
                    <td className="py-2 font-medium text-gray-900">{dock.code}</td>
                    <td className="py-2 text-right text-gray-600">{dock.sessions}</td>
                    <td className="py-2 text-right text-gray-600">{dock.avgDuration} min</td>
                    <td className="py-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="h-2 w-16 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className="h-full bg-[#84CC16]"
                            style={{ width: `${dock.utilization}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{dock.utilization}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Top Drivers */}
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Top Drivers</h3>
            <button className="flex items-center gap-1 text-sm text-[#84CC16] hover:underline">
              View All <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-3">
            {MOCK_DRIVER_STATS.map((driver, idx) => (
              <div key={driver.name} className="flex items-center gap-3">
                <div className={`grid h-8 w-8 place-items-center rounded-full text-sm font-bold ${
                  idx === 0 ? 'bg-amber-100 text-amber-700' :
                  idx === 1 ? 'bg-gray-200 text-gray-600' :
                  idx === 2 ? 'bg-orange-100 text-orange-700' :
                  'bg-gray-100 text-gray-500'
                }`}>
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{driver.name}</div>
                  <div className="text-xs text-gray-500">
                    {driver.sessions} sessions • Avg {driver.avgDuration} min
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold text-gray-900">{driver.sessions}</div>
                  <div className="text-xs text-gray-500">sessions</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-4 text-white">
          <div className="text-sm opacity-80">Best Day</div>
          <div className="mt-1 text-2xl font-bold">Tuesday</div>
          <div className="mt-1 text-xs opacity-70">32 sessions avg</div>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-4 text-white">
          <div className="text-sm opacity-80">Fastest Dock</div>
          <div className="mt-1 text-2xl font-bold">D-03</div>
          <div className="mt-1 text-xs opacity-70">85 min avg</div>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 p-4 text-white">
          <div className="text-sm opacity-80">Peak Hour</div>
          <div className="mt-1 text-2xl font-bold">15:00</div>
          <div className="mt-1 text-xs opacity-70">6 sessions avg</div>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 p-4 text-white">
          <div className="text-sm opacity-80">Monthly Total</div>
          <div className="mt-1 text-2xl font-bold">486</div>
          <div className="mt-1 text-xs opacity-70">sessions completed</div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
