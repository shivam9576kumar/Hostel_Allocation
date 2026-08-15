import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, ShieldCheck, Filter, RefreshCw, Layers, Building2, CheckCircle2, AlertCircle, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { 
  getAllocationRules, 
  createAllocationRule, 
  updateAllocationRule, 
  deleteAllocationRule 
} from '../../api/allocationRules';

const getOrdinal = (n) => {
  if (!n) return '';
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
};

const AllocationRulesManager = () => {
  const [hostels, setHostels] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form State
  const [selectedHostelId, setSelectedHostelId] = useState('');
  const [programme, setProgramme] = useState('B.Tech');
  const [allowedYear, setAllowedYear] = useState('ALL'); // 'ALL' = null
  const [selectedBlockId, setSelectedBlockId] = useState('');
  const [floorStart, setFloorStart] = useState('0');
  const [floorEnd, setFloorEnd] = useState('5');

  // Edit Mode State
  const [editingRuleId, setEditingRuleId] = useState(null);

  // Filter State
  const [filterHostelId, setFilterHostelId] = useState('ALL');
  const [filterProgramme, setFilterProgramme] = useState('ALL');
  const [filterYear, setFilterYear] = useState('ALL');

  const programmesList = ['B.Tech', 'M.Tech', 'M.Sc', 'PhD', 'B.Des', 'M.Des', 'MBA'];
  const yearsList = [
    { label: 'All Years (Default)', value: 'ALL' },
    { label: '1st Year', value: '1' },
    { label: '2nd Year', value: '2' },
    { label: '3rd Year', value: '3' },
    { label: '4th Year', value: '4' },
    { label: '5th Year', value: '5' }
  ];

  const fetchData = async () => {
    setLoading(true);
    try {
      const [hostelsRes, rulesRes] = await Promise.all([
        api.get('/admin/hostels'),
        getAllocationRules()
      ]);

      const fetchedHostels = hostelsRes.data.hostels || [];
      setHostels(fetchedHostels);
      setRules(rulesRes.data.rules || []);

      if (fetchedHostels.length > 0 && !selectedHostelId) {
        setSelectedHostelId(fetchedHostels[0].hostel_id);
      }
    } catch (error) {
      console.error('Error fetching allocation rules data:', error);
      toast.error('Failed to load allocation rules data.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch blocks whenever selectedHostelId changes
  useEffect(() => {
    if (selectedHostelId) {
      fetchBlocksForHostel(selectedHostelId);
    } else {
      setBlocks([]);
    }
  }, [selectedHostelId]);

  const fetchBlocksForHostel = async (hId) => {
    try {
      const res = await api.get(`/admin/blocks?hostelId=${hId}`);
      const fetchedBlocks = res.data?.blocks || res.data?.data || res.data || [];
      setBlocks(Array.isArray(fetchedBlocks) ? fetchedBlocks : []);
      if (Array.isArray(fetchedBlocks) && fetchedBlocks.length > 0) {
        setSelectedBlockId(fetchedBlocks[0].block_id);
      } else {
        setSelectedBlockId('');
      }
    } catch (error) {
      console.error('Error fetching blocks:', error);
      setBlocks([]);
      setSelectedBlockId('');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedHostelId || !programme || !selectedBlockId) {
      toast.error('Please select a Hostel, Programme, and Block.');
      return;
    }

    const start = parseInt(floorStart, 10);
    const end = parseInt(floorEnd, 10);

    if (isNaN(start) || isNaN(end) || start > end || start < 0) {
      toast.error('Please enter a valid floor range (Start <= End, Start >= 0).');
      return;
    }

    const payloadYear = allowedYear === 'ALL' || !allowedYear ? null : parseInt(allowedYear, 10);

    try {
      if (editingRuleId) {
        const response = await updateAllocationRule(editingRuleId, {
          programme,
          allowed_year: payloadYear,
          block_id: parseInt(selectedBlockId, 10),
          floor_start: start,
          floor_end: end
        });
        toast.success(response.data.message || 'Rule updated successfully!');
        setEditingRuleId(null);
      } else {
        const response = await createAllocationRule({
          hostel_id: parseInt(selectedHostelId, 10),
          programme,
          allowed_year: payloadYear,
          block_id: parseInt(selectedBlockId, 10),
          floor_start: start,
          floor_end: end
        });
        toast.success(response.data.message || 'Rule created successfully!');
      }

      // Reset form to defaults
      setAllowedYear('ALL');
      setFloorStart('0');
      setFloorEnd('5');
      fetchData();
    } catch (error) {
      const errMsg = error.response?.data?.error || 'Failed to save allocation rule.';
      toast.error(errMsg);
    }
  };

  const handleEdit = (rule) => {
    setEditingRuleId(rule.rule_id);
    setSelectedHostelId(rule.hostel_id);
    setProgramme(rule.programme);
    setAllowedYear(rule.allowed_year ? rule.allowed_year.toString() : 'ALL');
    setSelectedBlockId(rule.block_id);
    setFloorStart(rule.floor_start.toString());
    setFloorEnd(rule.floor_end.toString());
  };

  const handleCancelEdit = () => {
    setEditingRuleId(null);
    setAllowedYear('ALL');
    setFloorStart('0');
    setFloorEnd('5');
  };

  const handleDelete = async (ruleId) => {
    if (!window.confirm('Are you sure you want to delete this allocation rule?')) return;

    try {
      await deleteAllocationRule(ruleId);
      toast.success('Allocation rule deleted successfully.');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete allocation rule.');
    }
  };

  // Filtered Rules List
  const filteredRules = rules.filter(r => {
    const matchesHostel = filterHostelId === 'ALL' || r.hostel_id.toString() === filterHostelId.toString();
    const matchesProgramme = filterProgramme === 'ALL' || r.programme === filterProgramme;
    const matchesYear = filterYear === 'ALL' || (filterYear === 'NULL' ? r.allowed_year === null : r.allowed_year?.toString() === filterYear);
    return matchesHostel && matchesProgramme && matchesYear;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-blue-600" />
            Allocation Rules Manager
          </h1>
          <p className="text-sm text-slate-500">
            Define multi-programme & multi-year eligibility rules per hostel with block-level and floor-range granularity.
          </p>
        </div>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-semibold transition flex items-center gap-2 shadow-sm self-start md:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Rules
        </button>
      </div>

      {/* Add / Edit Form Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Plus className="w-5 h-5 text-blue-600" />
            {editingRuleId ? 'Edit Allocation Rule' : 'Add New Allocation Rule'}
          </h3>
          {editingRuleId && (
            <button
              onClick={handleCancelEdit}
              className="text-xs text-rose-600 hover:underline font-semibold"
            >
              Cancel Editing
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
          {/* Hostel Dropdown */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Target Hostel</label>
            <select
              value={selectedHostelId}
              onChange={(e) => setSelectedHostelId(e.target.value)}
              disabled={!!editingRuleId}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-60"
              required
            >
              <option value="">Select Hostel</option>
              {hostels.map((h) => (
                <option key={h.hostel_id} value={h.hostel_id}>
                  {h.name} ({h.allowed_gender})
                </option>
              ))}
            </select>
          </div>

          {/* Programme Dropdown */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Programme</label>
            <select
              value={programme}
              onChange={(e) => setProgramme(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
            >
              {programmesList.map((prog) => (
                <option key={prog} value={prog}>{prog}</option>
              ))}
            </select>
          </div>

          {/* Year Dropdown */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Allowed Year</label>
            <select
              value={allowedYear}
              onChange={(e) => setAllowedYear(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              {yearsList.map((y) => (
                <option key={y.value} value={y.value}>{y.label}</option>
              ))}
            </select>
          </div>

          {/* Block Dropdown */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Target Block</label>
            <select
              value={selectedBlockId}
              onChange={(e) => setSelectedBlockId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
            >
              <option value="">Select Block</option>
              {blocks.map((b) => (
                <option key={b.block_id} value={b.block_id}>
                  {b.name} {b.is_reserved ? '(Reserved)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Floor Range Inputs */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Floor Range</label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="0"
                value={floorStart}
                onChange={(e) => setFloorStart(e.target.value)}
                placeholder="0"
                className="w-1/2 bg-slate-50 border border-slate-300 rounded-xl px-2 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
              <span className="text-slate-400 font-bold text-xs">to</span>
              <input
                type="number"
                min="0"
                value={floorEnd}
                onChange={(e) => setFloorEnd(e.target.value)}
                placeholder="5"
                className="w-1/2 bg-slate-50 border border-slate-300 rounded-xl px-2 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2 text-sm shadow-sm"
            >
              <Plus className="w-4 h-4" />
              {editingRuleId ? 'Update Rule' : 'Add Rule'}
            </button>
          </div>
        </form>
      </div>

      {/* Rules Directory Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {/* Table Filter Controls */}
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-slate-800 text-base">Configured Allocation Rules</h3>
            <span className="text-xs bg-slate-100 border border-slate-200 text-slate-600 px-2.5 py-0.5 rounded-full font-bold">
              {filteredRules.length} rules
            </span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Filter by Hostel */}
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={filterHostelId}
                onChange={(e) => setFilterHostelId(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 font-medium focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Hostels</option>
                {hostels.map((h) => (
                  <option key={h.hostel_id} value={h.hostel_id}>{h.name}</option>
                ))}
              </select>
            </div>

            {/* Filter by Programme */}
            <div className="flex items-center gap-1.5">
              <select
                value={filterProgramme}
                onChange={(e) => setFilterProgramme(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 font-medium focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Programmes</option>
                {programmesList.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* Filter by Year */}
            <div className="flex items-center gap-1.5">
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 font-medium focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Years</option>
                <option value="1">1st Year</option>
                <option value="2">2nd Year</option>
                <option value="3">3rd Year</option>
                <option value="4">4th Year</option>
                <option value="5">5th Year</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase font-semibold">
              <tr>
                <th className="px-4 py-3">Rule ID</th>
                <th className="px-4 py-3">Hostel</th>
                <th className="px-4 py-3">Programme</th>
                <th className="px-4 py-3">Year</th>
                <th className="px-4 py-3">Block</th>
                <th className="px-4 py-3">Floor Range</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRules.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-slate-400">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p>No allocation rules configured yet for the selected filter.</p>
                  </td>
                </tr>
              ) : (
                filteredRules.map((rule) => (
                  <tr key={rule.rule_id} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3 text-xs text-slate-400 font-mono font-bold">#{rule.rule_id}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {rule.Hostel?.name || `Hostel #${rule.hostel_id}`}
                      <span className="text-xs text-slate-400 font-normal block">{rule.Hostel?.allowed_gender}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                        {rule.programme}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                        rule.allowed_year ? 'bg-purple-100 text-purple-800 border border-purple-200' : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {rule.allowed_year ? `${rule.allowed_year}${getOrdinal(rule.allowed_year)} Year` : 'All Years'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700">
                      {rule.Block?.name || `Block #${rule.block_id}`}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                        Floors {rule.floor_start} – {rule.floor_end}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        onClick={() => handleEdit(rule)}
                        className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition"
                      >
                        <Edit2 className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => handleDelete(rule.rule_id)}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AllocationRulesManager;
