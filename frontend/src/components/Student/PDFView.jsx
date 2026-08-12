import React, { useState, useEffect } from 'react';
import { Download, FileCheck, CheckCircle2, Building, Users, Calendar, Award } from 'lucide-react';
import api from '../../api/axios';
import { getSwapActive } from '../../api/swap';
import SwapButton from './SwapButton';
import SwapModal from './SwapModal';
import SwapConsentCard from './SwapConsentCard';

const PDFView = ({ student, onLogout }) => {
  const [downloading, setDownloading] = useState(false);
  const [swapActive, setSwapActive] = useState(false);
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);

  useEffect(() => {
    checkSwapStatus();
  }, []);

  const checkSwapStatus = async () => {
    try {
      const res = await getSwapActive();
      setSwapActive(res.data.swapActive);
    } catch (err) {
      console.error('Failed to check swap status:', err);
    }
  };

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const response = await api.get('/student/pdf', { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Hostel_Allocation_${student.roll_number}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to download PDF certificate. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const room = student?.BookedRoom;
  const floor = room?.Floor;
  const block = floor?.Block;
  const hostel = block?.Hostel;

  const isSwapGenerated = student?.pdfInfo?.isSwap || (student?.pdfInfo?.version > 1);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center items-center px-4 py-12">
      <div className="max-w-2xl w-full bg-slate-800 rounded-3xl border border-slate-700/80 shadow-2xl p-8 md:p-10 relative space-y-6">

        {/* Status Badge */}
        <div className="flex items-center justify-between pb-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center border border-emerald-500/30">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-widest block">
                Status: Locked & Confirmed {student?.pdfInfo?.version ? `(v${student.pdfInfo.version})` : ''}
              </span>
              <h1 className="text-xl font-bold text-white">Hostel Room Allocation Certificate</h1>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="text-xs text-slate-400 hover:text-white px-3 py-2 bg-slate-700/60 hover:bg-slate-700 rounded-xl transition"
          >
            Sign Out
          </button>
        </div>

        {/* Swap Alert Banner */}
        {isSwapGenerated && (
          <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-2">
            <span>⚠️ This allocation certificate has been updated due to a room swap (Version {student?.pdfInfo?.version || 2}).</span>
          </div>
        )}

        {/* Certificate Mock Card */}
        <div className="bg-slate-900/90 rounded-2xl p-6 border border-slate-700/70 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-blue-400 text-sm font-semibold">
              <Award className="w-5 h-5" />
              <span>Official Allocation Certificate</span>
            </div>
            <span className="text-xs text-slate-500 font-mono">ID: HAS-{(student.roll_number + '2026').slice(-8)}</span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm bg-slate-800/60 p-4 rounded-xl border border-slate-700/50">
            <div>
              <span className="text-xs text-slate-400 font-medium block">Allottee Name</span>
              <span className="font-bold text-white text-base">{student.full_name}</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 font-medium block">Roll Number</span>
              <span className="font-bold text-blue-400 text-base">{student.roll_number}</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 font-medium block">Programme & Year</span>
              <span className="font-semibold text-slate-200">{student.programme} (Year {student.year})</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 font-medium block">Gender</span>
              <span className="font-semibold text-slate-200">{student.gender}</span>
            </div>
          </div>

          {/* Allocation Room Grid Info */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-800 p-3 rounded-xl border border-slate-700 text-center">
              <span className="text-[11px] text-slate-400 block font-medium">Hostel</span>
              <span className="font-bold text-slate-100 text-sm">{hostel?.name || 'Assigned Hostel'}</span>
            </div>
            <div className="bg-slate-800 p-3 rounded-xl border border-slate-700 text-center">
              <span className="text-[11px] text-slate-400 block font-medium">Block</span>
              <span className="font-bold text-slate-100 text-sm">{block?.name || 'Assigned Block'}</span>
            </div>
            <div className="bg-slate-800 p-3 rounded-xl border border-slate-700 text-center">
              <span className="text-[11px] text-slate-400 block font-medium">Floor</span>
              <span className="font-bold text-slate-100 text-sm">Floor {floor?.floor_number || 1}</span>
            </div>
            <div className="bg-slate-800 p-3 rounded-xl border border-slate-700 text-center">
              <span className="text-[11px] text-slate-400 block font-medium">Room No.</span>
              <span className="font-bold text-emerald-400 text-base">{room?.room_number || 'Room'}</span>
            </div>
          </div>
        </div>

        {/* Swap Activity Section */}
        {swapActive && (
          <div className="bg-slate-800/90 rounded-2xl p-6 border border-slate-700/80 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-amber-400">Room Swap Window Active</h3>
                <p className="text-xs text-slate-400">You can request or respond to room exchange proposals.</p>
              </div>
              <SwapButton onClick={() => setIsSwapModalOpen(true)} />
            </div>

            <SwapConsentCard studentRoll={student.roll_number} onUpdate={() => window.location.reload()} />
          </div>
        )}

        {/* Download Button */}
        <button
          onClick={handleDownloadPDF}
          disabled={downloading}
          className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-2xl shadow-xl shadow-blue-600/30 transition flex items-center justify-center gap-3 text-base disabled:opacity-50"
        >
          <Download className="w-5 h-5" />
          {downloading ? 'Generating Official PDF...' : 'Download Official Allocation PDF'}
        </button>

        {/* Swap Request Modal */}
        <SwapModal
          isOpen={isSwapModalOpen}
          onClose={() => setIsSwapModalOpen(false)}
          onSuccess={() => window.location.reload()}
        />

      </div>
    </div>
  );
};

export default PDFView;
