import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';
import { TrendingUp, DollarSign, CreditCard, CheckCircle, RefreshCw } from 'lucide-react';



const COLORS = ['#2563eb', '#16a34a', '#d97706', '#9333ea', '#dc2626', '#0891b2', '#65a30d'];

const formatCurrency = (v) => `₱${parseFloat(v || 0)?.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
      {label && <p className="font-semibold text-gray-700 mb-1">{label}</p>}
      {payload?.map((entry, i) => (
        <p key={i} style={{ color: entry?.color }} className="font-medium">
          {entry?.name}: {entry?.name?.toLowerCase()?.includes('revenue') || entry?.name?.toLowerCase()?.includes('amount') ? formatCurrency(entry?.value) : entry?.value}
        </p>
      ))}
    </div>
  );
};

const StatCard = ({ icon: IconComponent, label, value, sub, color }) => (
  <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-5">
    <div className="flex items-start gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
        <IconComponent size={18} className="text-white" />
      </div>
      <div>
        <p className="text-xs text-gray-500 mb-0.5">{label}</p>
        <p className="text-lg font-bold text-gray-900">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  </div>
);

const RevenueCharts = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const since = new Date();
      since?.setDate(since?.getDate() - parseInt(period));

      const { data: bookings, error } = await supabase
        ?.from('bookings')
        ?.select('id, total_cost, payment_method, payment_status, status, created_at, vehicles!bookings_vehicle_id_fkey(vehicle_type), pickup_location, dropoff_location')
        ?.gte('created_at', since?.toISOString())
        ?.order('created_at', { ascending: true });

      if (error) throw error;

      const paid = bookings?.filter(b => b?.payment_status === 'paid' || b?.status === 'confirmed');
      const totalRevenue = paid?.reduce((sum, b) => sum + parseFloat(b?.total_cost || 0), 0);
      const totalBookings = bookings?.length || 0;
      const successRate = totalBookings > 0 ? ((paid?.length / totalBookings) * 100)?.toFixed(1) : 0;
      const refunded = bookings?.filter(b => b?.payment_status === 'refunded')?.length || 0;

      // Revenue by day (last N days)
      const dayMap = {};
      for (let i = parseInt(period) - 1; i >= 0; i--) {
        const d = new Date();
        d?.setDate(d?.getDate() - i);
        const key = d?.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
        dayMap[key] = 0;
      }
      paid?.forEach(b => {
        const key = new Date(b?.created_at)?.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
        if (dayMap?.[key] !== undefined) dayMap[key] += parseFloat(b?.total_cost || 0);
      });
      const revenueByDay = Object.entries(dayMap)?.map(([date, revenue]) => ({ date, revenue }));

      // Payments by method
      const methodMap = {};
      bookings?.forEach(b => {
        const m = b?.payment_method || 'Unknown';
        if (!methodMap?.[m]) methodMap[m] = { method: m, count: 0, revenue: 0 };
        methodMap[m].count++;
        if (b?.payment_status === 'paid' || b?.status === 'confirmed') {
          methodMap[m].revenue += parseFloat(b?.total_cost || 0);
        }
      });
      const byMethod = Object.values(methodMap)?.sort((a, b) => b?.revenue - a?.revenue);

      // Revenue by vehicle type
      const vehicleMap = {};
      paid?.forEach(b => {
        const vt = b?.vehicles?.vehicle_type || 'Unknown';
        if (!vehicleMap?.[vt]) vehicleMap[vt] = { type: vt, revenue: 0, count: 0 };
        vehicleMap[vt].revenue += parseFloat(b?.total_cost || 0);
        vehicleMap[vt].count++;
      });
      const byVehicle = Object.values(vehicleMap)?.sort((a, b) => b?.revenue - a?.revenue);

      // Revenue by destination zone (dropoff)
      const zoneMap = {};
      paid?.forEach(b => {
        const zone = b?.dropoff_location?.split(',')?.[0]?.trim() || b?.dropoff_location || 'Unknown';
        if (!zoneMap?.[zone]) zoneMap[zone] = { zone, revenue: 0, count: 0 };
        zoneMap[zone].revenue += parseFloat(b?.total_cost || 0);
        zoneMap[zone].count++;
      });
      const byZone = Object.values(zoneMap)?.sort((a, b) => b?.revenue - a?.revenue)?.slice(0, 8);

      // Payment success rate breakdown
      const statusMap = { paid: 0, pending: 0, failed: 0, refunded: 0, cancelled: 0 };
      bookings?.forEach(b => {
        const s = b?.status === 'cancelled' ? 'cancelled' : (b?.payment_status || 'pending');
        if (statusMap?.[s] !== undefined) statusMap[s]++;
        else statusMap['pending']++;
      });
      const successRateData = Object.entries(statusMap)
        ?.filter(([, v]) => v > 0)
        ?.map(([name, value]) => ({ name: name?.charAt(0)?.toUpperCase() + name?.slice(1), value }));

      setData({ totalRevenue, totalBookings, successRate, refunded, revenueByDay, byMethod, byVehicle, byZone, successRateData, paidCount: paid?.length });
    } catch (err) {
      console.error('Error loading revenue data:', err);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <RefreshCw size={20} className="animate-spin text-gray-400 mr-2" />
      <span className="text-gray-500 text-sm">Loading revenue data...</span>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Period selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">Revenue Analytics</h2>
        <div className="flex items-center gap-2">
          <button onClick={loadData} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
            <RefreshCw size={14} className="text-gray-500" />
          </button>
          <select
            value={period}
            onChange={e => setPeriod(e?.target?.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </div>
      </div>
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={DollarSign} label="Total Revenue" value={formatCurrency(data?.totalRevenue)} sub={`${data?.paidCount} paid bookings`} color="bg-green-500" />
        <StatCard icon={TrendingUp} label="Total Bookings" value={data?.totalBookings} sub={`Last ${period} days`} color="bg-blue-500" />
        <StatCard icon={CheckCircle} label="Success Rate" value={`${data?.successRate}%`} sub="Paid / Total" color="bg-purple-500" />
        <StatCard icon={CreditCard} label="Refunded" value={data?.refunded} sub="Reversed payments" color="bg-red-400" />
      </div>
      {/* Revenue Over Time */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-4">Revenue Over Time</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data?.revenueByDay} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={Math.floor((data?.revenueByDay?.length || 1) / 6)} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `₱${(v / 1000)?.toFixed(0)}k`} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#2563eb" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {/* Payments by Method + Success Rate */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Revenue by Payment Method</h3>
          {data?.byMethod?.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">No payment data</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data?.byMethod} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="method" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `₱${(v / 1000)?.toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="revenue" name="Revenue" radius={[4, 4, 0, 0]}>
                  {data?.byMethod?.map((_, i) => <Cell key={i} fill={COLORS?.[i % COLORS?.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Payment Status Breakdown</h3>
          {data?.successRateData?.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={data?.successRateData} cx="50%" cy="50%" outerRadius={75} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100)?.toFixed(0)}%`} labelLine={false} fontSize={10}>
                  {data?.successRateData?.map((_, i) => <Cell key={i} fill={COLORS?.[i % COLORS?.length]} />)}
                </Pie>
                <Tooltip />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
      {/* Revenue by Vehicle Type + Destination Zone */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Revenue by Vehicle Type</h3>
          {data?.byVehicle?.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data?.byVehicle} layout="vertical" margin={{ top: 5, right: 10, left: 60, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `₱${(v / 1000)?.toFixed(0)}k`} />
                <YAxis type="category" dataKey="type" tick={{ fontSize: 10 }} width={55} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="revenue" name="Revenue" radius={[0, 4, 4, 0]}>
                  {data?.byVehicle?.map((_, i) => <Cell key={i} fill={COLORS?.[i % COLORS?.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Revenue by Destination Zone</h3>
          {data?.byZone?.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data?.byZone} layout="vertical" margin={{ top: 5, right: 10, left: 80, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `₱${(v / 1000)?.toFixed(0)}k`} />
                <YAxis type="category" dataKey="zone" tick={{ fontSize: 10 }} width={75} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="revenue" name="Revenue" radius={[0, 4, 4, 0]}>
                  {data?.byZone?.map((_, i) => <Cell key={i} fill={COLORS?.[i % COLORS?.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};

export default RevenueCharts;
