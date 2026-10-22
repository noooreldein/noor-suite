import { Modal } from './Modal';
import { Button } from './Button';

interface Props {
  msg: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ msg, onConfirm, onCancel }: Props) {
  return (
    <Modal title="تأكيد" onClose={onCancel} width={420}>
      <p style={{ color: 'var(--soft)' }}>{msg}</p>
      <div className="modal-actions">
        <Button variant="outline" onClick={onCancel}>إلغاء</Button>
        <Button variant="danger" onClick={onConfirm}>تأكيد الحذف</Button>
      </div>
    </Modal>
  );
}
