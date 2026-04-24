import { useState, useEffect } from 'react';
import api from '../utils/api.js';
import toast from 'react-hot-toast';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const EMPTY_USER = { username: '', email: '', password: '', fullName: '', roleId: '', assignedClass: '', isActive: true };

// Semua permission dikelompokkan per modul
const PERMISSION_GROUPS = [
  { label: 'Absensi',      prefix: 'attendance',   perms: ['create','read','update','delete'] },
  { label: 'Siswa',        prefix: 'student',       perms: ['create','read','update','delete','import','export'] },
  { label: 'Sanksi',       prefix: 'sanction',      perms: ['create','read','update','delete'] },
  { label: 'Laporan',      prefix: 'report',        perms: ['read','export'] },
  { label: 'Pengaturan',   prefix: 'setting',       perms: ['read','update','branding'] },
  { label: 'Pengguna',     prefix: 'user',          perms: ['create','read','update','delete'] },
  { label: 'Role',         prefix: 'role',          perms: ['create','read','update','delete'] },
  { label: 'Panggilan OT', prefix: 'parent-call',   perms: ['create','read','generate'] },
  { label: 'Audit Log',    prefix: 'audit',         perms: ['read'] },
];

const permKey = (prefix, p) => `${prefix}:${p}`;

export default function Users() {
  const { hasPermission, user: me } = useAuth();
  const [users, setUsers]   = useState([]);
  const [roles, setRoles]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]       = useState('users');

  // User modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser]   = useState(null);
  const [form, setForm]           = useState(EMPTY_USER);
  const [saving, setSaving]       = useState(false);

  // Deactivate
  const [deactivateId, setDeactivateId]   = useState(null);
  const [deactivating, setDeactivating]   = useState(false);

  // Reset password
  const [resetModal, setResetModal] = useState(null);
  const [newPass, setNewPass]       = useState('');
  const [resetting, setResetting]   = useState(false);

  // Role editor
  const [editRole, setEditRole]         = useState(null);  // role object
  const [rolePerms, setRolePerms]       = useState([]);    // array of selected perm strings
  const [savingRole, setSavingRole]     = useState(false);
  const [roleNameForm, setRoleNameForm] = useState({ name: '', displayName: '' });

  // New role modal
  const [newRoleModal, setNewRoleModal]   = useState(false);
  const [newRoleForm, setNewRoleForm]     = useState({ name: '', displayName: '', permissions: [] });
  const [creatingRole, setCreatingRole]   = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [uRes, rRes] = await Promise.all([api.get('/users'), api.get('/users/roles')]);
      setUsers(uRes.data.data);
      setRoles(rRes.data.data);
    } catch {}
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  // ── USER CRUD ──────────────────────────────────────────────────
  const openAdd  = () => { setEditUser(null); setForm(EMPTY_USER); setModalOpen(true); };
  const openEdit = (u) => {
    setEditUser(u);
    setForm({ username: u.username, email: u.email, password: '', fullName: u.fullName, roleId: u.role?._id, assignedClass: u.assignedClass || '', isActive: u.isActive });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.password) delete payload.password;
      if (editUser) await api.put(`/users/${editUser._id}`, payload);
      else          await api.post('/users', payload);
      toast.success(editUser ? 'Pengguna berhasil diupdate' : 'Pengguna berhasil dibuat');
      setModalOpen(false);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Gagal menyimpan'); }
    setSaving(false);
  };

  const handleDeactivate = async () => {
    setDeactivating(true);
    try { await api.delete(`/users/${deactivateId}`); toast.success('Pengguna dinonaktifkan'); setDeactivateId(null); load(); }
    catch { toast.error('Gagal'); }
    setDeactivating(false);
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setResetting(true);
    try { await api.post(`/users/${resetModal}/reset-password`, { newPassword: newPass }); toast.success('Password berhasil direset'); setResetModal(null); setNewPass(''); }
    catch { toast.error('Gagal'); }
    setResetting(false);
  };

  // ── ROLE EDITOR ────────────────────────────────────────────────
  const openRoleEdit = (role) => {
    setEditRole(role);
    setRolePerms([...role.permissions]);
    setRoleNameForm({ name: role.name, displayName: role.displayName });
  };

  const togglePerm = (perm) =>
    setRolePerms(p => p.includes(perm) ? p.filter(x => x !== perm) : [...p, perm]);

  const toggleGroup = (group) => {
    const allPerms = group.perms.map(p => permKey(group.prefix, p));
    const allSelected = allPerms.every(p => rolePerms.includes(p));
    if (allSelected) setRolePerms(prev => prev.filter(p => !allPerms.includes(p)));
    else setRolePerms(prev => [...new Set([...prev, ...allPerms])]);
  };

  const handleSaveRole = async () => {
    setSavingRole(true);
    try {
      await api.put(`/users/roles/${editRole._id}`, {
        displayName: roleNameForm.displayName,
        permissions: rolePerms,
      });
      toast.success('Permission role berhasil disimpan');
      setEditRole(null);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Gagal menyimpan'); }
    setSavingRole(false);
  };

  const handleCreateRole = async (e) => {
    e.preventDefault();
    setCreatingRole(true);
    try {
      await api.post('/users/roles', newRoleForm);
      toast.success('Role baru berhasil dibuat');
      setNewRoleModal(false);
      setNewRoleForm({ name: '', displayName: '', permissions: [] });
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Gagal membuat role'); }
    setCreatingRole(false);
  };

  const selectAllPerms = () => {
    const all = PERMISSION_GROUPS.flatMap(g => g.perms.map(p => permKey(g.prefix, p)));
    setRolePerms(all);
  };

  const clearAllPerms = () => setRolePerms([]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Manajemen Pengguna</h1>
        <div className="flex gap-2">
          {hasPermission('role:create') && tab === 'roles' && (
            <button onClick={() => setNewRoleModal(true)} className="btn-secondary">+ Buat Role Baru</button>
          )}
          {hasPermission('user:create') && tab === 'users' && (
            <button onClick={openAdd} className="btn-primary">+ Tambah Pengguna</button>
          )}
        </div>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {['users', 'roles'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`py-2 px-5 rounded-md text-sm font-medium transition-all ${tab === t ? 'bg-white shadow text-blue-800' : 'text-gray-600'}`}>
            {t === 'users' ? 'Pengguna' : 'Role & Izin'}
          </button>
        ))}
      </div>

      {loading ? <div className="h-64 flex items-center justify-center"><LoadingSpinner size="lg" /></div> : (
        tab === 'users' ? (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr><th>Nama</th><th>Username</th><th>Role</th><th>Status</th><th>Login Terakhir</th><th>Aksi</th></tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-10 text-gray-400">Tidak ada pengguna</td></tr>
                  ) : users.map(u => (
                    <tr key={u._id}>
                      <td><p className="font-medium">{u.fullName}</p><p className="text-xs text-gray-400">{u.email}</p></td>
                      <td className="font-mono text-sm">{u.username}</td>
                      <td><span className="badge bg-blue-50 text-blue-800">{u.role?.displayName}</span></td>
                      <td><span className={`badge ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{u.isActive ? 'Aktif' : 'Nonaktif'}</span></td>
                      <td className="text-sm text-gray-500">{u.lastLogin ? new Date(u.lastLogin).toLocaleDateString('id-ID') : '-'}</td>
                      <td>
                        <div className="flex gap-2 flex-wrap">
                          {hasPermission('user:update') && <button onClick={() => openEdit(u)} className="text-blue-600 hover:text-blue-800 text-sm">Edit</button>}
                          {hasPermission('user:update') && <button onClick={() => { setResetModal(u._id); setNewPass(''); }} className="text-orange-500 hover:text-orange-700 text-sm">Reset PW</button>}
                          {hasPermission('user:delete') && u._id !== me?._id && u.isActive && (
                            <button onClick={() => setDeactivateId(u._id)} className="text-red-500 hover:text-red-700 text-sm">Nonaktif</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* ── TAB ROLES ── */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {roles.map(r => (
              <div key={r._id} className="card p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-gray-900">{r.displayName}</h3>
                    <p className="text-xs text-gray-400 font-mono">{r.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.isSystem && <span className="badge bg-gray-100 text-gray-500 text-xs">System</span>}
                    {hasPermission('role:update') && (
                      <button onClick={() => openRoleEdit(r)} className="btn-secondary btn-sm text-xs">
                        ✏️ Edit Izin
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {r.permissions.map(p => (
                    <span key={p} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{p}</span>
                  ))}
                  {r.permissions.length === 0 && <span className="text-xs text-gray-400 italic">Tidak ada izin</span>}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ── MODAL TAMBAH PENGGUNA ── */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editUser ? 'Edit Pengguna' : 'Tambah Pengguna'}>
        <form onSubmit={handleSave} className="space-y-4">
          {[
            ['Nama Lengkap *', 'fullName', 'text', true],
            ['Username *', 'username', 'text', true],
            ['Email *', 'email', 'email', true],
            [editUser ? 'Password Baru (kosongkan jika tidak diubah)' : 'Password *', 'password', 'password', !editUser],
          ].map(([label, key, type, req]) => (
            <div key={key}>
              <label className="label">{label}</label>
              <input className="input" type={type} value={form[key] || ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} required={req} />
            </div>
          ))}
          <div>
            <label className="label">Role *</label>
            <select className="input" value={form.roleId} onChange={e => setForm(f => ({ ...f, roleId: e.target.value }))} required>
              <option value="">Pilih role</option>
              {roles.map(r => <option key={r._id} value={r._id}>{r.displayName}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Kelas yang Diampu (untuk Wali Kelas)</label>
            <input className="input" placeholder="Contoh: X IPA 1" value={form.assignedClass} onChange={e => setForm(f => ({ ...f, assignedClass: e.target.value }))} />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Batal</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</button>
          </div>
        </form>
      </Modal>

      {/* ── MODAL EDIT ROLE PERMISSIONS ── */}
      <Modal open={!!editRole} onClose={() => setEditRole(null)} title={`Edit Izin — ${editRole?.displayName}`} size="lg">
        {editRole && (
          <div className="space-y-4">
            <div>
              <label className="label">Nama Tampilan Role</label>
              <input className="input" value={roleNameForm.displayName}
                onChange={e => setRoleNameForm(f => ({ ...f, displayName: e.target.value }))} />
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-700">Pilih Permission</p>
              <div className="flex gap-2">
                <button onClick={selectAllPerms} className="text-xs text-blue-600 hover:underline">Pilih Semua</button>
                <span className="text-gray-300">|</span>
                <button onClick={clearAllPerms} className="text-xs text-red-500 hover:underline">Hapus Semua</button>
              </div>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {PERMISSION_GROUPS.map(group => {
                const groupPerms = group.perms.map(p => permKey(group.prefix, p));
                const allSelected = groupPerms.every(p => rolePerms.includes(p));
                const someSelected = groupPerms.some(p => rolePerms.includes(p));
                return (
                  <div key={group.prefix} className="border border-gray-200 rounded-lg overflow-hidden">
                    <div
                      className={`flex items-center justify-between px-3 py-2 cursor-pointer select-none ${allSelected ? 'bg-blue-600' : someSelected ? 'bg-blue-50' : 'bg-gray-50'}`}
                      onClick={() => toggleGroup(group)}
                    >
                      <span className={`text-sm font-semibold ${allSelected ? 'text-white' : 'text-gray-800'}`}>
                        {group.label}
                      </span>
                      <span className={`text-xs ${allSelected ? 'text-blue-100' : 'text-gray-400'}`}>
                        {groupPerms.filter(p => rolePerms.includes(p)).length}/{groupPerms.length} aktif
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 p-3 bg-white">
                      {group.perms.map(p => {
                        const key = permKey(group.prefix, p);
                        const active = rolePerms.includes(key);
                        return (
                          <label key={key} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border cursor-pointer text-xs font-medium transition-all select-none ${active ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-300 text-gray-600 hover:border-blue-400'}`}>
                            <input type="checkbox" className="hidden" checked={active} onChange={() => togglePerm(key)} />
                            {p}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3 justify-end pt-2 border-t border-gray-100">
              <span className="text-sm text-gray-400 self-center">{rolePerms.length} permission dipilih</span>
              <button className="btn-secondary" onClick={() => setEditRole(null)}>Batal</button>
              <button className="btn-primary" onClick={handleSaveRole} disabled={savingRole}>
                {savingRole ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── MODAL BUAT ROLE BARU ── */}
      <Modal open={newRoleModal} onClose={() => setNewRoleModal(false)} title="Buat Role Baru" size="lg">
        <form onSubmit={handleCreateRole} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Nama Role (snake_case) *</label>
              <input className="input font-mono" placeholder="contoh: waka_kurikulum" value={newRoleForm.name}
                onChange={e => setNewRoleForm(f => ({ ...f, name: e.target.value.toLowerCase().replace(/\s+/g, '_') }))} required />
            </div>
            <div>
              <label className="label">Nama Tampilan *</label>
              <input className="input" placeholder="contoh: Wakasek Kurikulum" value={newRoleForm.displayName}
                onChange={e => setNewRoleForm(f => ({ ...f, displayName: e.target.value }))} required />
            </div>
          </div>

          <div>
            <p className="label mb-2">Permission Awal</p>
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {PERMISSION_GROUPS.map(group => (
                <div key={group.prefix} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="px-3 py-1.5 bg-gray-50 text-xs font-semibold text-gray-600">{group.label}</div>
                  <div className="flex flex-wrap gap-2 p-3">
                    {group.perms.map(p => {
                      const key = permKey(group.prefix, p);
                      const active = newRoleForm.permissions.includes(key);
                      return (
                        <label key={key} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border cursor-pointer text-xs font-medium transition-all ${active ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-300 text-gray-600 hover:border-blue-400'}`}>
                          <input type="checkbox" className="hidden" checked={active}
                            onChange={() => setNewRoleForm(f => ({
                              ...f,
                              permissions: f.permissions.includes(key) ? f.permissions.filter(x => x !== key) : [...f.permissions, key],
                            }))} />
                          {p}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-2 border-t border-gray-100">
            <button type="button" className="btn-secondary" onClick={() => setNewRoleModal(false)}>Batal</button>
            <button type="submit" className="btn-primary" disabled={creatingRole}>
              {creatingRole ? 'Membuat...' : 'Buat Role'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── DEACTIVATE CONFIRM ── */}
      <ConfirmDialog open={!!deactivateId} onClose={() => setDeactivateId(null)} onConfirm={handleDeactivate}
        title="Nonaktifkan Pengguna" message="Pengguna tidak akan bisa login setelah dinonaktifkan."
        loading={deactivating} confirmText="Nonaktifkan" confirmClass="btn-danger" />

      {/* ── RESET PASSWORD ── */}
      <Modal open={!!resetModal} onClose={() => setResetModal(null)} title="Reset Password" size="sm">
        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <label className="label">Password Baru *</label>
            <input className="input" type="password" value={newPass} onChange={e => setNewPass(e.target.value)} required minLength={6} />
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" className="btn-secondary" onClick={() => setResetModal(null)}>Batal</button>
            <button type="submit" className="btn-danger" disabled={resetting}>{resetting ? 'Mereset...' : 'Reset Password'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
