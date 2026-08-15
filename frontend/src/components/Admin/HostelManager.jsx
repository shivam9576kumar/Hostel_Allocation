import React, { useState, useEffect } from 'react';
import { Building2, RefreshCw, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import HostelCard from './HostelCard';
import HostelPopup from './HostelPopup';
import AddHostelModal from './AddHostelModal';

const HostelManager = () => {
  const [hostels, setHostels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedHostelId, setSelectedHostelId] = useState(null);
  const [popupOpen, setPopupOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);

  useEffect(() => {
    fetchHostels();
  }, []);

  const fetchHostels = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/hostels');
      setHostels(res.data.hostels || []);
    } catch (err) {
      toast.error('Failed to fetch hostels');
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = (hostelId) => {
    setSelectedHostelId(hostelId);
    setPopupOpen(true);
  };

  const handleAddHostel = async (name) => {
    try {
      await api.post('/admin/hostels', { name });
      toast.success(`Hostel "${name}" created`);
      fetchHostels();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create hostel');
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-blue-600" />
            Hostel Management
          </h1>
          <p className="text-sm text-slate-500">
            Create hostels by entering their name. Block, floor, and room hierarchy are configured within each hostel.
          </p>
        </div>
        <button
          onClick={fetchHostels}
          className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-medium transition flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-4">
        <div className="bg-white rounded-xl border border-slate-200 px-4 py-2 shadow-sm text-sm">
          Total Hostels: <span className="font-bold">{hostels.length}</span>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 px-4 py-2 shadow-sm text-sm">
          Total Blocks: <span className="font-bold">{hostels.reduce((acc, h) => acc + (h.blockCount || 0), 0)}</span>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm animate-pulse h-44"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {hostels.map((hostel) => (
            <HostelCard
              key={hostel.hostel_id}
              hostel={hostel}
              onClick={handleCardClick}
              onRefresh={fetchHostels}
            />
          ))}
          {/* Empty Card */}
          <div
            onClick={() => setAddModalOpen(true)}
            className="bg-white border-2 border-dashed border-slate-300 rounded-2xl p-6 shadow-sm hover:bg-slate-50 transition cursor-pointer flex flex-col items-center justify-center min-h-[170px]"
          >
            <Plus className="w-12 h-12 text-slate-300 mb-2" />
            <span className="text-sm font-medium text-slate-500">Create Hostel</span>
            <span className="text-xs text-slate-400">Click to add</span>
          </div>
        </div>
      )}

      {/* Popups */}
      {popupOpen && selectedHostelId && (
        <HostelPopup
          hostelId={selectedHostelId}
          onClose={() => setPopupOpen(false)}
        />
      )}
      {addModalOpen && (
        <AddHostelModal
          onClose={() => setAddModalOpen(false)}
          onSuccess={handleAddHostel}
        />
      )}
    </div>
  );
};

export default HostelManager;
