import {useEffect, useRef, useState} from 'react';
import {ArrowLeft, Coins, Plus, Settings, Volume2, VolumeX} from 'lucide-react';
import {money} from './format.js';
import {useAnimatedNumber} from './hooks.js';
import {SettingsModal} from './SettingsModal.jsx';

export function Topbar({
  balance,
  onBack,
  sound,
  setSound,
  home = false,
  onProfile,
  onWallet,
  user,
  avatar
}) {
  const shown = useAnimatedNumber(balance);
  const [ping, setPing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const prev = useRef(balance);

  useEffect(() => {
    if (balance !== prev.current) {
      setPing(true);
      const t = setTimeout(() => setPing(false), 600);
      return () => clearTimeout(t);
    }
  }, [balance]);

  const userAvatar = avatar || user?.avatar || (user?.id ? localStorage.getItem('goldzone_avatar_' + user.id) : null) || localStorage.getItem('goldzone_avatar') || '/assets/home-avatar.webp';

  return (
    <>
      <header className="topbar">
        {home ? (
          <button className="avatarButton" onClick={onProfile} title="Trang cá nhân">
            <img className="avatar" src={userAvatar} alt="Tài khoản" loading="eager" decoding="async" />
          </button>
        ) : (
          <button className="iconBtn" aria-label="Quay lại trang chủ" onClick={onBack}>
            <ArrowLeft />
          </button>
        )}

        <div className={'brandcoin ' + (ping ? 'walletPing' : '')}>
          <Coins /> {money(shown)}
        </div>

        <div className="topActions">
          <button className="roundPlus" onClick={onWallet} title="Nạp / Rút ví">
            <Plus />
          </button>
          <button className="iconBtn" onClick={() => setSound(!sound)} title={sound ? 'Tắt âm thanh' : 'Bật âm thanh'}>
            {sound ? <Volume2 /> : <VolumeX />}
          </button>
          <button className="iconBtn settingBtn" onClick={() => setShowSettings(true)} title="Cài đặt hệ thống">
            <Settings />
          </button>
        </div>
      </header>

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        sound={sound}
        setSound={setSound}
      />
    </>
  );
}

