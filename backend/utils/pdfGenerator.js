const PDFDocument = require('pdfkit');

const BLUE = '#1e40af';
const GRAY = '#6b7280';
const LIGHT = '#f3f4f6';

const addHeader = (doc, school, title, subtitle = '') => {
  doc.rect(0, 0, doc.page.width, 90).fill(BLUE);
  doc.fillColor('white').fontSize(18).font('Helvetica-Bold').text(school.name, 50, 20, { align: 'center' });
  doc.fontSize(9).font('Helvetica').text(`${school.address} | Telp: ${school.phone} | Email: ${school.email}`, 50, 44, { align: 'center' });
  doc.moveTo(50, 68).lineTo(doc.page.width - 50, 68).strokeColor('white').lineWidth(1).stroke();
  doc.fontSize(13).font('Helvetica-Bold').text(title, 50, 74, { align: 'center' });
  doc.fillColor('#1f2937');
  if (subtitle) { doc.fontSize(10).font('Helvetica').fillColor(GRAY).text(subtitle, 50, 100, { align: 'center' }); }
  doc.moveDown(subtitle ? 1 : 2);
};

const tableHeader = (doc, cols, y) => {
  doc.rect(50, y, doc.page.width - 100, 22).fill(BLUE);
  let x = 55;
  cols.forEach(c => { doc.fillColor('white').fontSize(9).font('Helvetica-Bold').text(c.label, x, y + 6, { width: c.width }); x += c.width; });
  return y + 22;
};

const tableRow = (doc, cols, values, y, shade) => {
  if (shade) doc.rect(50, y, doc.page.width - 100, 20).fill(LIGHT);
  let x = 55;
  cols.forEach((c, i) => {
    doc.fillColor('#1f2937').fontSize(8).font('Helvetica').text(String(values[i] ?? '-'), x, y + 5, { width: c.width - 4, ellipsis: true });
    x += c.width;
  });
  return y + 20;
};

const formatTime = (d) => d ? new Date(d).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-';
const formatDate = (d) => d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '-';

exports.generateDailyPdf = (records, date, school, res) => {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  doc.pipe(res);
  addHeader(doc, school, 'LAPORAN KETERLAMBATAN HARIAN', `Tanggal: ${formatDate(date)}`);

  const cols = [
    { label: 'No', width: 28 }, { label: 'NIS', width: 65 }, { label: 'Nama Siswa', width: 130 },
    { label: 'Kelas', width: 45 }, { label: 'Jam Masuk', width: 60 }, { label: 'Terlambat', width: 55 }, { label: 'Sanksi', width: 110 },
  ];

  const late = records.filter(r => r.status === 'Late');
  doc.fontSize(10).fillColor('#1f2937').font('Helvetica').text(`Total Terlambat: ${late.length} siswa dari ${records.length} absensi`, { align: 'left' }).moveDown(0.5);

  let y = doc.y;
  y = tableHeader(doc, cols, y);
  late.forEach((r, i) => {
    if (y > 750) { doc.addPage(); y = 50; y = tableHeader(doc, cols, y); }
    y = tableRow(doc, cols, [
      i + 1, r.student?.nis, r.student?.name, r.student?.class,
      formatTime(r.arrivalTime), `${r.tardinessMinutes} mnt`,
      r.sanctions?.map(s => s.sanction?.name).join(', ') || '-',
    ], y, i % 2 === 0);
  });

  doc.end();
};

exports.generateWeeklyPdf = (records, from, to, school, res) => {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  doc.pipe(res);
  addHeader(doc, school, 'LAPORAN KETERLAMBATAN MINGGUAN', `Periode: ${formatDate(from)} - ${formatDate(to)}`);

  const byDay = {};
  records.forEach(r => {
    const d = new Date(r.date).toISOString().split('T')[0];
    if (!byDay[d]) byDay[d] = [];
    byDay[d].push(r);
  });

  const cols = [{ label: 'No', width: 28 }, { label: 'NIS', width: 65 }, { label: 'Nama Siswa', width: 130 }, { label: 'Kelas', width: 50 }, { label: 'Jam Masuk', width: 65 }, { label: 'Terlambat', width: 55 }, { label: 'Sanksi', width: 100 }];

  Object.entries(byDay).sort().forEach(([day, recs]) => {
    doc.fontSize(11).font('Helvetica-Bold').fillColor(BLUE).text(`${formatDate(day)} (${recs.length} siswa terlambat)`).moveDown(0.3);
    let y = doc.y;
    y = tableHeader(doc, cols, y);
    recs.forEach((r, i) => {
      if (y > 750) { doc.addPage(); y = 50; }
      y = tableRow(doc, cols, [i+1, r.student?.nis, r.student?.name, r.student?.class, formatTime(r.arrivalTime), `${r.tardinessMinutes} mnt`, r.sanctions?.map(s=>s.sanction?.name).join(', ')||'-'], y, i%2===0);
    });
    doc.y = y + 10;
    doc.moveDown(1);
  });
  doc.end();
};

exports.generateMonthlyPdf = (records, month, year, school, res) => {
  const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  doc.pipe(res);
  addHeader(doc, school, 'LAPORAN KETERLAMBATAN BULANAN', `${months[month-1]} ${year}`);

  const byStudent = {};
  records.forEach(r => {
    const key = r.student._id.toString();
    if (!byStudent[key]) byStudent[key] = { student: r.student, count: 0, dates: [] };
    byStudent[key].count++;
    byStudent[key].dates.push(r.date);
  });
  const sorted = Object.values(byStudent).sort((a,b) => b.count - a.count);

  const cols = [{ label: 'No', width: 28 }, { label: 'NIS', width: 65 }, { label: 'Nama Siswa', width: 150 }, { label: 'Kelas', width: 55 }, { label: 'Jumlah Terlambat', width: 90 }, { label: 'Terakhir Terlambat', width: 105 }];
  let y = doc.y;
  y = tableHeader(doc, cols, y);
  sorted.forEach((r, i) => {
    if (y > 750) { doc.addPage(); y = 50; y = tableHeader(doc, cols, y); }
    y = tableRow(doc, cols, [i+1, r.student?.nis, r.student?.name, r.student?.class, `${r.count}x`, formatDate(r.dates[r.dates.length-1])], y, i%2===0);
  });
  doc.end();
};

exports.generateClassPdf = (data, cls, school, res) => {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  doc.pipe(res);
  addHeader(doc, school, `LAPORAN KELAS ${cls}`, 'Rekap Keterlambatan Per Siswa');

  const cols = [{ label: 'No', width: 28 }, { label: 'NIS', width: 65 }, { label: 'Nama Siswa', width: 165 }, { label: 'Jumlah Terlambat', width: 95 }, { label: 'Terakhir Terlambat', width: 140 }];
  let y = doc.y;
  y = tableHeader(doc, cols, y);
  data.forEach((r, i) => {
    if (y > 750) { doc.addPage(); y = 50; y = tableHeader(doc, cols, y); }
    y = tableRow(doc, cols, [i+1, r.student?.nis, r.student?.name, `${r.count}x`, formatDate(r.lastDate)], y, i%2===0);
  });
  doc.end();
};

exports.generateParentLetterPdf = (call, school, res) => {
  const L = 60; // left margin
  const R = 60; // right margin
  const W = 595.28 - L - R; // usable width A4
  const doc = new PDFDocument({ margin: L, size: 'A4' });
  doc.pipe(res);

  // ── KOP SURAT ──────────────────────────────────────────────────
  // Garis atas tebal
  doc.rect(L, 40, W, 4).fill(BLUE);

  // Nama sekolah
  doc.fillColor(BLUE).fontSize(18).font('Helvetica-Bold')
    .text(school.name, L, 52, { width: W, align: 'center' });

  // Alamat & kontak
  const contact = [school.address, school.phone ? `Telp. ${school.phone}` : '', school.email].filter(Boolean).join('  |  ');
  doc.fontSize(9).font('Helvetica').fillColor(GRAY)
    .text(contact, L, 76, { width: W, align: 'center' });

  // Garis bawah kop
  doc.moveTo(L, 92).lineTo(L + W, 92).lineWidth(0.5).strokeColor(BLUE).stroke();
  doc.moveTo(L, 95).lineTo(L + W, 95).lineWidth(2).strokeColor(BLUE).stroke();

  // Judul surat
  doc.rect(L, 104, W, 24).fill(BLUE);
  doc.fillColor('white').fontSize(11).font('Helvetica-Bold')
    .text('SURAT PANGGILAN ORANG TUA / WALI SISWA', L, 111, { width: W, align: 'center' });

  // ── NOMOR & TANGGAL ────────────────────────────────────────────
  const today = formatDate(new Date());
  const year  = new Date().getFullYear();
  doc.fillColor('#1f2937').fontSize(10.5).font('Helvetica');
  const metaY = 144;
  doc.text(`Nomor    : ........./SDH/BK/${year}`, L, metaY);
  doc.text('Lampiran : -', L, metaY + 16);
  doc.text('Perihal  : Pemanggilan Orang Tua/Wali Siswa', L, metaY + 32);
  doc.text(`Kupang, ${today}`, L, metaY, { width: W, align: 'right' });

  // ── TUJUAN SURAT ───────────────────────────────────────────────
  const destY = metaY + 60;
  doc.font('Helvetica').fontSize(10.5)
    .text('Kepada Yth.', L, destY)
    .text(`Bapak/Ibu ${call.student.parentName}`, L, destY + 15)
    .font('Helvetica-Bold')
    .text('di -', L, destY + 30)
    .font('Helvetica')
    .text('Tempat', L + 20, destY + 30);

  // ── PEMBUKA ────────────────────────────────────────────────────
  const bodyY = destY + 60;
  doc.font('Helvetica').fontSize(10.5)
    .text('Dengan hormat,', L, bodyY)
    .moveDown(0.6)
    .text(
      `Sehubungan dengan kondisi kedisiplinan putra/putri Bapak/Ibu di ${school.name}, dengan ini kami sampaikan bahwa:`,
      { align: 'justify' }
    )
    .moveDown(0.8);

  // ── IDENTITAS SISWA (tabel sederhana) ──────────────────────────
  const iY = doc.y;
  doc.rect(L, iY, W, 84).strokeColor('#d1d5db').lineWidth(0.5).stroke();
  doc.rect(L, iY, W, 84).fillColor('#f9fafb').fill();

  const rows = [
    ['Nama Siswa',     call.student.name],
    ['NIS',            call.student.nis],
    ['Kelas',          call.student.class],
    ['Orang Tua/Wali', call.student.parentName],
  ];
  const labelW = 130;
  rows.forEach(([lbl, val], i) => {
    const ry = iY + 8 + i * 18;
    doc.fillColor(GRAY).font('Helvetica').fontSize(9.5).text(lbl, L + 8, ry, { width: labelW });
    doc.fillColor('#1f2937').font('Helvetica-Bold').fontSize(9.5).text(`: ${val}`, L + labelW, ry, { width: W - labelW - 8 });
  });
  doc.fillColor('#1f2937').moveDown(0.3);

  // ── ISI SURAT ──────────────────────────────────────────────────
  const afterTable = iY + 94;
  doc.font('Helvetica').fontSize(10.5).fillColor('#1f2937')
    .text(
      `Berdasarkan catatan kehadiran sekolah, putra/putri Bapak/Ibu telah tercatat ` +
      `terlambat sebanyak ${call.totalTardiness} kali dalam periode ${call.period}.`,
      L, afterTable, { align: 'justify' }
    )
    .moveDown(0.8);

  // Tabel tanggal terlambat
  if (call.tardinessDates?.length > 0) {
    doc.font('Helvetica-Bold').fontSize(10).text('Daftar Tanggal Keterlambatan:').moveDown(0.3);
    const cols = 3;
    const colW = Math.floor(W / cols);
    call.tardinessDates.forEach((d, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = L + col * colW;
      const cy = doc.y + (col === 0 && i > 0 ? 0 : 0);
      if (col === 0 && i > 0) doc.moveDown(0.1);
      if (col === 0) {
        doc.font('Helvetica').fontSize(9.5)
          .text(`${i+1}. ${formatDate(d)}`, cx, doc.y, { width: colW, continued: cols > 1 && col < cols - 1 && i < call.tardinessDates.length - 1 });
      } else {
        // simpler: just list them
      }
    });
    // Simpler list approach
    doc.y = doc.y; // reset
  }

  // Simpler tanggal list (clear approach)
  const tY = doc.y + 2;
  doc.font('Helvetica').fontSize(9.5);
  call.tardinessDates.forEach((d, i) => {
    if (doc.y > 700) { doc.addPage(); }
    doc.text(`${i + 1}. ${formatDate(d)}`, L + 10, doc.y, { continued: false });
    if (i < call.tardinessDates.length - 1) doc.moveDown(0.15);
  });
  doc.moveDown(0.6);

  if (call.sanctionsAssigned?.length > 0) {
    doc.font('Helvetica-Bold').fontSize(10).text('Sanksi yang telah diberikan:').moveDown(0.3);
    call.sanctionsAssigned.forEach((s, i) => {
      doc.font('Helvetica').fontSize(9.5).text(`${i + 1}. ${s}`);
      if (i < call.sanctionsAssigned.length - 1) doc.moveDown(0.15);
    });
    doc.moveDown(0.6);
  }

  doc.font('Helvetica').fontSize(10.5)
    .text(
      'Sehubungan dengan hal tersebut, kami mohon kesediaan Bapak/Ibu untuk hadir di sekolah ' +
      'guna berdiskusi bersama dalam rangka pembinaan kedisiplinan putra/putri Bapak/Ibu.',
      { align: 'justify' }
    )
    .moveDown(0.8)
    .text(
      'Demikian surat panggilan ini kami sampaikan. Atas perhatian dan kerja samanya, kami ucapkan terima kasih.',
      { align: 'justify' }
    )
    .moveDown(1.8);

  // ── TANDA TANGAN ───────────────────────────────────────────────
  if (doc.y > 680) doc.addPage();
  const sigY  = doc.y;
  const col1X = L;
  const col2X = L + Math.floor(W / 2);
  const sigW  = Math.floor(W / 2) - 10;

  doc.font('Helvetica').fontSize(10).fillColor('#1f2937');
  doc.text('Mengetahui,', col1X, sigY, { width: sigW, align: 'center' });
  doc.text(`Kupang, ${today}`, col2X, sigY, { width: sigW, align: 'center' });

  doc.moveDown(0.2);
  doc.font('Helvetica-Bold').fontSize(10);
  doc.text('Kepala Sekolah', col1X, doc.y, { width: sigW, align: 'center' });
  doc.text('Guru BK / Wali Kelas', col2X, doc.y, { width: sigW, align: 'center' });

  const afterTitleY = doc.y + 4;
  doc.font('Helvetica').fontSize(10);
  doc.text(`${school.name}`, col1X, afterTitleY, { width: sigW, align: 'center' });

  const lineY = afterTitleY + 50;
  // Garis tanda tangan
  doc.moveTo(col1X + 10,  lineY).lineTo(col1X + sigW - 10,  lineY).lineWidth(0.7).strokeColor('#374151').stroke();
  doc.moveTo(col2X + 10,  lineY).lineTo(col2X + sigW - 10,  lineY).lineWidth(0.7).strokeColor('#374151').stroke();

  const nameY = lineY + 4;
  doc.font('Helvetica-Bold').fontSize(10);
  doc.text('(________________________)', col1X, nameY, { width: sigW, align: 'center' });
  doc.text('(________________________)', col2X, nameY, { width: sigW, align: 'center' });

  doc.font('Helvetica').fontSize(9).fillColor(GRAY);
  doc.text('NIP. ......................', col1X, nameY + 14, { width: sigW, align: 'center' });
  doc.text('NIP. ......................', col2X, nameY + 14, { width: sigW, align: 'center' });

  // ── FOOTER ─────────────────────────────────────────────────────
  const footY = doc.page.height - 35;
  doc.moveTo(L, footY - 6).lineTo(L + W, footY - 6).lineWidth(0.5).strokeColor('#d1d5db').stroke();
  doc.font('Helvetica').fontSize(8).fillColor(GRAY)
    .text(`${school.name} — ${school.address}`, L, footY, { width: W, align: 'center' });

  doc.end();
};
