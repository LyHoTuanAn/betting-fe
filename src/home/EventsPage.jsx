import {useEffect, useState} from 'react';
import {
  Calendar, Check, ChevronRight, ExternalLink, Flame, Gift,
  Sparkles, Star, Trophy, Zap, AlertCircle
} from 'lucide-react';
import {api} from '../shared/api.js';
import {fetchEvents} from '../shared/content.js';
import {money} from '../shared/format.js';
import {Topbar} from '../shared/Topbar.jsx';
import {Nav} from './Nav.jsx';

const FILTER_TABS = [
  {key: 'all', label: 'Tất cả'},
  {key: 'deposit', label: 'Thưởng nạp'},
  {key: 'tournament', label: 'Giải đấu'},
  {key: 'slot', label: 'Nổ hũ'},
  {key: 'fish', label: 'Bắn cá'},
  {key: 'dice', label: 'Tài xỉu'}
];

export function EventsPage({
  setScreen,
  balance,
  setBalance,
  sound,
  setSound,
  user,
  setUser,
  token,
  openPanel,
  goHome
}) {
  const [events, setEvents] = useState([]);
  const [category, setCategory] = useState('all');
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    fetchEvents().then(items => setEvents(items.filter(e => e.enabled !== false)));
  }, []);

  const showToast = (msg, type = 'ok') => {
    setNotice({msg, type});
    setTimeout(() => setNotice(null), 4000);
  };

  const handleAction = async (ev) => {
    // Nếu sự kiện có URL tùy chỉnh và người dùng muốn mở URL
    if (ev.actionUrl && (ev.actionType === 'url' || !ev.actionType)) {
      window.open(ev.actionUrl, '_blank', 'noopener,noreferrer');
      return;
    }


    if (ev.actionType === 'wallet') {
      if (openPanel) openPanel('wallet');
      else setScreen('profile');
      return;
    }

    if (ev.actionType === 'slot' || ev.actionType === 'dice' || ev.actionType === 'fish') {
      setScreen(ev.actionType);
      return;
    }

    // Default: nếu có actionUrl thì mở
    if (ev.actionUrl) {
      window.open(ev.actionUrl, '_blank', 'noopener,noreferrer');
    } else {
      showToast('Sự kiện đang diễn ra tự động trong hệ thống!', 'ok');
    }
  };

  const filtered = events.filter(e => category === 'all' || e.category === category);

  return (
    <div className="screen eventScreen">
      <Topbar
        home={false}
        balance={balance}
        onBack={goHome || (() => setScreen('lobby'))}
        sound={sound}
        setSound={setSound}
        user={user}
        onProfile={() => setScreen('profile')}
        onWallet={() => openPanel ? openPanel('wallet') : setScreen('profile')}
      />

      <main className="eventMain">
        <header className="eventHeader">
          <div className="eventHeaderBadge">
            <Sparkles size={14} /> SỰ KIỆN HOÀNG KIM
          </div>
          <h1>ƯU ĐÃI & SỰ KIỆN HOT</h1>
          <p>Tham gia các sự kiện đặc sắc để nhận hàng triệu vàng miễn phí mỗi ngày</p>
        </header>

        {notice && (
          <div className={'eventNotice ' + notice.type}>
            {notice.type === 'ok' ? <Gift size={18} /> : <AlertCircle size={18} />}
            <span>{notice.msg}</span>
          </div>
        )}

        <div className="eventTabs">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.key}
              className={'eventTab ' + (category === tab.key ? 'active' : '')}
              onClick={() => setCategory(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="eventList">
          {filtered.length === 0 ? (
            <div className="emptyEventBox">
              <Star size={36} />
              <p>Hiện không có sự kiện nào trong danh mục này.</p>
            </div>
          ) : (
            filtered.map(ev => (
              <article key={ev.id} className="eventCard">
                <div className="eventCardMedia">
                  <img
                    src={ev.image || '/assets/home-slot.webp'}
                    alt={ev.title}
                    onError={e => e.target.src = '/assets/home-slot.webp'}
                  />
                  <div className="eventCardShade" />
                  {ev.badge && (
                    <span className="eventCardTag">
                      <Flame size={12} /> {ev.badge}
                    </span>
                  )}
                  <div className="eventCardReward">
                    <Gift size={14} /> <span>{ev.reward}</span>
                  </div>
                </div>

                <div className="eventCardBody">
                  <div className="eventCardHead">
                    <h3>{ev.title}</h3>
                  </div>
                  <p className="eventCardDesc">{ev.desc}</p>

                  <div className="eventCardFooter">
                    {ev.startDate && ev.endDate ? (
                      <div className="eventCardDate">
                        <Calendar size={13} /> {ev.startDate} ~ {ev.endDate}
                      </div>
                    ) : (
                      <div className="eventCardDate active">
                        <Zap size={13} /> Đang diễn ra liên tục
                      </div>
                    )}

                    <div className="eventBtnGroup">
                      {ev.actionUrl && (
                        <a
                          className="eventUrlLink"
                          href={ev.actionUrl}
                          target="_blank"
                          rel="noreferrer"
                          title="Mở đường dẫn sự kiện"
                          onClick={e => e.stopPropagation()}
                        >
                          <ExternalLink size={14} /> Chi tiết
                        </a>
                      )}
                      <button
                        className="eventActionBtn"
                        onClick={() => handleAction(ev)}
                      >
                        {ev.actionLabel || 'Tham gia'}
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </main>

      <Nav setScreen={setScreen} active="events" />
    </div>
  );
}
