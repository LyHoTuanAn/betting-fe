import React, {useMemo, useState} from 'react';
import {ArrowDown, ArrowLeft, ArrowUp, ChevronRight} from 'lucide-react';
import {api, money, percent, when} from '../api.js';
import {Card, Field, Toggle, Pill, StatTile, Empty, Loading, useAsync} from '../ui.jsx';
import {getMergedGames} from '../../shared/games.js';

/**
 * Mỗi game có bộ tham số riêng. Khai báo ở đây phải khớp `configSchemas` bên
 * backend — backend vẫn là nơi chốt, phần này chỉ để dựng form và xem trước.
 */
const CONFIG_FIELDS = {
  SLOT: [
    {key: 'jackpotBp', label: 'Tỉ lệ nổ hũ', hint: 'Phần vạn — 2 nghĩa là 0,02% số lượt quay', step: 1, min: 0, max: 10000, format: v => percent(v / 10000, 3)},
    {key: 'bigWinBp', label: 'Tỉ lệ thắng lớn', hint: 'Phần vạn', step: 1, min: 0, max: 10000, format: v => percent(v / 10000, 3)},
    {key: 'smallWinBp', label: 'Tỉ lệ thắng nhỏ', hint: 'Phần vạn', step: 1, min: 0, max: 10000, format: v => percent(v / 10000, 3)},
    {key: 'jackpotX', label: 'Bội số nổ hũ', hint: 'Tiền thưởng = cược × bội số', step: 1, min: 0, max: 10000, format: v => '×' + v},
    {key: 'bigWinX', label: 'Bội số thắng lớn', step: 0.5, min: 0, max: 1000, format: v => '×' + v},
    {key: 'smallWinX', label: 'Bội số thắng nhỏ', step: 0.5, min: 0, max: 100, format: v => '×' + v}
  ],
  DICE: [
    {key: 'payoutX', label: 'Bội số trả thưởng', hint: '1.98 tương đương hoa hồng nhà cái 1%', step: 0.01, min: 1, max: 10, format: v => '×' + v}
  ],
  FISH: [
    {key: 'powerBonus', label: 'Thưởng theo lực bắn', hint: 'Tiền thưởng = giá cá + lực bắn × hệ số', step: 0.05, min: 0, max: 5, format: v => '×' + v},
    {key: 'rtp', label: 'Tỉ lệ hoàn trả (RTP)', hint: 'Quyết định sát thương mỗi phát bắn trong phòng chung', step: 0.01, min: 0.5, max: 1, format: v => percent(v)}
  ],
  POKER: [
    {key: 'smallBlind', label: 'Mức cược Small Blind', step: 1000, min: 1000, max: 1000000, format: v => money(v)},
    {key: 'bigBlind', label: 'Mức cược Big Blind', step: 1000, min: 2000, max: 2000000, format: v => money(v)},
    {key: 'rakeBp', label: 'Hoa hồng bàn (Rake)', hint: 'Phần vạn — 250 nghĩa là 2.5%', step: 10, min: 0, max: 1000, format: v => percent(v / 10000, 2)}
  ],
  ROULETTE: [
    {key: 'straightPayout', label: 'Bội số cược số đơn (Straight)', step: 1, min: 1, max: 50, format: v => '×' + v},
    {key: 'dozenPayout', label: 'Bội số cược tá (Dozen)', step: 1, min: 1, max: 10, format: v => '×' + v},
    {key: 'outsidePayout', label: 'Bội số cược ngoài (Red/Black...)', step: 0.1, min: 1, max: 5, format: v => '×' + v}
  ],
  BLACKJACK: [
    {key: 'bjPayout', label: 'Tỉ lệ Blackjack (3:2 = 1.5)', step: 0.1, min: 1, max: 3, format: v => '×' + v},
    {key: 'dealerStand', label: 'Điểm nhà cái dừng (Dealer Stand)', step: 1, min: 16, max: 18, format: v => v + ' điểm'}
  ],
  TIENLEN: [
    {key: 'betPerCard', label: 'Mức cược mỗi lá', step: 1000, min: 1000, max: 1000000, format: v => money(v)},
    {key: 'chatHeoMulti', label: 'Hệ số phạt Chặt Heo', step: 1, min: 1, max: 10, format: v => '×' + v},
    {key: 'tuQuyMulti', label: 'Hệ số phạt Tứ Quý', step: 1, min: 1, max: 20, format: v => '×' + v}
  ]
};

const GAME_LABEL = {
  SLOT: 'Nổ hũ',
  DICE: 'Tài xỉu',
  FISH: 'Bắn cá',
  POKER: 'Poker Texas',
  ROULETTE: 'Roulette Châu Âu',
  BLACKJACK: 'VIP Blackjack',
  TIENLEN: 'Tiến Lên Miền Nam'
};
const GAME_ART = {
  SLOT: '/assets/home-slot.webp',
  DICE: '/assets/home-dice.webp',
  FISH: '/assets/home-fish.webp',
  POKER: '/assets/home-poker.webp',
  ROULETTE: '/assets/home-roulette.webp',
  BLACKJACK: '/assets/home-blackjack.webp',
  TIENLEN: '/assets/home-tienlen.webp'
};

// Game mới thêm sau này chưa có khai báo ở đây thì rơi về giá trị chung, không vỡ trang.
const labelOf = key => GAME_LABEL[key] || key;
const artOf = key => GAME_ART[key] || '/assets/home-banner.webp';
const fieldsOf = key => CONFIG_FIELDS[key] || [];

/** Tính lại RTP ngay khi admin gõ, mirror công thức của backend. */
function previewRtp(key, config) {
  const value = k => Number(config[k]) || 0;
  if (key === 'SLOT') return (value('jackpotBp') * value('jackpotX') + value('bigWinBp') * value('bigWinX') + value('smallWinBp') * value('smallWinX')) / 10000;
  if (key === 'DICE') return value('payoutX') / 2;
  if (key === 'POKER') return 1 - (value('rakeBp') / 10000 || 0.025);
  if (key === 'ROULETTE') return 36 / 37;
  if (key === 'BLACKJACK') return (value('bjPayout') || 1.5) * 0.048 + 0.923;
  if (key === 'TIENLEN') return 0.98;
  return value('rtp') || 0.95;
}

/**
 * `param` là khóa game lấy từ hash (#games/SLOT). Không có thì hiện lưới thẻ —
 * danh sách phải gọn để còn dùng được khi có hàng chục game.
 */
export default function GamesPage({notify, go, param}) {
  const {data, loading, error, reload} = useAsync(() => api.get('/admin/games').catch(() => ({games: []})), []);

  if (loading && !data) return <Loading label="Đang tải danh sách game..." />;
  if (error && !data) return <Card><Empty>{error}</Empty></Card>;

  const games = getMergedGames(data?.games || []);
  const selected = param && games.find(game => game.key === param.toUpperCase());

  if (param && !selected) return <Card><Empty>Không tìm thấy game "{param}".</Empty></Card>;

  return selected
    ? <GameDetail game={selected} notify={notify} onSaved={reload} onBack={() => go('games')} />
    : <GameList games={games} notify={notify} onSaved={reload} onOpen={key => go('games/' + key)} />;
}

function GameList({games, notify, onSaved, onOpen}) {
  const hidden = games.filter(game => !game.enabled).length;

  const moveGame = async (gameKey, direction) => {
    const idx = games.findIndex(g => g.key === gameKey);
    if (idx === -1) return;
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= games.length) return;

    const newGames = [...games];
    const [moved] = newGames.splice(idx, 1);
    newGames.splice(targetIdx, 0, moved);

    try {
      const overrides = JSON.parse(localStorage.getItem('goldzone_admin_games_override') || '{}');
      newGames.forEach((g, i) => {
        overrides[g.key] = {...(overrides[g.key] || {}), sortOrder: i + 1};
      });
      localStorage.setItem('goldzone_admin_games_override', JSON.stringify(overrides));
      window.dispatchEvent(new CustomEvent('goldzone:games_updated'));

      newGames.forEach((g, i) => {
        api.patch('/admin/games/' + g.key, {sortOrder: i + 1}).catch(() => {});
      });

      notify.ok(`Đã chuyển "${moved.name}" sang vị trí #${targetIdx + 1}`);
      onSaved();
    } catch (e) {
      notify.fail('Không thể lưu thứ tự sắp xếp');
    }
  };

  const setGameOrder = async (gameKey, targetOrder) => {
    const targetIdx = Math.max(0, Math.min(games.length - 1, targetOrder - 1));
    const idx = games.findIndex(g => g.key === gameKey);
    if (idx === -1 || idx === targetIdx) return;

    const newGames = [...games];
    const [moved] = newGames.splice(idx, 1);
    newGames.splice(targetIdx, 0, moved);

    try {
      const overrides = JSON.parse(localStorage.getItem('goldzone_admin_games_override') || '{}');
      newGames.forEach((g, i) => {
        overrides[g.key] = {...(overrides[g.key] || {}), sortOrder: i + 1};
      });
      localStorage.setItem('goldzone_admin_games_override', JSON.stringify(overrides));
      window.dispatchEvent(new CustomEvent('goldzone:games_updated'));

      newGames.forEach((g, i) => {
        api.patch('/admin/games/' + g.key, {sortOrder: i + 1}).catch(() => {});
      });

      notify.ok(`Đã đổi vị trí "${moved.name}" thành #${targetIdx + 1}`);
      onSaved();
    } catch (e) {
      notify.fail('Không thể lưu thứ tự sắp xếp');
    }
  };

  return (
    <div className="stack">
      <div className="statRow">
        <StatTile label="Tổng số game" value={games.length} />
        <StatTile label="Đang hiển thị" value={games.length - hidden} tone="ok" />
        <StatTile label="Đang ẩn" value={hidden} tone={hidden ? 'warn' : ''} />
      </div>
      <div className="gameTiles">
        {games.map((game, idx) => (
          <GameTile
            key={game.key}
            game={game}
            index={idx}
            total={games.length}
            onMove={dir => moveGame(game.key, dir)}
            onSetOrder={pos => setGameOrder(game.key, pos)}
            notify={notify}
            onSaved={onSaved}
            onOpen={() => onOpen(game.key)}
          />
        ))}
      </div>
    </div>
  );
}

function GameTile({game, index, total, onMove, onSetOrder, notify, onSaved, onOpen}) {
  const [enabled, setEnabled] = useState(game.enabled);
  const toggle = useVisibilityToggle(game, enabled, setEnabled, notify, onSaved);

  return (
    <article className={'gameTile ' + (enabled ? '' : 'isHidden')}>
      {/* Bấm bất kỳ đâu trên thẻ để mở chi tiết; công tắc bên dưới tự chặn sự kiện. */}
      <button className="tileHit" onClick={onOpen} aria-label={'Mở cấu hình ' + game.name} />
      <div className="tileArt">
        <img src={artOf(game.key)} alt="" loading="lazy" />
        <div className="tileOrderBadge" onClick={e => e.stopPropagation()}>
          <button
            type="button"
            className="orderBtn"
            disabled={index === 0}
            onClick={() => onMove(-1)}
            title="Đẩy lên trước"
          >
            <ArrowUp size={13} />
          </button>
          <select
            className="orderSelect"
            value={index + 1}
            onChange={e => onSetOrder(Number(e.target.value))}
            title="Chọn thứ tự hiển thị"
          >
            {Array.from({length: total}, (_, i) => (
              <option key={i + 1} value={i + 1}>
                #{i + 1}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="orderBtn"
            disabled={index === total - 1}
            onClick={() => onMove(1)}
            title="Đẩy xuống sau"
          >
            <ArrowDown size={13} />
          </button>
        </div>
      </div>
      <div className="tileBody">
        <header>
          <div>
            <h3>{game.name}</h3>
            <small>{labelOf(game.key)} · {game.subtitle}</small>
          </div>
          {!enabled && <Pill tone="warn">Đang ẩn</Pill>}
        </header>
        <dl className="tileFacts">
          <div><dt>Hạn mức cược</dt><dd>{money(game.minBet)} – {money(game.maxBet)}</dd></div>
          <div><dt>RTP lý thuyết</dt><dd>{percent(game.theoreticalRtp)}</dd></div>
          <div><dt>RTP thực tế</dt><dd>{percent(game.stats.actualRtp)}</dd></div>
          <div><dt>Số ván</dt><dd>{money(game.stats.rounds)}</dd></div>
          <div><dt>Nhà cái thu về</dt><dd className={game.stats.houseNet >= 0 ? 'up' : 'down'}>{money(game.stats.houseNet)}</dd></div>
        </dl>
        <footer>
          <span onClick={e => e.stopPropagation()}><Toggle checked={enabled} onChange={toggle} on="Hiện" off="Ẩn" /></span>
          <span className="tileOpen">Sửa chi tiết <ChevronRight size={15} /></span>
        </footer>
      </div>
    </article>
  );
}

/**
 * Bật/tắt lưu ngay chứ không chờ nút Lưu: khi cần gỡ gấp một game khỏi web
 * người chơi, admin không nên phải mở chi tiết và điền xong form mới áp dụng được.
 */
function useVisibilityToggle(game, enabled, setEnabled, notify, onSaved) {
  return async (next) => {
    setEnabled(next);
    try {
      await api.patch('/admin/games/' + game.key, {enabled: next});
    } catch (_) {
      try {
        const overrides = JSON.parse(localStorage.getItem('goldzone_admin_games_override') || '{}');
        overrides[game.key] = {...(overrides[game.key] || {}), enabled: next};
        localStorage.setItem('goldzone_admin_games_override', JSON.stringify(overrides));
        window.dispatchEvent(new CustomEvent('goldzone:games_updated'));
      } catch (e) {
        console.error(e);
      }
    }
    notify.ok(next ? game.name + ' đã hiện trên web người chơi' : game.name + ' đã bị ẩn khỏi web người chơi');
    onSaved();
  };
}

function GameDetail({game, notify, onSaved, onBack}) {
  const [draft, setDraft] = useState(() => toDraft(game));
  const [saving, setSaving] = useState(false);
  const [showRounds, setShowRounds] = useState(false);
  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(toDraft(game)), [draft, game]);
  const rtp = previewRtp(game.key, draft.config);
  const rangeInvalid = Number(draft.minBet) > Number(draft.maxBet);

  const set = (patch) => setDraft(current => ({...current, ...patch}));
  const setConfig = (key, value) => setDraft(current => ({...current, config: {...current.config, [key]: value}}));
  const toggleVisibility = useVisibilityToggle(game, draft.enabled, value => set({enabled: value}), notify, onSaved);

  const save = async () => {
    if (rangeInvalid) return notify.fail('Cược tối thiểu đang lớn hơn cược tối đa');
    setSaving(true);
    const payload = {
      name: draft.name.trim(),
      subtitle: draft.subtitle.trim(),
      enabled: draft.enabled,
      sortOrder: Number(draft.sortOrder),
      minBet: Number(draft.minBet),
      maxBet: Number(draft.maxBet),
      maintenanceNote: draft.maintenanceNote.trim() || null,
      config: draft.config
    };
    try {
      await api.patch('/admin/games/' + game.key, payload);
    } catch (_) {
      try {
        const overrides = JSON.parse(localStorage.getItem('goldzone_admin_games_override') || '{}');
        overrides[game.key] = {...(overrides[game.key] || {}), ...payload};
        localStorage.setItem('goldzone_admin_games_override', JSON.stringify(overrides));
        window.dispatchEvent(new CustomEvent('goldzone:games_updated'));
      } catch (e) {
        console.error(e);
      }
    }
    notify.ok('Đã lưu ' + draft.name);
    setSaving(false);
    onSaved();
  };

  const reset = async () => {
    const agreed = await notify.confirm({
      title: 'Khôi phục cấu hình mặc định?',
      message: game.name + ' sẽ trở lại tên, hạn mức cược và tỉ lệ trả thưởng ban đầu. Các thay đổi hiện tại sẽ mất.',
      confirmLabel: 'Khôi phục', danger: true
    });
    if (!agreed) return;
    setSaving(true);
    try { await api.post('/admin/games/' + game.key + '/reset'); } catch (_) {}
    try {
      const overrides = JSON.parse(localStorage.getItem('goldzone_admin_games_override') || '{}');
      delete overrides[game.key];
      localStorage.setItem('goldzone_admin_games_override', JSON.stringify(overrides));
      window.dispatchEvent(new CustomEvent('goldzone:games_updated'));
    } catch (e) {}
    notify.ok('Đã khôi phục mặc định');
    setSaving(false);
    onSaved();
  };

  return (
    <div className="stack">
      <div className="detailBar">
        <button className="ghost" onClick={onBack}><ArrowLeft size={16} /> Danh sách game</button>
        <div className="detailTitle"><strong>{game.name}</strong><code>{game.key}</code></div>
        <Toggle checked={draft.enabled} onChange={toggleVisibility} />
      </div>

      <Card className={'gameEditor ' + (draft.enabled ? '' : 'isHidden')}>
        <div className="gameGrid">
          <div className="col">
            <h3 className="groupTitle">Hiển thị ngoài sảnh</h3>
            <Field label="Tên game"><input value={draft.name} maxLength={60} onChange={e => set({name: e.target.value})} /></Field>
            <Field label="Mô tả ngắn"><input value={draft.subtitle} maxLength={120} onChange={e => set({subtitle: e.target.value})} /></Field>
            <Field label="Thứ tự sắp xếp" hint="Số nhỏ hiện trước">
              <input type="number" min={0} max={99} value={draft.sortOrder} onChange={e => set({sortOrder: e.target.value})} />
            </Field>
            <Field label="Thông báo khi ẩn" hint="Hiện cho người chơi cố mở game đã tắt. Bỏ trống để dùng câu mặc định.">
              <input value={draft.maintenanceNote} maxLength={200} placeholder="Ví dụ: Bảo trì đến 22h hôm nay" onChange={e => set({maintenanceNote: e.target.value})} />
            </Field>
          </div>

          <div className="col">
            <h3 className="groupTitle">Hạn mức cược</h3>
            <Field label="Cược tối thiểu (vàng)">
              <input type="number" min={1} value={draft.minBet} onChange={e => set({minBet: e.target.value})} />
            </Field>
            <Field label="Cược tối đa (vàng)">
              <input type="number" min={1} value={draft.maxBet} onChange={e => set({maxBet: e.target.value})} />
            </Field>
            {rangeInvalid && <p className="inlineError">Cược tối thiểu đang lớn hơn cược tối đa.</p>}
            <div className="rtpBox">
              <span>RTP lý thuyết sau khi lưu</span>
              <strong className={rtp > 1 ? 'danger' : rtp > 0.99 ? 'warn' : ''}>{percent(rtp)}</strong>
              {rtp > 1 && <small className="danger">Trên 100% nghĩa là nhà cái lỗ về dài hạn.</small>}
            </div>
          </div>

          <div className="col">
            <h3 className="groupTitle">Tỉ lệ và trả thưởng</h3>
            {fieldsOf(game.key).map(field => (
              <Field key={field.key} label={field.label} hint={field.hint}>
                <div className="numberRow">
                  <input
                    type="number" step={field.step} min={field.min} max={field.max}
                    value={draft.config[field.key]}
                    onChange={e => setConfig(field.key, e.target.value === '' ? '' : Number(e.target.value))}
                  />
                  <em>{field.format(Number(draft.config[field.key]) || 0)}</em>
                </div>
              </Field>
            ))}
          </div>
        </div>

        <div className="gameStats">
          <StatTile label="Số ván đã chơi" value={money(game.stats.rounds)} />
          <StatTile label="Tổng cược" value={money(game.stats.bet)} />
          <StatTile label="Tổng trả thưởng" value={money(game.stats.payout)} />
          <StatTile label="Nhà cái thu về" value={money(game.stats.houseNet)} tone={game.stats.houseNet >= 0 ? 'ok' : 'warn'} />
          <StatTile label="RTP thực tế" value={percent(game.stats.actualRtp)} sub={'Lý thuyết ' + percent(game.theoreticalRtp)} />
        </div>

        <footer className="cardFoot">
          <div className="footMeta">
            {game.updatedAt
              ? <Pill>Sửa lần cuối {when(game.updatedAt)}</Pill>
              : <Pill tone="warn">Chưa lưu vào CSDL — đang chạy cấu hình mặc định</Pill>}
            {dirty && <Pill tone="warn">Có thay đổi chưa lưu</Pill>}
          </div>
          <div className="actions">
            <button className="ghost" onClick={() => setShowRounds(!showRounds)}>{showRounds ? 'Ẩn ván gần đây' : 'Xem ván gần đây'}</button>
            <button className="ghost" onClick={reset} disabled={saving}>Khôi phục mặc định</button>
            <button className="ghost" onClick={() => setDraft(toDraft(game))} disabled={!dirty || saving}>Hoàn tác</button>
            <button className="primary" onClick={save} disabled={!dirty || saving}>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</button>
          </div>
        </footer>
      </Card>

      {showRounds && <Card title="Ván chơi gần đây"><RecentRounds gameKey={game.key} /></Card>}
    </div>
  );
}

function RecentRounds({gameKey}) {
  const {data, loading, error} = useAsync(() => api.get('/admin/games/' + gameKey + '/rounds?limit=30'), [gameKey]);
  if (loading) return <Loading label="Đang tải ván chơi..." />;
  if (error) return <Empty>{error}</Empty>;
  if (!data.items.length) return <Empty>Chưa có ván nào.</Empty>;
  return (
    <div className="tableWrap">
      <table>
        <thead><tr><th>Thời gian</th><th>Người chơi</th><th className="num">Cược</th><th className="num">Thưởng</th><th className="num">Lãi/lỗ</th></tr></thead>
        <tbody>
          {data.items.map(round => (
            <tr key={round.id}>
              <td>{when(round.createdAt)}</td>
              <td>{round.user.displayName} <small>@{round.user.username}</small></td>
              <td className="num">{money(round.bet)}</td>
              <td className="num">{money(round.payout)}</td>
              <td className={'num ' + (round.net >= 0 ? 'up' : 'down')}>{round.net >= 0 ? '+' : ''}{money(round.net)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const toDraft = (game) => ({
  name: game.name, subtitle: game.subtitle, enabled: game.enabled,
  sortOrder: game.sortOrder, minBet: game.minBet, maxBet: game.maxBet,
  maintenanceNote: game.maintenanceNote || '', config: {...game.config}
});
