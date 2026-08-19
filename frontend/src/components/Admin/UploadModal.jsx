// frontend/src/components/Admin/UploadModal.jsx

import React, { useState } from 'react';
import { X, Upload, FileSpreadsheet, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { uploadStudents } from '../../api/students';

const UploadModal = ({ onClose, onSuccess }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;
    setFile(selected);
    // Parse and preview
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(firstSheet);
        setPreview(json.slice(0, 5)); // show first 5 rows
      } catch (err) {
        toast.error('Invalid file format');
      }
    };
    reader.readAsArrayBuffer(selected);
  };

  const handleUpload = async () => {
    if (!file) return toast.error('Please select a file');
    const formData = new FormData();
    formData.append('file', file);
    setLoading(true);
    try {
      await uploadStudents(formData);
      toast.success('Students uploaded successfully');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-600" />
            Upload Student Data
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-slate-50 transition">
            <FileSpreadsheet className="w-12 h-12 text-slate-400 mx-auto mb-2" />
            <p className="text-sm text-slate-600">Select or drag & drop CSV / Excel file</p>
            <p className="text-xs text-slate-400">Accept .csv, .xlsx files</p>
            <input
              type="file"
              accept=".csv,.xlsx"
              onChange={handleFileChange}
              className="mt-3 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          {preview.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-slate-700 mb-2">Preview (first 5 rows)</h4>
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50">
                    <tr>
                      {Object.keys(preview[0]).map(k => <th key={k} className="px-3 py-2 text-left font-semibold text-slate-600">{k}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className="border-t border-slate-100">
                        {Object.values(row).map((val, j) => <td key={j} className="px-3 py-2 text-slate-700">{String(val)}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-700 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>Required columns: RollNumber, FullName, Email, Gender, Programme, Year. Duplicates will be skipped.</span>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-xl text-sm font-medium transition">Cancel</button>
            <button onClick={handleUpload} disabled={loading || !file} className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition disabled:opacity-50">
              {loading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadModal;
