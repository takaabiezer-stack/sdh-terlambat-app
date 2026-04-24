import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api.js';
import toast from 'react-hot-toast';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { downloadWithAuth } from '../utils/download.js';

const EMPTY = { nis: '', name: '', class: '', grade: '', parentName: '', parentPhone: '', parentEmail: '', address: '' };

export default function Students() {
  const { hasPermission } = useAuth();
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [modalOpen, setModalOpen] = useState(false);
  const [editStudent, setEditStudent] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20, ...(search && { search }), ...(filterClass && { class: filterClass }) });
      const res = await api.get(`/students?${params}`);
      setStudents(res.data.data);
      setPagination(res.data.pagination);
    } catch { toast.error('Gagal memuat data siswa'); }
    setLoading(false);
  }, [search, filterClass, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { api.get('/students/classes').then(r => setClasses(r.data.data.classes)); }, []);

  const openAdd = () => { setEditStudent(null); setForm(EMPTY); setModalOpen(true); };
  const openEdit = (s) => { setEditStudent(s); setForm(s); setModalOpen(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editStudent) await api.put(`/students/${editStudent._id}`, form);
      else await api.post('/students', form);
      toast.success(editStudent ? 'Data berhasil diupdate' : 'Siswa berhasil ditambahkan');
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan');
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/students/${deleteId}`);
      toast.success('Siswa berhasil diarsipkan');
      setDeleteId(null);
      load();
    } catch { toast.error('Gagal menghapus'); }
    setDeleting(false);
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await api.post('/students/import', fd);
      toast.success(res.data.message);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Import gagal'); }
    e.target.value = '';
  };

  const handleExport = () => downloadWithAuth('/students/export', 'data-siswa.xlsx');
  const handleTemplate = () => downloadWithAuth('/students/template', 'template-import-siswa.xlsx');

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Data Siswa</h1>
        <div className="flex gap-2 flex-wrap">
          {hasPermission('student:import') && (
            <button onClick={handleTemplate} className="btn-secondary text-sm">
              📋 Template Import
            </button>
          )}
          {hasPermission('student:import') && (
            <label className="btn-secondary cursor-pointer text-sm">
              📥 Import Excel
              <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
            </label>
          )}
          {hasPermission('student:export') && (
            <button onClick={handleExport} className="btn-secondary text-sm">📤 Export</button>
          )}
          {hasPermission('student:create') && (
            <button onClick={openAdd} className="btn-primary text-sm">+ Tambah Siswa</button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <input className="input max-w-xs" placeholder="Cari nama atau NIS..." value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }} />
        <select className="input max-w-xs" value={filterClass} onChange={e => { setFilterClass(e.target.value); setPage(1); }}>
          <option value="">Semua Kelas</option>
          {classes.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="card overflow-hidden">
        {loading ? <div className="h-64 flex items-center justify-center"><LoadingSpinner size="lg" /></div> : (
          <>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr><th>NIS</th><th>Nama</th><th>Kelas</th><th>Orang Tua</th><th>No. HP</th><th>Aksi</th></tr>
                </thead>
                <tbody>
                  {students.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-12 text-gray-400">Tidak ada data siswa</td></tr>
                  ) : students.map(s => (
                    <tr key={s._id}>
                      <td className="font-mono text-sm text-gray-600">{s.nis}</td>
                      <td className="font-medium">{s.name}</td>
                      <td><span className="badge bg-blue-50 text-blue-800">{s.class}</span></td>
                      <td className="text-sm text-gray-600">{s.parentName}</td>
                      <td className="text-sm text-gray-600">{s.parentPhone}</td>
                      <td>
                        <div className="flex gap-2">
                          {hasPermission('student:update') && (
                            <button onClick={() => openEdit(s)} className="text-blue-600 hover:text-blue-800 text-sm font-medium">Edit</button>
                          )}
                          {hasPermission('student:delete') && (
                            <button onClick={() => setDeleteId(s._id)} className="text-red-500 hover:text-red-700 text-sm font-medium">Hapus</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pagination.pages > 1 && (
              <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between text-sm">
                <p className="text-gray-500">Total: {pagination.total} siswa</p>
                <div className="flex gap-2">
                  <button className="btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                  <span className="py-1.5 px-3 text-gray-600">{page} / {pagination.pages}</span>
                  <button className="btn-secondary btn-sm" disabled={page === pagination.pages} onClick={() => setPage(p => p + 1)}>Next →</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editStudent ? 'Edit Siswa' : 'Tambah Siswa'} size="lg">
        <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[['NIS *', 'nis', true], ['Nama Lengkap *', 'name', true], ['Kelas *', 'class', true], ['Tingkat *', 'grade', true], ['Nama Orang Tua *', 'parentName', true], ['No. HP Orang Tua *', 'parentPhone', true], ['Email Orang Tua', 'parentEmail', false]].map(([label, key, req]) => (
            <div key={key}>
              <label className="label">{label}</label>
              <input className="input" value={form[key] || ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} required={req} />
            </div>
          ))}
          <div className="sm:col-span-2">
            <label className="label">Alamat</label>
            <textarea className="input" rows={2} value={form.address || ''} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
          </div>
          <div className="sm:col-span-2 flex gap-3 justify-end pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Batal</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete}
        title="Hapus Siswa" message="Siswa akan diarsipkan dan tidak muncul di daftar. Data absensi tetap tersimpan."
        loading={deleting} />
    </div>
  );
}
