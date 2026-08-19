import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShieldCheck, Plus, Trash2, ArrowLeft, Layers, Edit, Check, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import AddRuleForm from './AddRuleForm';
import ConfirmDialog from '../Common/ConfirmDialog';

const BlockRules = () => {
  const { hostelId, blockId } = useParams();
  const navigate = useNavigate();

  const [hostel, setHostel] = useState(null);
  const [block, setBlock] = useState(null);
  const [floors, setFloors] = useState([]);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    type: 'danger',
    title: '',
    message: '',
    details: [],
    confirmLabel: 'Delete Rule',
    onConfirm: () => {},
  });

  useEffect(() => {
    fetchData();
  }, [hostelId, blockId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [hRes, bRes, fRes, rRes] = await Promise.all([
        api.get(`/admin/hostels/${hostelId}`),
        api.get(`/admin/blocks/${blockId}`),
        api.get(`/admin/floors?blockId=${blockId}`),
        api.get(`/admin/allocation-rules?block_id=${blockId}`),
      ]);
      setHostel(hRes.data.hostel || hRes.data);
      setBlock(bRes.data.block || bRes.data);
      setFloors(fRes.data.floors || fRes.data || []);
      setRules(rRes.data.rules || rRes.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load block allocation rules data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRule = async (data) => {
    try {
      await api.post('/admin/allocation-rules', {
        ...data,
        hostel_id: hostelId,
        block_id: blockId,
      });
      toast.success('Allocation rule created & floors reserved!');
      setShowAddForm(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create rule');
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

  const handleDeleteRule = (ruleId) => {
    setConfirmDialog({
      isOpen: true,
      type: 'danger',
      title: 'Delete Allocation Rule?',
      message: 'Are you sure you want to delete this allocation rule?',
      details: [
        'The rule restriction will be removed',
        'Allocated floors associated with this rule will be freed',
      ],
      confirmLabel: 'Delete Rule',
      onConfirm: async () => {
        try {
          await api.delete(`/admin/allocation-rules/${ruleId}`);
          toast.success('Rule deleted & allocated floors freed.');
          fetchData();
        } catch (err) {
          toast.error('Failed to delete rule');
        } finally {
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        }
      },
    });
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
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 mb-2 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to {hostel?.name || 'Hostel'} Blocks
          </button>

          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-blue-600" />
            Allocation Rules: {block?.name || 'Block'}
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            {hostel?.name || 'Hostel'} &bull; Configure floor-by-floor programme and year restrictions for this block.
          </p>
        </div>

        <button
          onClick={() => { setShowAddForm(!showAddForm); setEditingRule(null); }}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" /> {showAddForm ? 'Cancel Add' : 'Add Allocation Rule'}
        </button>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center text-slate-400 font-semibold animate-pulse">
          Loading allocation rules...
        </div>
      ) : (
        <div className="space-y-6">
          {/* Add / Edit Form Modal or inline card */}
          {(showAddForm || editingRule) && (
            <AddRuleForm
              block={block}
              floors={floors}
              programmesList={programmesList}
              yearsList={yearsList}
              availableFloors={availableFloors}
              editingRule={editingRule}
              onAdd={handleCreateRule}
              onEdit={(ruleId, data) => handleEditRule(ruleId || editingRule?.rule_id, data)}
              onSubmit={editingRule ? (data) => handleEditRule(editingRule.rule_id, data) : handleCreateRule}
              onCancelEdit={() => { setShowAddForm(false); setEditingRule(null); }}
              onCancel={() => { setShowAddForm(false); setEditingRule(null); }}
            />
          )}

          {/* Empty State Container (Outside table) */}
          {rules.length === 0 && !showAddForm && (
            <div className="flex flex-col items-center justify-center space-y-3 py-10 bg-white rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-slate-500 font-medium text-sm">
                No allocation rules defined for this block yet. Click below to restrict floors to specific cohorts.
              </p>
              <button
                onClick={() => { setShowAddForm(true); setEditingRule(null); }}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-2 shadow-md hover:shadow-lg"
              >
                <Plus className="w-4 h-4" /> Add Allocation Rule
              </button>
            </div>
          )}

          {/* Rules Table (Only when rules exist) */}
          {rules.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-xs uppercase">
                  <tr>
                    <th className="px-5 py-3.5 text-left">Floors Range</th>
                    <th className="px-5 py-3.5 text-left">Target Programme</th>
                    <th className="px-5 py-3.5 text-left">Target Year</th>
                    <th className="px-5 py-3.5 text-left">Gender</th>
                    <th className="px-5 py-3.5 text-left">Capacity</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {rules.map((rule) => (
                    <tr key={rule.rule_id} className="hover:bg-slate-50/60 transition">
                      <td className="px-5 py-4 font-bold text-slate-900">
                        Floors {rule.floor_start} to {rule.floor_end}
                      </td>
                      <td className="px-5 py-4">
                        <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold">
                          {rule.programme}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold">
                          {(rule.allowed_year || rule.year) ? `${rule.allowed_year || rule.year}${getOrdinal(rule.allowed_year || rule.year)} Year` : 'All Years'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="px-2.5 py-1 bg-purple-50 text-purple-700 rounded-lg text-xs font-bold">
                          {rule.gender || 'Any'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg text-xs font-bold">
                          {rule.capacity === 1 ? 'Single Seater' : rule.capacity === 2 ? 'Double Seater' : rule.capacity === 3 ? 'Triple Seater' : `${rule.capacity || 2} Seater`}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right space-x-2">
                        <button
                          onClick={() => { setEditingRule(rule); setShowAddForm(false); }}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteRule(rule.rule_id)}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold transition"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        type={confirmDialog.type}
        title={confirmDialog.title}
        message={confirmDialog.message}
        details={confirmDialog.details}
        confirmLabel={confirmDialog.confirmLabel}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

const getOrdinal = (n) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
};

export default BlockRules;
