import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, RefreshCw, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import HostelCard from './HostelCard';

const AllocationRulesManager = () => {
  const navigate = useNavigate();
  const [hostels, setHostels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchHostels();
  }, []);

  const fetchHostels = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/hostels');
      const hostelList = res.data.hostels || [];

      // For each hostel, calculate block count, rules count
      const hostelData = await Promise.all(
        hostelList.map(async (hostel) => {
          const blocksRes = await api.get(`/admin/blocks?hostelId=${hostel.hostel_id}`);
          const blocks = blocksRes.data.blocks || [];

          let totalRules = 0;
          for (const block of blocks) {
            const rulesRes = await api.get(`/admin/allocation-rules?blockId=${block.block_id}`);
            const rules = rulesRes.data.rules || [];
            totalRules += rules.length;
          }

          return {
            ...hostel,
            blocks: blocks.length,
            rules: totalRules
          };
        })
      );

      setHostels(hostelData);
    } catch (err) {
      toast.error('Failed to fetch hostel allocation data');
    } finally {
      setLoading(false);
    }
  };

  const handleHostelClick = (hostelId) => {
    navigate(`/admin/allocation-rules/hostels/${hostelId}`);
  };

  const filteredHostels = hostels.filter(h =>
    h.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: hostels.length,
    configured: hostels.filter(h => h.rules > 0).length,
    needsSetup: hostels.filter(h => h.rules === 0).length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-blue-600" />
            📋 Allocation Rules Manager
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage programme, year, block, floor, gender, and capacity eligibility.
          </p>
        </div>
        <button
          onClick={fetchHostels}
          className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Stats Summary Bar */}
      <div className="flex flex-wrap gap-4">
        <div className="bg-white rounded-xl border border-slate-200 px-4 py-2 shadow-sm text-xs font-bold text-slate-700">
          Total: <span className="text-blue-600 font-extrabold text-sm ml-1">{stats.total}</span>
        </div>
        <div className="bg-emerald-50 rounded-xl border border-emerald-200 px-4 py-2 shadow-sm text-xs font-bold text-emerald-800">
          Rules Configured: <span className="font-extrabold text-sm ml-1">{stats.configured}</span>
        </div>
        <div className="bg-amber-50 rounded-xl border border-amber-200 px-4 py-2 shadow-sm text-xs font-bold text-amber-800">
          Needs Setup: <span className="font-extrabold text-sm ml-1">{stats.needsSetup}</span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search hostels..."
          className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
      </div>

      {/* Hostel Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm animate-pulse h-44"></div>
          ))}
        </div>
      ) : filteredHostels.length === 0 ? (
        <div className="text-center py-12 text-slate-400 font-medium bg-white rounded-2xl border border-slate-200 shadow-sm">
          No hostels found.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredHostels.map((hostel) => (
            <HostelCard
              key={hostel.hostel_id}
              hostel={hostel}
              onClick={handleHostelClick}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default AllocationRulesManager;
