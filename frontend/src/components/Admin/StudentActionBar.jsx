// frontend/src/components/Admin/StudentActionBar.jsx

import React, { useState } from 'react';
import { CheckSquare, Square, Download, Upload, Trash2, Archive, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmDialog from '../Common/ConfirmDialog';

const StudentActionBar = ({
  selectedCount,
  totalCount,
  onSelectAll,
  onBulkRemove,
  onBulkArchive,
  onBatchRemove,
  onExport,
  onUpload,
}) => {
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    type: 'warning',
    title: '',
    message: '',
    details: [],
    confirmLabel: 'Confirm',
    onConfirm: () => {},
  });

  const handleBulkRemoveClick = () => {
    if (selectedCount === 0) return toast.error('Select at least one student.');
    setConfirmDialog({
      isOpen: true,
      type: 'danger',
      title: 'Remove Selected Students',
      message: `Are you sure you want to remove ${selectedCount} selected student(s)?`,
      details: [
        '⚠️ This action CANNOT be undone',
        'All bookings and history will be deleted',
        'Their rooms will be freed (if assigned)',
        'Students will be completely removed from the system',
      ],
      confirmLabel: 'Remove Permanently',
      onConfirm: () => {
        onBulkRemove();
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleBulkArchiveClick = () => {
    if (selectedCount === 0) return toast.error('Select at least one student.');
    setConfirmDialog({
      isOpen: true,
      type: 'warning',
      title: 'Archive Selected Students',
      message: `Are you sure you want to archive ${selectedCount} selected student(s)?`,
      details: [
        'Students will be marked as "archived"',
        'They will be removed from the active roster',
        'All history will be preserved',
        'They can be restored later',
      ],
      confirmLabel: 'Archive Students',
      onConfirm: () => {
        onBulkArchive();
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      },
    });
  };

  return (
    <>
      <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-sm flex flex-wrap items-center gap-3">
        <button
          onClick={onSelectAll}
          className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition"
        >
          {selectedCount === totalCount && totalCount > 0 ? (
            <CheckSquare className="w-4 h-4 text-blue-600" />
          ) : (
            <Square className="w-4 h-4" />
          )}
          {selectedCount === totalCount && totalCount > 0 ? 'Deselect All' : 'Select All'} ({selectedCount}/{totalCount})
        </button>

        {selectedCount > 0 && (
          <>
            <span className="text-slate-300">|</span>
            <button
              onClick={handleBulkRemoveClick}
              className="flex items-center gap-1.5 text-sm font-medium text-rose-600 hover:text-rose-800 transition"
            >
              <Trash2 className="w-4 h-4" /> Remove Selected
            </button>
            <button
              onClick={handleBulkArchiveClick}
              className="flex items-center gap-1.5 text-sm font-medium text-amber-600 hover:text-amber-800 transition"
            >
              <Archive className="w-4 h-4" /> Archive Selected
            </button>
          </>
        )}

        <span className="text-slate-300">|</span>
        <button
          onClick={onBatchRemove}
          className="flex items-center gap-1.5 text-sm font-medium text-rose-600 hover:text-rose-800 transition"
        >
          <Users className="w-4 h-4" /> Batch Remove
        </button>

        <div className="ml-auto flex gap-2">
          <button
            onClick={onExport}
            className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-xs font-medium transition flex items-center gap-1"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
          <button
            onClick={onUpload}
            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-medium transition flex items-center gap-1"
          >
            <Upload className="w-3.5 h-3.5" /> + Upload
          </button>
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

export default StudentActionBar;
