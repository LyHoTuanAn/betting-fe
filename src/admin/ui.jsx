import React, {useEffect, useRef, useState} from 'react';

export const Card = ({title, action, children, className = ''}) => (
  <section className={'card ' + className}>
    {(title || action) && <header className="cardHead"><h2>{title}</h2>{action}</header>}
    {children}
  </section>
);

export const StatTile = ({label, value, sub, tone}) => (
  <div className={'stat ' + (tone || '')}><span>{label}</span><strong>{value}</strong>{sub && <small>{sub}</small>}</div>
);

export const Field = ({label, hint, children}) => (
  <label className="field"><span className="fieldLabel">{label}</span>{children}{hint && <small className="hint">{hint}</small>}</label>
);

export const Toggle = ({checked, onChange, on = 'Đang hiển thị', off = 'Đang ẩn'}) => (
  <button type="button" className={'toggle ' + (checked ? 'on' : 'off')} onClick={() => onChange(!checked)} aria-pressed={checked}>
    <i /><span>{checked ? on : off}</span>
  </button>
);

export const Pill = ({tone, children}) => <span className={'pill ' + (tone || '')}>{children}</span>;

export const Empty = ({children}) => <p className="empty">{children}</p>;

const DIALOG_TITLE = {ok: 'Thành công', fail: 'Không thực hiện được', warn: 'Chưa hợp lệ', info: 'Thông báo'};

/**
 * Mọi thông báo và câu hỏi của trang quản trị đều đi qua đây dưới dạng popup
 * chặn thao tác, thay cho toast tự tắt và cho confirm()/prompt() của trình
 * duyệt — admin phải thấy và bấm xác nhận, không để trôi mất.
 */
export function Dialog({dialog, onClose}) {
  const [value, setValue] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (!dialog) return;
    setValue(dialog.defaultValue || '');
    // Escape luôn là "huỷ": câu hỏi trả về false/null chứ không phải xác nhận.
    const onKey = e => { if (e.key === 'Escape') close(null); };
    addEventListener('keydown', onKey);
    const focus = setTimeout(() => inputRef.current?.focus(), 40);
    return () => { removeEventListener('keydown', onKey); clearTimeout(focus); };
  }, [dialog]);

  if (!dialog) return null;

  function close(result) {
    dialog.resolve?.(result);
    onClose();
  }

  const asking = dialog.kind === 'confirm' || dialog.kind === 'prompt';
  const submit = e => {
    e?.preventDefault();
    close(dialog.kind === 'prompt' ? value : true);
  };

  return (
    <div className="dialogBackdrop" onMouseDown={e => e.target === e.currentTarget && close(dialog.kind === 'prompt' ? null : false)}>
      <form className={'dialogBox ' + (dialog.tone || 'info')} onSubmit={submit}>
        <h2>{dialog.title || DIALOG_TITLE[dialog.tone] || DIALOG_TITLE.info}</h2>
        {dialog.message && <p>{dialog.message}</p>}
        {dialog.kind === 'prompt' && (
          <label className="dialogField">
            <span>{dialog.label || 'Nội dung'}</span>
            <input ref={inputRef} value={value} maxLength={dialog.maxLength || 500} placeholder={dialog.placeholder || ''} onChange={e => setValue(e.target.value)} />
          </label>
        )}
        <div className="dialogActions">
          {asking && <button type="button" className="ghost" onClick={() => close(dialog.kind === 'prompt' ? null : false)}>{dialog.cancelLabel || 'Huỷ'}</button>}
          <button type="submit" className={dialog.danger ? 'danger' : 'primary'}>{dialog.confirmLabel || (asking ? 'Đồng ý' : 'Đã hiểu')}</button>
        </div>
      </form>
    </div>
  );
}

/**
 * `show(message, tone)` giữ nguyên chữ ký cũ để các trang đang gọi kiểu đó
 * không phải sửa; `confirm`/`prompt` trả về Promise nên nơi gọi chỉ cần await.
 */
export function useDialog() {
  const [dialog, setDialog] = useState(null);
  const ask = (kind, options) => new Promise(resolve => setDialog({kind, ...options, resolve}));
  return {
    dialog,
    close: () => setDialog(null),
    show: (message, tone = 'info') => setDialog({kind: 'alert', message, tone}),
    ok: (message) => setDialog({kind: 'alert', message, tone: 'ok'}),
    fail: (message) => setDialog({kind: 'alert', message, tone: 'fail'}),
    warn: (message) => setDialog({kind: 'alert', message, tone: 'warn'}),
    confirm: (options) => ask('confirm', options),
    prompt: (options) => ask('prompt', options)
  };
}

/** Bọc mọi lần tải dữ liệu để trang nào cũng có cùng trạng thái chờ và báo lỗi. */
export function useAsync(loader, deps) {
  const [state, setState] = useState({loading: true, error: null, data: null});
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    let alive = true;
    setState(current => ({...current, loading: true, error: null}));
    loader()
      .then(data => alive && setState({loading: false, error: null, data}))
      .catch(error => alive && setState({loading: false, error: error.message, data: null}));
    return () => { alive = false; };
  }, [...deps, nonce]);
  return {...state, reload: () => setNonce(n => n + 1)};
}

export const Loading = ({label = 'Đang tải...'}) => <div className="loading"><i /><span>{label}</span></div>;
