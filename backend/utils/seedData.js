require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Role = require('../models/Role');
const User = require('../models/User');
const Setting = require('../models/Setting');
const Sanction = require('../models/Sanction');

const ALL_PERMISSIONS = [
  'attendance:create','attendance:read','attendance:update','attendance:delete',
  'student:create','student:read','student:update','student:delete','student:import','student:export',
  'sanction:create','sanction:read','sanction:update','sanction:delete',
  'report:read','report:export',
  'setting:read','setting:update','setting:branding',
  'user:create','user:read','user:update','user:delete',
  'role:create','role:read','role:update','role:delete',
  'parent-call:create','parent-call:read','parent-call:generate',
  'audit:read',
];

const roles = [
  { name: 'super_admin', displayName: 'Super Admin', permissions: ALL_PERMISSIONS, isSystem: true },
  { name: 'admin', displayName: 'Admin', permissions: ALL_PERMISSIONS.filter(p => !p.startsWith('role:')), isSystem: true },
  {
    name: 'guru_bk', displayName: 'Guru BK', isSystem: true,
    permissions: ['attendance:create','attendance:read','attendance:update','student:read','student:export','sanction:read','sanction:create','sanction:update','report:read','report:export','parent-call:create','parent-call:read','parent-call:generate'],
  },
  {
    name: 'kepala_sekolah', displayName: 'Kepala Sekolah', isSystem: true,
    permissions: ['report:read','report:export','student:read','setting:read','setting:branding','parent-call:read'],
  },
  {
    name: 'wali_kelas', displayName: 'Wali Kelas', isSystem: true,
    permissions: ['attendance:create','attendance:read','attendance:update','student:read','sanction:read','report:read','report:export'],
  },
  {
    name: 'orang_tua', displayName: 'Orang Tua', isSystem: true,
    permissions: ['student:read','attendance:read','report:read'],
  },
];

const defaultSettings = [
  { key: 'schoolName', value: 'SDH KUPANG' },
  { key: 'schoolAddress', value: 'Jl. Timor Raya No. 1, Kupang, NTT 85111' },
  { key: 'schoolPhone', value: '0380-123456' },
  { key: 'schoolEmail', value: 'sdh@kupang.sch.id' },
  { key: 'onTimeCutoff', value: '07:30' },
  { key: 'gracePeriodMinutes', value: 0 },
  { key: 'parentCallThreshold', value: [{ count: 5, period: 1, level: 'warning' }, { count: 10, period: 1, level: 'call' }] },
  { key: 'timezone', value: 'Asia/Makassar' },
  { key: 'dateFormat', value: 'DD/MM/YYYY' },
  { key: 'primaryColor', value: '#1e40af' },
  { key: 'secondaryColor', value: '#3b82f6' },
  { key: 'accentColor', value: '#f59e0b' },
  { key: 'fontFamily', value: 'sans-serif' },
  { key: 'academicYear', value: '2024/2025' },
  { key: 'semester', value: '1' },
];

const defaultSanctions = [
  { name: 'Menulis Surat Pernyataan', description: 'Siswa menulis surat pernyataan tidak terlambat lagi' },
  { name: 'Piket Kelas', description: 'Siswa melakukan piket kelas sebagai sanksi' },
  { name: 'Membersihkan Halaman', description: 'Siswa membersihkan halaman sekolah' },
  { name: 'Push Up 20x', description: 'Siswa melakukan push up 20 kali' },
  { name: 'Lapor ke BK', description: 'Siswa melapor ke ruang Bimbingan Konseling' },
  { name: 'Panggilan Orang Tua', description: 'Orang tua/wali dipanggil ke sekolah' },
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Terhubung ke database...');

  await Role.deleteMany({});
  const createdRoles = await Role.insertMany(roles);
  console.log(`${createdRoles.length} role berhasil dibuat`);

  const superAdminRole = createdRoles.find(r => r.name === 'super_admin');

  await User.deleteMany({});
  const superAdmin = new User({
    username: 'admin',
    email: 'admin@sdh.sch.id',
    passwordHash: 'Admin123!',
    fullName: 'Super Administrator',
    role: superAdminRole._id,
    isActive: true,
  });
  await superAdmin.save();
  console.log('Super admin dibuat: username=admin, password=Admin123!');

  for (const s of defaultSettings) {
    await Setting.findOneAndUpdate({ key: s.key }, s, { upsert: true });
  }
  console.log('Pengaturan default berhasil dimuat');

  await Sanction.deleteMany({});
  await Sanction.insertMany(defaultSanctions.map(s => ({ ...s, createdBy: superAdmin._id })));
  console.log(`${defaultSanctions.length} sanksi default berhasil dibuat`);

  console.log('\n✅ Seed data selesai!');
  console.log('📌 Login: username=admin, password=Admin123!');
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
