// frontend/src/components/Admin/StudentTable.jsx

import React from 'react';
import StudentTableRow from './StudentTableRow';

const StudentTable = ({ students, loading, selectedStudents, onSelectRow, onRowClick }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 animate-pulse">
        Loading students...
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400">
        No students found.
      </div>
    );
  }

  const allSelected = students.length > 0 && students.every(s => selectedStudents.includes(s.roll_number));

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left w-10">
                <input
                  type="checkbox"
                  onChange={() => {
                    if (allSelected) {
                      students.forEach(s => {
                        if (selectedStudents.includes(s.roll_number)) onSelectRow(s.roll_number);
                      });
                    } else {
                      students.forEach(s => {
                        if (!selectedStudents.includes(s.roll_number)) onSelectRow(s.roll_number);
                      });
                    }
                  }}
                  checked={allSelected}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Roll Number</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Programme</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Year</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Department</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Room</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <StudentTableRow
                key={student.roll_number}
                student={student}
                isSelected={selectedStudents.includes(student.roll_number)}
                onSelect={() => onSelectRow(student.roll_number)}
                onClick={() => onRowClick(student.roll_number)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StudentTable;
