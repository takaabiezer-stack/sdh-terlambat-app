import { useState, useEffect, useRef } from 'react';
import api from '../utils/api.js';
import toast from 'react-hot-toast';
import { useSettings } from '../context/SettingsContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';

export default function Settings() {
  const { settings, refetchSettings } = useSettings();
  const { hasPermission } = useAuth();
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('school');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoRef = useRef(null);

  useEffect(() => { setForm({ ...settings }); }, [settings]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/settings', form);
      toast.success('Pengaturan berhasil disimpan');
      refetchSettings();
    } catch (err) { toast.error(err.response?.data?.message || 'Gagal menyimpan'); }
    setSaving(false);
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingLogo(true);
    const fd = new FormData();
    fd.append('logo', file);
    try {
      const res = await api.post('/settings/logo', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setForm(f => ({ ...f, logoUrl: res.data.data.logoUrl }));
      toast.success('Logo berhasil diupload');
      refetchSettings();
    } catch { toast.error('Gagal upload logo'); }
    setUploadingLogo(false);
    e.target.value = '';
  };

  const sections = [
    { id: 'school', label: '🏫 Info Sekolah' },
    { id: 'time', label: '⏰ Pengaturan Waktu' },
    { id: 'threshold', label: '📢 Batas Panggilan' },
    { id: 'branding', label: '🎨 Tampilan' },
  ];

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">Pengaturan Sistem</h1>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="card p-3 h-fit">
          <nav className="space-y-1">
            {sections.map(s => (
              <button key={s.id} onClick={() => setActiveSection(s.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeSection === s.id ? 'bg-blue-800 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                {s.label}
              </button>
            ))}
          </nav>
        </div>

        <form onSubmit={handleSave} className="lg:col-span-3 space-y-4">
          <div className="card">
            <div className="card-header">
              <h2 className="font-semibold">{sections.find(s => s.id === activeSection)?.label}</h2>
            </div>
            <div className="card-body space-y-4">
              {activeSection === 'school' && (
                <>
                  {[['Nama Sekolah', 'schoolName'], ['Alamat', 'schoolAddress'], ['No. Telepon', 'schoolPhone'], ['Email Sekolah', 'schoolEmail'], ['Tahun Ajaran', 'academicYear']].map(([label, key]) => (
                    <div key={key}>
                      <label className="label">{label}</label>
                      <input className="input" value={form[key] || ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
                    </div>
                  ))}
                  <div>
                    <label className="label">Semester</label>
                    <select className="input" value={form.semester || '1'} onChange={e => setForm(f => ({ ...f, semester: e.target.value }))}>
                      <option value="1">Semester 1 (Ganjil)</option>
                      <option value="2">Semester 2 (Genap)</option>
                    </select>
                  </div>
                </>
              )}

              {activeSection === 'time' && (
                <>
                  <div>
                    <label className="label">Batas Tepat Waktu (HH:MM)</label>
                    <input type="time" className="input" value={form.onTimeCutoff || '07:30'} onChange={e => setForm(f => ({ ...f, onTimeCutoff: e.target.value }))} />
                    <p className="text-xs text-gray-400 mt-1">Siswa yang masuk pada/sebelum jam ini dianggap tepat waktu</p>
                  </div>
                  <div>
                    <label className="label">Toleransi Keterlambatan (menit)</label>
                    <input type="number" className="input" min={0} max={30} value={form.gracePeriodMinutes || 0} onChange={e => setForm(f => ({ ...f, gracePeriodMinutes: parseInt(e.target.value) }))} />
                    <p className="text-xs text-gray-400 mt-1">0 = tidak ada toleransi</p>
                  </div>
                  <div>
                    <label className="label">Timezone</label>
                    <select className="input" value={form.timezone || 'Asia/Makassar'} onChange={e => setForm(f => ({ ...f, timezone: e.target.value }))}>
                      <option value="Asia/Jakarta">WIB (Asia/Jakarta)</option>
                      <option value="Asia/Makassar">WITA (Asia/Makassar)</option>
                      <option value="Asia/Jayapura">WIT (Asia/Jayapura)</option>
                    </select>
                  </div>
                </>
              )}

              {activeSection === 'threshold' && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-500">Tentukan jumlah keterlambatan dalam periode tertentu yang memicu surat panggilan orang tua.</p>
                  {(form.parentCallThreshold || [{ count: 5, period: 1, level: 'warning' }]).map((t, i) => (
                    <div key={i} className="border border-gray-200 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm">Threshold {i + 1}</h4>
                        <button type="button" onClick={() => setForm(f => ({ ...f, parentCallThreshold: f.parentCallThreshold.filter((_, idx) => idx !== i) }))} className="text-red-500 text-sm">Hapus</button>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="label text-xs">Jumlah Terlambat</label>
                          <input type="number" className="input" min={1} value={t.count} onChange={e => {
                            const arr = [...(form.parentCallThreshold || [])];
                            arr[i] = { ...arr[i], count: parseInt(e.target.value) };
                            setForm(f => ({ ...f, parentCallThreshold: arr }));
                          }} />
                        </div>
                        <div>
                          <label className="label text-xs">Dalam (bulan)</label>
                          <input type="number" className="input" min={1} value={t.period} onChange={e => {
                            const arr = [...(form.parentCallThreshold || [])];
                            arr[i] = { ...arr[i], period: parseInt(e.target.value) };
                            setForm(f => ({ ...f, parentCallThreshold: arr }));
                          }} />
                        </div>
                        <div>
                          <label className="label text-xs">Level</label>
                          <select className="input" value={t.level} onChange={e => {
                            const arr = [...(form.parentCallThreshold || [])];
                            arr[i] = { ...arr[i], level: e.target.value };
                            setForm(f => ({ ...f, parentCallThreshold: arr }));
                          }}>
                            <option value="warning">⚠️ Peringatan</option>
                            <option value="call">📞 Panggilan</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button type="button" onClick={() => setForm(f => ({ ...f, parentCallThreshold: [...(f.parentCallThreshold || []), { count: 10, period: 1, level: 'call' }] }))} className="btn-secondary w-full">+ Tambah Threshold</button>
                </div>
              )}

              {activeSection === 'branding' && hasPermission('setting:branding') && (
                <>
                  <div>
                    <label className="label">Logo Sekolah</label>
                    <div className="flex items-center gap-4">
                      {form.logoUrl && <img src={form.logoUrl} alt="Logo" className="w-16 h-16 object-contain border border-gray-200 rounded-xl p-1" />}
                      <div>
                        <button type="button" onClick={() => logoRef.current?.click()} className="btn-secondary" disabled={uploadingLogo}>
                          {uploadingLogo ? <LoadingSpinner size="sm" /> : '📁'} Upload Logo
                        </button>
                        <p className="text-xs text-gray-400 mt-1">PNG transparan direkomendasikan, max 5MB</p>
                        <input type="file" ref={logoRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    {[['Warna Primer', 'primaryColor'], ['Warna Sekunder', 'secondaryColor'], ['Warna Aksen', 'accentColor']].map(([label, key]) => (
                      <div key={key}>
                        <label className="label text-xs">{label}</label>
                        <div className="flex gap-2">
                          <input type="color" className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer" value={form[key] || '#1e40af'} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
                          <input className="input" value={form[key] || ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div>
                    <label className="label">Font</label>
                    <select className="input" value={form.fontFamily || 'sans-serif'} onChange={e => setForm(f => ({ ...f, fontFamily: e.target.value }))}>
                      <option value="sans-serif">Sans-serif (Modern)</option>
                      <option value="serif">Serif (Formal)</option>
                    </select>
                  </div>

                  <div className="mt-4 p-4 border-2 border-dashed border-gray-200 rounded-xl">
                    <p className="text-xs text-gray-400 mb-2">Preview Header:</p>
                    <div className="rounded-lg p-4 text-white text-center" style={{ background: form.primaryColor || '#1e40af' }}>
                      <p className="font-bold text-lg" style={{ fontFamily: form.fontFamily }}>{form.schoolName || 'Nama Sekolah'}</p>
                      <p className="text-sm opacity-80">{form.schoolAddress || 'Alamat Sekolah'}</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {hasPermission('setting:update') && (
            <div className="flex justify-end">
              <button type="submit" className="btn-primary btn-lg" disabled={saving}>
                {saving ? 'Menyimpan...' : '💾 Simpan Pengaturan'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
