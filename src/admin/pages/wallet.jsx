import React, {useState} from 'react';
import {api, money, when} from '../api.js';
import {Card, Empty, Field, Loading, Pill, useAsync} from '../ui.jsx';

/**
 * Hai màn hình tối thiểu mà SRS mục 20 yêu cầu, cộng phần cấu hình tài khoản
 * nhận tiền: giao dịch nạp đọc từ email (lọc theo trạng thái, khớp tay được các
 * giao dịch UNMATCHED) và yêu cầu rút chờ admin chuyển khoản rồi xác nhận.
 */

const TABS = [
  {key: 'deposits', label: 'Giao dịch nạp'},
  {key: 'withdrawals', label: 'Yêu cầu rút'},
  {key: 'settings', label: 'Tài khoản nhận tiền'}
];

const DEPOSIT_FILTERS = [
  {key: 'ALL', label: 'Tất cả'},
  {key: 'COMPLETED', label: 'Đã cộng tiền'},
  {key: 'UNMATCHED', label: 'Chưa khớp'}
];

const WITHDRAW_FILTERS = [
  {key: 'PENDING', label: 'Chờ duyệt'},
  {key: 'APPROVED', label: 'Đã duyệt'},
  {key: 'REJECTED', label: 'Đã từ chối'}
];

const STATUS_TONE = {PENDING: 'warn', APPROVED: 'ok', REJECTED: 'fail', COMPLETED: 'ok', UNMATCHED: 'warn'};
const STATUS_LABEL = {PENDING: 'Chờ duyệt', APPROVED: 'Đã duyệt', REJECTED: 'Đã từ chối', COMPLETED: 'Đã cộng tiền', UNMATCHED: 'Chưa khớp'};

export default function WalletPage({notify}) {
  const [tab, setTab] = useState('deposits');
  const active = TABS.find(item => item.key === tab) || TABS[0];
  return (
    <>
      <div className="tabs pageTabs">
        {TABS.map(item => (
          <button key={item.key} className={item.key === tab ? 'active' : ''} onClick={() => setTab(item.key)}>{item.label}</button>
        ))}
      </div>
      {active.key === 'deposits' ? <DepositsPanel notify={notify} />
        : active.key === 'withdrawals' ? <WithdrawalsPanel notify={notify} />
        : <BankAccountPanel notify={notify} />}
    </>
  );
}

function DepositsPanel({notify}) {
  const [status, setStatus] = useState('ALL');
  const {data, loading, error, reload} = useAsync(() => api.get('/admin/deposits?status=' + status), [status]);
  const reader = useAsync(() => api.get('/admin/email-reader'), []);
  const [busy, setBusy] = useState(null);

  const match = async (deposit) => {
    const username = await notify.prompt({
      title: 'Khớp giao dịch cho người chơi nào?',
      message: `${money(deposit.amount)} · nội dung chuyển khoản: "${deposit.transferContent}"`,
      label: 'Username người chơi',
      placeholder: 'vd: teddy123',
      confirmLabel: 'Cộng tiền'
    });
    if (username === null) return;
    const clean = username.trim().toLowerCase();
    if (!clean) return notify.warn('Bạn chưa nhập username');
    setBusy(deposit.id);
    try {
      await api.post(`/admin/deposits/${deposit.id}/match`, {username: clean});
      notify.ok(`Đã cộng ${money(deposit.amount)} cho @${clean}`);
      reload();
    } catch (err) { notify.fail(err.display || err.message); }
    finally { setBusy(null); }
  };

  return (
    <>
      <ReaderStatus state={reader} />
      <Card
        title="Giao dịch nạp từ email ngân hàng"
        action={
          <div className="tabs">
            {DEPOSIT_FILTERS.map(item => (
              <button key={item.key} className={status === item.key ? 'active' : ''} onClick={() => setStatus(item.key)}>{item.label}</button>
            ))}
          </div>
        }
      >
        {loading ? <Loading /> : error ? <Empty>{error}</Empty> : !data.items.length ? <Empty>Chưa có giao dịch nào.</Empty> : (
          <div className="tableWrap">
            <table>
              <thead><tr><th>Thời gian</th><th>Mã giao dịch</th><th className="num">Số tiền</th><th>Nội dung CK</th><th>Người chơi</th><th>Trạng thái</th><th /></tr></thead>
              <tbody>
                {data.items.map(item => (
                  <tr key={item.id}>
                    <td>{when(item.transactionTime)}</td>
                    <td><code>{item.bankTransactionId}</code></td>
                    <td className="num">{money(item.amount)}</td>
                    <td className="muted">{item.transferContent}</td>
                    <td>{item.user ? <>{item.user.displayName} <small>@{item.user.username}</small></> : <span className="muted">—</span>}</td>
                    <td>
                      <Pill tone={STATUS_TONE[item.status]}>{STATUS_LABEL[item.status]}</Pill>
                      {item.resolvedBy && <small className="muted"> khớp tay bởi @{item.resolvedBy.username}</small>}
                    </td>
                    <td className="rowActions">
                      {item.status === 'UNMATCHED' && (
                        <button className="primary sm" disabled={busy === item.id} onClick={() => match(item)}>Khớp tay</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

/** Worker chết là tiền nạp ngừng được cộng, nên trạng thái của nó phải hiện rõ. */
function ReaderStatus({state}) {
  if (state.loading || state.error || !state.data) return null;
  const {runs, completed, unmatched, duplicates, errors, lastRunAt, lastError} = state.data;
  const idle = !lastRunAt;
  return (
    <Card className="readerCard">
      <div className="readerRow">
        <Pill tone={idle ? 'warn' : lastError ? 'fail' : 'ok'}>
          {idle ? 'Worker đọc email chưa chạy' : lastError ? 'Vòng quét gần nhất lỗi' : 'Đang hoạt động'}
        </Pill>
        {idle
          ? <span className="muted">Bật bằng EMAIL_READER_ENABLED=1 và khai báo IMAP_* trong .env của backend.</span>
          : <span className="muted">
              {runs} lượt quét · đã cộng {completed} · chưa khớp {unmatched} · trùng {duplicates} · lỗi {errors} · lần cuối {when(lastRunAt)}
            </span>}
      </div>
      {lastError && <p className="inlineError">{lastError}</p>}
    </Card>
  );
}

function WithdrawalsPanel({notify}) {
  const [status, setStatus] = useState('PENDING');
  const {data, loading, error, reload} = useAsync(() => api.get('/admin/withdrawals?status=' + status), [status]);
  const [busy, setBusy] = useState(null);

  const review = async (request, decision) => {
    const approving = decision === 'approve';
    const note = await notify.prompt({
      title: approving ? 'Xác nhận đã chuyển khoản?' : 'Từ chối yêu cầu rút?',
      message: approving
        ? `Chỉ bấm sau khi ĐÃ chuyển ${money(request.amount)} tới ${request.bankName || '—'} ${request.accountNumber || ''} (${request.accountName || '—'}). Số dư người chơi sẽ bị trừ hẳn.`
        : `${money(request.amount)} sẽ được mở khoá và trả lại số dư khả dụng của ${request.user.displayName}.`,
      label: 'Ghi chú (không bắt buộc)',
      placeholder: approving ? 'Mã giao dịch Timo...' : 'Lý do từ chối...',
      confirmLabel: approving ? 'Đã chuyển, duyệt' : 'Từ chối',
      danger: !approving
    });
    if (note === null) return;
    setBusy(request.id);
    try {
      await api.post(`/admin/withdrawals/${request.id}/${decision}`, {note: note.trim() || undefined});
      notify.ok(approving ? 'Đã duyệt yêu cầu rút' : 'Đã từ chối và mở khoá tiền');
      reload();
    } catch (err) { notify.fail(err.display || err.message); }
    finally { setBusy(null); }
  };

  return (
    <Card
      title="Yêu cầu rút tiền"
      action={
        <div className="tabs">
          {WITHDRAW_FILTERS.map(item => (
            <button key={item.key} className={status === item.key ? 'active' : ''} onClick={() => setStatus(item.key)}>{item.label}</button>
          ))}
        </div>
      }
    >
      {loading ? <Loading /> : error ? <Empty>{error}</Empty> : !data.items.length ? <Empty>Không có yêu cầu nào.</Empty> : (
        <div className="tableWrap">
          <table>
            <thead><tr><th>Thời gian</th><th>Người chơi</th><th className="num">Số tiền</th><th>Ngân hàng</th><th>Số tài khoản</th><th>Chủ tài khoản</th><th>Trạng thái</th><th>Ghi chú</th><th /></tr></thead>
            <tbody>
              {data.items.map(request => (
                <tr key={request.id}>
                  <td>{when(request.createdAt)}</td>
                  <td>{request.user.displayName} <small>@{request.user.username}</small></td>
                  <td className="num">{money(request.amount)}</td>
                  <td>{request.bankName || <span className="muted">—</span>}</td>
                  <td>{request.accountNumber || <span className="muted">—</span>}</td>
                  <td>{request.accountName || <span className="muted">—</span>}</td>
                  <td><Pill tone={STATUS_TONE[request.status]}>{STATUS_LABEL[request.status]}</Pill></td>
                  <td className="muted">{request.note || '—'}</td>
                  <td className="rowActions">
                    {request.status === 'PENDING' && (
                      <>
                        <button className="primary sm" disabled={busy === request.id} onClick={() => review(request, 'approve')}>Duyệt</button>
                        <button className="danger sm" disabled={busy === request.id} onClick={() => review(request, 'reject')}>Từ chối</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function BankAccountPanel({notify}) {
  const {data, loading, error, reload} = useAsync(() => api.get('/admin/bank-account'), []);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);

  const account = data?.account;
  const current = form ?? {
    bankName: account?.bankName || 'Timo',
    accountNumber: account?.accountNumber || '',
    accountName: account?.accountName || '',
    transferContentDescription: account?.transferContentDescription || 'Ghi ĐÚNG username của bạn trong nội dung chuyển khoản, không thêm chữ nào khác.'
  };
  const set = (key, value) => setForm({...current, [key]: value});

  const save = async () => {
    const confirmed = await notify.confirm({
      title: 'Đổi tài khoản nhận tiền?',
      message: 'Người chơi sẽ thấy số tài khoản mới ngay lập tức. Giao dịch cũ vẫn giữ nguyên lịch sử.',
      confirmLabel: 'Lưu'
    });
    if (!confirmed) return;
    setBusy(true);
    try {
      await api.put('/admin/bank-account', current);
      notify.ok('Đã cập nhật tài khoản nhận tiền');
      setForm(null);
      reload();
    } catch (err) { notify.fail(err.display || err.message); }
    finally { setBusy(false); }
  };

  if (loading) return <Card title="Tài khoản nhận tiền"><Loading /></Card>;
  if (error) return <Card title="Tài khoản nhận tiền"><Empty>{error}</Empty></Card>;

  return (
    <Card title="Tài khoản nhận tiền nạp">
      {!account && <p className="inlineError">Chưa cấu hình tài khoản nào — trang nạp tiền của người chơi đang báo lỗi.</p>}
      <div className="formGrid">
        <Field label="Ngân hàng"><input value={current.bankName} onChange={e => set('bankName', e.target.value)} /></Field>
        <Field label="Số tài khoản" hint="Chỉ gồm chữ số">
          <input value={current.accountNumber} inputMode="numeric" onChange={e => set('accountNumber', e.target.value.replace(/\D/g, ''))} />
        </Field>
        <Field label="Tên tài khoản"><input value={current.accountName} onChange={e => set('accountName', e.target.value.toUpperCase())} /></Field>
        <Field label="Ghi chú hiển thị cho người chơi">
          <input value={current.transferContentDescription} onChange={e => set('transferContentDescription', e.target.value)} />
        </Field>
      </div>
      <div className="rowActions">
        <button className="primary" disabled={busy || !current.accountNumber || !current.accountName} onClick={save}>
          {busy ? 'Đang lưu...' : 'Lưu tài khoản'}
        </button>
        {form && <button className="ghost" onClick={() => setForm(null)}>Huỷ thay đổi</button>}
      </div>
    </Card>
  );
}
