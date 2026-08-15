import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Lock, Unlock, Trash2, Eye, Users, Layers, ShieldCheck, PlusCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';

const BlockCard = ({ block, hostelId, onBlockUpdated, onViewFloors, onClick }) => {
  const navigate = useNavigate();

  // If used in Allocation Rules Level 2 (HostelDetail.jsx)
  if (onClick || block.ruleCount !== undefined || block.hasRules !== undefined) {
    const hasRules = (block.ruleCount || 0) > 0;

    return (
      <div
        onClick={() => onClick ? onClick(block.block_id) : null}
        className="bg-white border-2 border-slate-200 hover:border-blue-300 rounded-2xl p-6 shadow-sm hover:shadow-md transition cursor-pointer flex flex-col justify-between"
      >
        <div>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-extrabold text-slate-900">🟦 {block.name}</h3>
            </div>
          </div>

          <div className="mt-4 text-xs font-semibold text-slate-500 space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>Rules: <span className="font-extrabold text-slate-800">{block.ruleCount || 0}</span></div>
            {hasRules ? (
              <div className="text-emerald-700 font-bold">
                {block.ruleCount} rule{block.ruleCount > 1 ? 's' : ''} assigned
              </div>
            ) : (
              <div className="text-slate-400 font-bold">
                No rules assigned
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
          <button
            onClick={(e) => { e.stopPropagation(); if (onClick) onClick(block.block_id); }}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm ${
              hasRules
                ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            {hasRules ? <ShieldCheck className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
            {hasRules ? '[ Update Rules ]' : '[ Add Rule ]'}
          </button>
        </div>
      </div>
    );
  }

  // Block Management View (/admin/blocks)
  const handleViewFloors = () => {
    if (onViewFloors) {
      onViewFloors(block);
    } else {
      const hId = hostelId || block.hostel_id;
      if (hId && block.block_id) {
        navigate(`/admin/hostels/${hId}/blocks/${block.block_id}/floors`);
      } else {
        toast.error('Hostel or Block ID missing');
      }
    }
  };

  const toggleReservation = async () => {
    try {
      await api.put(`/admin/blocks/${block.block_id}/reserve`, {
        is_reserved: !block.is_reserved
      });
      toast.success(`Block ${block.name} ${block.is_reserved ? 'unreserved' : 'reserved'}`);
      if (onBlockUpdated) onBlockUpdated();
    } catch (err) {
      toast.error('Failed to toggle reservation');
    }
  };

  const deleteBlock = async () => {
    if (!window.confirm(
      `⚠️ Delete Block ${block.name}?\n\n` +
      `This will permanently delete:\n` +
      `• All floors in this block\n` +
      `• All rooms in this block\n` +
      `• All student bookings in this block\n\n` +
      `This action cannot be undone.`
    )) return;

    try {
      await api.delete(`/admin/blocks/${block.block_id}`);
      toast.success(`Block ${block.name} deleted`);
      if (onBlockUpdated) onBlockUpdated();
    } catch (err) {
      toast.error('Failed to delete block');
    }
  };

  const { totalRooms, lockedRooms, reservedRooms, vacantRooms } = block.stats || {};

  return (
    <div className={`bg-white border-2 rounded-2xl p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between ${
      block.is_reserved ? 'border-rose-200 hover:border-rose-300' : 'border-slate-200 hover:border-blue-300'
    }`}>
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600 shrink-0" />
              <span className="text-lg font-bold text-slate-800">{block.name}</span>
            </div>
            <div className="text-xs text-slate-500 font-semibold mt-0.5">
              {block.hostel_name || 'Hostel'}
            </div>
          </div>

          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
            block.is_reserved
              ? 'bg-rose-100 text-rose-700 border-rose-200'
              : 'bg-emerald-100 text-emerald-700 border-emerald-200'
          }`}>
            {block.is_reserved ? '🔴 Reserved' : '🟢 Active'}
          </span>
        </div>

        <div className="mt-4 bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-2">
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Room Metrics</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-white p-2 rounded-lg border border-slate-100">
              <div className="text-base font-extrabold text-slate-900">{totalRooms || 0}</div>
              <div className="text-[10px] font-semibold text-slate-400 uppercase">Total</div>
            </div>
            <div className="bg-white p-2 rounded-lg border border-slate-100">
              <div className="text-base font-extrabold text-blue-600">{lockedRooms || 0}</div>
              <div className="text-[10px] font-semibold text-slate-400 uppercase">Occupied</div>
            </div>
            <div className="bg-white p-2 rounded-lg border border-slate-100">
              <div className="text-base font-extrabold text-emerald-600">{vacantRooms || 0}</div>
              <div className="text-[10px] font-semibold text-slate-400 uppercase">Vacant</div>
            </div>
          </div>

          {reservedRooms > 0 && (
            <div className="text-center text-xs text-rose-600 font-bold pt-0.5">
              ({reservedRooms} room{reservedRooms > 1 ? 's' : ''} reserved)
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5 border-t border-slate-100 pt-3">
        <button
          onClick={() => onViewFloors ? onViewFloors(block) : (onClick ? onClick(block.block_id) : null)}
          className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 transition flex items-center gap-1 text-slate-700 shadow-sm"
        >
          <Eye className="w-3.5 h-3.5 text-blue-600" /> View
        </button>

        <button
          onClick={() => window.location.href = `/admin/floors?blockId=${block.block_id}`}
          className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition flex items-center gap-1 shadow-sm"
        >
          <Layers className="w-3.5 h-3.5 text-emerald-600" /> Manage Floors
        </button>

        <button
          onClick={toggleReservation}
          className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition flex items-center gap-1 ${
            block.is_reserved
              ? 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
              : 'border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100'
          }`}
        >
          {block.is_reserved ? <Unlock className="w-3.5 h-3.5 text-emerald-600" /> : <Lock className="w-3.5 h-3.5 text-amber-600" />}
          {block.is_reserved ? 'Unreserve' : 'Reserve'}
        </button>

        <button
          onClick={deleteBlock}
          className="p-1.5 text-xs font-semibold rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition flex items-center gap-1 ml-auto"
          title="Delete Block"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default BlockCard;
