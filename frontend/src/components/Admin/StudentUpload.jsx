import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Upload, FileSpreadsheet, CheckCircle, AlertTriangle, Search, Filter, RefreshCw, UserCheck } from 'lucide-react';
import StudentDashboard from './StudentDashboard';

const StudentUpload = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [error, setError] = useState(null);

  // Student Search & Filter Controls (with "Select All" / ALL)
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGender, setFilterGender] = useState('ALL');
  const [filterProgramme, setFilterProgramme] = useState('ALL');
  const [filterYear, setFilterYear] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const currentFilters = {
    search: searchTerm,
    gender: filterGender,
    programme: filterProgramme,
    year: filterYear,
    status: filterStatus
  };

  const fetchStudents = async () => {
    setLoadingStudents(true);
    try {
      const res = await api.get('/admin/students', {
        params: {
          search: searchTerm,
          gender: filterGender,
          programme: filterProgramme,
          year: filterYear,
          status: filterStatus
        }
      });
      setStudents(res.data.students || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStudents(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [searchTerm, filterGender, filterProgramme, filterYear, filterStatus]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a CSV or Excel file.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    setError(null);
    setUploadResult(null);

    try {
      const res = await api.post('/admin/upload-students', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUploadResult(res.data.result);
      setFile(null);
      fetchStudents();
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Upload Widget */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <h2 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
          <Upload className="w-5 h-5 text-amber-500" />
          Bulk Student Data Upload (CSV / Excel)
        </h2>
        <p className="text-xs text-slate-500 mb-6">
          Required Columns: <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-slate-700">RollNumber, FullName, Email, Gender, Programme, Year</code>. Duplicates will be skipped automatically.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleUpload} className="space-y-4">
          <div className="border-2 border-dashed border-slate-300 hover:border-amber-500 rounded-2xl p-6 text-center transition bg-slate-50">
            <FileSpreadsheet className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <span className="text-sm font-semibold text-slate-700 block">
              {file ? file.name : 'Select or drag & drop student CSV / Excel file'}
            </span>
            <span className="text-xs text-slate-400 block mt-1">Accepts .csv, .xlsx files</span>

            <input
              type="file"
              accept=".csv, .xlsx, .xls"
              onChange={(e) => setFile(e.target.files[0])}
              className="mt-4 text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-amber-100 file:text-amber-800 hover:file:bg-amber-200 cursor-pointer"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={uploading || !file}
              className="py-2.5 px-6 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-xl shadow-md transition text-sm disabled:opacity-50 flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              {uploading ? 'Processing File...' : 'Upload Roster Data'}
            </button>
          </div>
        </form>

        {/* Upload Summary Output */}
        {uploadResult && (
          <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              Upload Processing Report
            </h3>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-center">
                <span className="text-slate-400 block">Total Rows</span>
                <span className="font-bold text-slate-900 text-base">{uploadResult.totalRows}</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-center">
                <span className="text-slate-400 block">Inserted</span>
                <span className="font-bold text-emerald-600 text-base">{uploadResult.insertedCount}</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-center">
                <span className="text-slate-400 block">Skipped (Duplicates)</span>
                <span className="font-bold text-amber-600 text-base">{uploadResult.skippedCount}</span>
              </div>
            </div>

            {uploadResult.errors?.length > 0 && (
              <div className="mt-3 text-xs text-rose-700 bg-rose-50 p-3 rounded-lg border border-rose-200 max-h-32 overflow-y-auto">
                <span className="font-bold block mb-1">Errors encountered during ingestion:</span>
                <ul className="list-disc pl-4 space-y-1">
                  {uploadResult.errors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dynamic Student Analytics Dashboard */}
      <StudentDashboard filters={currentFilters} />

      {/* Student Directory Table with Filters & Search */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-amber-500" />
              Enrolled Students Roster ({students.length})
            </h2>
            <p className="text-xs text-slate-500">View student profiles, room booking statuses, and program details.</p>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search roll, name, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <select
              value={filterGender}
              onChange={(e) => setFilterGender(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-medium"
            >
              <option value="ALL">All Genders (Select All)</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>

            <select
              value={filterProgramme}
              onChange={(e) => setFilterProgramme(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-medium"
            >
              <option value="ALL">All Programmes (Select All)</option>
              <option value="B.Tech">B.Tech</option>
              <option value="M.Tech">M.Tech</option>
              <option value="M.Sc">M.Sc</option>
              <option value="PhD">PhD</option>
            </select>

            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-medium"
            >
              <option value="ALL">All Years (Select All)</option>
              <option value="1">Year 1</option>
              <option value="2">Year 2</option>
              <option value="3">Year 3</option>
              <option value="4">Year 4</option>
              <option value="5">Year 5</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-medium"
            >
              <option value="ALL">All Statuses (Select All)</option>
              <option value="Pending">Pending</option>
              <option value="Pending_Pairing">Pending Pairing</option>
              <option value="Locked">Locked (Booked)</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold border-b border-slate-200">
                <th className="p-3.5">Roll Number</th>
                <th className="p-3.5">Full Name</th>
                <th className="p-3.5">Email</th>
                <th className="p-3.5">Gender</th>
                <th className="p-3.5">Programme & Year</th>
                <th className="p-3.5">Booking Status</th>
                <th className="p-3.5">Assigned Room</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {students.map((s) => (
                <tr key={s.roll_number} className="hover:bg-slate-50/80 transition">
                  <td className="p-3.5 font-bold font-mono text-blue-600">{s.roll_number}</td>
                  <td className="p-3.5 font-bold text-slate-900">{s.full_name}</td>
                  <td className="p-3.5 text-slate-600 text-xs">{s.email}</td>
                  <td className="p-3.5 text-slate-700 text-xs">{s.gender}</td>
                  <td className="p-3.5 text-xs font-semibold text-slate-800">{s.programme} - Year {s.year}</td>
                  <td className="p-3.5">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                      s.booking_status === 'Pending' ? 'bg-slate-100 text-slate-700' :
                      s.booking_status === 'Pending_Pairing' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {s.booking_status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-3.5 text-xs font-semibold text-slate-800">
                    {s.BookedRoom ? `Room ${s.BookedRoom.room_number} (${s.BookedRoom.Floor?.Block?.Hostel?.name})` : 'Unassigned'}
                  </td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 text-sm">
                    {loadingStudents ? 'Loading student records...' : 'No students found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StudentUpload;
