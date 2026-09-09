import {History, Home, Plus, Star, UserRound} from 'lucide-react';

export function Nav({setScreen, active = 'lobby'}) {
  return (
    <nav className="nav">
      <button
        className={active === 'lobby' ? 'active' : ''}
        onClick={() => setScreen('lobby')}
      >
        <Home />
        <span>Trang chủ</span>
      </button>

      <button
        className={active === 'events' ? 'active' : ''}
        onClick={() => setScreen('events')}
      >
        <Star />
        <span>Sự kiện</span>
      </button>

      <button
        className="navMain"
        onClick={() => setScreen('slot')}
        title="Nổ Hũ Hoàng Kim"
      >
        <Plus />
      </button>

      <button
        className={active === 'history' ? 'active' : ''}
        onClick={() => setScreen('history')}
      >
        <History />
        <span>Lịch sử</span>
      </button>

      <button
        className={active === 'profile' ? 'active' : ''}
        onClick={() => setScreen('profile')}
      >
        <UserRound />
        <span>Cá nhân</span>
      </button>
    </nav>
  );
}
