// frontend/src/components/Admin/StudentProfileModal.jsx

import React, { useState, useEffect } from 'react';
import { X, User, Trash2, Archive, Edit, RefreshCw, Lock, Settings } from 'lucide-react';
import toast from 'react-hot-toast';
import { getStudentProfile, archiveStudent, unarchiveStudent } from '../../api/students';
import api from '../../api/axios';
import StudentHistoryTabs from './StudentHistoryTabs';
import ConfirmDialog from '../Common/ConfirmDialog';
import AssignRoomModal from './AssignRoomModal';
import ManageRoomModal from './ManageRoomModal';

const StudentProfileModal = ({ rollNumber, onClose, onRefresh }) => {
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [manageRoomModalOpen, setManageRoomModalOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    type: 'warning',
    title: '',
    message: '',
    details: [],
    confirmLabel: 'Confirm',
    onConfirm: () => {},
  });

  useEffect(() => {
    fetchProfile();
  }, [rollNumber]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await getStudentProfile(rollNumber);
      setStudent(res.data.student);
    } catch (err) {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleManageRoom = () => {
    if (!student?.booked_room_id) {
      toast.error('This student is not assigned to any room.');
      return;
    }
    setManageRoomModalOpen(true);
  };

  const handleArchive = () => {
    setConfirmDialog({
      isOpen: true,
      type: 'warning',
      title: 'Archive Student',
      message: `Are you sure you want to archive ${student.full_name} (${student.roll_number})?`,
      details: [
        'Mark the student as "archived" (soft delete)',
        'Free their room (if assigned)',
        'Keep their history (bookings, swaps, PDFs)',
        'Remove them from the active roster',
      ],
      confirmLabel: 'Archive Student',
      onConfirm: async () => {
        try {
          await archiveStudent(rollNumber);
          toast.success('Student archived successfully');
          if (onRefresh) onRefresh();
          onClose();
        } catch (err) {
          toast.error(err.response?.data?.error || 'Failed to archive');
        }
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleUnarchive = () => {
    setConfirmDialog({
      isOpen: true,
      type: 'info',
      title: 'Unarchive Student',
      message: `Restore ${student.full_name} (${student.roll_number}) to active status?`,
      details: [
        'Student will reappear in the active roster',
        'Their room assignment will remain unchanged',
        'All history will be preserved',
      ],
      confirmLabel: 'Restore Student',
      onConfirm: async () => {
        try {
          await unarchiveStudent(rollNumber);
          toast.success('Student restored successfully');
          if (onRefresh) onRefresh();
          onClose();
        } catch (err) {
          toast.error(err.response?.data?.error || 'Failed to restore student');
        }
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleDelete = () => {
    setConfirmDialog({
      isOpen: true,
      type: 'danger',
      title: 'Delete Student',
      message: `Permanently delete ${student.full_name} (${student.roll_number})?`,
      details: [
        '⚠️ This action CANNOT be undone',
        'All bookings, swaps, and PDF history will be deleted',
        'Their room will be freed (if assigned)',
        'The student will be completely removed from the system',
      ],
      confirmLabel: 'Delete Permanently',
      onConfirm: async () => {
        try {
          await api.delete(`/admin/students/${rollNumber}`);
          toast.success('Student deleted');
          if (onRefresh) onRefresh();
          onClose();
        } catch (err) {
          toast.error('Failed to delete');
        }
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      },
    });
  };

  if (loading || !student) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-8 text-slate-400 font-semibold">Loading profile...</div>
      </div>
    );
  }

  const { ProgramCode } = student;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between p-6 border-b border-slate-200">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              Student Profile
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            {/* Basic Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div><span className="text-xs text-slate-500">Roll Number</span><p className="font-bold">{student.roll_number}</p></div>
              <div><span className="text-xs text-slate-500">Full Name</span><p className="font-bold">{student.full_name}</p></div>
              <div><span className="text-xs text-slate-500">Email</span><p className="text-sm">{student.email}</p></div>
              <div><span className="text-xs text-slate-500">Gender</span><p>{student.gender}</p></div>
              <div><span className="text-xs text-slate-500">Programme</span><p>{student.programme}</p></div>
              <div><span className="text-xs text-slate-500">Year</span><p>{student.year} ({student.admission_year || 'N/A'})</p></div>
              <div><span className="text-xs text-slate-500">Department</span><p>{student.department || 'N/A'}</p></div>
              <div><span className="text-xs text-slate-500">Status</span>
                <span className={`ml-2 px-2.5 py-0.5 rounded-full text-xs font-medium ${student.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  {student.status || 'active'}
                </span>
              </div>
              <div><span className="text-xs text-slate-500">Hostel Stay</span><p>{ProgramCode?.hostel_stay || 'N/A'} years</p></div>
              <div><span className="text-xs text-slate-500">Hostel Stay End</span><p>{student.hostel_stay_end_year || 'N/A'}</p></div>
              <div><span className="text-xs text-slate-500">Room</span><p>{student.BookedRoom?.room_number ? String(student.BookedRoom.room_number).padStart(3, '0') : 'Unassigned'}</p></div>
              <div><span className="text-xs text-slate-500">Booking Status</span><p>{student.booking_status || 'Pending'}</p></div>
            </div>

            {/* History Tabs */}
            <StudentHistoryTabs rollNumber={rollNumber} />

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-200">
              {student.booked_room_id ? (
                <button
                  onClick={handleManageRoom}
                  disabled={!student.booked_room_id}
                  className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl text-sm font-bold transition flex items-center gap-2 border border-amber-200 shadow-sm disabled:opacity-50"
                >
                  <Settings className="w-4 h-4" /> Manage Room {student.BookedRoom ? `(${String(student.BookedRoom.room_number).padStart(3, '0')})` : ''}
                </button>
              ) : (
                <button
                  onClick={() => setAssignModalOpen(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition flex items-center gap-2 shadow-sm"
                >
                  <Edit className="w-4 h-4" /> Assign Room
                </button>
              )}

              {student.status === 'archived' ? (
                <button
                  onClick={handleUnarchive}
                  className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-sm font-medium transition flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" /> Unarchive
                </button>
              ) : (
                <button
                  onClick={handleArchive}
                  className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl text-sm font-medium transition flex items-center gap-2"
                >
                  <Archive className="w-4 h-4" /> Archive
                </button>
              )}

              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-sm font-medium transition flex items-center gap-2 ml-auto"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </div>
          </div>
        </div>
      </div>

      {assignModalOpen && (
        <AssignRoomModal
          student={student}
          onClose={() => setAssignModalOpen(false)}
          onSuccess={(data) => {
            fetchProfile();
            if (onRefresh) onRefresh();
            if (data?.isFull) {
              toast.success('Room fully occupied! All assigned students are now locked.');
            }
          }}
        />
      )}

      {manageRoomModalOpen && student?.booked_room_id && (
        <ManageRoomModal
          roomId={student.booked_room_id}
          onClose={() => setManageRoomModalOpen(false)}
          onRefresh={() => {
            fetchProfile();
            if (onRefresh) onRefresh();
          }}
        />
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
    </>
  );
};

export default StudentProfileModal;
