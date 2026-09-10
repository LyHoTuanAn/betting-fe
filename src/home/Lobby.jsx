import {useEffect, useState} from 'react';
import {ChevronLeft, ChevronRight, ExternalLink, Flame, Sparkles} from 'lucide-react';
import {fetchBanners} from '../shared/content.js';
import {GAME_CATEGORY, GAME_SCREEN} from '../shared/games.js';
import {Topbar} from '../shared/Topbar.jsx';
import {GameCard} from './GameCard.jsx';
import {Nav} from './Nav.jsx';

const LOBBY_TABS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'casino', label: 'Casino & Vòng Quay' },
  { key: 'card', label: 'Game Bài' },
  { key: 'arcade', label: 'Nổ Hũ & Bắn Cá' }
];

export function Lobby({setScreen, balance, sound, setSound, openPanel, games, user}) {
  const [banners, setBanners] = useState([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [selectedCat, setSelectedCat] = useState('all');

  useEffect(() => {
    fetchBanners().then(items => {
      const active = items.filter(b => b.enabled !== false);
      if (active.length > 0) setBanners(active);
    });
  }, []);

  // Auto-play banner slider
  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setActiveIdx(curr => (curr + 1) % banners.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [banners.length]);

  const currentBanner = banners[activeIdx] || {
    title: 'SIÊU NỔ HŨ HOÀNG KIM',
    subtitle: 'Nạp rút tức thì • Bảo mật tuyệt đối • Thưởng x5000',
    link: '#slot',
    image: '/assets/home-banner.webp'
  };

  const handleBannerClick = () => {
    if (!currentBanner.link) return;
    if (currentBanner.link.startsWith('#')) {
      const targetScreen = currentBanner.link.slice(1);
      if (targetScreen) setScreen(targetScreen);
    } else if (currentBanner.link.startsWith('http')) {
      window.open(currentBanner.link, '_blank', 'noreferrer');
    }
  };

  const prevBanner = (e) => {
    e.stopPropagation();
    setActiveIdx(curr => (curr - 1 + banners.length) % banners.length);
  };

  const nextBanner = (e) => {
    e.stopPropagation();
    setActiveIdx(curr => (curr + 1) % banners.length);
  };

  const activeGames = games.filter(game => game.enabled !== false);
  const filteredGames = activeGames.filter(game => {
    if (selectedCat === 'all') return true;
    return GAME_CATEGORY[game.key] === selectedCat;
  });

  return (
    <div className="screen lobby">
      <Topbar
        home
        balance={balance}
        onBack={() => {}}
        sound={sound}
        setSound={setSound}
        user={user}
        onProfile={() => setScreen('profile')}
        onWallet={() => openPanel ? openPanel('wallet') : setScreen('profile')}
      />

      <main className="lobbyBody">
        {/* DYNAMIC HERO BANNER SLIDER */}
        <section className="hero dynamicHero" onClick={handleBannerClick}>
          <img
            key={currentBanner.id || activeIdx}
            src={currentBanner.image || '/assets/home-banner.webp'}
            alt={currentBanner.title}
            loading="eager"
            decoding="async"
            onError={e => e.target.src = '/assets/home-banner.webp'}
          />
          <div className="heroShade" />
          <div className="heroGlow" />

          {currentBanner.tag && (
            <span className="heroTagBadge">
              <Flame size={12} /> {currentBanner.tag}
            </span>
          )}

          <span className="heroTitle">{currentBanner.title}</span>
          <small className="heroSub">{currentBanner.subtitle}</small>

          {currentBanner.actionLabel && (
            <div className="heroActionBtn">
              {currentBanner.actionLabel}
              {currentBanner.actionUrl ? <ExternalLink size={12} /> : null}
            </div>
          )}

          {banners.length > 1 && (
            <>
              <button className="bannerNavBtn prev" onClick={prevBanner} title="Banner trước">
                <ChevronLeft size={18} />
              </button>
              <button className="bannerNavBtn next" onClick={nextBanner} title="Banner sau">
                <ChevronRight size={18} />
              </button>

              <div className="dots" onClick={e => e.stopPropagation()}>
                {banners.map((_, idx) => (
                  <i
                    key={idx}
                    className={idx === activeIdx ? 'active' : ''}
                    onClick={() => setActiveIdx(idx)}
                  />
                ))}
              </div>
            </>
          )}
        </section>

        {/* CATEGORY FILTER TABS */}
        <div className="eventTabs lobbyCatTabs">
          {LOBBY_TABS.map(tab => (
            <button
              key={tab.key}
              className={'eventTab ' + (selectedCat === tab.key ? 'active' : '')}
              onClick={() => setSelectedCat(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="sectionTitle">
          <span>TRÒ CHƠI NỔI BẬT ({filteredGames.length})</span>
          <Sparkles />
        </div>

        <div className="gameGrid">
          {filteredGames.map(game => (
            <GameCard
              key={game.key}
              type={GAME_SCREEN[game.key]}
              title={game.name}
              sub={game.subtitle}
              onClick={() => setScreen(GAME_SCREEN[game.key])}
            />
          ))}
        </div>

        {!filteredGames.length && (
          <p className="lobbyEmpty">Không có trò chơi nào trong danh mục này.</p>
        )}
      </main>

      <Nav setScreen={setScreen} active="lobby" />
    </div>
  );
}
