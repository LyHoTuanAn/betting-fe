import React from 'react';
import {api, money, percent} from '../api.js';
import {Card, StatTile, Pill, Empty, Loading, useAsync} from '../ui.jsx';
import {getMergedGames} from '../../shared/games.js';

export default function DashboardPage({go}) {
  const {data, loading, error} = useAsync(() => Promise.all([
    api.get('/admin/stats').catch(() => ({users: 0, suspended: 0, pendingWithdrawals: 0, unmatchedDeposits: 0, rounds: 0, bet: 0, houseNet: 0, payout: 0})),
    api.get('/admin/games').catch(() => ({games: []}))
  ]), []);

  if (loading && !data) return <Loading label="Đang tải số liệu..." />;
  if (error && !data) return <Card><Empty>{error}</Empty></Card>;

  const [stats = {}, rawCatalog = {games: []}] = data || [];
  const games = getMergedGames(rawCatalog?.games || []);
  const hidden = games.filter(g => !g.enabled);

  return (
    <div className="stack">
      <div className="statRow">
        <StatTile label="Người chơi" value={money(stats.users)} sub={stats.suspended + ' bị khóa'} />
        <StatTile label="Yêu cầu rút chờ duyệt" value={money(stats.pendingWithdrawals)} tone={stats.pendingWithdrawals ? 'warn' : 'ok'} />
        <StatTile label="Giao dịch nạp chưa khớp" value={money(stats.unmatchedDeposits)} tone={stats.unmatchedDeposits ? 'warn' : 'ok'} />
        <StatTile label="Số ván đã chơi" value={money(stats.rounds)} />
        <StatTile label="Tổng cược" value={money(stats.bet)} />
        <StatTile label="Nhà cái thu về" value={money(stats.houseNet)} tone={stats.houseNet >= 0 ? 'ok' : 'warn'} sub={'RTP thực tế ' + percent(stats.bet ? stats.payout / stats.bet : null)} />
      </div>

      {(stats.pendingWithdrawals > 0 || stats.unmatchedDeposits > 0) && (
        <Card>
          <div className="callout">
            <p>
              Có <strong>{stats.pendingWithdrawals}</strong> yêu cầu rút chờ duyệt
              {stats.unmatchedDeposits > 0 && <> và <strong>{stats.unmatchedDeposits}</strong> giao dịch nạp chưa khớp được người chơi</>}.
            </p>
            <button className="primary" onClick={() => go('wallet')}>Xử lý ngay</button>
          </div>
        </Card>
      )}

      <Card title="Trạng thái game" action={<button className="ghost" onClick={() => go('games')}>Quản lý chi tiết</button>}>
        <div className="tableWrap">
          <table>
            <thead><tr><th>Game</th><th>Trạng thái</th><th className="num">Hạn mức cược</th><th className="num">RTP lý thuyết</th><th className="num">RTP thực tế</th><th className="num">Nhà cái thu về</th></tr></thead>
            <tbody>
              {games.map(game => (
                <tr key={game.key}>
                  <td><button className="linkCell" onClick={() => go('games/' + game.key)}>{game.name}</button> <small>{game.key}</small></td>
                  <td>{game.enabled ? <Pill tone="ok">Đang hiển thị</Pill> : <Pill tone="warn">Đang ẩn</Pill>}</td>
                  <td className="num">{money(game.minBet)} – {money(game.maxBet)}</td>
                  <td className="num">{percent(game.theoreticalRtp)}</td>
                  <td className="num">{percent(game.stats.actualRtp)}</td>
                  <td className={'num ' + (game.stats.houseNet >= 0 ? 'up' : 'down')}>{money(game.stats.houseNet)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {hidden.length > 0 && (
          <p className="note">Đang ẩn khỏi web người chơi: {hidden.map(g => g.name).join(', ')}.</p>
        )}
      </Card>
    </div>
  );
}
