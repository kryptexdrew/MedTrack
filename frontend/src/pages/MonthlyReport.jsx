import React from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useMedTrack } from '../context/MedTrackContext';

export default function MonthlyReport() {
  const navigate = useNavigate();
  const { periodStats, medicineStatsForPeriod, weeklyBreakdown } = useMedTrack();

  const stats = periodStats(30);
  // Scope the per-medicine bars to the same 30 days as the cards.
  const medicineStats = medicineStatsForPeriod(30);
  const today = new Date();
  const monthStart = new Date(today);
  monthStart.setDate(monthStart.getDate() - 29);
  const periodLabel = `${monthStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  return (
    <div className="min-h-dvh bg-[#F8FAFC] font-sans text-slate-800 antialiased selection:bg-rose-100 selection:text-rose-900">
      <Navbar />

      <main className="mx-auto max-w-4xl px-4 py-8 pb-28 md:pb-8">
        {/* Title and Period Toggle */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">Adherence report</h1>
            <p className="text-xs font-normal text-slate-400 mt-1">{periodLabel}</p>
          </div>

          {/* Segmented Control */}
          <div className="flex items-center self-start rounded-lg bg-[#ECEFF2] p-1 text-xs font-medium text-slate-600">
            <button
              onClick={() => navigate('/reports/weekly')}
              className="min-h-10 rounded-md px-3.5 py-1 text-slate-500 transition hover:text-slate-800 cursor-pointer md:min-h-0"
              type="button"
            >
              Weekly
            </button>
            <button
              className="min-h-10 cursor-pointer rounded-md bg-white px-3.5 py-1 font-semibold text-slate-800 shadow-sm md:min-h-0"
              type="button"
            >
              Monthly
            </button>
          </div>
        </div>

        {/* Metric Cards Grid */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-slate-100 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)] sm:p-5">
            <span className="text-[10px] tracking-wider font-semibold text-slate-400 uppercase">ADHERENCE</span>
            <div className="text-2xl font-bold text-[#065F46] mt-1 sm:text-3xl">{stats.adherence}%</div>
            <p className="mt-1 text-[10px] font-medium text-slate-400">{stats.taken} of {stats.expected} expected</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)] sm:p-5">
            <span className="text-[10px] tracking-wider font-semibold text-slate-400 uppercase">TAKEN</span>
            <div className="text-2xl font-bold text-[#0F172A] mt-1 sm:text-3xl">{stats.taken}</div>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)] sm:p-5">
            <span className="text-[10px] tracking-wider font-semibold text-slate-400 uppercase">MISSED</span>
            <div className="text-2xl font-bold text-[#B91C1C] mt-1 sm:text-3xl">{stats.missed}</div>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)] sm:p-5">
            <span className="text-[10px] tracking-wider font-semibold text-slate-400 uppercase">SKIPPED</span>
            <div className="text-2xl font-bold text-[#9A3412] mt-1 sm:text-3xl">{stats.skipped}</div>
          </div>
        </section>

        {/* Weekly Adherence Chart */}
        <section className="mb-6 rounded-xl border border-slate-100 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)] sm:p-6">
          <h2 className="mb-8 text-sm font-bold text-slate-800">Weekly adherence</h2>
          <div className="-mx-1 overflow-x-auto px-1 pb-1">
            <div className="flex min-w-[320px] items-end justify-center space-x-5 pt-2 pb-1 sm:space-x-12">
              {weeklyBreakdown.map((item) => {
                const hasExpected = item.expected > 0;
                const barColor = !hasExpected
                  ? 'bg-slate-300'
                  : item.adherence >= 80
                    ? 'bg-[#065F46]'
                    : item.adherence >= 50
                      ? 'bg-[#C25E00]'
                      : 'bg-[#B91C1C]';
                return (
                  <div
                    key={item.week}
                    className="flex flex-col items-center"
                    title={`${item.taken} taken, ${item.missed} missed of ${item.expected} expected`}
                  >
                    <span className="mb-2 text-xs font-semibold text-slate-700">{item.adherence}%</span>
                    <div className="flex h-40 w-12 flex-col justify-end overflow-hidden rounded-xl bg-[#F1F5F9] p-0 sm:w-16">
                      <div
                        className={`w-full rounded-xl transition-all duration-500 ${barColor}`}
                        style={{ height: `${item.adherence === 0 ? (hasExpected ? 4 : 3) : item.adherence}%` }}
                      ></div>
                    </div>
                    <span className="mt-3 text-xs font-medium text-slate-400">{item.week}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* By Medicine Section */}
        <section className="rounded-xl border border-slate-100 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)] sm:p-6">
          <h2 className="mb-6 text-sm font-bold text-slate-800">By medicine</h2>
          {medicineStats.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400">
              No medicine data yet
            </div>
          ) : (
            <div className="space-y-5">
              {medicineStats.map((med) => (
                <div key={med.name} className="flex flex-col gap-1.5 text-xs font-medium sm:flex-row sm:items-center sm:gap-0">
                  <span className="w-full truncate font-medium text-slate-700 sm:w-48 sm:shrink-0">{med.name}</span>
                  <div className="mx-0 h-2 flex-1 rounded-full bg-[#F1F5F9] sm:mx-4">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${med.percent >= 80 ? 'bg-[#065F46]' : med.percent >= 50 ? 'bg-[#C25E00]' : 'bg-[#B91C1C]'}`}
                      style={{ width: `${med.percent}%` }}
                    ></div>
                  </div>
                  <span className="w-auto text-left font-semibold text-slate-700 sm:w-8 sm:text-right">{med.percent}%</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

