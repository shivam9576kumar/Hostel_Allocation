import React, { useState, useEffect } from 'react';
import { X, CheckSquare, Square, Trash2, UserCog, UserCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';

const ManageOccupantsModal = ({ isOpen, onClose, roomId, onRefresh }) => {
  const [occupants, setOccupants] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && roomId) {
      fetchOccupants();
    }
  }, [isOpen, roomId]);

  const fetchOccupants = async () => {
    try {
      const res = await api.get(`/admin/rooms/${roomId}/occupants`);
      setOccupants(res.data.occupants || []);
    } catch (err) {
      toast.error('Failed to load occupants');
    }
  };

  const toggleSelect = (roll) => {
    setSelected(prev =>
      prev.includes(roll) ? prev.filter(r => r !== roll) : [...prev, roll]
    );
  };

  const handleRemoveSelected = async () => {
    if (selected.length === 0) return toast.error('Select at least one student.');
    if (!window.confirm(`Remove ${selected.length} student(s) from this room?`)) return;
    setLoading(true);
    try {
      await api.post(`/admin/rooms/${roomId}/release`, {
        studentRolls: selected,
        clearAll: false
      });
      toast.success(`${selected.length} student(s) released successfully`);
      setSelected([]);
      await fetchOccupants();
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to release students');
    } finally {
      setLoading(false);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Remove ALL students from this room?')) return;
    setLoading(true);
    try {
      await api.post(`/admin/rooms/${roomId}/release`, {
        studentRolls: [],
        clearAll: true
      });
      toast.success('Room cleared successfully');
      setSelected([]);
      await fetchOccupants();
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to clear room');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-[70] p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl max-w-md w-full max-h-[85vh] overflow-hidden shadow-2xl border border-slate-100 flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center">
              <UserCog className="w-5 h-5" />
            </div>
            <h4 className="font-extrabold text-slate-900 text-base">Manage Room Occupants</h4>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-200/60 rounded-xl transition text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {occupants.length === 0 ? (
            <div className="text-center text-xs text-slate-400 py-8 font-semibold bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              No occupants currently assigned to this room.
            </div>
          ) : (
            <div className="space-y-2">
              {occupants.map((student) => (
                <div key={student.roll_number} className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-blue-300 transition">
                  <button onClick={() => toggleSelect(student.roll_number)} className="text-slate-400 hover:text-blue-600 transition">
                    {selected.includes(student.roll_number) ? <CheckSquare className="w-5 h-5 text-blue-600" /> : <Square className="w-5 h-5 text-slate-300" />}
                  </button>
                  <div className="flex-1">
                    <div className="text-xs font-bold text-slate-900">{student.full_name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{student.roll_number} • {student.programme}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center gap-2">
          <button
            onClick={handleRemoveSelected}
            disabled={loading || selected.length === 0}
            className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 shadow-sm flex items-center justify-center gap-1.5"
          >
            <UserCheck className="w-4 h-4" /> Remove Selected ({selected.length})
          </button>
          <button
            onClick={handleClearAll}
            disabled={loading || occupants.length === 0}
            className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold transition border border-rose-200 disabled:opacity-50 flex items-center gap-1.5"
          >
            <Trash2 className="w-4 h-4" /> Clear All
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManageOccupantsModal;
