import Modal from './Modal.jsx';

export default function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmText = 'Hapus', confirmClass = 'btn-danger', loading }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="text-gray-600 mb-6">{message}</p>
      <div className="flex gap-3 justify-end">
        <button className="btn-secondary" onClick={onClose} disabled={loading}>Batal</button>
        <button className={confirmClass} onClick={onConfirm} disabled={loading}>
          {loading ? 'Memproses...' : confirmText}
        </button>
      </div>
    </Modal>
  );
}
