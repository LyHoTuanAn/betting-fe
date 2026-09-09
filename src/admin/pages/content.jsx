import React, {useState} from 'react';
import {
  Image, Sparkles, Plus, Edit2, Trash2, Check, X, ExternalLink,
  Eye, EyeOff, Calendar, Gift, Flame, Trophy, PlayCircle, Layers
} from 'lucide-react';
import {api} from '../api.js';
import {Card, Field, Toggle, Pill, StatTile, Empty, Loading, useAsync} from '../ui.jsx';

const SCREEN_OPTIONS = [
  {value: 'slot', label: 'Nổ Hũ (Slot)'},
  {value: 'dice', label: 'Tài Xỉu (Dice)'},
  {value: 'fish', label: 'Bắn Cá (Fish)'},
  {value: 'events', label: 'Trang Sự Kiện'},
  {value: 'profile', label: 'Trang Cá Nhân'},
  {value: 'url', label: 'Đường dẫn URL ngoài'}
];

const CATEGORY_OPTIONS = [
  {value: 'checkin', label: 'Điểm danh hàng ngày'},
  {value: 'deposit', label: 'Nạp / Khuyến mãi ví'},
  {value: 'tournament', label: 'Giải đấu / Đua Top'},
  {value: 'slot', label: 'Sự kiện Nổ Hũ'},
  {value: 'fish', label: 'Săn Boss Bắn Cá'},
  {value: 'dice', label: 'Hoàn trả Tài Xỉu'},
  {value: 'special', label: 'Đặc biệt / Tri ân'}
];

const PRESET_IMAGES = [
  {label: 'Banner Vàng', url: '/assets/home-banner.webp'},
  {label: 'Slot Nổ Hũ', url: '/assets/home-slot.webp'},
  {label: 'Tài Xỉu', url: '/assets/home-dice.webp'},
  {label: 'Bắn Cá', url: '/assets/home-fish.webp'},
  {label: 'Avatar Thành Viên', url: '/assets/home-avatar.webp'}
];

export default function ContentPage({notify}) {
  const [tab, setTab] = useState('banners');
  const {data: bannersData, loading: bLoading, reload: reloadBanners} = useAsync(() => api.get('/admin/banners'), []);
  const {data: eventsData, loading: eLoading, reload: reloadEvents} = useAsync(() => api.get('/admin/events'), []);

  return (
    <div className="stack">
      <div className="contentTabNav">
        <button
          className={tab === 'banners' ? 'active' : ''}
          onClick={() => setTab('banners')}
        >
          <Image size={18} /> Quản lý Banner ({bannersData?.banners?.length || 0})
        </button>
        <button
          className={tab === 'events' ? 'active' : ''}
          onClick={() => setTab('events')}
        >
          <Sparkles size={18} /> Quản lý Sự kiện ({eventsData?.events?.length || 0})
        </button>
      </div>

      {tab === 'banners' ? (
        bLoading ? <Loading label="Đang tải danh sách banner..." /> : (
          <BannerManager
            banners={bannersData?.banners || []}
            notify={notify}
            reload={reloadBanners}
          />
        )
      ) : (
        eLoading ? <Loading label="Đang tải danh sách sự kiện..." /> : (
          <EventManager
            events={eventsData?.events || []}
            notify={notify}
            reload={reloadEvents}
          />
        )
      )}
    </div>
  );
}

/* ========================================================================= */
/* BANNER MANAGER                                                            */
/* ========================================================================= */
function BannerManager({banners, notify, reload}) {
  const [editing, setEditing] = useState(null);
  const [isCreating, setIsCreating] = useState(false);

  const activeCount = banners.filter(b => b.enabled).length;

  const handleDelete = async (id, title) => {
    const agreed = await notify.confirm({title: `Xóa banner "${title}"?`, message: 'Banner sẽ bị gỡ khỏi web người chơi và không khôi phục được.', confirmLabel: 'Xóa banner', danger: true});
    if (!agreed) return;
    try {
      await api.delete ? api.delete(`/admin/banners/${id}`) : api.post(`/admin/banners/${id}`, {_method: 'DELETE'});
      notify.show(`Đã xóa banner "${title}"`, 'ok');
      reload();
    } catch (err) {
      // Fallback direct fetch if api.delete not declared
      try {
        const token = localStorage.getItem('goldzone_admin_token');
        const res = await fetch(`/api/admin/banners/${id}`, {
          method: 'DELETE',
          headers: {'Content-Type': 'application/json', ...(token ? {Authorization: `Bearer ${token}`} : {})}
        });
        if (!res.ok) throw new Error('Không thể xóa banner');
        notify.show(`Đã xóa banner "${title}"`, 'ok');
        reload();
      } catch (e) {
        notify.show(e.message, 'fail');
      }
    }
  };

  const handleToggle = async (banner) => {
    try {
      await api.patch(`/admin/banners/${banner.id}`, {enabled: !banner.enabled});
      notify.show(`Đã ${!banner.enabled ? 'bật' : 'tắt'} banner`, 'ok');
      reload();
    } catch (err) {
      notify.show(err.message, 'fail');
    }
  };

  return (
    <div className="stack">
      <div className="statRow">
        <StatTile label="Tổng banner" value={banners.length} />
        <StatTile label="Đang hiển thị" value={activeCount} tone="ok" />
        <StatTile label="Đang ẩn" value={banners.length - activeCount} tone={banners.length - activeCount ? 'warn' : ''} />
      </div>

      <div className="actionRow">
        <h3>Danh sách Banner trang chủ</h3>
        <button className="primary sm" onClick={() => { setIsCreating(true); setEditing({
          title: 'BANNER MỚI',
          subtitle: 'Mô tả ngắn hấp dẫn',
          image: '/assets/home-banner.webp',
          tag: 'HOT',
          actionScreen: 'slot',
          actionUrl: '',
          actionLabel: 'Chơi Ngay',
          enabled: true,
          sortOrder: banners.length + 1
        }); }}>
          <Plus size={16} /> Thêm Banner mới
        </button>
      </div>

      {banners.length === 0 ? (
        <Card><Empty>Chưa có banner nào. Hãy bấm "Thêm Banner mới" để tạo banner trang chủ.</Empty></Card>
      ) : (
        <div className="contentCardGrid">
          {banners.map(b => (
            <Card key={b.id} className={'bannerAdminCard ' + (!b.enabled ? 'disabled' : '')}>
              <div className="bannerImgPreview">
                <img src={b.image} alt={b.title} onError={e => e.target.src = '/assets/home-banner.webp'} />
                {b.tag && <span className="bannerTagBadge">{b.tag}</span>}
                <div className="bannerOrderBadge">Thứ tự: {b.sortOrder}</div>
              </div>
              <div className="bannerAdminBody">
                <div className="bannerHead">
                  <h4>{b.title}</h4>
                  <span className={'statusDot ' + (b.enabled ? 'ok' : 'muted')} title={b.enabled ? 'Đang bật' : 'Đang tắt'} />
                </div>
                <p className="bannerSub">{b.subtitle || <em>(Không có phụ đề)</em>}</p>
                <div className="bannerMeta">
                  <span className="pill">
                    Đích: {SCREEN_OPTIONS.find(s => s.value === b.actionScreen)?.label || b.actionScreen || 'Mặc định'}
                  </span>
                  {b.actionUrl && (
                    <span className="pill url" title={b.actionUrl}>
                      <ExternalLink size={12} /> {b.actionUrl}
                    </span>
                  )}
                </div>
                <div className="bannerCardActions">
                  <button
                    className={'sm ' + (b.enabled ? 'ghost' : 'primary')}
                    onClick={() => handleToggle(b)}
                    title={b.enabled ? 'Ẩn banner' : 'Hiện banner'}
                  >
                    {b.enabled ? <><EyeOff size={14} /> Ẩn</> : <><Eye size={14} /> Bật</>}
                  </button>
                  <button className="sm ghost" onClick={() => { setIsCreating(false); setEditing({...b}); }}>
                    <Edit2 size={14} /> Sửa
                  </button>
                  <button className="sm danger" onClick={() => handleDelete(b.id, b.title)}>
                    <Trash2 size={14} /> Xóa
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {editing && (
        <BannerEditModal
          banner={editing}
          isCreating={isCreating}
          onClose={() => { setEditing(null); setIsCreating(false); }}
          onSaved={() => { setEditing(null); setIsCreating(false); reload(); }}
          notify={notify}
        />
      )}
    </div>
  );
}

function BannerEditModal({banner, isCreating, onClose, onSaved, notify}) {
  const [form, setForm] = useState({...banner});
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return notify.show('Vui lòng nhập tiêu đề banner', 'warn');
    if (!form.image.trim()) return notify.show('Vui lòng chọn hoặc nhập đường dẫn ảnh', 'warn');

    setBusy(true);
    try {
      const payload = {
        title: form.title.trim(),
        subtitle: form.subtitle?.trim() || '',
        image: form.image.trim(),
        tag: form.tag?.trim() || null,
        actionScreen: form.actionScreen || null,
        actionUrl: form.actionUrl?.trim() || null,
        actionLabel: form.actionLabel?.trim() || 'Chơi Ngay',
        enabled: !!form.enabled,
        sortOrder: Number(form.sortOrder) || 0
      };

      if (isCreating) {
        await api.post('/admin/banners', payload);
        notify.show('Đã tạo banner mới thành công!', 'ok');
      } else {
        await api.patch(`/admin/banners/${banner.id}`, payload);
        notify.show('Đã cập nhật banner thành công!', 'ok');
      }
      onSaved();
    } catch (err) {
      notify.show(err.message, 'fail');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="adminModalBackdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="adminModal">
        <header className="adminModalHead">
          <h3>{isCreating ? 'Thêm Banner Trang Chủ Mới' : 'Chỉnh Sửa Banner'}</h3>
          <button className="iconBtn ghost" onClick={onClose}><X size={18} /></button>
        </header>

        <form onSubmit={handleSubmit} className="adminModalBody">
          <div className="modalSplit">
            <div className="modalForm">
              <label>
                <span>Tiêu đề Banner <b className="req">*</b></span>
                <input
                  value={form.title}
                  onChange={e => setForm({...form, title: e.target.value})}
                  placeholder="VD: KHO BÁU HOÀNG KIM"
                  required
                />
              </label>

              <label>
                <span>Phụ đề / Mô tả ngắn</span>
                <input
                  value={form.subtitle || ''}
                  onChange={e => setForm({...form, subtitle: e.target.value})}
                  placeholder="VD: Nổ Hũ Jackpot Cực Khủng"
                />
              </label>

              <label>
                <span>Nhãn Badge nổi bật</span>
                <input
                  value={form.tag || ''}
                  onChange={e => setForm({...form, tag: e.target.value})}
                  placeholder="VD: HOT, VIP, MỚI, SỰ KIỆN"
                />
              </label>

              <label>
                <span>Đường dẫn ảnh Banner <b className="req">*</b></span>
                <input
                  value={form.image}
                  onChange={e => setForm({...form, image: e.target.value})}
                  placeholder="/assets/home-banner.webp hoặc URL ảnh online"
                  required
                />
              </label>

              <div className="presetImgRow">
                <span>Chọn ảnh mẫu nhanh:</span>
                {PRESET_IMAGES.map(p => (
                  <button
                    key={p.url}
                    type="button"
                    className={'presetTag ' + (form.image === p.url ? 'active' : '')}
                    onClick={() => setForm({...form, image: p.url})}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <div className="grid2">
                <label>
                  <span>Màn hình chuyển hướng</span>
                  <select
                    value={form.actionScreen || 'slot'}
                    onChange={e => setForm({...form, actionScreen: e.target.value})}
                  >
                    {SCREEN_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Chữ trên nút hành động</span>
                  <input
                    value={form.actionLabel || ''}
                    onChange={e => setForm({...form, actionLabel: e.target.value})}
                    placeholder="VD: Chơi Ngay, Nhận Thưởng"
                  />
                </label>
              </div>

              <label>
                <span>URL liên kết ngoài (nếu có)</span>
                <input
                  value={form.actionUrl || ''}
                  onChange={e => setForm({...form, actionUrl: e.target.value})}
                  placeholder="https://example.com/event"
                />
              </label>

              <div className="grid2">
                <label>
                  <span>Thứ tự hiển thị</span>
                  <input
                    type="number"
                    min="0"
                    max="999"
                    value={form.sortOrder}
                    onChange={e => setForm({...form, sortOrder: e.target.value})}
                  />
                </label>

                <div className="toggleWrap">
                  <span>Trạng thái hiển thị</span>
                  <label className="checkboxLabel">
                    <input
                      type="checkbox"
                      checked={form.enabled}
                      onChange={e => setForm({...form, enabled: e.target.checked})}
                    />
                    <span>Bật hiển thị trên trang chủ</span>
                  </label>
                </div>
              </div>
            </div>

            {/* LIVE PREVIEW HERO */}
            <div className="modalPreview">
              <span className="previewLabel">Xem trước hiển thị ở trang chủ:</span>
              <div className="liveHeroPreview">
                <img
                  src={form.image}
                  alt={form.title}
                  onError={e => e.target.src = '/assets/home-banner.webp'}
                />
                <div className="liveHeroShade" />
                <div className="liveHeroGlow" />
                {form.tag && <div className="liveHeroTag">{form.tag}</div>}
                <div className="liveHeroContent">
                  <strong>{form.title || 'TIÊU ĐỀ BANNER'}</strong>
                  <small>{form.subtitle || 'Phụ đề banner'}</small>
                  <div className="liveHeroBtn">{form.actionLabel || 'Chơi Ngay'}</div>
                </div>
              </div>
            </div>
          </div>

          <footer className="adminModalFoot">
            <button type="button" className="ghost" onClick={onClose}>Hủy bỏ</button>
            <button type="submit" className="primary" disabled={busy}>
              {busy ? 'Đang lưu...' : isCreating ? 'Thêm Banner' : 'Lưu Thay Đổi'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

/* ========================================================================= */
/* EVENT MANAGER                                                             */
/* ========================================================================= */
function EventManager({events, notify, reload}) {
  const [editing, setEditing] = useState(null);
  const [isCreating, setIsCreating] = useState(false);

  const activeCount = events.filter(e => e.enabled).length;

  const handleDelete = async (id, title) => {
    const agreed = await notify.confirm({title: `Xóa sự kiện "${title}"?`, message: 'Sự kiện sẽ bị gỡ khỏi web người chơi và không khôi phục được.', confirmLabel: 'Xóa sự kiện', danger: true});
    if (!agreed) return;
    try {
      const token = localStorage.getItem('goldzone_admin_token');
      const res = await fetch(`/api/admin/events/${id}`, {
        method: 'DELETE',
        headers: {'Content-Type': 'application/json', ...(token ? {Authorization: `Bearer ${token}`} : {})}
      });
      if (!res.ok) throw new Error('Không thể xóa sự kiện');
      notify.show(`Đã xóa sự kiện "${title}"`, 'ok');
      reload();
    } catch (e) {
      notify.show(e.message, 'fail');
    }
  };

  const handleToggle = async (ev) => {
    try {
      await api.patch(`/admin/events/${ev.id}`, {enabled: !ev.enabled});
      notify.show(`Đã ${!ev.enabled ? 'bật' : 'tắt'} sự kiện`, 'ok');
      reload();
    } catch (err) {
      notify.show(err.message, 'fail');
    }
  };

  return (
    <div className="stack">
      <div className="statRow">
        <StatTile label="Tổng sự kiện" value={events.length} />
        <StatTile label="Đang diễn ra" value={activeCount} tone="ok" />
        <StatTile label="Đang ẩn" value={events.length - activeCount} tone={events.length - activeCount ? 'warn' : ''} />
      </div>

      <div className="actionRow">
        <h3>Danh sách Sự kiện người chơi</h3>
        <button className="primary sm" onClick={() => { setIsCreating(true); setEditing({
          title: 'SỰ KIỆN MỚI',
          category: 'checkin',
          badge: 'HÀNG NGÀY',
          reward: '100,000 Vàng',
          desc: 'Mô tả chi tiết thể lệ tham gia sự kiện và cách nhận quà...',
          image: '/assets/home-slot.webp',
          status: 'ACTIVE',
          startDate: '2026-01-01',
          endDate: '2026-12-31',
          actionType: 'checkin',
          actionUrl: '',
          actionLabel: 'Tham gia ngay',
          enabled: true,
          sortOrder: events.length + 1
        }); }}>
          <Plus size={16} /> Thêm Sự kiện mới
        </button>
      </div>

      {events.length === 0 ? (
        <Card><Empty>Chưa có sự kiện nào. Bấm "Thêm Sự kiện mới" để tạo sự kiện cho người chơi.</Empty></Card>
      ) : (
        <div className="contentCardGrid">
          {events.map(ev => (
            <Card key={ev.id} className={'eventAdminCard ' + (!ev.enabled ? 'disabled' : '')}>
              <div className="eventImgPreview">
                <img src={ev.image} alt={ev.title} onError={e => e.target.src = '/assets/home-banner.webp'} />
                {ev.badge && <span className="eventBadge">{ev.badge}</span>}
                <div className="eventRewardTag"><Gift size={12} /> {ev.reward}</div>
              </div>
              <div className="eventAdminBody">
                <div className="bannerHead">
                  <h4>{ev.title}</h4>
                  <span className={'statusDot ' + (ev.enabled ? 'ok' : 'muted')} title={ev.enabled ? 'Đang bật' : 'Đang tắt'} />
                </div>
                <p className="eventDesc">{ev.desc}</p>
                <div className="eventMetaRow">
                  <span className="pill cat">
                    {CATEGORY_OPTIONS.find(c => c.value === ev.category)?.label || ev.category}
                  </span>
                  {ev.actionUrl && (
                    <a className="pill urlLink" href={ev.actionUrl} target="_blank" rel="noreferrer" title={ev.actionUrl}>
                      <ExternalLink size={12} /> Link sự kiện
                    </a>
                  )}
                  {ev.startDate && ev.endDate && (
                    <span className="pill date">
                      <Calendar size={12} /> {ev.startDate} ~ {ev.endDate}
                    </span>
                  )}
                </div>
                <div className="bannerCardActions">
                  <button
                    className={'sm ' + (ev.enabled ? 'ghost' : 'primary')}
                    onClick={() => handleToggle(ev)}
                  >
                    {ev.enabled ? <><EyeOff size={14} /> Ẩn</> : <><Eye size={14} /> Bật</>}
                  </button>
                  <button className="sm ghost" onClick={() => { setIsCreating(false); setEditing({...ev}); }}>
                    <Edit2 size={14} /> Sửa
                  </button>
                  <button className="sm danger" onClick={() => handleDelete(ev.id, ev.title)}>
                    <Trash2 size={14} /> Xóa
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {editing && (
        <EventEditModal
          event={editing}
          isCreating={isCreating}
          onClose={() => { setEditing(null); setIsCreating(false); }}
          onSaved={() => { setEditing(null); setIsCreating(false); reload(); }}
          notify={notify}
        />
      )}
    </div>
  );
}

function EventEditModal({event, isCreating, onClose, onSaved, notify}) {
  const [form, setForm] = useState({...event});
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return notify.show('Vui lòng nhập tên sự kiện', 'warn');
    if (!form.reward.trim()) return notify.show('Vui lòng nhập phần thưởng', 'warn');
    if (!form.desc.trim()) return notify.show('Vui lòng nhập thể lệ sự kiện', 'warn');

    setBusy(true);
    try {
      const payload = {
        title: form.title.trim(),
        category: form.category || 'special',
        badge: form.badge?.trim() || null,
        reward: form.reward.trim(),
        desc: form.desc.trim(),
        image: form.image?.trim() || '/assets/home-slot.webp',
        status: form.status || 'ACTIVE',
        startDate: form.startDate?.trim() || null,
        endDate: form.endDate?.trim() || null,
        actionType: form.actionType || 'checkin',
        actionUrl: form.actionUrl?.trim() || null,
        actionLabel: form.actionLabel?.trim() || 'Tham gia ngay',
        enabled: !!form.enabled,
        sortOrder: Number(form.sortOrder) || 0
      };

      if (isCreating) {
        await api.post('/admin/events', payload);
        notify.show('Đã tạo sự kiện mới thành công!', 'ok');
      } else {
        await api.patch(`/admin/events/${event.id}`, payload);
        notify.show('Đã cập nhật sự kiện thành công!', 'ok');
      }
      onSaved();
    } catch (err) {
      notify.show(err.message, 'fail');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="adminModalBackdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="adminModal">
        <header className="adminModalHead">
          <h3>{isCreating ? 'Thêm Sự Kiện Mới' : 'Chỉnh Sửa Sự Kiện'}</h3>
          <button className="iconBtn ghost" onClick={onClose}><X size={18} /></button>
        </header>

        <form onSubmit={handleSubmit} className="adminModalBody">
          <div className="modalSplit">
            <div className="modalForm">
              <label>
                <span>Tên Sự kiện <b className="req">*</b></span>
                <input
                  value={form.title}
                  onChange={e => setForm({...form, title: e.target.value})}
                  placeholder="VD: Điểm Danh Nhận Thưởng Mỗi Ngày"
                  required
                />
              </label>

              <div className="grid2">
                <label>
                  <span>Danh mục sự kiện</span>
                  <select
                    value={form.category || 'checkin'}
                    onChange={e => setForm({...form, category: e.target.value})}
                  >
                    {CATEGORY_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Phần thưởng nổi bật <b className="req">*</b></span>
                  <input
                    value={form.reward}
                    onChange={e => setForm({...form, reward: e.target.value})}
                    placeholder="VD: 100,000 Vàng, +100% Nạp"
                    required
                  />
                </label>
              </div>

              <div className="grid2">
                <label>
                  <span>Nhãn Badge</span>
                  <input
                    value={form.badge || ''}
                    onChange={e => setForm({...form, badge: e.target.value})}
                    placeholder="VD: HÀNG NGÀY, HOT, GIẢI ĐẤU"
                  />
                </label>

                <label>
                  <span>Đường dẫn URL ngoài (nếu có)</span>
                  <input
                    value={form.actionUrl || ''}
                    onChange={e => setForm({...form, actionUrl: e.target.value})}
                    placeholder="https://t.me/goldzone_event hoặc link ngoài"
                  />
                </label>
              </div>

              <label>
                <span>Thể lệ & Chi tiết sự kiện <b className="req">*</b></span>
                <textarea
                  rows="3"
                  value={form.desc}
                  onChange={e => setForm({...form, desc: e.target.value})}
                  placeholder="Nhập chi tiết điều kiện nhận quà, thể lệ tham gia..."
                  required
                />
              </label>

              <label>
                <span>Ảnh đại diện sự kiện</span>
                <input
                  value={form.image || ''}
                  onChange={e => setForm({...form, image: e.target.value})}
                  placeholder="/assets/home-slot.webp"
                />
              </label>

              <div className="presetImgRow">
                <span>Chọn ảnh mẫu:</span>
                {PRESET_IMAGES.map(p => (
                  <button
                    key={p.url}
                    type="button"
                    className={'presetTag ' + (form.image === p.url ? 'active' : '')}
                    onClick={() => setForm({...form, image: p.url})}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <div className="grid2">
                <label>
                  <span>Hành động khi bấm</span>
                  <select
                    value={form.actionType || 'checkin'}
                    onChange={e => setForm({...form, actionType: e.target.value})}
                  >
                    <option value="checkin">Nhận điểm danh (+100,000 vàng)</option>
                    <option value="wallet">Mở giao diện nạp vàng</option>
                    <option value="slot">Chơi game Nổ Hũ</option>
                    <option value="dice">Chơi game Tài Xỉu</option>
                    <option value="fish">Chơi game Bắn Cá</option>
                    <option value="url">Mở đường dẫn URL ngoài</option>
                  </select>
                </label>

                <label>
                  <span>Chữ trên nút</span>
                  <input
                    value={form.actionLabel || ''}
                    onChange={e => setForm({...form, actionLabel: e.target.value})}
                    placeholder="VD: Điểm danh ngay, Nạp ngay"
                  />
                </label>
              </div>

              <div className="grid2">
                <label>
                  <span>Ngày bắt đầu</span>
                  <input
                    type="text"
                    value={form.startDate || ''}
                    onChange={e => setForm({...form, startDate: e.target.value})}
                    placeholder="YYYY-MM-DD"
                  />
                </label>

                <label>
                  <span>Ngày kết thúc</span>
                  <input
                    type="text"
                    value={form.endDate || ''}
                    onChange={e => setForm({...form, endDate: e.target.value})}
                    placeholder="YYYY-MM-DD"
                  />
                </label>
              </div>

              <div className="grid2">
                <label>
                  <span>Thứ tự ưu tiên</span>
                  <input
                    type="number"
                    min="0"
                    max="999"
                    value={form.sortOrder}
                    onChange={e => setForm({...form, sortOrder: e.target.value})}
                  />
                </label>

                <div className="toggleWrap">
                  <span>Trạng thái</span>
                  <label className="checkboxLabel">
                    <input
                      type="checkbox"
                      checked={form.enabled}
                      onChange={e => setForm({...form, enabled: e.target.checked})}
                    />
                    <span>Kích hoạt sự kiện</span>
                  </label>
                </div>
              </div>
            </div>

            {/* LIVE PREVIEW EVENT CARD */}
            <div className="modalPreview">
              <span className="previewLabel">Xem trước thẻ Sự Kiện:</span>
              <div className="liveEventPreviewCard">
                <div className="liveEventImgWrap">
                  <img
                    src={form.image || '/assets/home-slot.webp'}
                    alt={form.title}
                    onError={e => e.target.src = '/assets/home-slot.webp'}
                  />
                  {form.badge && <span className="liveEventBadge">{form.badge}</span>}
                  <div className="liveEventReward"><Gift size={13} /> {form.reward || '100,000 Vàng'}</div>
                </div>
                <div className="liveEventBody">
                  <strong>{form.title || 'Tên sự kiện'}</strong>
                  <p>{form.desc || 'Mô tả thể lệ sự kiện...'}</p>
                  {form.actionUrl && (
                    <div className="liveEventUrl">
                      <ExternalLink size={12} /> {form.actionUrl}
                    </div>
                  )}
                  <div className="liveEventBtn">{form.actionLabel || 'Tham gia ngay'}</div>
                </div>
              </div>
            </div>
          </div>

          <footer className="adminModalFoot">
            <button type="button" className="ghost" onClick={onClose}>Hủy bỏ</button>
            <button type="submit" className="primary" disabled={busy}>
              {busy ? 'Đang lưu...' : isCreating ? 'Tạo Sự Kiện' : 'Lưu Thay Đổi'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
