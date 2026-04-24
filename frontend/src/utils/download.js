import api from './api.js';
import toast from 'react-hot-toast';

export async function downloadWithAuth(url, filename) {
  const toastId = toast.loading('Mengunduh file...');
  try {
    const res = await api.get(url, { responseType: 'blob' });
    const type = res.headers['content-type'] || 'application/octet-stream';
    const blob = new Blob([res.data], { type });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    toast.success('File berhasil diunduh', { id: toastId });
  } catch {
    toast.error('Gagal mengunduh file', { id: toastId });
  }
}
