import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, X, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';

const AddRuleForm = ({
  block,
  blockId,
  floors = [],
  programmesList = ['B.Tech', 'M.Tech', 'M.Sc', 'PhD', 'B.Des', 'M.Des', 'MBA'],
  yearsList = [
    { label: '1st Year', value: '1' },
    { label: '2nd Year', value: '2' },
    { label: '3rd Year', value: '3' },
    { label: '4th Year', value: '4' },
    { label: '5th Year', value: '5' },
  ],
  onAdd,
  editingRule,
  onEdit,
  onCancelEdit,
  onSubmit,
  onCancel,
  allocatedRanges = []
}) => {
  const params = useParams();
  const currentBlockId = blockId || block?.block_id || params?.blockId;

  const [gender, setGender] = useState('');
  const [programme, setProgramme] = useState('');
  const [allowedYear, setAllowedYear] = useState('');
  const [floorStart, setFloorStart] = useState('');
  const [floorEnd, setFloorEnd] = useState('');
  const [capacity, setCapacity] = useState('2');
  const [loading, setLoading] = useState(false);

  const [maxFloor, setMaxFloor] = useState(0);
  const [minFloor, setMinFloor] = useState(0);
  const [totalFloors, setTotalFloors] = useState(0);
  const [loadingFloors, setLoadingFloors] = useState(false);

  useEffect(() => {
    const fetchBlockFloors = async () => {
      if (floors && floors.length > 0) {
        const floorNumbers = floors.map(f => f.floor_number);
        const minF = Math.min(...floorNumbers);
        const maxF = Math.max(...floorNumbers);
        setTotalFloors(floors.length);
        setMinFloor(minF);
        setMaxFloor(maxF);
        if (!editingRule && floorStart === '' && floorEnd === '') {
          setFloorStart(minF.toString());
          setFloorEnd(minF.toString());
        }
        return;
      }

      if (!currentBlockId) return;
      setLoadingFloors(true);
      try {
        const res = await api.get(`/admin/floors?blockId=${currentBlockId}`);
        const fetchedFloors = res.data.floors || [];
        if (fetchedFloors.length === 0) {
          toast.error('This block has no floors. Please add floors first.');
          setTotalFloors(0);
          setMaxFloor(0);
          setMinFloor(0);
        } else {
          const floorNumbers = fetchedFloors.map(f => f.floor_number);
          const minF = Math.min(...floorNumbers);
          const maxF = Math.max(...floorNumbers);
          setTotalFloors(fetchedFloors.length);
          setMinFloor(minF);
          setMaxFloor(maxF);
          if (!editingRule && floorStart === '' && floorEnd === '') {
            setFloorStart(minF.toString());
            setFloorEnd(minF.toString());
          }
        }
      } catch (error) {
        console.error('Failed to fetch block floors:', error);
      } finally {
        setLoadingFloors(false);
      }
    };
    fetchBlockFloors();
  }, [currentBlockId, floors, editingRule]);

  useEffect(() => {
    if (editingRule) {
      setGender(editingRule.gender || '');
      setProgramme(editingRule.programme || '');
      setAllowedYear(editingRule.allowed_year ? editingRule.allowed_year.toString() : '');
      setFloorStart(editingRule.floor_start !== undefined ? editingRule.floor_start.toString() : '');
      setFloorEnd(editingRule.floor_end !== undefined ? editingRule.floor_end.toString() : '');
      setCapacity(editingRule.capacity ? editingRule.capacity.toString() : '2');
    } else {
      setGender('');
      setProgramme('');
      setAllowedYear('');
      if (totalFloors > 0) {
        setFloorStart(minFloor.toString());
        setFloorEnd(minFloor.toString());
      } else {
        setFloorStart('');
        setFloorEnd('');
      }
      setCapacity('2');
    }
  }, [editingRule, totalFloors, minFloor]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!gender) {
      toast.error('Please select a gender.');
      return;
    }

    if (!programme) {
      toast.error('Please select a programme.');
      return;
    }

    if (!allowedYear || allowedYear === 'ALL') {
      toast.error('Please select a specific year (1st, 2nd, 3rd, 4th, or 5th Year).');
      return;
    }

    if (floorStart === '' || floorEnd === '') {
      toast.error('Please specify floor start and end numbers.');
      return;
    }

    const start = parseInt(floorStart, 10);
    const end = parseInt(floorEnd, 10);

    if (isNaN(start) || isNaN(end) || start > end || start < 0) {
      toast.error('Please enter a valid floor range (0 ≤ Start ≤ End).');
      return;
    }

    if (totalFloors === 0) {
      toast.error('This block has no floors. Please add floors before creating a rule.');
      return;
    }

    if (start < minFloor) {
      toast.error(`Block floors start at ${minFloor}. Please enter a floor range within ${minFloor} to ${maxFloor}.`);
      return;
    }

    if (end > maxFloor) {
      toast.error(`Block has only ${totalFloors} floor(s) (${minFloor} to ${maxFloor}). Please enter a valid floor range within this block.`);
      return;
    }

    const payload = {
      gender,
      programme,
      allowed_year: parseInt(allowedYear, 10),
      floor_start: start,
      floor_end: end,
      capacity: parseInt(capacity, 10),
    };

    console.log('📝 Submitting rule form with payload:', payload);

    setLoading(true);
    try {
      if (editingRule) {
        const handleEditFn = onEdit || onSubmit;
        if (typeof handleEditFn === 'function') {
          await handleEditFn(editingRule.rule_id, payload);
        } else {
          toast.error('Edit handler is not configured');
        }
      } else {
        const handleAddFn = onAdd || onSubmit;
        if (typeof handleAddFn === 'function') {
          await handleAddFn(payload);
          // Reset form fields after successful addition
          setGender('');
          setProgramme('');
          setAllowedYear('');
          setFloorStart('');
          setFloorEnd('');
          setCapacity('2');
        } else {
          toast.error('Add rule handler is not configured');
        }
      }
    } catch (err) {
      console.error('Error submitting allocation rule form:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelClick = onCancelEdit || onCancel;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          {editingRule ? `Edit Rule #${editingRule.rule_id}` : '➕ ADD NEW RULE'}
        </h3>
        {editingRule && handleCancelClick && (
          <button
            type="button"
            onClick={handleCancelClick}
            className="p-1 hover:bg-slate-100 rounded-lg transition text-slate-400 hover:text-slate-700"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-3">
        {/* Gender */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-500">Gender:</label>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
            required
          >
            <option value="">Select Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </div>

        {/* Programme */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-500">Programme:</label>
          <select
            value={programme}
            onChange={(e) => setProgramme(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
            required
          >
            <option value="">Select Programme</option>
            {programmesList.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        {/* Year */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-500">Year:</label>
          <select
            value={allowedYear}
            onChange={(e) => setAllowedYear(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
            required
          >
            <option value="">Select Year</option>
            {yearsList.map((y) => (
              <option key={y.value} value={y.value}>{y.label}</option>
            ))}
          </select>
        </div>

        {/* Floor Range */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-500">Floor Range:</label>
          <input
            type="number"
            value={floorStart}
            onChange={(e) => setFloorStart(e.target.value)}
            placeholder="Start"
            className="w-16 px-2.5 py-1.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
            min="0"
            required
          />
          <span className="text-xs font-bold text-slate-400">to</span>
          <input
            type="number"
            value={floorEnd}
            onChange={(e) => setFloorEnd(e.target.value)}
            placeholder="End"
            className="w-16 px-2.5 py-1.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
            min="0"
            required
          />
        </div>

        {/* Floor Range Helper Text */}
        <div className="text-xs font-medium text-slate-500 w-full">
          {loadingFloors ? (
            'Loading floors...'
          ) : totalFloors > 0 ? (
            `Valid floor range: ${minFloor} to ${maxFloor} (${totalFloors} floor${totalFloors > 1 ? 's' : ''} available)`
          ) : (
            <span className="text-rose-500 font-semibold">No floors found for this block. Please add floors first.</span>
          )}
        </div>

        {/* Capacity */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-500">Capacity:</label>
          <select
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
          >
            <option value="">Select Capacity</option>
            <option value="1">1 Seater (Single)</option>
            <option value="2">2 Seater (Double)</option>
            <option value="3">3 Seater (Triple)</option>
          </select>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || loadingFloors || totalFloors === 0}
          className={`px-5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm ${
            loading || loadingFloors || totalFloors === 0
              ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          <Plus className="w-4 h-4" />
          {loadingFloors ? 'Loading...' : editingRule ? (loading ? 'Updating...' : 'Update Rule') : (loading ? 'Adding...' : '+ Add Rule')}
        </button>
      </form>
    </div>
  );
};

export default AddRuleForm;
