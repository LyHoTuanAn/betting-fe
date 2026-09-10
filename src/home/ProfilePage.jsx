import {useState} from 'react';
import {
  Check, ChevronRight, Coins, Copy, CreditCard,
  Crown, Edit3, Gift, History, KeyRound, Lock,
  LogOut, Minus, Plus, ShieldCheck, Sparkles, Star, User, Wallet
} from 'lucide-react';
import {api} from '../shared/api.js';
import {Popup, usePopup} from '../shared/Popup.jsx';
import {money} from '../shared/format.js';
import {Topbar} from '../shared/Topbar.jsx';
import {Nav} from './Nav.jsx';

const AVATARS = [
  '/assets/home-avatar.webp',
  '/assets/home-slot.webp',
  '/assets/home-dice.webp',
  '/assets/home-fish.webp',
  '/assets/home-banner.webp'
];

export function ProfilePage({
  setScreen,
  user,
  token,
  setUser,
  balance,
  setBalance,
  sound,
  setSound,
  onLogout,
  openPanel,
  goHome
}) {
  const initialAvatar = user?.avatar || (user?.id ? localStorage.getItem('goldzone_avatar_' + user.id) : null) || localStorage.getItem('goldzone_avatar') || AVATARS[0];
  const [name, setName] = useState(user?.displayName || '');
  const [avatar, setAvatar] = useState(initialAvatar);
  const [selectedAvatar, setSelectedAvatar] = useState(initialAvatar);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const notice = usePopup();
  const [copied, setCopied] = useState(false);

  // VIP Level calculation based on balance/games
  const vipTier = balance >= 5000000 ? 'VIP Kim Cương' : balance >= 1000000 ? 'VIP Vàng' : balance >= 200000 ? 'VIP Bạc' : 'VIP Đồng';

  // Popup chặn thao tác thay cho thông báo tự tắt sau 4 giây.
  const showMsg = (text, type = 'ok') => notice.show(text, type);

  const copyId = () => {
    navigator.clipboard?.writeText(user?.id || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      return showMsg('Vui lòng chọn tệp hình ảnh (jpg, png, webp,...)', 'warn');
    }
    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 256;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setSelectedAvatar(dataUrl);
      };
      img.src = readerEvent.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveAvatar = async (target) => {
    const targetAvatar = target || selectedAvatar;
    if (!targetAvatar) return;
    setSavingAvatar(true);
    try {
      if (user?.id) localStorage.setItem('goldzone_avatar_' + user.id, targetAvatar);
      localStorage.setItem('goldzone_avatar', targetAvatar);
      setAvatar(targetAvatar);
      if (setUser) {
        setUser(prev => prev ? {...prev, avatar: targetAvatar} : prev);
      }
      try {
        await api('/me', {
          token,
          method: 'PATCH',
          body: JSON.stringify({avatar: targetAvatar, displayName: name.trim() || user?.displayName})
        });
      } catch {}

      setShowAvatarPicker(false);
      showMsg('Đã cập nhật ảnh đại diện thành công!', 'ok');
    } catch (err) {
      showMsg(err.display || err.message || 'Lỗi khi cập nhật ảnh', 'warn');
    } finally {
      setSavingAvatar(false);
    }
  };

  const saveProfile = async () => {
    if (!name.trim()) return showMsg('Tên hiển thị không được để trống', 'warn');
    try {
      const data = await api('/me', {
        token,
        method: 'PATCH',
        body: JSON.stringify({displayName: name.trim(), avatar})
      });
      if (setUser) setUser(prev => ({...prev, ...(data.user || {}), avatar}));
      showMsg('Đã cập nhật tên hiển thị thành công!', 'ok');
    } catch (err) {
      showMsg(err.display || err.message || 'Lỗi khi cập nhật tên', 'warn');
    }
  };

  return (
    <div className="screen profileScreen">
      <Topbar
        home={false}
        balance={balance}
        onBack={goHome || (() => setScreen('lobby'))}
        sound={sound}
        setSound={setSound}
        user={user}
        avatar={avatar}
        onProfile={() => {}}
        onWallet={() => {}}
      />

      <main className="profileMain">
        {/* VIP CARD */}
        <section className="vipCardSection">
          <div className="vipCard">
            <div className="vipCardGlow" />
            <div className="vipCardShine" />

            <div className="vipCardTop">
              <div className="vipBrand">
                <Crown size={22} />
                <span>GOLDZONE VIP</span>
              </div>
              <span className="vipTierBadge">{vipTier}</span>
            </div>

            <div className="vipCardMiddle">
              <div
                className="vipAvatarWrap"
                onClick={() => {
                  setSelectedAvatar(avatar);
                  setShowAvatarPicker(true);
                }}
                title="Bấm để đổi ảnh đại diện"
              >
                <img src={avatar} alt={user?.displayName || 'Avatar'} />
                <div className="vipAvatarEdit"><Edit3 size={13} /></div>
              </div>

              <div className="vipUserInfo">
                <h2>{user?.displayName || 'Thành Viên'}</h2>
                <p>@{user?.username || 'user'}</p>
                <div className="vipIdBadge" onClick={copyId} title="Bấm để sao chép ID">
                  <small>ID: {user?.id?.slice(0, 8)}...</small>
                  {copied ? <Check size={12} className="copied" /> : <Copy size={12} />}
                </div>
              </div>
            </div>

            <div className="vipCardBottom">
              <div className="vipBalanceCol">
                <small>SỐ DƯ HIỆN TẠI</small>
                <strong><Coins size={18} /> {money(balance)}</strong>
              </div>
              <button className="vipCheckinBtn" onClick={() => openPanel ? openPanel('wallet') : setScreen('profile')}>
                <Plus size={16} /> <span>Nạp vàng</span>
              </button>
            </div>
          </div>
        </section>

        <Popup popup={notice.popup} onClose={notice.close} />

        {/* ĐỔI ẢNH ĐẠI DIỆN MODAL */}
        {showAvatarPicker && (
          <div className="avatarPickerModal" onClick={() => setShowAvatarPicker(false)}>
            <div className="avatarPickerCard" onClick={e => e.stopPropagation()}>
              <div className="avatarPickerHead">
                <h3>Đổi Ảnh Đại Diện</h3>
                <p>Chọn ảnh có sẵn hoặc tải ảnh mới từ thiết bị của bạn</p>
              </div>

              {/* Preview ảnh hiện tại / đang chọn */}
              <div className="avatarCurrentPreview">
                <img src={selectedAvatar} alt="Xem trước avatar" />
                <span>Ảnh xem trước</span>
              </div>

              {/* Grid ảnh mẫu */}
              <div className="avatarGrid">
                {AVATARS.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={'avatarOpt ' + (selectedAvatar === img ? 'selected' : '')}
                    onClick={() => setSelectedAvatar(img)}
                  >
                    <img src={img} alt={`Avatar mẫu ${idx + 1}`} />
                    {selectedAvatar === img && <div className="avatarCheck"><Check size={14} /></div>}
                  </button>
                ))}
              </div>

              {/* Nút Upload ảnh từ thiết bị */}
              <div className="avatarUploadRow">
                <label className="avatarUploadBtn">
                  <span>📷 Tải ảnh từ thiết bị</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    style={{display: 'none'}}
                  />
                </label>
              </div>

              {/* Action Buttons */}
              <div className="avatarModalActions">
                <button
                  type="button"
                  className="avatarSaveBtn"
                  disabled={savingAvatar}
                  onClick={() => handleSaveAvatar()}
                >
                  <Check size={16} /> {savingAvatar ? 'Đang lưu...' : 'Lưu ảnh đại diện'}
                </button>
                <button
                  type="button"
                  className="avatarCancelBtn"
                  onClick={() => setShowAvatarPicker(false)}
                >
                  Hủy bỏ
                </button>
              </div>
            </div>
          </div>
        )}

        {/* QUẢN LÝ VÍ & NẠP RÚT */}
        <section className="profileCard walletCard">
          <div className="profileCardHeader">
            <div className="cardIcon"><Wallet size={18} /></div>
            <div>
              <h3>Quản lý Ví GoldZone</h3>
              <p>Yêu cầu nạp và rút vàng vào tài khoản</p>
            </div>
          </div>

          <div className="walletInputBox">
            <div className="walletBalanceRow">
              <span>Số dư khả dụng</span>
              <b>{money(balance)}</b>
            </div>

            {/* Nạp và rút đều nằm trong trang ví: nạp cần hiện số tài khoản Timo
                kèm nội dung chuyển khoản, rút cần thông tin ngân hàng người nhận
                — không nhét vừa một ô nhập số tiền như luồng cũ. */}
            <div className="walletBtnRow">
              <button className="walletBtn deposit" onClick={() => openPanel?.('wallet')}>
                <Plus size={16} /> Nạp Vàng
              </button>
              <button className="walletBtn withdraw" onClick={() => openPanel?.('wallet')}>
                <Minus size={16} /> Rút Vàng
              </button>
            </div>

            <p className="walletNote">
              <ShieldCheck size={14} /> Nạp bằng cách chuyển khoản tới tài khoản Timo của hệ thống, ghi đúng username trong nội dung. Tiền được cộng tự động.
            </p>
          </div>
        </section>

        {/* CẬP NHẬT HỒ SƠ */}
        <section className="profileCard">
          <div className="profileCardHeader">
            <div className="cardIcon"><User size={18} /></div>
            <div>
              <h3>Thông tin tài khoản</h3>
              <p>Tùy chỉnh thông tin hiển thị của bạn</p>
            </div>
          </div>

          <div className="profileForm">
            <label>
              <span>Tên hiển thị trong game</span>
              <div className="inputWithBtn">
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Nhập tên hiển thị mới"
                />
                <button className="saveNameBtn" onClick={saveProfile}>
                  Lưu
                </button>
              </div>
            </label>

            <label>
              <span>Tên đăng nhập</span>
              <input value={user?.username || ''} disabled className="disabledInput" />
            </label>

            <label>
              <span>Vai trò tài khoản</span>
              <input value={user?.role === 'ADMIN' ? 'Quản Trị Viên (Admin)' : 'Người Chơi (Player)'} disabled className="disabledInput" />
            </label>
          </div>
        </section>

        {/* LỐI TẮT NHANH */}
        <section className="profileMenuSection">
          <button className="profileMenuItem" onClick={() => setScreen('history')}>
            <div className="menuLeft"><History size={18} /> <span>Xem lịch sử giao dịch</span></div>
            <ChevronRight size={18} />
          </button>
          <button className="profileMenuItem" onClick={() => setScreen('events')}>
            <div className="menuLeft"><Sparkles size={18} /> <span>Sự kiện & Khuyến mãi hot</span></div>
            <ChevronRight size={18} />
          </button>
        </section>

        {/* ĐĂNG XUẤT */}
        <div className="logoutSection">
          <button className="fullLogoutBtn" onClick={onLogout}>
            <LogOut size={18} /> Đăng xuất tài khoản
          </button>
        </div>
      </main>

      <Nav setScreen={setScreen} active="profile" />
    </div>
  );
}
