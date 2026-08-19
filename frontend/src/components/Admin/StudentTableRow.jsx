// frontend/src/components/Admin/StudentTableRow.jsx

import React from 'react';

const StudentTableRow = ({ student, isSelected, onSelect, onClick }) => {
  const statusColors = {
    'active': 'bg-emerald-100 text-emerald-700',
    'archived': 'bg-slate-100 text-slate-500',
  };

  return (
    <tr
      onClick={onClick}
      className="border-b border-slate-100 hover:bg-slate-50/60 transition cursor-pointer"
    >
      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onSelect}
          className="w-4 h-4 text-blue-600 rounded border-slate-300"
        />
      </td>
      <td className="px-4 py-3 font-mono text-xs font-medium text-slate-700">{student.roll_number}</td>
      <td className="px-4 py-3 font-medium text-slate-800">{student.full_name}</td>
      <td className="px-4 py-3 text-slate-600">{student.programme}</td>
      <td className="px-4 py-3 text-slate-600">{student.year}</td>
      <td className="px-4 py-3 text-slate-600">{student.department || 'N/A'}</td>
      <td className="px-4 py-3 text-slate-600">
        {student.BookedRoom?.room_number || 'Unassigned'}
      </td>
      <td className="px-4 py-3">
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[student.status] || 'bg-slate-100 text-slate-700'}`}>
          {student.status || 'active'}
        </span>
      </td>
    </tr>
  );
};

export default StudentTableRow;
