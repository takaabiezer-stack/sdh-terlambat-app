import { useState, useEffect } from 'react';
import api from '../utils/api.js';
import toast from 'react-hot-toast';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function Sanctions() {
  const { hasPermission } = useAuth();
  const [sanctions, setSanctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', isActive: true });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    try { const r = await api.get('/sanctions'); setSanctions(r.data.data); } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditItem(null); setForm({ name: '', description: '', isActive: true }); setModalOpen(true); };
  const openEdit = (s) => { setEditItem(s); setForm({ name: s.name, description: s.description, isActive: s.isActive }); setModalOpen(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editItem) await api.put(`/sanctions/${editItem._id}`, form);
      else await api.post('/sanctions', form);
      toast.success(editItem ? 'Sanksi berhasil diupdate' : 'Sanksi berhasil ditambahkan');
      setModalOpen(false);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Gagal menyimpan'); }
    setSaving(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try { await api.delete(`/sanctions/${deleteId}`); toast.success('Sanksi dihapus'); setDeleteId(null); load(); }
    catch { toast.error('Gagal menghapus'); }
    setDeleting(false);
  };

  const toggleActive = async (s) => {
    try {
      await api.put(`/sanctions/${s._id}`, { isActive: !s.isActive });
      load();
    } catch {}
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Manajemen Sanksi</h1>
        {hasPermission('sanction:create') && (
          <button onClick={openAdd} className="btn-primary">+ Tambah Sanksi</button>
        )}
      </div>

      {loading ? <div className="h-64 flex items-center justify-center"><LoadingSpinner size="lg" /></div> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sanctions.length === 0 ? (
            <div className="col-span-3 text-center py-12 text-gray-400 card">
              <p className="text-4xl mb-3">📋</p>
              <p>Belum ada sanksi. Klik "Tambah Sanksi" untuk memulai.</p>
            </div>
          ) : sanctions.map(s => (
            <div key={s._id} className={`card p-5 ${!s.isActive ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold text-gray-900">{s.name}</h3>
                <span className={`badge flex-shrink-0 ${s.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {s.isActive ? 'Aktif' : 'Nonaktif'}
                </span>
              </div>
              {s.description && <p className="text-sm text-gray-500 mb-4">{s.description}</p>}
              <div className="flex gap-2 mt-auto pt-3 border-t border-gray-100">
                {hasPermission('sanction:update') && (
                  <>
                    <button onClick={() => openEdit(s)} className="btn-secondary btn-sm flex-1 justify-center">Edit</button>
                    <button onClick={() => toggleActive(s)} className={`btn-sm flex-1 justify-center ${s.isActive ? 'btn-secondary' : 'btn-success'}`}>
                      {s.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                    </button>
                  </>
                )}
                {hasPermission('sanction:delete') && (
                  <button onClick={() => setDeleteId(s._id)} className="btn-danger btn-sm">🗑</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Edit Sanksi' : 'Tambah Sanksi'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label">Nama Sanksi *</label>
            <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="Contoh: Push Up 20x" />
          </div>
          <div>
            <label className="label">Deskripsi</label>
            <textarea className="input" rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Penjelasan sanksi..." />
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="isActive" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} className="w-4 h-4 accent-blue-800" />
            <label htmlFor="isActive" className="text-sm font-medium text-gray-700">Sanksi aktif (dapat dipilih saat absensi)</label>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Batal</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete}
        title="Hapus Sanksi" message="Sanksi yang sudah digunakan dalam absensi tidak akan terhapus dari riwayat." loading={deleting} />
    </div>
  );
}
