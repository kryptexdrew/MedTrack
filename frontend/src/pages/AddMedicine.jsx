import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useMedTrack } from '../context/MedTrackContext';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import '../styles/datepicker.css';
import { calculateDoses, calculateTotalDoses, getDosageParts, combineDosage, getTodayDateString } from '../utils/medicineSchedule';

const FORMS = ['Tablet', 'Capsule', 'Syrup', 'Other'];
const FREQUENCIES = ['Once a day', 'Several times a day', 'Specific days', 'Every few hours'];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DOSE_TIMES = ['5:00 AM', '6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM', '10:00 PM'];
const UNITS = ['mg', 'ml', 'mcg', 'tablets', 'units', 'puffs', 'drops'];

export default function AddMedicine() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { addMedicine, updateMedicine } = useMedTrack();

  const isEditing = !!id;
  const initialData = location.state?.medicine;

  // Form states
  const [name, setName] = useState('');
  const [dosageAmount, setDosageAmount] = useState('');
  const [dosageUnit, setDosageUnit] = useState('mg');
  const [form, setForm] = useState('Tablet');
  const [notes, setNotes] = useState('');
  const [frequency, setFrequency] = useState('Once a day');
  const [repeatEvery, setRepeatEvery] = useState('8');
  const [firstDoseAt, setFirstDoseAt] = useState('8:00 AM');
  const [customTimes, setCustomTimes] = useState(['8:00 AM', '1:00 PM', '8:00 PM']);
  const [selectedDays, setSelectedDays] = useState(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [hasEndDate, setHasEndDate] = useState(false);
  const [browserNotification, setBrowserNotification] = useState(true);
  const [emailReminder, setEmailReminder] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initialData) {
      const fullName = initialData.name || '';
      const parts = fullName.split(' ');
      // If name contains dosage pattern, try to split
      const { amount, unit } = getDosageParts(initialData.dosage || '');
      setName(initialData.name?.replace(initialData.dosage || '', '').trim() || parts[0] || fullName);
      setDosageAmount(amount || '');
      setDosageUnit(unit || 'mg');
      setForm(initialData.form || 'Tablet');
      if (initialData.frequency) setFrequency(initialData.frequency);
      if (initialData.notes !== undefined) setNotes(initialData.notes);
      if (initialData.scheduledTimes?.[0]) setFirstDoseAt(initialData.scheduledTimes[0]);
      if (initialData.repeatEvery) setRepeatEvery(String(initialData.repeatEvery).replace(/[^0-9]/g, '') || '8');
      if (initialData.days) setSelectedDays(initialData.days);
      if (initialData.scheduledTimes && Array.isArray(initialData.scheduledTimes)) {
        setCustomTimes(initialData.scheduledTimes);
      }
      if (initialData.startDate) {
        const d = new Date(initialData.startDate + 'T00:00:00');
        if (!isNaN(d.getTime())) setStartDate(d);
      }
      if (initialData.endDate) {
        const d = new Date(initialData.endDate + 'T00:00:00');
        if (!isNaN(d.getTime())) {
          setEndDate(d);
          setHasEndDate(true);
        }
      }
      if (initialData.browserNotification !== undefined) setBrowserNotification(initialData.browserNotification);
      if (initialData.emailReminder !== undefined) setEmailReminder(initialData.emailReminder);
    } else {
      setStartDate(new Date());
    }
  }, [initialData]);

  const toggleDay = (day) => {
    if (selectedDays.includes(day)) {
      if (selectedDays.length > 1) {
        setSelectedDays(selectedDays.filter(d => d !== day));
      }
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const addCustomTime = () => {
    setCustomTimes([...customTimes, '12:00 PM']);
  };

  const updateCustomTime = (index, value) => {
    const updated = [...customTimes];
    updated[index] = value;
    setCustomTimes(updated);
  };

  const removeCustomTime = (index) => {
    if (customTimes.length > 1) {
      setCustomTimes(customTimes.filter((_, i) => i !== index));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!name.trim()) newErrors.name = 'Medicine name is required';
    if (!dosageAmount.trim()) newErrors.dosageAmount = 'Dosage is required';
    if (!startDate) newErrors.startDate = 'Start date is required';
    if (hasEndDate && endDate && startDate && endDate < startDate) {
      newErrors.endDate = 'End date must be after start date';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);

    const dosage = combineDosage(dosageAmount, dosageUnit);
    const scheduledTimes = frequency === 'Several times a day' ? customTimes : (frequency === 'Every few hours' ? 
      calculateDoses(frequency, `${repeatEvery} hours`, firstDoseAt).map(d => d.displayTime) : [firstDoseAt]);

    const payload = {
      name: name.trim(),
      dosage,
      form,
      notes: notes.trim(),
      frequency,
      repeatEvery: frequency === 'Every few hours' ? `${repeatEvery} hours` : undefined,
      firstDoseAt,
      scheduledTimes,
      days: frequency === 'Specific days' ? selectedDays : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      startDate: startDate ? startDate.toISOString().split('T')[0] : getTodayDateString(),
      endDate: hasEndDate && endDate ? endDate.toISOString().split('T')[0] : null,
      browserNotification,
      emailReminder
    };

    try {
      if (isEditing) {
        const result = await updateMedicine(id, payload);
        if (!result?.success) {
          throw new Error(result?.message || 'Failed to save medicine');
        }
        navigate('/medicines');
      } else {
        // addMedicine() already POSTs to /medicines. Do not call api.post here
        // as well, or every new medicine is created twice.
        const result = await addMedicine(payload);
        if (!result?.success) {
          throw new Error(result?.message || 'Failed to save medicine');
        }

        // Clear form and close/navigate on successful API response
        setName('');
        setDosageAmount('');
        setDosageUnit('mg');
        setForm('Tablet');
        setNotes('');
        setFrequency('Once a day');
        setRepeatEvery('8');
        setFirstDoseAt('8:00 AM');
        setCustomTimes(['8:00 AM', '1:00 PM', '8:00 PM']);
        setSelectedDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
        setStartDate(new Date());
        setEndDate(null);
        setHasEndDate(false);
        setBrowserNotification(true);
        setEmailReminder(false);
        setErrors({});
        navigate('/medicines');
      }
    } catch (err) {
      console.warn('API error:', err.message);
      setErrors({ submit: err.message || 'Failed to save medicine' });
    } finally {
      setLoading(false);
    }
  };

  const doseSummary = calculateDoses(frequency, `${repeatEvery} hours`, firstDoseAt, customTimes);
  const totalDosesInfo = calculateTotalDoses(
    frequency, 
    `${repeatEvery} hours`, 
    frequency === 'Specific days' ? selectedDays : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    startDate ? startDate.toISOString().split('T')[0] : null,
    hasEndDate && endDate ? endDate.toISOString().split('T')[0] : null,
    frequency === 'Several times a day' ? customTimes : []
  );

  return (
    <div className="min-h-dvh bg-[#f8fafc] text-slate-800 antialiased">
      <Navbar />

      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6">
          <Link
            className="mb-3 inline-flex min-h-11 items-center text-xs font-semibold text-slate-500 transition hover:text-slate-800 md:min-h-0"
            to="/medicines"
          >
            <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M10 19l-7-7m0 0l7-7m-7 7h18" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
            </svg>
            Back to medicines
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">
            {isEditing ? 'Edit medicine' : 'Add medicine'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">Fill in the details to track your medication</p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* Medicine Information */}
          <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-6 flex items-start space-x-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-red-100 bg-red-50 text-xs font-bold text-red-700">1</span>
              <div>
                <h2 className="text-base font-bold text-slate-900 leading-tight">Medicine Information</h2>
                <p className="text-xs text-slate-500 mt-0.5">What are you taking?</p>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5" htmlFor="medicine-name">
                  Medicine name <span className="text-red-500">*</span>
                </label>
                <input
                  className={`w-full text-sm px-3.5 py-2.5 rounded-lg border ${errors.name ? 'border-red-300 focus:ring-red-500' : 'border-slate-200 focus:ring-red-600'} text-slate-900 focus:ring-2 focus:border-red-600 outline-none transition`}
                  id="medicine-name"
                  type="text"
                  placeholder="e.g., Paracetamol"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Dosage <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    className={`min-w-0 flex-1 text-sm px-3.5 py-2.5 rounded-lg border ${errors.dosageAmount ? 'border-red-300 focus:ring-red-500' : 'border-slate-200 focus:ring-red-600'} text-slate-900 focus:ring-2 focus:border-red-600 outline-none transition`}
                    type="number"
                    step="0.01"
                    placeholder="500"
                    value={dosageAmount}
                    onChange={(e) => setDosageAmount(e.target.value)}
                    inputMode="decimal"
                  />
                  <select
                    className="w-28 shrink-0 text-sm px-3 py-2.5 rounded-lg border border-slate-200 text-slate-900 focus:ring-2 focus:ring-red-600 focus:border-red-600 outline-none transition sm:w-32"
                    value={dosageUnit}
                    onChange={(e) => setDosageUnit(e.target.value)}
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
                {errors.dosageAmount && <p className="text-xs text-red-600 mt-1">{errors.dosageAmount}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2">Form</label>
                <div className="flex flex-wrap gap-2 text-xs">
                  {FORMS.map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setForm(f)}
                      className={`inline-flex min-h-10 items-center rounded-full px-4 py-1.5 text-xs font-medium transition cursor-pointer md:min-h-0 ${form === f ? 'bg-red-700 text-white shadow-sm' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'}`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5" htmlFor="notes">
                  Notes <span className="text-slate-400 font-normal">optional</span>
                </label>
                <textarea
                  className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-slate-200 text-slate-900 focus:ring-2 focus:ring-red-600 focus:border-red-600 outline-none resize-none transition"
                  id="notes"
                  rows="3"
                  placeholder="e.g., Take after meals"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                ></textarea>
              </div>
            </div>
          </section>

          {/* Schedule */}
          <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-6 flex items-start space-x-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-red-100 bg-red-50 text-xs font-bold text-red-700">2</span>
              <div>
                <h2 className="text-base font-bold text-slate-900 leading-tight">Schedule</h2>
                <p className="text-xs text-slate-500 mt-0.5">When do you take it?</p>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2">Frequency</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {FREQUENCIES.map((freq) => (
                    <button
                      key={freq}
                      type="button"
                      onClick={() => setFrequency(freq)}
                      className={`min-h-11 rounded-lg px-3.5 py-2 text-left text-xs font-medium transition cursor-pointer md:min-h-0 ${frequency === freq ? 'bg-red-50 text-red-700 border-2 border-red-200' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'}`}
                    >
                      {freq}
                    </button>
                  ))}
                </div>
              </div>

              {frequency === 'Every few hours' && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Interval (hours)</label>
                    <input
                      className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-slate-200 text-slate-900 focus:ring-2 focus:ring-red-600 focus:border-red-600 outline-none transition"
                      type="number"
                      min="1"
                      max="24"
                      value={repeatEvery}
                      onChange={(e) => setRepeatEvery(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">First dose at</label>
                    <select
                      className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-slate-200 text-slate-900 focus:ring-2 focus:ring-red-600 focus:border-red-600 outline-none transition"
                      value={firstDoseAt}
                      onChange={(e) => setFirstDoseAt(e.target.value)}
                    >
                      {DOSE_TIMES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {frequency === 'Once a day' && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Time</label>
                  <select
                    className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-slate-200 text-slate-900 focus:ring-2 focus:ring-red-600 focus:border-red-600 outline-none transition"
                    value={firstDoseAt}
                    onChange={(e) => setFirstDoseAt(e.target.value)}
                  >
                    {DOSE_TIMES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              )}

              {frequency === 'Several times a day' && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-2">Dose times</label>
                  <div className="space-y-2">
                    {customTimes.map((time, index) => (
                      <div key={index} className="flex gap-2">
                        <select
                          className="flex-1 text-sm px-3.5 py-2.5 rounded-lg border border-slate-200 text-slate-900 focus:ring-2 focus:ring-red-600 focus:border-red-600 outline-none transition"
                          value={time}
                          onChange={(e) => updateCustomTime(index, e.target.value)}
                        >
                          {DOSE_TIMES.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                        {customTimes.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeCustomTime(index)}
                            className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addCustomTime}
                      className="text-xs text-red-600 font-medium hover:text-red-700 flex items-center gap-1"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
                      </svg>
                      Add time
                    </button>
                  </div>
                </div>
              )}

              {frequency === 'Specific days' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Time</label>
                    <select
                      className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-slate-200 text-slate-900 focus:ring-2 focus:ring-red-600 focus:border-red-600 outline-none transition"
                      value={firstDoseAt}
                      onChange={(e) => setFirstDoseAt(e.target.value)}
                    >
                      {DOSE_TIMES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-2">Select days</label>
                    <div className="flex flex-wrap gap-1.5">
                      {DAYS.map((d) => {
                        const isSelected = selectedDays.includes(d);
                        return (
                          <button
                            key={d}
                            type="button"
                            onClick={() => toggleDay(d)}
                            className={`flex h-11 w-11 items-center justify-center rounded-lg text-xs font-medium transition sm:h-8 sm:w-10 ${isSelected ? 'bg-red-700 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
                          >
                            {d}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    Start date <span className="text-red-500">*</span>
                  </label>
                  <DatePicker
                    selected={startDate}
                    onChange={(date) => setStartDate(date)}
                    dateFormat="yyyy-MM-dd"
                    className={`w-full text-sm px-3.5 py-2.5 rounded-lg border ${errors.startDate ? 'border-red-300' : 'border-slate-200'} text-slate-900 focus:ring-2 focus:ring-red-600 focus:border-red-600 outline-none transition`}
                    placeholderText="Select start date"
                  />
                  {errors.startDate && <p className="text-xs text-red-600 mt-1">{errors.startDate}</p>}
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-medium text-slate-600">End date</label>
                    <label className="flex min-h-11 items-center gap-2 text-xs text-slate-600 md:min-h-0 md:gap-1.5">
                      <input
                        type="checkbox"
                        checked={hasEndDate}
                        onChange={(e) => {
                          setHasEndDate(e.target.checked);
                          if (!e.target.checked) setEndDate(null);
                        }}
                        className="h-6 w-6 rounded border-slate-300 text-red-600 focus:ring-red-500 md:h-4 md:w-4"
                      />
                      Has end date
                    </label>
                  </div>
                  {hasEndDate && (
                    <>
                      <DatePicker
                        selected={endDate}
                        onChange={(date) => setEndDate(date)}
                        dateFormat="yyyy-MM-dd"
                        minDate={startDate}
                        className={`w-full text-sm px-3.5 py-2.5 rounded-lg border ${errors.endDate ? 'border-red-300' : 'border-slate-200'} text-slate-900 focus:ring-2 focus:ring-red-600 focus:border-red-600 outline-none transition`}
                        placeholderText="Select end date"
                      />
                      {errors.endDate && <p className="text-xs text-red-600 mt-1">{errors.endDate}</p>}
                    </>
                  )}
                </div>
              </div>

              {(doseSummary.length > 0 || totalDosesInfo.isOngoing) && (
                <div className="bg-emerald-50/80 border border-emerald-100 text-emerald-800 text-xs px-3.5 py-2.5 rounded-lg">
                  <p className="font-medium">
                    {frequency === 'Every few hours' 
                      ? `Doses: ${doseSummary.map(d => d.displayTime).join(' · ')}`
                      : frequency === 'Several times a day'
                      ? `Doses: ${customTimes.join(' · ')}`
                      : frequency === 'Specific days'
                      ? `Doses: ${firstDoseAt} on ${selectedDays.join(', ')}`
                      : `Doses: ${firstDoseAt} once daily`}
                  </p>
                  {totalDosesInfo.isOngoing && <p className="mt-0.5">Course: Ongoing</p>}
                  {totalDosesInfo.count > 0 && <p className="mt-0.5">Total doses: ~{totalDosesInfo.count}</p>}
                </div>
              )}
            </div>
          </section>

          {/* Reminders */}
          <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-6 flex items-start space-x-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-red-100 bg-red-50 text-xs font-bold text-red-700">3</span>
              <div>
                <h2 className="text-base font-bold text-slate-900 leading-tight">Reminders</h2>
                <p className="text-xs text-slate-500 mt-0.5">How should we remind you?</p>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              <div className="py-3 first:pt-0 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Browser notification</h3>
                  <p className="text-xs text-slate-500 mt-0.5">A pop-up at each dose time</p>
                </div>
                <button
                  type="button"
                  onClick={() => setBrowserNotification(!browserNotification)}
                  aria-pressed={browserNotification}
                  aria-label="Toggle browser notification"
                  className="flex h-11 w-14 shrink-0 items-center justify-center rounded-lg md:h-6 md:w-11"
                >
                  <span className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${browserNotification ? 'bg-emerald-600' : 'bg-slate-200'}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${browserNotification ? 'translate-x-6' : 'translate-x-1'}`} />
                  </span>
                </button>
              </div>

              <div className="py-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Email reminder</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Sent to your registered email</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEmailReminder(!emailReminder)}
                  aria-pressed={emailReminder}
                  aria-label="Toggle email reminder"
                  className="flex h-11 w-14 shrink-0 items-center justify-center rounded-lg md:h-6 md:w-11"
                >
                  <span className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${emailReminder ? 'bg-emerald-600' : 'bg-slate-200'}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${emailReminder ? 'translate-x-6' : 'translate-x-1'}`} />
                  </span>
                </button>
              </div>
            </div>
          </section>

          {errors.submit && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {errors.submit}
            </div>
          )}

          <div className="sticky bottom-0 z-20 -mx-4 flex items-center gap-3 border-t border-slate-200 bg-white/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur md:static md:mx-0 md:justify-end md:border-0 md:bg-transparent md:px-0 md:pb-0 md:pt-2">
            <Link to="/medicines" className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 md:min-h-0 md:flex-none">Cancel</Link>
            <button className="inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-lg bg-red-700 px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-red-800 disabled:opacity-50 md:min-h-0 md:flex-none" type="submit" disabled={loading}>
              <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"></path>
              </svg>
              {loading ? 'Saving...' : isEditing ? 'Update medicine' : 'Save medicine'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
