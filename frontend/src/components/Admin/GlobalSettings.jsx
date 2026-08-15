import React, { useState, useEffect } from 'react';
import { Clock, Save, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';

const GlobalSettings = () => {
  const [settings, setSettings] = useState({
    booking_start_time: '',
    booking_end_time: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/admin/settings');
      const data = res.data.settings || {};

      const formatForInput = (isoStr) => {
        if (!isoStr) return '';
        try {
          const d = new Date(isoStr);
          const pad = (n) => String(n).padStart(2, '0');
          return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        } catch {
          return '';
        }
      };

      setSettings({
        booking_start_time: formatForInput(data.booking_start_time),
        booking_end_time: formatForInput(data.booking_end_time)
      });
    } catch (err) {
      toast.error('Failed to load global settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/admin/settings', {
        booking_start_time: settings.booking_start_time ? new Date(settings.booking_start_time).toISOString() : null,
        booking_end_time: settings.booking_end_time ? new Date(settings.booking_end_time).toISOString() : null
      });
      toast.success('Global booking window updated successfully!');
    } catch (err) {
      toast.error('Failed to save global settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-6 h-6 text-blue-600" />
            Global Booking Window Settings
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Set the system-wide booking start and end time window. Students across all hostels can only book within this window.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400 font-medium animate-pulse">Loading settings...</div>
      ) : (
        <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-extrabold text-slate-900">System-Wide Allocation Schedule</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                Booking Start Time
              </label>
              <input
                type="datetime-local"
                value={settings.booking_start_time}
                onChange={(e) => setSettings({ ...settings, booking_start_time: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">When room allocation opening begins.</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                Booking End Time
              </label>
              <input
                type="datetime-local"
                value={settings.booking_end_time}
                onChange={(e) => setSettings({ ...settings, booking_end_time: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">When room allocation closing deadline expires.</span>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default GlobalSettings;
