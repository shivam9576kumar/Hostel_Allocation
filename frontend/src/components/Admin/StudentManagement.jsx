// frontend/src/components/Admin/StudentManagement.jsx

import React, { useState, useEffect } from 'react';
import { Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { getStudents, getStudentCount, batchRemoveStudents, archiveStudent, exportStudents } from '../../api/students';
import StudentStatsCards from './StudentStatsCards';
import StudentFilterBar from './StudentFilterBar';
import StudentActionBar from './StudentActionBar';
import StudentTable from './StudentTable';
import StudentProfileModal from './StudentProfileModal';
import BatchRemovalModal from './BatchRemovalModal';
import UploadModal from './UploadModal';

const StudentManagement = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [filters, setFilters] = useState({
    search: '',
    programme: 'ALL',
    year: 'ALL',
    gender: 'ALL',
    department: 'ALL',
    status: 'ALL',
    admissionYear: 'ALL',
  });
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [selectedRoll, setSelectedRoll] = useState(null);
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  useEffect(() => {
    fetchStudents();
    fetchStats();
  }, [filters]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const params = {};
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'ALL') params[key] = value;
      });
      const res = await getStudents(params);
      setStudents(res.data.students || []);
    } catch (err) {
      console.error('Fetch students error:', err);
      toast.error('Failed to fetch students');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const params = {};
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'ALL') params[key] = value;
      });
      const res = await getStudentCount(params);
      setStats(res.data.data || {});
    } catch (err) {
      console.error('Stats error:', err);
    }
  };

  const handleStatFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    if (key === 'status') {
      setActiveFilter(value);
    }
  };

  const handleReset = () => {
    setFilters({
      search: '',
      programme: 'ALL',
      year: 'ALL',
      gender: 'ALL',
      department: 'ALL',
      status: 'ALL',
      admissionYear: 'ALL',
    });
    setActiveFilter('ALL');
  };

  const handleRowClick = (rollNumber) => {
    setSelectedRoll(rollNumber);
    setProfileModalOpen(true);
  };

  const handleSelectAll = () => {
    if (selectedStudents.length === students.length && students.length > 0) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(students.map(s => s.roll_number));
    }
  };

  const handleSelectRow = (rollNumber) => {
    setSelectedStudents(prev =>
      prev.includes(rollNumber)
        ? prev.filter(r => r !== rollNumber)
        : [...prev, rollNumber]
    );
  };

  const handleBulkRemove = async () => {
    if (selectedStudents.length === 0) return toast.error('Select at least one student.');
    try {
      await batchRemoveStudents({ rollNumbers: selectedStudents });
      toast.success(`${selectedStudents.length} students removed`);
      setSelectedStudents([]);
      fetchStudents();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to remove students');
    }
  };

  const handleBulkArchive = async () => {
    if (selectedStudents.length === 0) return toast.error('Select at least one student.');
    try {
      await Promise.all(selectedStudents.map(roll => archiveStudent(roll)));
      toast.success(`${selectedStudents.length} students archived`);
      setSelectedStudents([]);
      fetchStudents();
      fetchStats();
    } catch (err) {
      toast.error('Failed to archive students');
    }
  };

  const handleExport = async () => {
    try {
      const params = {};
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'ALL') params[key] = value;
      });
      const res = await exportStudents(params);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'students_roster.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Failed to export students');
    }
  };

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
        <Users className="w-6 h-6 text-blue-600" />
        Student Management
      </h1>

      {/* 1. Filters Bar (Moved to Top above Stats) */}
      <StudentFilterBar
        filters={filters}
        setFilters={setFilters}
        onReset={handleReset}
      />

      {/* 2. Dynamic Stats Cards */}
      <StudentStatsCards
        stats={stats}
        activeFilter={activeFilter}
        onFilterChange={handleStatFilterChange}
      />

      {/* 3. Action Bar */}
      <StudentActionBar
        selectedCount={selectedStudents.length}
        totalCount={students.length}
        onSelectAll={handleSelectAll}
        onBulkRemove={handleBulkRemove}
        onBulkArchive={handleBulkArchive}
        onBatchRemove={() => setBatchModalOpen(true)}
        onExport={handleExport}
        onUpload={() => setUploadModalOpen(true)}
      />

      {/* 4. Table */}
      <StudentTable
        students={students}
        loading={loading}
        selectedStudents={selectedStudents}
        onSelectRow={handleSelectRow}
        onRowClick={handleRowClick}
      />

      {/* Profile Modal */}
      {profileModalOpen && (
        <StudentProfileModal
          rollNumber={selectedRoll}
          onClose={() => setProfileModalOpen(false)}
          onRefresh={() => { fetchStudents(); fetchStats(); }}
        />
      )}

      {/* Batch Removal Modal */}
      {batchModalOpen && (
        <BatchRemovalModal
          onClose={() => setBatchModalOpen(false)}
          onSuccess={() => { fetchStudents(); fetchStats(); }}
        />
      )}

      {/* Upload Modal */}
      {uploadModalOpen && (
        <UploadModal
          onClose={() => setUploadModalOpen(false)}
          onSuccess={() => { fetchStudents(); fetchStats(); }}
        />
      )}
    </div>
  );
};

export default StudentManagement;
