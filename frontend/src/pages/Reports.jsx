import { useState, useEffect } from 'react';
import api from '../utils/api.js';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { downloadWithAuth } from '../utils/download.js';

const today = format(new Date(), 'yyyy-MM-dd');
const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');

export default function Reports() {
  const [tab, setTab] = useState('daily');
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  const [dailyParams, setDailyParams] = useState({ date: today, class: '' });
  const [weeklyParams, setWeeklyParams] = useState({ from: weekStart, to: weekEnd, class: '' });
  const [monthlyParams, setMonthlyParams] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear(), class: '' });
  const [classParams, setClassParams] = useState({ class: '', from: '', to: '' });

  useEffect(() => { api.get('/students/classes').then(r => setClasses(r.data.data.classes)); }, []);

  const fetchReport = async () => {
    setLoading(true);
    setData(null);
    try {
      let res;
      if (tab === 'daily') res = await api.get(`/reports/daily?date=${dailyParams.date}&class=${dailyParams.class}`);
      else if (tab === 'weekly') res = await api.get(`/reports/weekly?from=${weeklyParams.from}&to=${weeklyParams.to}&class=${weeklyParams.class}`);
      else if (tab === 'monthly') res = await api.get(`/reports/monthly?month=${monthlyParams.month}&year=${monthlyParams.year}&class=${monthlyParams.class}`);
      else res = await api.get(`/reports/by-class?class=${classParams.class}&from=${classParams.from}&to=${classParams.to}`);
      setData(res.data);
    } catch (err) { toast.error('Gagal memuat laporan'); }
    setLoading(false);
  };

  const downloadReport = (fmt) => {
    let url, filename;
    if (tab === 'daily') {
      url = `/reports/daily?date=${dailyParams.date}&class=${dailyParams.class}&format=${fmt}`;
      filename = `laporan-harian-${dailyParams.date}.${fmt === 'pdf' ? 'pdf' : 'xlsx'}`;
    } else if (tab === 'weekly') {
      url = `/reports/weekly?from=${weeklyParams.from}&to=${weeklyParams.to}&class=${weeklyParams.class}&format=${fmt}`;
      filename = `laporan-mingguan.${fmt === 'pdf' ? 'pdf' : 'xlsx'}`;
    } else if (tab === 'monthly') {
      url = `/reports/monthly?month=${monthlyParams.month}&year=${monthlyParams.year}&class=${monthlyParams.class}&format=${fmt}`;
      filename = `laporan-bulanan-${monthlyParams.year}-${monthlyParams.month}.${fmt === 'pdf' ? 'pdf' : 'xlsx'}`;
    } else {
      url = `/reports/by-class?class=${classParams.class}&format=${fmt}`;
      filename = `laporan-kelas-${classParams.class}.${fmt === 'pdf' ? 'pdf' : 'xlsx'}`;
    }
    downloadWithAuth(url, filename);
  };

  const tabs = [{ id: 'daily', label: 'Harian' }, { id: 'weekly', label: 'Mingguan' }, { id: 'monthly', label: 'Bulanan' }, { id: 'class', label: 'Per Kelas' }];

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">Laporan</h1>

      <div className="card">
        <div className="card-header">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
            {tabs.map(t => (
              <button key={t.id} onClick={() => { setTab(t.id); setData(null); }}
                className={`py-2 px-4 rounded-md text-sm font-medium transition-all ${tab === t.id ? 'bg-white shadow text-blue-800' : 'text-gray-600 hover:text-gray-800'}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="card-body">
          <div className="flex flex-wrap gap-3 mb-4">
            {tab === 'daily' && (
              <>
                <div><label className="label text-xs">Tanggal</label><input type="date" className="input" value={dailyParams.date} onChange={e => setDailyParams(p => ({ ...p, date: e.target.value }))} /></div>
                <div><label className="label text-xs">Kelas</label>
                  <select className="input" value={dailyParams.class} onChange={e => setDailyParams(p => ({ ...p, class: e.target.value }))}>
                    <option value="">Semua</option>{classes.map(c => <option key={c} value={c}>{c}</option>)}
                  </select></div>
              </>
            )}
            {tab === 'weekly' && (
              <>
                <div><label className="label text-xs">Dari</label><input type="date" className="input" value={weeklyParams.from} onChange={e => setWeeklyParams(p => ({ ...p, from: e.target.value }))} /></div>
                <div><label className="label text-xs">Sampai</label><input type="date" className="input" value={weeklyParams.to} onChange={e => setWeeklyParams(p => ({ ...p, to: e.target.value }))} /></div>
                <div><label className="label text-xs">Kelas</label>
                  <select className="input" value={weeklyParams.class} onChange={e => setWeeklyParams(p => ({ ...p, class: e.target.value }))}>
                    <option value="">Semua</option>{classes.map(c => <option key={c} value={c}>{c}</option>)}
                  </select></div>
              </>
            )}
            {tab === 'monthly' && (
              <>
                <div><label className="label text-xs">Bulan</label>
                  <select className="input" value={monthlyParams.month} onChange={e => setMonthlyParams(p => ({ ...p, month: e.target.value }))}>
                    {['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'].map((m, i) => (
                      <option key={i+1} value={i+1}>{m}</option>
                    ))}
                  </select></div>
                <div><label className="label text-xs">Tahun</label><input type="number" className="input w-28" value={monthlyParams.year} onChange={e => setMonthlyParams(p => ({ ...p, year: e.target.value }))} /></div>
                <div><label className="label text-xs">Kelas</label>
                  <select className="input" value={monthlyParams.class} onChange={e => setMonthlyParams(p => ({ ...p, class: e.target.value }))}>
                    <option value="">Semua</option>{classes.map(c => <option key={c} value={c}>{c}</option>)}
                  </select></div>
              </>
            )}
            {tab === 'class' && (
              <>
                <div><label className="label text-xs">Kelas *</label>
                  <select className="input" value={classParams.class} onChange={e => setClassParams(p => ({ ...p, class: e.target.value }))}>
                    <option value="">Pilih kelas</option>{classes.map(c => <option key={c} value={c}>{c}</option>)}
                  </select></div>
                <div><label className="label text-xs">Dari</label><input type="date" className="input" value={classParams.from} onChange={e => setClassParams(p => ({ ...p, from: e.target.value }))} /></div>
                <div><label className="label text-xs">Sampai</label><input type="date" className="input" value={classParams.to} onChange={e => setClassParams(p => ({ ...p, to: e.target.value }))} /></div>
              </>
            )}
            <div className="flex items-end">
              <button onClick={fetchReport} className="btn-primary" disabled={loading || (tab === 'class' && !classParams.class)}>
                {loading ? <LoadingSpinner size="sm" /> : '🔍'} Tampilkan
              </button>
            </div>
          </div>

          {data && (
            <>
              <div className="flex gap-2 mb-4">
                <button onClick={() => downloadReport('pdf')} className="btn-secondary btn-sm">📄 Download PDF</button>
                <button onClick={() => downloadReport('excel')} className="btn-secondary btn-sm">📊 Download Excel</button>
              </div>
              <ReportTable tab={tab} data={data} />
            </>
          )}
          {!data && !loading && (
            <div className="text-center py-12 text-gray-400">
              <svg className="w-16 h-16 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              <p>Pilih filter dan klik "Tampilkan" untuk melihat laporan</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ReportTable({ tab, data }) {
  if (tab === 'daily') {
    const late = data.data?.filter(r => r.status === 'Late') || [];
    return (
      <>
        <div className="flex gap-4 mb-3 text-sm">
          <span className="badge-late px-3 py-1 rounded-lg">{data.stats?.late} terlambat</span>
          <span className="badge-ontime px-3 py-1 rounded-lg">{data.stats?.onTime} tepat waktu</span>
        </div>
        <div className="overflow-x-auto">
          <table className="table">
            <thead><tr><th>No</th><th>NIS</th><th>Nama</th><th>Kelas</th><th>Jam Masuk</th><th>Terlambat</th><th>Sanksi</th></tr></thead>
            <tbody>
              {late.map((r, i) => (
                <tr key={r._id}><td>{i+1}</td><td className="font-mono text-xs">{r.student?.nis}</td><td>{r.student?.name}</td>
                  <td>{r.student?.class}</td>
                  <td>{new Date(r.arrivalTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</td>
                  <td><span className="badge-late">{r.tardinessMinutes} mnt</span></td>
                  <td className="text-sm">{r.sanctions?.map(s => s.sanction?.name).join(', ') || '-'}</td>
                </tr>
              ))}
              {late.length === 0 && <tr><td colSpan={7} className="text-center text-gray-400 py-6">Tidak ada siswa terlambat</td></tr>}
            </tbody>
          </table>
        </div>
      </>
    );
  }
  if (tab === 'weekly') {
    return (
      <div className="space-y-4">
        {Object.entries(data.data || {}).map(([day, recs]) => (
          <div key={day}>
            <h3 className="font-semibold text-blue-800 mb-2">{new Date(day).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })} ({recs.length} siswa)</h3>
            <table className="table">
              <thead><tr><th>Nama</th><th>Kelas</th><th>Terlambat</th></tr></thead>
              <tbody>{recs.map(r => (<tr key={r._id}><td>{r.student?.name}</td><td>{r.student?.class}</td><td>{r.tardinessMinutes} mnt</td></tr>))}</tbody>
            </table>
          </div>
        ))}
      </div>
    );
  }
  if (tab === 'monthly' || tab === 'class') {
    const rows = data.data || [];
    return (
      <table className="table">
        <thead><tr><th>No</th><th>NIS</th><th>Nama</th><th>Kelas</th><th>Jumlah Terlambat</th></tr></thead>
        <tbody>
          {rows.map((r, i) => (<tr key={i}><td>{i+1}</td><td className="font-mono text-xs">{r.student?.nis}</td><td>{r.student?.name}</td><td>{r.student?.class}</td><td><span className="badge-late">{r.count}x</span></td></tr>))}
          {rows.length === 0 && <tr><td colSpan={5} className="text-center text-gray-400 py-6">Tidak ada data</td></tr>}
        </tbody>
      </table>
    );
  }
  return null;
}
