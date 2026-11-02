import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useMedTrack } from '../context/MedTrackContext';
import { formatDosage } from '../utils/medicineSchedule';
import { getNextDoseForMedicine } from '../utils/nextDose';

export default function Medicines() {
  const { medicines: medData, deleteMedicine } = useMedTrack();
  const [statusFilter, setStatusFilter] = useState('active');
  const [typeFilter, setTypeFilter] = useState('All');
  const [now, setNow] = useState(() => new Date());
  const navigate = useNavigate();

  // Keep the "Next dose" labels current while the page is open, including
  // after the tab has been backgrounded or the clock crosses midnight.
  useEffect(() => {
    const refresh = () => setNow(new Date());
    const timer = window.setInterval(refresh, 30000);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  const medicines = (medData || []).map((m) => {
    const next = m.status === 'ended'
      ? { label: 'Course ended', state: 'ended', isDueSoon: false }
      : getNextDoseForMedicine(m, now);

    return {
      id: m._id || m.id,
      name: `${m.name} ${formatDosage(m.dosage, m.form)}`.trim(),
      form: m.form,
      frequency: `${m.frequency}${m.scheduledTimes?.length ? ' · ' + m.scheduledTimes.join(', ') : ''}`,
      subtext: `${m.startDate ? 'Since ' + m.startDate : ''} ${m.notes ? '· ' + m.notes : ''}`,
      nextDose: next.label,
      nextDoseState: next.state,
      nextDoseDueSoon: next.isDueSoon,
      // Keep the raw record so the edit form receives the full schedule.
      source: m,
      status: m.status || 'active'
    };
  });

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete ${name}?`)) {
      await deleteMedicine(id);
    }
  };

  const handleEdit = (med) => {
    navigate(`/medicines/edit/${med.id}`, { state: { medicine: med.source } });
  };

  const filteredMedicines = medicines.filter(m => {
    const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
    const matchesType = typeFilter === 'All' || (m.form && m.form.toLowerCase() === typeFilter.toLowerCase());
    return matchesStatus && matchesType;
  });

  const activeCount = medicines.filter(m => m.status === 'active').length;
  const tabletCount = medicines.filter(m => (m.form || '').toLowerCase() === 'tablet').length;
  const capsuleCount = medicines.filter(m => (m.form || '').toLowerCase() === 'capsule').length;
  const syrupCount = medicines.filter(m => (m.form || '').toLowerCase() === 'syrup').length;

  return (
    <div className="min-h-dvh bg-[#F8FAFC] font-sans text-slate-800 antialiased selection:bg-red-100 selection:text-red-700">
      <Navbar />

      <main className="mx-auto max-w-6xl space-y-7 px-4 py-8 pb-28 sm:px-6 md:pb-8 lg:px-8" data-purpose="page-content">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">My medicines</h1>
            <p className="mt-0.5 text-sm text-slate-500">{activeCount} active medicines</p>
          </div>
          <Link
            to="/medicines/add"
            className="inline-flex w-full items-center justify-center self-start rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-red-700 sm:w-auto sm:py-2 cursor-pointer"
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M12 4v16m8-8H4" strokeLinecap="round" strokeLinejoin="round"></path>
            </svg>
            Add medicine
          </Link>
        </div>

        <div className="inline-flex p-1 rounded-full bg-slate-100 text-xs font-semibold">
          <button
            onClick={() => setStatusFilter('active')}
            className={`min-h-10 rounded-full px-4 py-1 transition-all cursor-pointer md:min-h-0 ${statusFilter === 'active' ? 'bg-white text-slate-800 shadow-xs border border-slate-200/60' : 'text-slate-500 hover:text-slate-800'}`}
            type="button"
          >
            Active
          </button>
          <button
            onClick={() => setStatusFilter('ended')}
            className={`min-h-10 rounded-full px-4 py-1 transition-all cursor-pointer md:min-h-0 ${statusFilter === 'ended' ? 'bg-white text-slate-800 shadow-xs border border-slate-200/60' : 'text-slate-500 hover:text-slate-800'}`}
            type="button"
          >
            Ended
          </button>
        </div>

        <section className="space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-1">
            <h2 className="text-sm font-semibold text-slate-900">Browse by type</h2>
            <span className="text-xs font-medium text-slate-400">
              Showing {filteredMedicines.length} of {medicines.length} medicines
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            <div onClick={() => setTypeFilter('All')} className={`border rounded-xl p-3.5 flex flex-col items-start cursor-pointer transition shadow-2xs ${typeFilter === 'All' ? 'bg-red-50/70 border-red-300' : 'bg-white border-slate-200/80 hover:border-slate-300'}`}>
              <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center mb-2.5">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><rect height="5" rx="1.5" width="5" x="3" y="3"></rect><rect height="5" rx="1.5" width="5" x="12" y="3"></rect><rect height="5" rx="1.5" width="5" x="3" y="12"></rect><rect height="5" rx="1.5" width="5" x="12" y="12"></rect></svg>
              </div>
              <span className="text-xs font-bold text-slate-900">All types</span>
              <span className="text-[11px] text-slate-400 mt-0.5 font-medium">{medicines.length} medicines</span>
            </div>
            <div onClick={() => setTypeFilter('Tablet')} className={`border rounded-xl p-3.5 flex flex-col items-start cursor-pointer transition ${typeFilter === 'Tablet' ? 'bg-red-50/70 border-red-300' : 'bg-white border-slate-200/80 hover:border-slate-300'}`}>
              <div className="w-8 h-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center mb-2.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"></circle><line x1="6" x2="18" y1="12" y2="12"></line></svg>
              </div>
              <span className="text-xs font-bold text-slate-900">Tablets</span>
              <span className="text-[11px] text-slate-400 mt-0.5 font-medium">{tabletCount} medicines</span>
            </div>
            <div onClick={() => setTypeFilter('Capsule')} className={`border rounded-xl p-3.5 flex flex-col items-start cursor-pointer transition ${typeFilter === 'Capsule' ? 'bg-red-50/70 border-red-300' : 'bg-white border-slate-200/80 hover:border-slate-300'}`}>
              <div className="w-8 h-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center mb-2.5">
                <svg className="w-4 h-4 transform -rotate-45" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect height="8" rx="4" width="14" x="5" y="8"></rect><line x1="12" x2="12" y1="8" y2="16"></line></svg>
              </div>
              <span className="text-xs font-bold text-slate-900">Capsules</span>
              <span className="text-[11px] text-slate-400 mt-0.5 font-medium">{capsuleCount} medicine</span>
            </div>
            <div onClick={() => setTypeFilter('Syrup')} className={`border rounded-xl p-3.5 flex flex-col items-start cursor-pointer transition ${typeFilter === 'Syrup' ? 'bg-red-50/70 border-red-300' : 'bg-white border-slate-200/80 hover:border-slate-300'}`}>
              <div className="w-8 h-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center mb-2.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M10 3h4m-3 0v3m2 0V3m-4 3h6a2 2 0 012 2v10a3 3 0 01-3 3H10a3 3 0 01-3-3V8a2 2 0 012-2z" strokeLinecap="round" strokeLinejoin="round"></path></svg>
              </div>
              <span className="text-xs font-bold text-slate-900">Syrups</span>
              <span className="text-[11px] text-slate-400 mt-0.5 font-medium">{syrupCount} medicine</span>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          {filteredMedicines.length === 0 ? (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-8 text-center text-slate-500">
              <p className="text-sm">No medicines found matching this filter.</p>
              <button onClick={() => { setStatusFilter('active'); setTypeFilter('All'); }} className="mt-3 inline-flex min-h-11 items-center text-xs font-semibold text-red-600 hover:underline md:min-h-0" type="button">Reset filters</button>
            </div>
          ) : (
            filteredMedicines.map((med) => (
              <article key={med.id} className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition-shadow hover:border-slate-300 sm:p-5 md:flex-row md:items-center">
                <div className="flex min-w-0 items-start space-x-4">
                  <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                    <svg className="w-5 h-5 transform -rotate-45" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M19.5 12c0-3.866-3.134-7-7-7a7 7 0 000 14c3.866 0 7-3.134 7-7zM8.5 8.5l7 7" strokeLinecap="round" strokeLinejoin="round"></path></svg>
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900 sm:text-base">{med.name}</h3>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">{med.form}</span>
                    </div>
                    <p className="mt-1 break-words text-xs font-medium text-slate-600">{med.frequency}</p>
                    <p className="mt-0.5 break-words text-xs text-slate-400">{med.subtext}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between space-x-4 border-t border-slate-100 pt-2 md:justify-end md:border-t-0 md:pt-0">
                  <div className="text-left md:text-right">
                    <span className="block text-[10px] font-semibold tracking-wider text-slate-400">NEXT DOSE</span>
                    <span
                      className={`text-xs font-bold ${
                        med.nextDoseState !== 'scheduled'
                          ? 'text-slate-400'
                          : med.nextDoseDueSoon
                            ? 'text-red-600'
                            : 'text-slate-500'
                      }`}
                    >
                      {med.nextDose}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center space-x-2">
                    <button onClick={() => handleEdit(med)} className="min-h-11 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 active:bg-slate-100 md:min-h-0 cursor-pointer" type="button" aria-label={`Edit ${med.name}`}>Edit</button>
                    <button onClick={() => handleDelete(med.id, med.name)} className="min-h-11 rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 active:bg-red-50 md:min-h-0 cursor-pointer" type="button" aria-label={`Delete ${med.name}`}>Delete</button>
                  </div>
                </div>
              </article>
            ))
          )}
        </section>
      </main>
    </div>
  );
}
