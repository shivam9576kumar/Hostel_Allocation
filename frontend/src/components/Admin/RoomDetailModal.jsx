import React, { useState, useEffect } from 'react';
import { X, Users, User, ShieldCheck, UserCog } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import ManageOccupantsModal from './ManageOccupantsModal';

const formatRoomNumber = (num) => {
  if (num === undefined || num === null) return '';
  return String(num).padStart(3, '0');
};

const RoomDetailModal = ({ isOpen, onClose, roomId, onRefresh }) => {
  const [room, setRoom] = useState(null);
  const [occupants, setOccupants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [manageModalOpen, setManageModalOpen] = useState(false);

  useEffect(() => {
    if (isOpen && roomId) {
      fetchRoomDetails();
    }
  }, [isOpen, roomId]);

  const fetchRoomDetails = async () => {
    setLoading(true);
    try {
      const [roomRes, occRes] = await Promise.all([
        api.get(`/admin/rooms/${roomId}`),
        api.get(`/admin/rooms/${roomId}/occupants`)
      ]);
      setRoom(roomRes.data.room);
      setOccupants(occRes.data.occupants || roomRes.data.room?.Students || []);
    } catch (err) {
      toast.error('Failed to load room details');
    } finally {
      setLoading(false);
    }
  };

  const handleSubModalRefresh = async () => {
    await fetchRoomDetails();
    if (onRefresh) onRefresh();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-white rounded-3xl max-w-md w-full max-h-[90vh] overflow-hidden shadow-2xl border border-slate-100 flex flex-col" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center font-bold">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">
                  Room {formatRoomNumber(room?.room_number)}
                </h3>
                <p className="text-xs text-slate-500 font-mono">ID: #{room?.room_id}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-200/60 rounded-xl transition text-slate-400 hover:text-slate-700">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            {loading ? (
              <div className="text-center py-12 text-slate-400 font-medium animate-pulse">Loading room occupants...</div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs">
                  <div>
                    <span className="text-slate-400 uppercase tracking-wider font-bold block text-[10px]">Occupancy</span>
                    <span className="font-extrabold text-slate-800 text-sm">{occupants.length} / {room?.capacity || 2}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase tracking-wider font-bold block text-[10px]">Status</span>
                    <span className="font-extrabold text-blue-600 text-sm">{room?.status?.replace('_', ' ') || 'Vacant'}</span>
                  </div>
                </div>

                {occupants.length > 0 ? (
                  <div className="space-y-2.5">
                    <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-blue-600" /> Assigned Students ({occupants.length})
                    </h4>
                    {occupants.map((student) => (
                      <div key={student.roll_number} className="flex items-center justify-between bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center">
                            <User className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900">{student.full_name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{student.roll_number} • {student.programme} ({student.year})</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-xs text-slate-400 py-8 font-medium bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    No students currently assigned to this room.
                  </div>
                )}

                <button
                  onClick={() => setManageModalOpen(true)}
                  className="w-full mt-4 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold transition shadow-md flex items-center justify-center gap-2"
                >
                  <UserCog className="w-4 h-4" /> Manage Occupants
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <ManageOccupantsModal
        isOpen={manageModalOpen}
        onClose={() => setManageModalOpen(false)}
        roomId={roomId}
        onRefresh={handleSubModalRefresh}
      />
    </>
  );
};

export default RoomDetailModal;
