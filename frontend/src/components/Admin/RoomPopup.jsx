import React, { useState, useEffect } from 'react';
import { X, User, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';

const RoomPopup = ({ roomId, roomNumber, onClose }) => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOccupants();
  }, [roomId]);

  const fetchOccupants = async () => {
    try {
      const res = await api.get(`/admin/rooms/${roomId}/occupants`);
      setStudents(res.data.occupants || []);
    } catch (err) {
      toast.error('Failed to load room occupants');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-md w-full text-center text-slate-400">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-md w-full max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" />
            Room {roomNumber} – Occupants
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {students.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">No students assigned to this room.</p>
        ) : (
          <div className="space-y-3">
            {students.map((student) => (
              <div key={student.roll_number} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold">
                    {student.full_name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">{student.full_name}</p>
                    <p className="text-xs text-slate-400 font-mono">Roll: {student.roll_number}</p>
                    <p className="text-xs text-slate-500">{student.programme} - Year {student.year} | {student.gender}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-xl text-sm font-medium">Close</button>
        </div>
      </div>
    </div>
  );
};

export default RoomPopup;
