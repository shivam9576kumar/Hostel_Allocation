import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Layers, RefreshCw, Edit2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import AddRuleForm from './AddRuleForm';

const BlockRules = () => {
  const { hostelId, blockId } = useParams();
  const navigate = useNavigate();

  const [rules, setRules] = useState([]);
  const [block, setBlock] = useState(null);
  const [hostel, setHostel] = useState(null);
  const [floors, setFloors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingRule, setEditingRule] = useState(null);

  useEffect(() => {
    fetchData();
  }, [hostelId, blockId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [hostelRes, blockRes, rulesRes, floorsRes] = await Promise.all([
        api.get(`/admin/hostels/${hostelId}`),
        api.get(`/admin/blocks/${blockId}`),
        api.get(`/admin/allocation-rules?blockId=${blockId}`),
        api.get(`/admin/floors?blockId=${blockId}`)
      ]);

      setHostel(hostelRes.data.hostel);
      setBlock(blockRes.data.block);
      const fetchedRules = rulesRes.data.rules || [];
      setRules(fetchedRules);
      setFloors(floorsRes.data.floors || []);
    } catch (err) {
      toast.error('Failed to fetch allocation rules');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRule = async (data) => {
    try {
      await api.post('/admin/allocation-rules', {
        hostel_id: parseInt(hostelId, 10),
        ...data,
        block_id: parseInt(blockId, 10),
      });
      toast.success('Rule created & floors reserved successfully!');
      setEditingRule(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add rule');
    }
  };

  const handleEditRule = async (ruleId, data) => {
    try {
      await api.put(`/admin/allocation-rules/${ruleId}`, data);
      toast.success('Rule updated & floor reservation updated!');
      setEditingRule(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update rule');
    }
  };

  const handleDeleteRule = async (ruleId) => {
    if (!window.confirm('Delete this rule? This will free the allocated floors.')) return;
    try {
      await api.delete(`/admin/allocation-rules/${ruleId}`);
      toast.success('Rule deleted & allocated floors freed.');
      fetchData();
    } catch (err) {
      toast.error('Failed to delete rule');
    }
  };

  const goBack = () => {
    navigate(`/admin/allocation-rules/hostels/${hostelId}`);
  };

  const programmesList = ['B.Tech', 'M.Tech', 'M.Sc', 'PhD', 'B.Des', 'M.Des', 'MBA'];
  const yearsList = [
    { label: '1st Year', value: '1' },
    { label: '2nd Year', value: '2' },
    { label: '3rd Year', value: '3' },
    { label: '4th Year', value: '4' },
    { label: '5th Year', value: '5' },
  ];

  // Calculate available floor numbers vs reserved floor numbers
  const allFloorNumbers = floors.map(f => f.floor_number);
  const reservedFloorNumbers = new Set();
  rules.forEach(r => {
    for (let f = r.floor_start; f <= r.floor_end; f++) {
      reservedFloorNumbers.add(f);
    }
  });

  const availableFloors = allFloorNumbers.filter(f => !reservedFloorNumbers.has(f));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button
            onClick={goBack}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1 mb-2"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Blocks
          </button>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-6 h-6 text-blue-600" />
            {hostel?.name || 'Hostel'} → {block?.name || 'Block'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Rules: <span className="font-bold text-slate-800">{rules.length}</span> | Available Floors:{' '}
            <span className="font-bold text-emerald-600">
              {availableFloors.length > 0 ? availableFloors.join(', ') : 'None'}
            </span>
          </p>
        </div>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Add / Edit Rule Form (Inline) */}
      <AddRuleForm
        programmesList={programmesList}
        yearsList={yearsList}
        onAdd={handleAddRule}
        editingRule={editingRule}
        onEdit={handleEditRule}
        onCancelEdit={() => setEditingRule(null)}
      />

      {/* Rules Table */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 font-medium animate-pulse">Loading rules...</div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Rule ID</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Gender</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Programme</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Year</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Floors</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Capacity</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rules.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-4 py-8 text-center text-slate-400 font-medium">
                      No rules configured for this block. Add a rule using the form above.
                    </td>
                  </tr>
                ) : (
                  rules.map((rule) => (
                    <tr key={rule.rule_id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3 text-xs text-slate-400 font-mono">#{rule.rule_id}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{rule.gender || 'Male'}</td>
                      <td className="px-4 py-3 font-extrabold text-slate-900">{rule.programme}</td>
                      <td className="px-4 py-3 text-xs font-semibold text-slate-700">
                        {rule.allowed_year ? `${rule.allowed_year}${getOrdinal(rule.allowed_year)} Year` : '1st Year'}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs font-bold text-slate-800">
                        {rule.floor_start} – {rule.floor_end}
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-slate-800">
                        {rule.capacity || 2} Seater
                      </td>
                      <td className="px-4 py-3 text-right space-x-1">
                        <button
                          onClick={() => setEditingRule(rule)}
                          className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                          title="Edit Rule"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteRule(rule.rule_id)}
                          className="p-1.5 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition"
                          title="Delete Rule"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

const getOrdinal = (n) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
};

export default BlockRules;
