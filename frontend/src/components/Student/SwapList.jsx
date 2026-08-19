import React, { useState, useEffect } from 'react';
import { RefreshCw, ArrowLeftRight } from 'lucide-react';
import { getStudentSwapRequests } from '../../api/swap';
import SwapRequestCard from './SwapRequestCard';

const SwapList = ({ currentUserRoll, onUpdate }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    try {
      const res = await getStudentSwapRequests();
      setRequests(res.data.swapRequests || []);
    } catch (err) {
      console.error('Error fetching swap requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    const interval = setInterval(fetchRequests, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleUpdate = () => {
    fetchRequests();
    if (onUpdate) onUpdate();
  };

  if (loading && requests.length === 0) {
    return <div className="animate-pulse text-xs text-slate-400 py-4 text-center">Loading room swap requests...</div>;
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-6 text-xs text-slate-500 border border-slate-200 rounded-xl bg-white p-4">
        <ArrowLeftRight className="w-6 h-6 mx-auto text-slate-300 mb-1" />
        No active swap proposals found.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <ArrowLeftRight className="w-3.5 h-3.5 text-amber-500" />
          Active Swap Requests ({requests.length})
        </h4>
        <button
          onClick={fetchRequests}
          className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 font-medium"
        >
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>

      {requests.map((req) => (
        <SwapRequestCard
          key={req.id}
          request={req}
          currentUserRoll={currentUserRoll}
          onUpdate={handleUpdate}
        />
      ))}
    </div>
  );
};

export default SwapList;
