import { useState, useEffect, useRef } from 'react';
import api from '../utils/api.js';
import toast from 'react-hot-toast';
import BarcodeScanner from '../components/BarcodeScanner.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const STATUS_MAP = {
  Late:    ['badge-late',    'Terlambat'],
  OnTime:  ['badge-ontime',  'Tepat Waktu'],
  Absent:  ['badge-absent',  'Tidak Hadir'],
  Excused: ['badge-excused', 'Izin'],
};

export default function Attendance() {
  const { hasPermission } = useAuth();
  const [tab, setTab] = useState('barcode');
  const [sanctions, setSanctions] = useState([]);
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedSanctions, setSelectedSanctions] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [scanActive, setScanActive] = useState(true);
  const [todayRecords, setTodayRecords] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(true);

  // Edit/Delete state
  const [editRecord, setEditRecord] = useState(null);
  const [editForm, setEditForm] = useState({ arrivalTime: '', notes: '', status: '' });
  const [editSaving, setEditSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const searchRef = useRef(null);

  useEffect(() => {
    api.get('/sanctions?active=true').then(r => setSanctions(r.data.data));
    loadToday();
  }, []);

  useEffect(() => {
    if (search.length >= 2) {
      api.get(`/students?search=${search}&limit=10`).then(r => setStudents(r.data.data));
    } else setStudents([]);
  }, [search]);

  const loadToday = async () => {
    setLoadingRecords(true);
    try {
      const r = await api.get('/attendance/today');
      setTodayRecords(r.data.data);
    } catch {}
    setLoadingRecords(false);
  };

  const handleBarcodeScan = async (nis) => {
    setScanActive(false);
    try {
      const res = await api.get(`/students/nis/${nis}`);
      setSelectedStudent(res.data.data);
      toast.success(`Siswa ditemukan: ${res.data.data.name}`);
    } catch {
      toast.error('NIS tidak ditemukan dalam sistem');
      setTimeout(() => setScanActive(true), 2000);
    }
  };

  const handleSelectStudent = (s) => {
    setSelectedStudent(s);
    setSearch('');
    setStudents([]);
  };

  const handleSubmit = async () => {
    if (!selectedStudent) return toast.error('Pilih siswa terlebih dahulu');
    setSubmitting(true);
    try {
      const res = await api.post('/attendance', {
        studentId: selectedStudent._id,
        sanctionIds: selectedSanctions,
        inputMethod: tab,
      });
      const rec = res.data.data;
      setResult(rec);
      if (rec.status === 'Late') toast.success(`Terlambat ${rec.tardinessMinutes} menit — absensi dicatat`);
      else toast.success('Tepat waktu — absensi dicatat');
      setSelectedStudent(null);
      setSelectedSanctions([]);
      setScanActive(true);
      loadToday();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan absensi');
    }
    setSubmitting(false);
  };

  const toggleSanction = (id) =>
    setSelectedSanctions(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const openEdit = (rec) => {
    const local = new Date(rec.arrivalTime);
    const pad = n => String(n).padStart(2, '0');
    const timeStr = `${local.getFullYear()}-${pad(local.getMonth()+1)}-${pad(local.getDate())}T${pad(local.getHours())}:${pad(local.getMinutes())}`;
    setEditForm({ arrivalTime: timeStr, notes: rec.notes || '', status: rec.status });
    setEditRecord(rec);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setEditSaving(true);
    try {
      await api.put(`/attendance/${editRecord._id}`, {
        arrivalTime: editForm.arrivalTime ? new Date(editForm.arrivalTime).toISOString() : undefined,
        notes: editForm.notes,
        status: editForm.status,
      });
      toast.success('Data absensi berhasil diperbarui');
      setEditRecord(null);
      loadToday();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal memperbarui');
    }
    setEditSaving(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/attendance/${deleteId}`);
      toast.success('Data absensi berhasil dihapus');
      setDeleteId(null);
      loadToday();
    } catch {
      toast.error('Gagal menghapus');
    }
    setDeleting(false);
  };

  const lateCount = todayRecords.filter(r => r.status === 'Late').length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Input Absensi</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Panel */}
        <div className="card">
          <div className="card-header">
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              {['barcode', 'manual'].map(t => (
                <button key={t} onClick={() => { setTab(t); setSelectedStudent(null); setScanActive(t === 'barcode'); }}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${tab === t ? 'bg-white shadow text-blue-800' : 'text-gray-600 hover:text-gray-800'}`}>
                  {t === 'barcode' ? '📷 Scan Barcode' : '✍️ Pilih Nama'}
                </button>
              ))}
            </div>
          </div>
          <div className="card-body space-y-4">
            {tab === 'barcode' ? (
              !selectedStudent
                ? <BarcodeScanner onResult={handleBarcodeScan} active={scanActive} />
                : <StudentCard student={selectedStudent} onClear={() => { setSelectedStudent(null); setScanActive(true); }} />
            ) : (
              <>
                <div className="relative">
                  <input className="input" placeholder="Cari nama atau NIS..." value={search}
                    onChange={e => setSearch(e.target.value)} ref={searchRef} />
                  {students.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-10 bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-56 overflow-y-auto">
                      {students.map(s => (
                        <button key={s._id} onClick={() => handleSelectStudent(s)}
                          className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100 last:border-0">
                          <p className="font-medium text-sm">{s.name}</p>
                          <p className="text-xs text-gray-500">NIS: {s.nis} | Kelas: {s.class}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {selectedStudent && <StudentCard student={selectedStudent} onClear={() => setSelectedStudent(null)} />}
              </>
            )}

            {selectedStudent && (
              <>
                <div>
                  <label className="label">Sanksi (opsional)</label>
                  <div className="grid grid-cols-1 gap-2">
                    {sanctions.map(s => (
                      <label key={s._id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${selectedSanctions.includes(s._id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                        <input type="checkbox" checked={selectedSanctions.includes(s._id)} onChange={() => toggleSanction(s._id)} className="w-4 h-4 accent-blue-800" />
                        <div>
                          <p className="text-sm font-medium">{s.name}</p>
                          {s.description && <p className="text-xs text-gray-500">{s.description}</p>}
                        </div>
                      </label>
                    ))}
                    {sanctions.length === 0 && <p className="text-sm text-gray-400 italic">Belum ada sanksi aktif.</p>}
                  </div>
                </div>
                <button onClick={handleSubmit} disabled={submitting} className="btn-primary w-full justify-center py-3 text-base">
                  {submitting ? <><LoadingSpinner size="sm" /> Menyimpan...</> : '✅ Simpan Absensi'}
                </button>
              </>
            )}

            {result && (
              <div className={`rounded-xl p-4 border ${result.status === 'Late' ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                <p className="font-bold text-lg">{result.status === 'Late' ? `⏰ Terlambat ${result.tardinessMinutes} menit` : '✅ Tepat Waktu'}</p>
                <p className="text-sm text-gray-600 mt-1">Absensi dicatat untuk <strong>{result.student?.name}</strong></p>
              </div>
            )}
          </div>
        </div>

        {/* Today Records */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="font-semibold">Absensi Hari Ini
              <span className="ml-2 text-sm font-normal text-gray-500">({lateCount} terlambat)</span>
            </h2>
            <button onClick={loadToday} className="text-sm text-blue-700 hover:underline">Refresh</button>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: 480 }}>
            {loadingRecords ? (
              <div className="h-32 flex items-center justify-center"><LoadingSpinner /></div>
            ) : todayRecords.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">Belum ada absensi hari ini</div>
            ) : (
              <table className="table">
                <thead>
                  <tr><th>Nama</th><th>Kelas</th><th>Jam</th><th>Status</th>
                    {(hasPermission('attendance:update') || hasPermission('attendance:delete')) && <th>Aksi</th>}
                  </tr>
                </thead>
                <tbody>
                  {todayRecords.map(r => {
                    const [cls, label] = STATUS_MAP[r.status] || ['badge-absent', r.status];
                    return (
                      <tr key={r._id}>
                        <td>
                          <p className="font-medium text-sm">{r.student?.name}</p>
                          <p className="text-xs text-gray-400">{r.student?.nis}</p>
                        </td>
                        <td><span className="badge bg-gray-100 text-gray-700">{r.student?.class}</span></td>
                        <td className="text-sm">{new Date(r.arrivalTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</td>
                        <td>
                          <span className={cls}>{r.status === 'Late' ? `${r.tardinessMinutes} mnt` : label}</span>
                        </td>
                        {(hasPermission('attendance:update') || hasPermission('attendance:delete')) && (
                          <td>
                            <div className="flex gap-2">
                              {hasPermission('attendance:update') && (
                                <button onClick={() => openEdit(r)} className="text-blue-600 hover:text-blue-800 text-xs font-medium">Edit</button>
                              )}
                              {hasPermission('attendance:delete') && (
                                <button onClick={() => setDeleteId(r._id)} className="text-red-500 hover:text-red-700 text-xs font-medium">Hapus</button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal open={!!editRecord} onClose={() => setEditRecord(null)} title="Edit Data Absensi" size="sm">
        {editRecord && (
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="bg-blue-50 rounded-lg p-3 text-sm">
              <p className="font-semibold text-blue-900">{editRecord.student?.name}</p>
              <p className="text-blue-700">NIS: {editRecord.student?.nis} | Kelas: {editRecord.student?.class}</p>
            </div>
            <div>
              <label className="label">Waktu Masuk</label>
              <input type="datetime-local" className="input" value={editForm.arrivalTime}
                onChange={e => setEditForm(f => ({ ...f, arrivalTime: e.target.value }))} />
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}>
                <option value="Late">Terlambat</option>
                <option value="OnTime">Tepat Waktu</option>
                <option value="Excused">Izin</option>
                <option value="Absent">Tidak Hadir</option>
              </select>
            </div>
            <div>
              <label className="label">Catatan</label>
              <textarea className="input" rows={2} value={editForm.notes}
                onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Catatan opsional..." />
            </div>
            <div className="flex gap-3 justify-end pt-1">
              <button type="button" className="btn-secondary" onClick={() => setEditRecord(null)}>Batal</button>
              <button type="submit" className="btn-primary" disabled={editSaving}>
                {editSaving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Hapus Data Absensi"
        message="Data absensi ini akan dihapus permanen dan tidak dapat dikembalikan."
        loading={deleting}
        confirmText="Hapus"
        confirmClass="btn-danger"
      />
    </div>
  );
}

function StudentCard({ student, onClear }) {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start justify-between">
      <div>
        <p className="font-bold text-blue-900 text-lg">{student.name}</p>
        <p className="text-sm text-blue-700">NIS: {student.nis} | Kelas: {student.class}</p>
        <p className="text-xs text-blue-600 mt-1">Orang Tua: {student.parentName}</p>
      </div>
      <button onClick={onClear} className="text-blue-400 hover:text-blue-600 ml-2 mt-1">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
