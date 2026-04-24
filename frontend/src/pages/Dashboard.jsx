import { useEffect, useState, useCallback } from 'react';
import api from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

const WIDGET_DEFS = [
  { id: 'stats',     label: 'Statistik Hari Ini' },
  { id: 'today',     label: 'Daftar Terlambat Hari Ini' },
  { id: 'sanctions', label: 'Rekap Sanksi Siswa' },
  { id: 'violators', label: 'Top Pelanggar' },
];

const DEFAULT_VISIBLE = ['stats', 'today', 'sanctions', 'violators'];
const LS_KEY = 'dashboard_widgets';

function useWidgetConfig() {
  const [visible, setVisible] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY)) || DEFAULT_VISIBLE; }
    catch { return DEFAULT_VISIBLE; }
  });
  const toggle = (id) => setVisible(v => {
    const next = v.includes(id) ? v.filter(x => x !== id) : [...v, id];
    localStorage.setItem(LS_KEY, JSON.stringify(next));
    return next;
  });
  return { visible, toggle };
}

export default function Dashboard() {
  const { user } = useAuth();
  const { visible, toggle } = useWidgetConfig();
  const [configOpen, setConfigOpen] = useState(false);

  const [stats, setStats] = useState({ todayLate: 0, todayTotal: 0, monthLate: 0 });
  const [todayRecords, setTodayRecords] = useState([]);
  const [sanctions, setSanctions] = useState([]);
  const [violators, setViolators] = useState([]);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const loadBase = useCallback(async () => {
    try {
      const [sRes, tRes] = await Promise.all([
        api.get('/attendance/stats'),
        api.get('/attendance/today'),
      ]);
      setStats(sRes.data.data);
      setTodayRecords(tRes.data.data);
    } catch {}
  }, []);

  const loadPeriod = useCallback(async () => {
    try {
      const [sanRes, volRes] = await Promise.all([
        api.get(`/attendance/sanctions-summary?month=${month}&year=${year}`),
        api.get(`/attendance/top-violators?month=${month}&year=${year}&limit=10`),
      ]);
      setSanctions(sanRes.data.data);
      setViolators(volRes.data.data);
    } catch {}
  }, [month, year]);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadBase(), loadPeriod()]).finally(() => setLoading(false));
    const interval = setInterval(loadBase, 60000);
    return () => clearInterval(interval);
  }, [loadBase, loadPeriod]);

  useEffect(() => { loadPeriod(); }, [loadPeriod]);

  const today = format(new Date(), 'EEEE, d MMMM yyyy', { locale: id });
  const lateToday = todayRecords.filter(r => r.status === 'Late');
  const maxCount = violators[0]?.count || 1;

  const MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">{today}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm text-gray-500">Selamat datang,</p>
            <p className="font-semibold text-gray-800">{user?.fullName}</p>
          </div>
          <button onClick={() => setConfigOpen(o => !o)}
            className={`p-2 rounded-xl border transition-colors ${configOpen ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-500 hover:text-gray-700'}`}
            title="Kustomisasi widget">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>

      {configOpen && (
        <div className="card p-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">Tampilkan Widget:</p>
          <div className="flex flex-wrap gap-2">
            {WIDGET_DEFS.map(w => (
              <button key={w.id} onClick={() => toggle(w.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${visible.includes(w.id) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-300 hover:border-blue-400'}`}>
                {visible.includes(w.id) ? '✓ ' : ''}{w.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? <div className="h-40 flex items-center justify-center"><LoadingSpinner size="lg" /></div> : (
        <>
          {visible.includes('stats') && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="stat-card">
                <div className="stat-icon bg-red-100 text-red-600">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-900">{stats.todayLate}</p>
                  <p className="text-sm text-gray-500">Terlambat Hari Ini</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon bg-blue-100 text-blue-700">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-900">{stats.todayTotal}</p>
                  <p className="text-sm text-gray-500">Total Absensi Hari Ini</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon bg-orange-100 text-orange-600">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-900">{stats.monthLate}</p>
                  <p className="text-sm text-gray-500">Terlambat Bulan Ini</p>
                </div>
              </div>
            </div>
          )}

          {visible.includes('today') && (
            <div className="card">
              <div className="card-header flex items-center justify-between">
                <h2 className="font-semibold text-gray-800">Keterlambatan Hari Ini ({lateToday.length} siswa)</h2>
                <button onClick={loadBase} className="text-sm text-blue-700 hover:underline">Refresh</button>
              </div>
              <div className="overflow-x-auto">
                {lateToday.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <svg className="w-16 h-16 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <p>Belum ada siswa terlambat hari ini</p>
                  </div>
                ) : (
                  <table className="table">
                    <thead><tr><th>No</th><th>NIS</th><th>Nama</th><th>Kelas</th><th>Jam Masuk</th><th>Terlambat</th><th>Sanksi</th></tr></thead>
                    <tbody>
                      {lateToday.map((r, i) => (
                        <tr key={r._id}>
                          <td className="text-gray-400">{i + 1}</td>
                          <td className="font-mono text-sm">{r.student?.nis}</td>
                          <td className="font-medium">{r.student?.name}</td>
                          <td><span className="badge bg-blue-50 text-blue-800">{r.student?.class}</span></td>
                          <td>{r.arrivalTime ? new Date(r.arrivalTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                          <td><span className="font-semibold text-red-600">{r.tardinessMinutes} mnt</span></td>
                          <td className="text-sm text-gray-600">{r.sanctions?.map(s => s.sanction?.name).join(', ') || <span className="text-gray-400">-</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {(visible.includes('sanctions') || visible.includes('violators')) && (
            <div className="flex flex-wrap gap-3 items-center">
              <span className="text-sm text-gray-500 font-medium">Filter rekap:</span>
              <select className="input input-sm w-36" value={month} onChange={e => setMonth(Number(e.target.value))}>
                {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
              </select>
              <input type="number" className="input input-sm w-24" value={year} onChange={e => setYear(Number(e.target.value))} min={2020} max={2099} />
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {visible.includes('sanctions') && (
              <div className="card">
                <div className="card-header">
                  <h2 className="font-semibold text-gray-800">Rekap Sanksi — {MONTHS[month-1]} {year}</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Siswa yang mendapatkan sanksi bulan ini</p>
                </div>
                <div className="overflow-x-auto">
                  {sanctions.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 text-sm">Tidak ada data sanksi bulan ini</div>
                  ) : (
                    <table className="table">
                      <thead><tr><th>Siswa</th><th>Kelas</th><th>Hari</th><th>Sanksi</th></tr></thead>
                      <tbody>
                        {sanctions.map((s, i) => (
                          <tr key={i}>
                            <td>
                              <p className="font-medium text-sm">{s.student.name}</p>
                              <p className="text-xs text-gray-400">{s.student.nis}</p>
                            </td>
                            <td><span className="badge bg-blue-50 text-blue-800 text-xs">{s.student.class}</span></td>
                            <td><span className="badge-late text-xs">{s.count}x</span></td>
                            <td className="text-xs text-gray-600 max-w-[160px]">{s.sanctions.join(', ') || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {visible.includes('violators') && (
              <div className="card">
                <div className="card-header">
                  <h2 className="font-semibold text-gray-800">Top Pelanggar — {MONTHS[month-1]} {year}</h2>
                  <p className="text-xs text-gray-400 mt-0.5">10 siswa paling sering terlambat</p>
                </div>
                <div className="p-4 space-y-3">
                  {violators.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">Tidak ada data bulan ini</div>
                  ) : violators.map((v, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${i === 0 ? 'bg-red-500 text-white' : i === 1 ? 'bg-orange-400 text-white' : i === 2 ? 'bg-yellow-400 text-white' : 'bg-gray-100 text-gray-500'}`}>{i+1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-sm font-medium text-gray-800 truncate">{v.student.name}</p>
                          <span className="text-xs font-bold text-red-600 ml-2 flex-shrink-0">{v.count}x</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                            <div className="bg-red-400 h-1.5 rounded-full transition-all" style={{ width: `${(v.count / maxCount) * 100}%` }} />
                          </div>
                          <span className="text-xs text-gray-400 flex-shrink-0">{v.student.class}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
