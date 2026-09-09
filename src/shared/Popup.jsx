import {useEffect, useState} from 'react';

const TITLES = {ok: 'Thành công', fail: 'Có lỗi xảy ra', warn: 'Chú ý', info: 'Thông báo'};

/**
 * Popup dùng chung cho web người chơi. Mọi thông báo và câu hỏi đều đi qua đây
 * thay vì hiện rồi tự tắt: người chơi phải bấm xác nhận nên không bỏ lỡ kết quả
 * nạp/rút hay lý do thao tác bị từ chối.
 */
export function Popup({popup, onClose}) {
  useEffect(() => {
    if (!popup) return;
    const onKey = e => { if (e.key === 'Escape') settle(false); };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [popup]);

  if (!popup) return null;

  function settle(result) {
    popup.resolve?.(result);
    onClose();
  }

  const asking = popup.kind === 'confirm';
  return (
    <div className="gamePopupBackdrop" onMouseDown={e => e.target === e.currentTarget && settle(false)}>
      <div className={'gamePopup ' + (popup.tone || 'info')}>
        <h3>{popup.title || TITLES[popup.tone] || TITLES.info}</h3>
        {popup.message && <p>{popup.message}</p>}
        <div className="gamePopupActions">
          {asking && <button className="popupCancel" onClick={() => settle(false)}>{popup.cancelLabel || 'Ở LẠI'}</button>}
          <button className={'popupOk ' + (popup.danger ? 'danger' : '')} autoFocus onClick={() => settle(true)}>
            {popup.confirmLabel || (asking ? 'ĐỒNG Ý' : 'ĐÃ HIỂU')}
          </button>
        </div>
      </div>
    </div>
  );
}

/** `show(message, tone)` cho thông báo, `confirm({...})` trả Promise cho câu hỏi. */
export function usePopup() {
  const [popup, setPopup] = useState(null);
  return {
    popup,
    close: () => setPopup(null),
    show: (message, tone = 'info') => setPopup({kind: 'alert', message, tone}),
    ok: (message) => setPopup({kind: 'alert', message, tone: 'ok'}),
    fail: (message) => setPopup({kind: 'alert', message, tone: 'fail'}),
    warn: (message) => setPopup({kind: 'alert', message, tone: 'warn'}),
    confirm: (options) => new Promise(resolve => setPopup({kind: 'confirm', ...options, resolve}))
  };
}
