import React, { useState, useEffect } from 'react';
import { Plus, X, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

const AddRuleForm = ({
  programmesList = ['B.Tech', 'M.Tech', 'M.Sc', 'PhD', 'B.Des', 'M.Des', 'MBA'],
  yearsList = [
    { label: '1st Year', value: '1' },
    { label: '2nd Year', value: '2' },
    { label: '3rd Year', value: '3' },
    { label: '4th Year', value: '4' },
    { label: '5th Year', value: '5' },
  ],
  onAdd,
  editingRule,
  onEdit,
  onCancelEdit,
  onSubmit,
  onCancel,
  allocatedRanges = []
}) => {
  const [gender, setGender] = useState('Male');
  const [programme, setProgramme] = useState('B.Tech');
  const [allowedYear, setAllowedYear] = useState('2');
  const [floorStart, setFloorStart] = useState('0');
  const [floorEnd, setFloorEnd] = useState('2');
  const [capacity, setCapacity] = useState('2');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingRule) {
      setGender(editingRule.gender || 'Male');
      setProgramme(editingRule.programme || 'B.Tech');
      setAllowedYear(editingRule.allowed_year ? editingRule.allowed_year.toString() : '1');
      setFloorStart(editingRule.floor_start !== undefined ? editingRule.floor_start.toString() : '0');
      setFloorEnd(editingRule.floor_end !== undefined ? editingRule.floor_end.toString() : '2');
      setCapacity(editingRule.capacity ? editingRule.capacity.toString() : '2');
    } else {
      setGender('Male');
      setProgramme('B.Tech');
      setAllowedYear('2');
      setFloorStart('0');
      setFloorEnd('2');
      setCapacity('2');
    }
  }, [editingRule]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const start = parseInt(floorStart, 10);
    const end = parseInt(floorEnd, 10);

    if (isNaN(start) || isNaN(end) || start > end || start < 0) {
      toast.error('Please enter a valid floor range (0 ≤ Start ≤ End).');
      return;
    }

    if (!allowedYear || allowedYear === 'ALL') {
      toast.error('Please select a specific year (1st, 2nd, 3rd, 4th, or 5th Year).');
      return;
    }

    const payload = {
      gender,
      programme,
      allowed_year: parseInt(allowedYear, 10),
      floor_start: start,
      floor_end: end,
      capacity: parseInt(capacity, 10),
    };

    console.log('📝 Submitting rule form with payload:', payload);

    setLoading(true);
    try {
      if (editingRule) {
        const handleEditFn = onEdit || onSubmit;
        if (typeof handleEditFn === 'function') {
          await handleEditFn(editingRule.rule_id, payload);
        } else {
          toast.error('Edit handler is not configured');
        }
      } else {
        const handleAddFn = onAdd || onSubmit;
        if (typeof handleAddFn === 'function') {
          await handleAddFn(payload);
        } else {
          toast.error('Add rule handler is not configured');
        }
      }
    } catch (err) {
      console.error('Error submitting allocation rule form:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelClick = onCancelEdit || onCancel;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          {editingRule ? `Edit Rule #${editingRule.rule_id}` : '➕ ADD NEW RULE'}
        </h3>
        {editingRule && handleCancelClick && (
          <button
            type="button"
            onClick={handleCancelClick}
            className="p-1 hover:bg-slate-100 rounded-lg transition text-slate-400 hover:text-slate-700"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-3">
        {/* Gender */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-500">Gender:</label>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
          >
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </div>

        {/* Programme */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-500">Programme:</label>
          <select
            value={programme}
            onChange={(e) => setProgramme(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
          >
            {programmesList.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        {/* Year */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-500">Year:</label>
          <select
            value={allowedYear}
            onChange={(e) => setAllowedYear(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
            required
          >
            {yearsList.map((y) => (
              <option key={y.value} value={y.value}>{y.label}</option>
            ))}
          </select>
        </div>

        {/* Floor Range */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-500">Floor Range:</label>
          <input
            type="number"
            value={floorStart}
            onChange={(e) => setFloorStart(e.target.value)}
            className="w-16 px-2.5 py-1.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
            min="0"
            required
          />
          <span className="text-xs font-bold text-slate-400">to</span>
          <input
            type="number"
            value={floorEnd}
            onChange={(e) => setFloorEnd(e.target.value)}
            className="w-16 px-2.5 py-1.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
            min="0"
            required
          />
        </div>

        {/* Capacity */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-500">Capacity:</label>
          <select
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
          >
            <option value="2">2 Seater</option>
            <option value="3">3 Seater</option>
          </select>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          {editingRule ? (loading ? 'Updating...' : 'Update Rule') : (loading ? 'Adding...' : '+ Add Rule')}
        </button>
      </form>
    </div>
  );
};

export default AddRuleForm;
