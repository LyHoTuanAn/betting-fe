import React, {useState} from 'react';
import {api, money, when} from '../api.js';
import {Card, Pill, Empty, Loading, useAsync} from '../ui.jsx';

const TABS = [
  {key: 'PENDING', label: 'Chờ duyệt'},
  {key: 'APPROVED', label: 'Đã duyệt'},
  {key: 'REJECTED', label: 'Đã từ chối'}
];

const TYPE_LABEL = {DEPOSIT: 'Nạp', WITHDRAW: 'Rút'};
const STATUS_TONE = {PENDING: 'warn', APPROVED: 'ok', REJECTED: 'fail'};
const STATUS_LABEL = {PENDING: 'Chờ duyệt', APPROVED: 'Đã duyệt', REJECTED: 'Đã từ chối'};

export default function WalletPage({notify}) {
  const [status, setStatus] = useState('PENDING');
  const {data, loading, error, reload} = useAsync(() => api.get('/admin/wallet/requests?status=' + status), [status]);
  const [busy, setBusy] = useState(null);

  const review = async (request, decision) => {
    const verb = decision === 'APPROVED' ? 'Duyệt' : 'Từ chối';
    const note = await notify.prompt({
      title: verb + ' yêu cầu ' + TYPE_LABEL[request.type].toLowerCase() + '?',
      message: money(request.amount) + ' vàng của ' + request.user.displayName + ' (@' + request.user.username + ').',
      label: 'Ghi chú (không bắt buộc)',
      placeholder: 'Lý do hoặc mã giao dịch...',
      confirmLabel: verb, danger: decision === 'REJECTED'
    });
    if (note === null) return;
    setBusy(request.id);
    try {
      await api.patch('/admin/wallet/requests/' + request.id, {status: decision, note: note.trim() || undefined});
      notify.ok('Đã ' + verb.toLowerCase() + ' yêu cầu');
      reload();
    } catch (err) { notify.fail(err.message); }
    finally { setBusy(null); }
  };

  return (
    <Card
      title="Yêu cầu nạp / rút"
      action={
        <div className="tabs">
          {TABS.map(tab => (
            <button key={tab.key} className={status === tab.key ? 'active' : ''} onClick={() => setStatus(tab.key)}>{tab.label}</button>
          ))}
        </div>
      }
    >
      {loading ? <Loading /> : error ? <Empty>{error}</Empty> : !data.items.length ? <Empty>Không có yêu cầu nào.</Empty> : (
        <div className="tableWrap">
          <table>
            <thead><tr><th>Thời gian</th><th>Người chơi</th><th>Loại</th><th className="num">Số tiền</th><th>Trạng thái</th><th>Ghi chú</th><th /></tr></thead>
            <tbody>
              {data.items.map(request => (
                <tr key={request.id}>
                  <td>{when(request.createdAt)}</td>
                  <td>{request.user.displayName} <small>@{request.user.username}</small></td>
                  <td>{TYPE_LABEL[request.type]}</td>
                  <td className="num">{money(request.amount)}</td>
                  <td><Pill tone={STATUS_TONE[request.status]}>{STATUS_LABEL[request.status]}</Pill></td>
                  <td className="muted">{request.note || '—'}</td>
                  <td className="rowActions">
                    {request.status === 'PENDING' && (
                      <>
                        <button className="primary sm" disabled={busy === request.id} onClick={() => review(request, 'APPROVED')}>Duyệt</button>
                        <button className="danger sm" disabled={busy === request.id} onClick={() => review(request, 'REJECTED')}>Từ chối</button>
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
