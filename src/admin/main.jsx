import React, {useEffect, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {LayoutDashboard, Gamepad2, Wallet, Users, LogOut, ShieldCheck, Sparkles, Music} from 'lucide-react';
import {api, session} from './api.js';
import {Dialog, useDialog} from './ui.jsx';
import DashboardPage from './pages/dashboard.jsx';
import GamesPage from './pages/games.jsx';
import WalletPage from './pages/wallet.jsx';
import UsersPage from './pages/users.jsx';
import ContentPage from './pages/content.jsx';
import AudioPage from './pages/audio.jsx';
import './admin.css';

const PAGES = [
  {key: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard, Component: DashboardPage},
  {key: 'games', label: 'Quản lý game', icon: Gamepad2, Component: GamesPage},
  {key: 'content', label: 'Banner & Sự kiện', icon: Sparkles, Component: ContentPage},
  {key: 'audio', label: 'Nhạc nền & Âm thanh', icon: Music, Component: AudioPage},
  {key: 'wallet', label: 'Nạp / rút', icon: Wallet, Component: WalletPage},
  {key: 'users', label: 'Người chơi', icon: Users, Component: UsersPage}
];

function App() {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(!!session.token);
  // Hash dạng "games/SLOT": đoạn đầu chọn trang, phần còn lại là tham số của
  // trang đó — nhờ vậy F5 hay nút back của trình duyệt vẫn giữ đúng chỗ đang xem.
  const [route, setRoute] = useState(() => location.hash.slice(1) || 'dashboard');
  const notify = useDialog();

  useEffect(() => {
    const onHash = () => setRoute(location.hash.slice(1) || 'dashboard');
    addEventListener('hashchange', onHash);
    return () => removeEventListener('hashchange', onHash);
  }, []);

  // Token còn trong localStorage vẫn phải hỏi lại server: quyền ADMIN có thể đã
  // bị gỡ, và một token cũ không được phép vẽ ra giao diện quản trị.
  useEffect(() => {
    if (!session.token) return;
    api.get('/me')
      .then(data => { if (data.user.role === 'ADMIN') setUser(data.user); else session.clear(); })
      .catch(() => session.clear())
      .finally(() => setBooting(false));
  }, []);

  const go = (target) => { location.hash = target; setRoute(target); };
  const logout = () => { api.logout(); setUser(null); };

  if (booting) return <div className="bootScreen"><ShieldCheck /><span>Đang kiểm tra quyền quản trị...</span></div>;
  if (!user) return <LoginScreen onLogin={setUser} />;

  const [pageKey, ...rest] = route.split('/');
  const active = PAGES.find(p => p.key === pageKey) || PAGES[0];
  const param = rest.join('/') || null;
  const Page = active.Component;

  return (
    <div className="adminShell">
      <aside className="sidebar">
        <div className="brand"><ShieldCheck /><div><strong>GoldZone</strong><small>Trang quản trị</small></div></div>
        <nav>
          {PAGES.map(item => (
            <button key={item.key} className={item.key === active.key ? 'active' : ''} onClick={() => go(item.key)}>
              <item.icon size={18} /><span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebarFoot">
          <div className="who"><strong>{user.displayName}</strong><small>@{user.username}</small></div>
          <button className="ghost" onClick={logout}><LogOut size={16} /> Đăng xuất</button>
        </div>
      </aside>
      <main className="content">
        <header className="pageHead">
          <h1>{active.label}</h1>
          <a className="ghost" href="/" target="_blank" rel="noreferrer">Mở web người chơi</a>
        </header>
        <Page notify={notify} go={go} param={param} />
      </main>
      <Dialog dialog={notify.dialog} onClose={notify.close} />
    </div>
  );
}

function LoginScreen({onLogin}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true); setError('');
    try { onLogin(await api.login(username.trim(), password)); }
    catch (err) { setError(err.display || err.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="loginScreen">
      <form className="loginCard" onSubmit={submit}>
        <div className="brand"><ShieldCheck /><div><strong>GoldZone</strong><small>Trang quản trị</small></div></div>
        <label><span>Tài khoản</span><input value={username} autoFocus autoComplete="username" onChange={e => setUsername(e.target.value)} /></label>
        <label><span>Mật khẩu</span><input type="password" value={password} autoComplete="current-password" onChange={e => setPassword(e.target.value)} /></label>
        {error && <p className="inlineError">{error}</p>}
        <button className="primary" disabled={busy || !username || !password}>{busy ? 'Đang đăng nhập...' : 'Đăng nhập'}</button>
        <small className="note">Chỉ tài khoản có quyền quản trị mới vào được trang này.</small>
      </form>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
