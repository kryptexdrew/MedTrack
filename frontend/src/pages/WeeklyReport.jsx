import React from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useMedTrack } from '../context/MedTrackContext';

export default function WeeklyReport() {
  const navigate = useNavigate();
  const { periodStats, medicineStatsForPeriod, dailyStats } = useMedTrack();

  const stats = periodStats(7);
  // Scope the per-medicine bars to the same 7 days as the cards.
  const medicineStats = medicineStatsForPeriod(7);

  const formatShortDate = (date) =>
    date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const periodEnd = new Date();
  const periodStart = new Date();
  periodStart.setDate(periodStart.getDate() - 6);
  const periodLabel = `${formatShortDate(periodStart)} – ${formatShortDate(periodEnd)}, ${periodEnd.getFullYear()}`;

  return (
    <div className="flex min-h-dvh flex-col bg-[#f8f9fa] font-sans text-slate-800 antialiased">
      <Navbar />

      <main className="mx-auto w-full max-w-[1020px] flex-1 space-y-6 p-4 pb-28 sm:p-6 md:p-10">
        {/* Header Title and Range Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-bold text-gray-900 leading-snug">Adherence report</h1>
            <p className="text-xs text-gray-400 mt-0.5 font-normal">{periodLabel}</p>
          </div>

          {/* Weekly / Monthly Toggle */}
          <div className="inline-flex items-center bg-[#eaedf1] p-1 rounded-xl self-start sm:self-auto text-xs font-medium text-gray-500">
            <button className="min-h-10 rounded-lg bg-white px-4 py-1 font-medium text-gray-800 shadow-sm transition-all cursor-pointer md:min-h-0">
              Weekly
            </button>
            <button
              onClick={() => navigate('/reports/monthly')}
              className="min-h-10 rounded-lg px-4 py-1 text-gray-500 transition-all hover:text-gray-800 cursor-pointer md:min-h-0"
            >
              Monthly
            </button>
          </div>
        </div>

        {/* Stat Cards */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4" data-purpose="key-metrics-summary">
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
            <span className="block text-[10px] font-bold tracking-wider text-gray-400 uppercase">Adherence</span>
            <span className="block text-2xl font-bold text-[#047835] mt-1.5 leading-none">{stats.adherence}%</span>
            <span className="mt-1 block text-[10px] font-medium text-gray-400">{stats.taken} of {stats.expected} expected</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
            <span className="block text-[10px] font-bold tracking-wider text-gray-400 uppercase">Taken</span>
            <span className="block text-2xl font-bold text-gray-900 mt-1.5 leading-none">{stats.taken}</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
            <span className="block text-[10px] font-bold tracking-wider text-gray-400 uppercase">Missed</span>
            <span className="block text-2xl font-bold text-[#b91c1c] mt-1.5 leading-none">{stats.missed}</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
            <span className="block text-[10px] font-bold tracking-wider text-gray-400 uppercase">Skipped</span>
            <span className="block text-2xl font-bold text-[#b45309] mt-1.5 leading-none">{stats.skipped}</span>
          </div>
        </section>

        {/* Daily Adherence Chart */}
        <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)] sm:p-6" data-purpose="daily-adherence-chart">
          <h2 className="mb-6 text-sm font-bold text-gray-800">Daily adherence</h2>
          <div className="-mx-1 overflow-x-auto px-1 pb-1">
            <div className="flex min-w-[320px] items-end justify-center space-x-3 pt-4 pb-2 sm:space-x-7">
              {dailyStats.map((item) => {
                const hasExpected = item.expected > 0;
                const barColor = hasExpected ? item.color : 'bg-slate-300';
                return (
                  <div
                    key={item.day}
                    className="flex flex-col items-center"
                    title={`${item.day}: ${item.taken} taken, ${item.missed} missed of ${item.expected} expected`}
                  >
                    <span className="mb-2 text-[10px] font-semibold text-gray-700">{item.percent}%</span>
                    <div className="relative flex h-36 w-9 items-end overflow-hidden rounded-md bg-[#f0f3f6] sm:w-10">
                      <div
                        className={`w-full rounded-md transition-all duration-500 ${barColor}`}
                        style={{ height: `${item.percent === 0 ? (hasExpected ? 4 : 3) : item.percent}%` }}
                      ></div>
                    </div>
                    <span className="mt-2 text-[10px] font-medium text-gray-400">{item.day}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* By Medicine Section */}
        <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)] sm:p-6" data-purpose="by-medicine-breakdown">
          <h2 className="mb-5 text-sm font-bold text-gray-800">By medicine</h2>
          {medicineStats.length === 0 ? (
            <div className="py-6 text-center text-xs text-gray-400">
              No medicine data yet
            </div>
          ) : (
            <div className="space-y-4">
              {medicineStats.map((med) => (
                <div key={med.name} className="flex flex-col gap-1.5 text-xs font-semibold text-gray-700 sm:flex-row sm:items-center sm:gap-0">
                  <div className="w-full truncate sm:w-48 sm:shrink-0">{med.name}</div>
                  <div className="mx-0 h-2 flex-1 overflow-hidden rounded-full bg-[#f0f3f6] sm:mx-3">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${med.percent >= 80 ? 'bg-[#047835]' : med.percent >= 50 ? 'bg-[#d96504]' : 'bg-[#b91c1c]'}`}
                      style={{ width: `${med.percent}%` }}
                    ></div>
                  </div>
                  <span className="w-auto text-left text-[11px] font-semibold text-gray-700 sm:w-9 sm:text-right">{med.percent}%</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

