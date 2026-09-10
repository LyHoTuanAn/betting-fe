import {useState} from 'react';
import {
  Check, ChevronRight, Coins, Copy, CreditCard,
  Crown, Edit3, Gift, History, KeyRound, Lock,
  LogOut, Minus, Plus, ShieldCheck, Sparkles, Star, User, Wallet
} from 'lucide-react';
import {api} from '../shared/api.js';
import {BET_LIMITS} from '../shared/constants.js';
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
  const [name, setName] = useState(user?.displayName || '');
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [walletAmount, setWalletAmount] = useState(50000);
  const [walletType, setWalletType] = useState('deposit');
  const [walletHistory, setWalletHistory] = useState([]);
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

  const saveProfile = async () => {
    if (!name.trim()) return showMsg('Tên hiển thị không được để trống', 'warn');
    try {
      const data = await api('/me', {token, method: 'PATCH', body: JSON.stringify({displayName: name.trim()})});
      if (setUser) setUser(data.user);
      showMsg('Đã cập nhật tên hiển thị thành công!', 'ok');
    } catch (err) {
      showMsg(err.message || 'Lỗi khi cập nhật tên', 'warn');
    }
  };

  const submitWallet = async (type) => {
    const num = Number(walletAmount);
    if (!num || num < BET_LIMITS.wallet.min || num > BET_LIMITS.wallet.max) {
      return showMsg(`Số tiền phải từ ${money(BET_LIMITS.wallet.min)} đến ${money(BET_LIMITS.wallet.max)} vàng`, 'warn');
    }

    try {
      const data = await api(`/wallet/${type}`, {
        token,
        method: 'POST',
        body: JSON.stringify({amount: num})
      });
      const profile = await api('/me', {token});
      if (setUser) setUser(profile.user);
      setWalletHistory(curr => [data.request, ...curr]);
      showMsg(`Đã tạo yêu cầu ${type === 'deposit' ? 'nạp' : 'rút'} #${data.request.id.slice(-6)}. Trạng thái: Chờ duyệt.`, 'ok');
    } catch (err) {
      showMsg(err.message || 'Không thể tạo yêu cầu nạp rút', 'warn');
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
              <div className="vipAvatarWrap" onClick={() => setShowAvatarPicker(true)} title="Đổi ảnh đại diện">
                <img src={avatar} alt={user?.displayName} />
                <div className="vipAvatarEdit"><Edit3 size={12} /></div>
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
              <button className="vipCheckinBtn" onClick={() => openPanel ? openPanel('wallet') : setWalletType('deposit')}>
                <Plus size={16} /> <span>Nạp vàng</span>
              </button>
            </div>
          </div>
        </section>

        <Popup popup={notice.popup} onClose={notice.close} />

        {/* ĐỔI ẢNH ĐẠI DIỆN DRAWER */}
        {showAvatarPicker && (
          <div className="avatarPickerModal" onClick={() => setShowAvatarPicker(false)}>
            <div className="avatarPickerCard" onClick={e => e.stopPropagation()}>
              <h3>Chọn ảnh đại diện</h3>
              <div className="avatarGrid">
                {AVATARS.map((img, idx) => (
                  <button
                    key={idx}
                    className={'avatarOpt ' + (avatar === img ? 'selected' : '')}
                    onClick={() => { setAvatar(img); setShowAvatarPicker(false); showMsg('Đã đổi ảnh đại diện!', 'ok'); }}
                  >
                    <img src={img} alt="Avatar" />
                    {avatar === img && <div className="avatarCheck"><Check size={14} /></div>}
                  </button>
                ))}
              </div>
              <button className="ghost sm" onClick={() => setShowAvatarPicker(false)}>Đóng</button>
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
            <label>
              <span>Số tiền giao dịch (vàng):</span>
              <input
                type="number"
                min={BET_LIMITS.wallet.min}
                max={BET_LIMITS.wallet.max}
                step="50000"
                value={walletAmount}
                onChange={e => setWalletAmount(e.target.value)}
              />
            </label>

            <div className="quickAmountChips">
              {[50000, 100000, 200000, 500000, 1000000].map(amt => (
                <button
                  key={amt}
                  type="button"
                  className={'quickChip ' + (Number(walletAmount) === amt ? 'active' : '')}
                  onClick={() => setWalletAmount(amt)}
                >
                  +{money(amt)}
                </button>
              ))}
            </div>

            <div className="walletBtnRow">
              <button className="walletBtn deposit" onClick={() => submitWallet('deposit')}>
                <Plus size={16} /> Nạp Vàng
              </button>
              <button className="walletBtn withdraw" onClick={() => submitWallet('withdraw')}>
                <Minus size={16} /> Rút Vàng
              </button>
            </div>

            <p className="walletNote">
              <ShieldCheck size={14} /> Hệ thống giao dịch nội bộ thử nghiệm, không hỗ trợ tiền mặt thực tế.
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
