import {useCallback, useEffect, useState} from 'react';
import {Coins} from 'lucide-react';
import {Dice} from './dice/Dice.jsx';
import {FishGame} from './fish/FishGame.jsx';
import {EventsPage} from './home/EventsPage.jsx';
import {HistoryPage} from './home/HistoryPage.jsx';
import {Lobby} from './home/Lobby.jsx';
import {ProfilePage} from './home/ProfilePage.jsx';
import {AccountPanel} from './shared/AccountPanel.jsx';
import {AuthScreen} from './shared/AuthScreen.jsx';
import {API_URL, api} from './shared/api.js';
import {Slot} from './slot/Slot.jsx';
import {FALLBACK_GAMES, GAME_SCREEN} from './shared/games.js';

const routes = {
  lobby: 'home',
  slot: 'no-hu',
  dice: 'tai-xiu',
  fish: 'ban-ca',
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
  const [games, setGames] = useState(FALLBACK_GAMES);

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
    api('/me', {token})
      .then(data => setUser(data.user))
      .catch(() => {
        localStorage.removeItem('goldzone_token');
        localStorage.removeItem('goldzone_refresh');
        setUser(null);
        setToken(null);
      })
      .finally(() => setLoading(false));
  }, [token]);

  // Danh sách game do admin quản lý; lỗi mạng thì giữ nguyên danh sách mặc định.
  useEffect(() => {
    if (!token) return;
    api('/games/catalog', {token}).then(data => setGames(data.games)).catch(() => {});
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
    const open = games.some(game => GAME_SCREEN[game.key] === screen) ? screen : 'lobby';
    page = open === 'slot' ? <Slot {...common} />
      : open === 'dice' ? <Dice {...common} />
      : open === 'fish' ? <FishGame {...common} />
      : <Lobby setScreen={setScreen} openPanel={setPanel} games={games} {...common} />;
  }

  return (
    <>
      {page}
      {panel && <AccountPanel view={panel} onClose={() => setPanel(null)} user={user} token={token} setUser={setUser} onLogout={logout} />}
    </>
  );
}
