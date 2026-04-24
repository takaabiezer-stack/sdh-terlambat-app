import { useEffect, useRef, useState } from 'react';

export default function BarcodeScanner({ onResult, active }) {
  const scannerRef = useRef(null);
  const [status, setStatus] = useState('idle'); // idle | starting | running | error
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!active) {
      stopScanner();
      setStatus('idle');
      return;
    }

    let cancelled = false;
    setStatus('starting');
    setErrorMsg('');

    const start = async () => {
      // Beri waktu DOM render dulu
      await new Promise(r => setTimeout(r, 150));
      if (cancelled) return;

      const el = document.getElementById('barcode-reader');
      if (!el) { setStatus('error'); setErrorMsg('Elemen kamera tidak ditemukan.'); return; }

      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (cancelled) return;

        const scanner = new Html5Qrcode('barcode-reader');
        scannerRef.current = scanner;

        const config = { fps: 10, qrbox: { width: 250, height: 150 } };
        const onDecode = (text) => { if (!cancelled) onResult(text); };
        const onError = () => {};

        try {
          await scanner.start({ facingMode: 'environment' }, config, onDecode, onError);
        } catch {
          // Fallback: coba kamera manapun (berguna di laptop)
          await scanner.start({ facingMode: 'user' }, config, onDecode, onError);
        }

        if (!cancelled) setStatus('running');
      } catch (err) {
        if (cancelled) return;
        setStatus('error');
        const msg = err?.message || err?.toString() || '';
        if (msg.includes('NotAllowed') || msg.includes('Permission')) {
          setErrorMsg('Izin kamera ditolak. Klik ikon kunci/info di address bar browser lalu izinkan akses kamera, kemudian refresh halaman.');
        } else if (msg.includes('NotFound') || msg.includes('DevicesNotFound')) {
          setErrorMsg('Tidak ada kamera yang terdeteksi di perangkat ini. Gunakan input nama manual.');
        } else {
          setErrorMsg('Kamera tidak dapat diakses. Pastikan tidak ada aplikasi lain yang menggunakan kamera, atau gunakan input nama manual.');
        }
      }
    };

    start();

    return () => {
      cancelled = true;
      stopScanner();
    };
  }, [active]);

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
    }
  };

  return (
    <div className="relative rounded-xl overflow-hidden bg-black" style={{ minHeight: 220 }}>
      {/* Div ini selalu ada di DOM agar html5-qrcode bisa attach */}
      <div
        id="barcode-reader"
        className="w-full"
        style={{ minHeight: 220, display: status === 'error' ? 'none' : 'block' }}
      />

      {status === 'idle' && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <p className="text-gray-400 text-sm">Kamera tidak aktif</p>
        </div>
      )}

      {status === 'starting' && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <div className="text-center text-white">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-sm">Memulai kamera...</p>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-xl">
          <div className="text-center p-5 max-w-xs">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="text-sm font-semibold text-red-600 mb-1">Kamera tidak tersedia</p>
            <p className="text-xs text-gray-500 leading-relaxed">{errorMsg}</p>
          </div>
        </div>
      )}

      {status === 'running' && (
        <div className="absolute bottom-3 left-0 right-0 flex justify-center pointer-events-none">
          <span className="bg-black/60 text-white text-xs px-3 py-1 rounded-full">
            Arahkan kamera ke barcode / QR Code NIS
          </span>
        </div>
      )}
    </div>
  );
}
