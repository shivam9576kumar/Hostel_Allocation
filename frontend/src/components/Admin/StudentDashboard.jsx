import React, { useState, useEffect } from 'react';
import { Users, Clock, CheckCircle2, GraduationCap, BarChart3, PieChart } from 'lucide-react';
import { PieChart as RePie, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { getStudentCount } from '../../api/students';

const StudentDashboard = ({ filters }) => {
  const [stats, setStats] = useState({
    total: 0,
    programmeBreakdown: [],
    genderBreakdown: [],
    statusBreakdown: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [filters]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await getStudentCount(filters);
      const responseData = response.data?.data || response.data;
      setStats({
        total: responseData.total || 0,
        programmeBreakdown: responseData.programmeBreakdown || [],
        genderBreakdown: responseData.genderBreakdown || [],
        statusBreakdown: responseData.statusBreakdown || []
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Group programme data for bar chart
  const programmeData = stats.programmeBreakdown.reduce((acc, item) => {
    const countVal = Number(item.count) || 0;
    const existing = acc.find(p => p.programme === item.programme);
    if (existing) {
      existing[`Yr${item.year}`] = countVal;
      existing.total += countVal;
    } else {
      acc.push({
        programme: item.programme,
        [`Yr${item.year}`]: countVal,
        total: countVal
      });
    }
    return acc;
  }, []);

  // Gender data for pie chart
  const genderData = stats.genderBreakdown.map(item => ({
    name: item.gender,
    value: Number(item.count) || 0
  }));

  const COLORS = ['#3b82f6', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#14b8a6'];

  if (loading) {
    return (
      <div className="animate-pulse space-y-4 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-slate-200 rounded-2xl"></div>)}
        </div>
      </div>
    );
  }

  const pendingCount = stats.statusBreakdown.find(s => s.booking_status === 'Pending')?.count || 0;
  const lockedCount = stats.statusBreakdown.find(s => s.booking_status === 'Locked')?.count || 0;
  const programmeCount = new Set(stats.programmeBreakdown.map(p => p.programme)).size;

  return (
    <div className="space-y-6 mb-6">
      {/* Top Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">Total Students</p>
              <p className="text-3xl font-extrabold text-slate-900">{stats.total}</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">Pending</p>
              <p className="text-3xl font-extrabold text-amber-600">
                {pendingCount}
              </p>
            </div>
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">Locked</p>
              <p className="text-3xl font-extrabold text-emerald-600">
                {lockedCount}
              </p>
            </div>
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">Programmes</p>
              <p className="text-3xl font-extrabold text-purple-600">
                {programmeCount}
              </p>
            </div>
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Gender Pie Chart */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <PieChart className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-700">Gender Distribution</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <RePie>
              <Pie
                data={genderData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {genderData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${value} students`} />
            </RePie>
          </ResponsiveContainer>
        </div>

        {/* Programme Bar Chart */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-700">Programme Distribution</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={programmeData} layout="vertical">
              <XAxis type="number" />
              <YAxis type="category" dataKey="programme" width={60} />
              <Tooltip formatter={(value) => `${value} students`} />
              <Bar dataKey="total" fill="#3b82f6" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Programme Details Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.programmeBreakdown.reduce((acc, item) => {
          const countNum = Number(item.count) || 0;
          const prog = acc.find(p => p.programme === item.programme);
          if (prog) {
            prog.years.push({ year: item.year, count: countNum });
            prog.total += countNum;
          } else {
            acc.push({ programme: item.programme, years: [{ year: item.year, count: countNum }], total: countNum });
          }
          return acc;
        }, []).map((prog, idx) => (
          <div key={prog.programme} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-medium text-slate-500">{prog.programme}</p>
                <p className="text-2xl font-bold text-slate-900">{prog.total}</p>
              </div>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                idx === 0 ? 'bg-blue-100 text-blue-600' :
                idx === 1 ? 'bg-purple-100 text-purple-600' :
                idx === 2 ? 'bg-emerald-100 text-emerald-600' :
                'bg-amber-100 text-amber-600'
              }`}>
                {prog.programme.charAt(0)}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1">
              {prog.years.map(y => (
                <span key={y.year} className="text-xs bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-full text-slate-600 font-medium">
                  Yr {y.year}: {y.count}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Status Progress Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Booking Status</h3>
        <div className="space-y-3">
          {stats.statusBreakdown.map((item) => (
            <div key={item.booking_status}>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span className="text-slate-700">{item.booking_status.replace('_', ' ')}</span>
                <span className="text-slate-500">{item.count} students ({stats.total > 0 ? ((item.count / stats.total) * 100).toFixed(1) : 0}%)</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-2.5 rounded-full transition-all duration-500 ${
                    item.booking_status === 'Locked' ? 'bg-emerald-500' :
                    item.booking_status === 'Pending_Pairing' ? 'bg-amber-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${stats.total > 0 ? (item.count / stats.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
