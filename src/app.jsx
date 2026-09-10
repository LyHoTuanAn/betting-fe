import {useCallback, useEffect, useState} from 'react';
import {Coins} from 'lucide-react';
import {Dice} from './dice/Dice.jsx';
import {FishGame} from './fish/FishGame.jsx';
import {Poker} from './poker/Poker.jsx';
import {Roulette} from './roulette/Roulette.jsx';
import {Slot} from './slot/Slot.jsx';
import {EventsPage} from './home/EventsPage.jsx';
import {HistoryPage} from './home/HistoryPage.jsx';
import {Lobby} from './home/Lobby.jsx';
import {ProfilePage} from './home/ProfilePage.jsx';
import {AccountPanel} from './shared/AccountPanel.jsx';
import {AuthScreen} from './shared/AuthScreen.jsx';
import {API_URL, api} from './shared/api.js';
import {Slot} from './slot/Slot.jsx';
import {FALLBACK_GAMES, GAME_SCREEN, getMergedGames} from './shared/games.js';

const routes = {
  lobby: 'home',
  slot: 'no-hu',
  dice: 'tai-xiu',
  fish: 'ban-ca',
  poker: 'poker',
  roulette: 'roulette',
  events: 'su-kien',
  history: 'lich-su',
  profile: 'ca-nhan'
};

const routeAliases = {
  home: 'lobby',
  lobby: 'lobby',
  'no-hu': 'slot',
  slot: 'slot',
  'tai-xiu': 'dice',
  dice: 'dice',
  'ban-ca': 'fish',
  fish: 'fish',
  poker: 'poker',
  'texas-holdem': 'poker',
  roulette: 'roulette',
  'su-kien': 'events',
  events: 'events',
  event: 'events',
  'lich-su': 'history',
  history: 'history',
  'ca-nhan': 'profile',
  profile: 'profile'
};

export function App() {
  const fromHash = () => routeAliases[location.hash.slice(1)] || 'lobby';
  const [screen, setRawScreen] = useState(fromHash);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('goldzone_token'));
  const [loading, setLoading] = useState(!!token);
  const [panel, setPanel] = useState(null);
  const [sound, setSound] = useState(true);
  const [games, setGames] = useState(() => getMergedGames([]));
  // Lỗi khi khôi phục phiên: giữ lại để hiện thành câu cụ thể, thay vì im lặng
  // đá người chơi về màn đăng nhập như thể họ chưa từng đăng nhập.
  const [bootError, setBootError] = useState('');
  const [retry, setRetry] = useState(0);

  const setBalance = useCallback(balance => setUser(current => current ? ({
    ...current,
    balance: typeof balance === 'function' ? balance(current.balance) : balance
  }) : current), []);

  const setScreen = s => {
    location.hash = routes[s] || s;
    setRawScreen(s);
    window.scrollTo(0, 0);
  };

  useEffect(() => {
    const onHash = () => setRawScreen(fromHash());
    window.addEventListener('hashchange', onHash);
    if (!location.hash) location.hash = 'home';
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setBootError('');
    api('/me', {token})
      .then(data => setUser(data.user))
      .catch(err => {
        // Chỉ lỗi xác thực mới đáng xoá phiên. Mất mạng hay server 500 mà cũng
        // xoá token thì người chơi bị đăng xuất oan và không biết vì sao.
        if (err.status === 401 || err.status === 403) {
          localStorage.removeItem('goldzone_token');
          localStorage.removeItem('goldzone_refresh');
          setUser(null);
          setToken(null);
        } else {
          setBootError(err.display || err.message);
        }
      })
      .finally(() => setLoading(false));
  }, [token, retry]);

  // Danh sách game do admin quản lý, tự động merge fallback và đồng bộ
  useEffect(() => {
    const refreshCatalog = () => {
      if (token) {
        api('/games/catalog', {token})
          .then(data => setGames(getMergedGames(data.games)))
          .catch(() => setGames(getMergedGames([])));
      } else {
        setGames(getMergedGames([]));
      }
    };

    refreshCatalog();
    window.addEventListener('goldzone:games_updated', refreshCatalog);
    window.addEventListener('storage', refreshCatalog);
    return () => {
      window.removeEventListener('goldzone:games_updated', refreshCatalog);
      window.removeEventListener('storage', refreshCatalog);
    };
  }, [token]);

  useEffect(() => {
    const update = e => setToken(e.detail);
    window.addEventListener('goldzone:token', update);
    return () => window.removeEventListener('goldzone:token', update);
  }, []);

  const authenticated = data => {
    localStorage.setItem('goldzone_token', data.token);
    localStorage.setItem('goldzone_refresh', data.refreshToken);
    setToken(data.token);
    setUser(data.user);
  };

  const logout = () => {
    fetch(API_URL + '/auth/logout', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({refreshToken: localStorage.getItem('goldzone_refresh')})
    }).catch(() => {});
    localStorage.removeItem('goldzone_token');
    localStorage.removeItem('goldzone_refresh');
    setToken(null);
    setUser(null);
    setPanel(null);
    setScreen('lobby');
  };

  if (loading) return <div className="appLoading"><Coins /><span>Đang mở kho báu...</span></div>;
  if (bootError) return (
    <div className="appLoading">
      <Coins />
      <span>{bootError}</span>
      <button className="authSubmit" onClick={() => setRetry(n => n + 1)}>THỬ LẠI</button>
      <button className="authSwitch" onClick={logout}>Đăng nhập lại</button>
    </div>
  );
  if (!user) return <AuthScreen onAuthenticated={authenticated} />;

  const common = {balance: user.balance, setBalance, sound, setSound, token, goHome: () => setScreen('lobby')};

  // Trang chuyên biệt: Events, History, Profile
  let page;
  if (screen === 'events') {
    page = <EventsPage setScreen={setScreen} user={user} setUser={setUser} openPanel={setPanel} {...common} />;
  } else if (screen === 'history') {
    page = <HistoryPage setScreen={setScreen} user={user} openPanel={setPanel} {...common} />;
  } else if (screen === 'profile') {
    page = <ProfilePage setScreen={setScreen} user={user} setUser={setUser} onLogout={logout} openPanel={setPanel} {...common} />;
  } else {
    // Game catalog kiểm tra
    const open = games.some(game => GAME_SCREEN[game.key] === screen && game.enabled !== false) ? screen : 'lobby';
    page = open === 'slot' ? <Slot {...common} />
      : open === 'dice' ? <Dice {...common} />
      : open === 'fish' ? <FishGame {...common} />
      : open === 'poker' ? <Poker {...common} />
      : open === 'roulette' ? <Roulette {...common} />
      : <Lobby setScreen={setScreen} openPanel={setPanel} games={games} {...common} />;
  }

  return (
    <>
      {page}
      {panel && <AccountPanel view={panel} onClose={() => setPanel(null)} user={user} token={token} setUser={setUser} onLogout={logout} />}
    </>
  );
}
