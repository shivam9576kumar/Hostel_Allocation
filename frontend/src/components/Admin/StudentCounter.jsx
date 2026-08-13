import React, { useState, useEffect, useRef } from 'react';
import { Users, GraduationCap, BarChart3 } from 'lucide-react';
import { getStudentCount } from '../../api/students';

const StudentCounter = ({ filters, onLoading }) => {
  const [stats, setStats] = useState({
    total: 0,
    programmeBreakdown: [],
    genderBreakdown: [],
    statusBreakdown: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const previousFilters = useRef({});

  // Fetch stats when filters change
  useEffect(() => {
    const filtersChanged = JSON.stringify(filters) !== JSON.stringify(previousFilters.current);
    if (!filtersChanged && !loading) return;
    
    previousFilters.current = { ...filters };
    fetchStats();
  }, [filters]);

  const fetchStats = async () => {
    setLoading(true);
    if (onLoading) onLoading(true);
    setError(null);
    
    try {
      const response = await getStudentCount(filters);
      
      // ✅ FIX: Access the nested 'data' property
      // API returns: { success: true, data: { total, programmeBreakdown, ... } }
      // So we need response.data.data, NOT response.data
      const responseData = response.data.data;
      
      if (!responseData) {
        throw new Error('Invalid response structure: missing data property');
      }
      
      setStats({
        total: responseData.total || 0,
        programmeBreakdown: responseData.programmeBreakdown || [],
        genderBreakdown: responseData.genderBreakdown || [],
        statusBreakdown: responseData.statusBreakdown || []
      });
      
    } catch (error) {
      console.error('❌ Error fetching student count:', error);
      console.error('Full error details:', error.response || error.message);
      setError(error.response?.data?.error || error.message || 'Failed to load student count');
    } finally {
      setLoading(false);
      if (onLoading) onLoading(false);
    }
  };

  // Manual refresh function
  const refresh = () => {
    fetchStats();
  };

  // Loading State
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm animate-pulse mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-200 rounded-xl"></div>
          <div className="flex-1">
            <div className="h-4 bg-slate-200 rounded w-24 mb-2"></div>
            <div className="h-8 bg-slate-200 rounded w-16"></div>
          </div>
        </div>
      </div>
    );
  }

  // Error State with Retry Button
  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-rose-200 p-6 shadow-sm mb-6">
        <div className="flex items-center gap-3 text-rose-600">
          <span className="text-lg">⚠️</span>
          <span className="text-sm font-medium">{error}</span>
          <button 
            onClick={refresh}
            className="ml-auto text-sm text-blue-600 hover:text-blue-800 font-medium px-3 py-1 border border-blue-200 rounded-lg hover:bg-blue-50 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Success State – Display Counter
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-6">
      {/* Main Counter Row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center border border-blue-100">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Students Found
            </p>
            <p className="text-3xl font-extrabold text-slate-900">
              {stats.total}
            </p>
          </div>
        </div>

        {/* Gender Breakdown */}
        {stats.genderBreakdown.length > 0 && (
          <div className="flex gap-4">
            {stats.genderBreakdown.map((item) => (
              <div key={item.gender} className="text-center px-3 py-1 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-xs text-slate-500 font-medium">{item.gender}</p>
                <p className="text-lg font-bold text-slate-800">{item.count}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Breakdown Cards */}
      <div className="mt-4 pt-4 border-t border-slate-100">
        <div className="flex flex-wrap gap-3">
          {/* Programme Breakdown */}
          {stats.programmeBreakdown.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <GraduationCap className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-medium text-slate-500 mr-1">Programme:</span>
              {stats.programmeBreakdown.map((item) => (
                <span
                  key={`${item.programme}-${item.year}`}
                  className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-full text-xs font-medium text-slate-700"
                >
                  {item.programme} Yr {item.year}: {item.count}
                </span>
              ))}
            </div>
          )}

          {/* Status Breakdown */}
          {stats.statusBreakdown.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 border-l border-slate-200 pl-3">
              <BarChart3 className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-medium text-slate-500 mr-1">Status:</span>
              {stats.statusBreakdown.map((item) => (
                <span
                  key={item.booking_status}
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    item.booking_status === 'Locked' 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : item.booking_status === 'Pending'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-slate-50 text-slate-700 border border-slate-200'
                  }`}
                >
                  {item.booking_status}: {item.count}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Refresh Button */}
      <div className="mt-3 flex justify-end">
        <button
          onClick={refresh}
          className="text-xs text-slate-400 hover:text-slate-600 font-medium flex items-center gap-1 transition"
        >
          <span>🔄</span> Refresh
        </button>
      </div>
    </div>
  );
};

export default StudentCounter;
