import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import BlockCard from './BlockCard';

const HostelDetail = () => {
  const { hostelId } = useParams();
  const navigate = useNavigate();

  const [hostel, setHostel] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [hostelId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const hostelRes = await api.get(`/admin/hostels/${hostelId}`);
      setHostel(hostelRes.data.hostel);

      const blocksRes = await api.get(`/admin/blocks?hostelId=${hostelId}`);
      const blockList = blocksRes.data.blocks || [];

      // Fetch rules for each block
      const blockData = await Promise.all(
        blockList.map(async (block) => {
          const rulesRes = await api.get(`/admin/allocation-rules?blockId=${block.block_id}`);
          const rules = rulesRes.data.rules || [];

          return {
            ...block,
            rules,
            ruleCount: rules.length,
            hasRules: rules.length > 0,
            programmes: [...new Set(rules.map(r => r.programme))],
            floorRanges: rules.map(r => `${r.floor_start}-${r.floor_end}`),
          };
        })
      );

      setBlocks(blockData);
    } catch (err) {
      toast.error('Failed to fetch hostel details');
    } finally {
      setLoading(false);
    }
  };

  const handleBlockClick = (blockId) => {
    navigate(`/admin/allocation-rules/hostels/${hostelId}/blocks/${blockId}`);
  };

  const goBack = () => {
    navigate('/admin/allocation-rules');
  };

  const stats = {
    total: blocks.length,
    configured: blocks.filter(b => b.hasRules).length,
    needsSetup: blocks.filter(b => !b.hasRules).length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button
            onClick={goBack}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1 mb-2"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Hostels
          </button>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-blue-600" />
            🏠 {hostel?.name || 'Hostel'} Hostel
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Level 2: Select a block to configure allocation rules.
          </p>
        </div>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Stats Summary Bar */}
      <div className="flex flex-wrap gap-4">
        <div className="bg-white rounded-xl border border-slate-200 px-4 py-2 shadow-sm text-xs font-bold text-slate-700">
          Blocks: <span className="text-blue-600 font-extrabold text-sm ml-1">{stats.total}</span>
        </div>
        <div className="bg-emerald-50 rounded-xl border border-emerald-200 px-4 py-2 shadow-sm text-xs font-bold text-emerald-800">
          Rules Configured: <span className="font-extrabold text-sm ml-1">{stats.configured}</span>
        </div>
        <div className="bg-amber-50 rounded-xl border border-amber-200 px-4 py-2 shadow-sm text-xs font-bold text-amber-800">
          Needs Setup: <span className="font-extrabold text-sm ml-1">{stats.needsSetup}</span>
        </div>
      </div>

      {/* Block Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm animate-pulse h-44"></div>
          ))}
        </div>
      ) : blocks.length === 0 ? (
        <div className="text-center py-12 text-slate-400 font-medium bg-white rounded-2xl border border-slate-200">
          No blocks found in this hostel.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {blocks.map((block) => (
            <BlockCard
              key={block.block_id}
              block={block}
              onClick={handleBlockClick}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default HostelDetail;
