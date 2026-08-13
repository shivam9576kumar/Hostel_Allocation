import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import StudentDashboard from '../../components/Admin/StudentDashboard';

const StudentRoster = () => {
  const [filters, setFilters] = useState({
    status: 'ALL',
    gender: 'ALL',
    programme: 'ALL',
    year: 'ALL',
    search: ''
  });

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    fetchStudents();
  }, [filters]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const params = {};
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'ALL' && value !== '') {
          params[key] = value;
        }
      });
      const response = await api.get('/admin/students', { params });
      setStudents(response.data.students || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Enrolled Students Roster</h1>
      <p className="text-sm text-slate-500">View student profiles, room booking statuses, and program details.</p>

      {/* Student Dashboard - Shows modern statistics & charts */}
      <StudentDashboard filters={filters} />

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[150px]">
            <label className="text-xs font-medium text-slate-500 block mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-xl text-xs bg-slate-50"
            >
              <option value="ALL">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Pending_Pairing">Pending Pairing</option>
              <option value="Locked">Locked</option>
            </select>
          </div>

          <div className="flex-1 min-w-[150px]">
            <label className="text-xs font-medium text-slate-500 block mb-1">Gender</label>
            <select
              value={filters.gender}
              onChange={(e) => handleFilterChange('gender', e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-xl text-xs bg-slate-50"
            >
              <option value="ALL">All Genders</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>

          <div className="flex-1 min-w-[150px]">
            <label className="text-xs font-medium text-slate-500 block mb-1">Programme</label>
            <select
              value={filters.programme}
              onChange={(e) => handleFilterChange('programme', e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-xl text-xs bg-slate-50"
            >
              <option value="ALL">All Programmes</option>
              <option value="B.Tech">B.Tech</option>
              <option value="M.Tech">M.Tech</option>
              <option value="M.Sc">M.Sc</option>
              <option value="PhD">PhD</option>
            </select>
          </div>

          <div className="flex-1 min-w-[150px]">
            <label className="text-xs font-medium text-slate-500 block mb-1">Year</label>
            <select
              value={filters.year}
              onChange={(e) => handleFilterChange('year', e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-xl text-xs bg-slate-50"
            >
              <option value="ALL">All Years</option>
              <option value="1">Year 1</option>
              <option value="2">Year 2</option>
              <option value="3">Year 3</option>
              <option value="4">Year 4</option>
              <option value="5">Year 5</option>
            </select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-medium text-slate-500 block mb-1">Search</label>
            <input
              type="text"
              placeholder="Search roll, name, email..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-xl text-xs bg-slate-50"
            />
          </div>
        </div>
      </div>

      {/* Student Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Roll Number</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Full Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Gender</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Programme & Year</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Booking Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Assigned Room</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-slate-400">Loading...</td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-slate-400">No students found</td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr key={student.roll_number} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs text-blue-600 font-bold">{student.roll_number}</td>
                    <td className="px-4 py-3 font-medium">{student.full_name}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{student.email}</td>
                    <td className="px-4 py-3">{student.gender}</td>
                    <td className="px-4 py-3">{student.programme} - Year {student.year}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        student.booking_status === 'Locked' 
                          ? 'bg-emerald-100 text-emerald-700' 
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {student.booking_status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {student.BookedRoom?.room_number || 'Unassigned'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StudentRoster;
