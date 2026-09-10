import React, {useEffect, useState} from 'react';
import {api, money, when} from '../api.js';
import {Card, Pill, Empty, Loading, useAsync} from '../ui.jsx';

export default function UsersPage({notify}) {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');

  // Gõ tới đâu tìm tới đó nhưng chờ 350ms để không bắn một request mỗi phím.
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const {data, loading, error, reload} = useAsync(
    () => api.get('/admin/users?' + new URLSearchParams({...(query ? {search: query} : {}), ...(status ? {status} : {})})),
    [query, status]
  );
  const [busy, setBusy] = useState(null);

  const setUserStatus = async (user, next) => {
    const verb = next === 'SUSPENDED' ? 'Khóa' : 'Mở khóa';
    const agreed = await notify.confirm({
      title: verb + ' tài khoản?',
      message: user.displayName + ' (@' + user.username + ')' + (next === 'SUSPENDED' ? ' sẽ bị đăng xuất khỏi mọi thiết bị và không vào được game.' : ' sẽ đăng nhập và chơi lại được bình thường.'),
      confirmLabel: verb, danger: next === 'SUSPENDED'
    });
    if (!agreed) return;
    setBusy(user.id);
    try {
      await api.patch('/admin/users/' + user.id + '/status', {status: next});
      notify.ok('Đã ' + verb.toLowerCase() + ' @' + user.username);
      reload();
    } catch (err) { notify.fail(err.display || err.message); }
    finally { setBusy(null); }
  };

  return (
    <Card
      title="Người chơi"
      action={
        <div className="filters">
          <input className="search" placeholder="Tìm tên hoặc tài khoản..." value={search} onChange={e => setSearch(e.target.value)} />
          <select value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="SUSPENDED">Đang bị khóa</option>
          </select>
        </div>
      }
    >
      {loading ? <Loading /> : error ? <Empty>{error}</Empty> : !data.items.length ? <Empty>Không tìm thấy người chơi nào.</Empty> : (
        <div className="tableWrap">
          <table>
            <thead><tr><th>Người chơi</th><th>Vai trò</th><th>Trạng thái</th><th className="num">Số dư</th><th>Ngày tham gia</th><th /></tr></thead>
            <tbody>
              {data.items.map(user => (
                <tr key={user.id}>
                  <td>{user.displayName} <small>@{user.username}</small></td>
                  <td>{user.role === 'ADMIN' ? <Pill tone="gold">Quản trị</Pill> : 'Người chơi'}</td>
                  <td>{user.status === 'ACTIVE' ? <Pill tone="ok">Hoạt động</Pill> : <Pill tone="fail">Bị khóa</Pill>}</td>
                  <td className="num">{money(user.balance)}</td>
                  <td>{when(user.createdAt)}</td>
                  <td className="rowActions">
                    {user.status === 'ACTIVE'
                      ? <button className="danger sm" disabled={busy === user.id} onClick={() => setUserStatus(user, 'SUSPENDED')}>Khóa</button>
                      : <button className="primary sm" disabled={busy === user.id} onClick={() => setUserStatus(user, 'ACTIVE')}>Mở khóa</button>}
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
