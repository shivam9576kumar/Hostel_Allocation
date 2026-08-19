// frontend/src/components/Admin/BatchRemovalModal.jsx

import React, { useState } from 'react';
import { X, Users, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { batchRemoveStudents } from '../../api/students';
import ConfirmDialog from '../Common/ConfirmDialog';

const programmes = ['B.Tech', 'B.Tech+M.Tech', 'B.Tech+MBA', 'M.Tech', 'M.Sc', 'PhD'];
const years = ['1', '2', '3', '4', '5'];

const BatchRemovalModal = ({ onClose, onSuccess }) => {
  const [programme, setProgramme] = useState('');
  const [year, setYear] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    type: 'danger',
    title: '',
    message: '',
    details: [],
    confirmLabel: 'Remove Batch',
    onConfirm: () => {},
  });

  const handleSubmit = () => {
    if (!programme || !year) {
      toast.error('Select both programme and year.');
      return;
    }

    setConfirmDialog({
      isOpen: true,
      type: 'danger',
      title: 'Batch Removal',
      message: `Remove all ${programme} Year ${year} students?`,
      details: [
        '⚠️ This action CANNOT be undone',
        'All students in this batch will be permanently deleted',
        'Their rooms will be freed (if assigned)',
        'All bookings, swaps, and PDF history will be deleted',
      ],
      confirmLabel: 'Remove Batch',
      onConfirm: async () => {
        setLoading(true);
        try {
          await batchRemoveStudents({ programme, year: parseInt(year, 10) });
          toast.success(`Removed all ${programme} Year ${year} students.`);
          onSuccess();
          onClose();
        } catch (err) {
          toast.error(err.response?.data?.error || 'Failed to remove batch');
        } finally {
          setLoading(false);
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-rose-600" />
              Batch Removal
            </h3>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Programme</label>
              <select
                value={programme}
                onChange={(e) => setProgramme(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Programme</option>
                {programmes.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Year</label>
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Year</option>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>This will permanently remove all students in this batch. Their rooms will be freed and bookings deleted.</span>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={onClose} className="flex-1 px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-xl text-sm font-medium transition">Cancel</button>
              <button onClick={handleSubmit} disabled={loading} className="flex-1 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold transition disabled:opacity-50">
                {loading ? 'Removing...' : 'Remove Batch'}
              </button>
            </div>
          </div>
        </div>
      </div>

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
    </>
  );
};

export default BatchRemovalModal;
