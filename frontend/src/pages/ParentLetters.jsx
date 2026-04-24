import { useState, useEffect } from 'react';
import api from '../utils/api.js';
import toast from 'react-hot-toast';
import Modal from '../components/Modal.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { downloadWithAuth } from '../utils/download.js';

export default function ParentLetters() {
  const { hasPermission } = useAuth();
  const [eligible, setEligible] = useState([]);
  const [letters, setLetters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createModal, setCreateModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ period: `${getMonthStart()}|${getMonthEnd()}`, notes: '' });
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('eligible');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [eligRes, letRes] = await Promise.all([
        api.get('/parent-calls/eligible'),
        api.get('/parent-calls'),
      ]);
      setEligible(eligRes.data.data);
      setLetters(letRes.data.data);
    } catch {}
    setLoading(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/parent-calls', { studentId: selected._id, ...form });
      toast.success('Data panggilan berhasil dibuat');
      setCreateModal(false);
      setSelected(null);
      loadData();
    } catch (err) { toast.error(err.response?.data?.message || 'Gagal'); }
    setSaving(false);
  };

  const generateLetter = (id, studentName) => {
    downloadWithAuth(`/parent-calls/${id}/letter`, `surat-panggilan-${studentName || id}.pdf`);
  };

  const markSent = async (id) => {
    try { await api.put(`/parent-calls/${id}/sent`); toast.success('Ditandai terkirim'); loadData(); }
    catch { toast.error('Gagal'); }
  };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">Surat Panggilan Orang Tua</h1>

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {[['eligible','Perlu Dipanggil'], ['letters','Riwayat Surat']].map(([id, label]) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`py-2 px-4 rounded-md text-sm font-medium transition-all ${activeTab === id ? 'bg-white shadow text-blue-800' : 'text-gray-600'}`}>
            {label} {id === 'eligible' && eligible.length > 0 && <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-1.5">{eligible.length}</span>}
          </button>
        ))}
      </div>

      {loading ? <div className="h-64 flex items-center justify-center"><LoadingSpinner size="lg" /></div> : (
        activeTab === 'eligible' ? (
          <div className="card overflow-hidden">
            <div className="card-header">
              <p className="text-sm text-gray-500">Siswa yang telah mencapai batas keterlambatan dan perlu dipanggil orang tuanya.</p>
            </div>
            <table className="table">
              <thead><tr><th>Nama Siswa</th><th>Kelas</th><th>Keterlambatan</th><th>Level</th><th>Aksi</th></tr></thead>
              <tbody>
                {eligible.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-10 text-gray-400">Tidak ada siswa yang perlu dipanggil saat ini</td></tr>
                ) : eligible.map((e, i) => (
                  <tr key={i}>
                    <td>
                      <p className="font-medium">{e.student.name}</p>
                      <p className="text-xs text-gray-400">NIS: {e.student.nis}</p>
                    </td>
                    <td>{e.student.class}</td>
                    <td><span className="badge-late">{e.count}x terlambat</span></td>
                    <td>
                      <span className={`badge ${e.threshold.level === 'call' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {e.threshold.level === 'call' ? '📞 Panggilan' : '⚠️ Peringatan'}
                      </span>
                    </td>
                    <td>
                      {hasPermission('parent-call:create') && (
                        <button onClick={() => { setSelected(e.student); setCreateModal(true); }} className="btn-primary btn-sm">Buat Surat</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="table">
              <thead><tr><th>Siswa</th><th>Periode</th><th>Total Terlambat</th><th>Surat</th><th>Status</th><th>Aksi</th></tr></thead>
              <tbody>
                {letters.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-10 text-gray-400">Belum ada surat panggilan</td></tr>
                ) : letters.map(l => (
                  <tr key={l._id}>
                    <td>
                      <p className="font-medium">{l.student?.name}</p>
                      <p className="text-xs text-gray-400">{l.student?.class}</p>
                    </td>
                    <td className="text-sm text-gray-600">{l.period}</td>
                    <td><span className="badge-late">{l.totalTardiness}x</span></td>
                    <td>{l.letterGenerated ? <span className="badge bg-green-100 text-green-700">✓ Dibuat</span> : <span className="badge bg-gray-100 text-gray-500">Belum</span>}</td>
                    <td>{l.letterSentDate ? <span className="badge bg-blue-100 text-blue-700">Terkirim</span> : <span className="badge bg-gray-100 text-gray-500">Belum Terkirim</span>}</td>
                    <td>
                      <div className="flex gap-2">
                        {hasPermission('parent-call:generate') && (
                          <button onClick={() => generateLetter(l._id, l.student?.name)} className="btn-primary btn-sm">📄 PDF</button>
                        )}
                        {!l.letterSentDate && hasPermission('parent-call:create') && (
                          <button onClick={() => markSent(l._id)} className="btn-secondary btn-sm">✓ Tandai Terkirim</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      <Modal open={createModal} onClose={() => { setCreateModal(false); setSelected(null); }} title="Buat Surat Panggilan">
        {selected && (
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="font-bold text-blue-900">{selected.name}</p>
              <p className="text-sm text-blue-700">NIS: {selected.nis} | Kelas: {selected.class}</p>
              <p className="text-sm text-blue-700">Orang Tua: {selected.parentName}</p>
            </div>
            <div>
              <label className="label">Periode (dari | sampai)</label>
              <div className="grid grid-cols-2 gap-2">
                <input type="date" className="input" value={form.period.split('|')[0]} onChange={e => setForm(f => ({ ...f, period: `${e.target.value}|${f.period.split('|')[1]}` }))} />
                <input type="date" className="input" value={form.period.split('|')[1]} onChange={e => setForm(f => ({ ...f, period: `${f.period.split('|')[0]}|${e.target.value}` }))} />
              </div>
            </div>
            <div>
              <label className="label">Catatan</label>
              <textarea className="input" rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="flex gap-3 justify-end">
              <button type="button" className="btn-secondary" onClick={() => setCreateModal(false)}>Batal</button>
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Memproses...' : 'Buat Surat'}</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

function getMonthStart() {
  const d = new Date(); d.setDate(1);
  return d.toISOString().split('T')[0];
}
function getMonthEnd() {
  const d = new Date(); d.setMonth(d.getMonth() + 1); d.setDate(0);
  return d.toISOString().split('T')[0];
}
