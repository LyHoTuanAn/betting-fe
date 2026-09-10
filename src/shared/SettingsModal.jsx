import {useEffect, useState} from 'react';
import {Check, Info, Music, Play, Sliders, Sparkles, Volume2, VolumeX, X} from 'lucide-react';
import {getSoundVolume, playTestSound, setSoundVolume} from './audio.js';
import {fetchAudioConfig} from './audioSources.js';

export function SettingsModal({isOpen, onClose, sound, setSound}) {
  const [activeTab, setActiveTab] = useState('audio');
  const [volume, setVolumeState] = useState(() => Math.round(getSoundVolume() * 100));
  const [bgAudio, setBgAudio] = useState(null);

  useEffect(() => {
    fetchAudioConfig().then(cfg => setBgAudio(cfg));
    const handleVolumeChange = (e) => {
      setVolumeState(Math.round(e.detail * 100));
    };
    const handleConfigChange = (e) => {
      if (e.detail) setBgAudio(e.detail);
    };
    window.addEventListener('goldzone:volume', handleVolumeChange);
    window.addEventListener('goldzone:audio_config_updated', handleConfigChange);
    return () => {
      window.removeEventListener('goldzone:volume', handleVolumeChange);
      window.removeEventListener('goldzone:audio_config_updated', handleConfigChange);
    };
  }, []);

  if (!isOpen) return null;

  const handleVolumeSlider = (e) => {
    const val = parseInt(e.target.value, 10);
    setVolumeState(val);
    setSoundVolume(val / 100);
    if (!sound && val > 0 && setSound) {
      setSound(true);
    }
  };

  const setPresetVolume = (val) => {
    setVolumeState(val);
    setSoundVolume(val / 100);
    if (!sound && val > 0 && setSound) {
      setSound(true);
    }
    playTestSound(val / 100);
  };

  const handleTestSound = () => {
    if (!sound && setSound) setSound(true);
    playTestSound(volume / 100);
  };

  return (
    <div className="settingsModalBackdrop" onClick={onClose}>
      <div className="settingsModalCard" onClick={e => e.stopPropagation()}>
        <div className="settingsModalHeader">
          <div className="settingsModalTitle">
            <Sliders size={20} className="goldIcon" />
            <h3>CÀI ĐẶT HỆ THỐNG</h3>
          </div>
          <button className="settingsCloseBtn" onClick={onClose} aria-label="Đóng cài đặt">
            <X size={18} />
          </button>
        </div>

        <div className="settingsTabs">
          <button
            className={`settingsTabBtn ${activeTab === 'audio' ? 'active' : ''}`}
            onClick={() => setActiveTab('audio')}
          >
            <Volume2 size={16} />
            <span>Âm thanh</span>
          </button>
          <button
            className={`settingsTabBtn ${activeTab === 'info' ? 'active' : ''}`}
            onClick={() => setActiveTab('info')}
          >
            <Info size={16} />
            <span>Thông tin</span>
          </button>
        </div>

        <div className="settingsBody">
          {activeTab === 'audio' && (
            <div className="settingsSection">
              <div className="settingsRow">
                <div className="settingLabelGroup">
                  <strong>Hiệu ứng âm thanh</strong>
                  <small>Bật / tắt âm thanh trong tất cả game</small>
                </div>
                <button
                  type="button"
                  className={`settingToggleBtn ${sound ? 'on' : 'off'}`}
                  onClick={() => setSound && setSound(!sound)}
                  aria-label={sound ? 'Tắt âm thanh' : 'Bật âm thanh'}
                >
                  <span className="toggleSlider" />
                  <span className="toggleText">{sound ? 'BẬT' : 'TẮT'}</span>
                </button>
              </div>

              <div className="volumeControlBlock">
                <div className="volumeHeader">
                  <div className="volumeLabel">
                    {sound && volume > 0 ? <Volume2 size={18} className="goldIcon" /> : <VolumeX size={18} className="dimIcon" />}
                    <span>Âm lượng chính: <b>{sound ? `${volume}%` : 'Đang tắt'}</b></span>
                  </div>
                  <button
                    type="button"
                    className="testSoundBtn"
                    onClick={handleTestSound}
                    title="Bấm để nghe thử âm thanh"
                  >
                    <Play size={13} /> Thử tiếng
                  </button>
                </div>

                <div className="sliderWrap">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={volume}
                    onChange={handleVolumeSlider}
                    className="goldVolumeSlider"
                    style={{
                      background: `linear-gradient(to right, #f5a623 0%, #ffd84e ${volume}%, #252e3d ${volume}%, #252e3d 100%)`
                    }}
                  />
                </div>

                <div className="volumePresets">
                  {[0, 25, 50, 75, 100].map(p => (
                    <button
                      key={p}
                      type="button"
                      className={`presetBtn ${volume === p ? 'active' : ''}`}
                      onClick={() => setPresetVolume(p)}
                    >
                      {p === 0 ? 'Tắt' : `${p}%`}
                    </button>
                  ))}
                </div>
              </div>

              {/* THÔNG TIN NHẠC NỀN HỆ THỐNG */}
              {bgAudio && bgAudio.enabled && (
                <div style={{background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,216,78,0.2)', borderRadius: '14px', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                    <div style={{background: 'rgba(255,216,78,0.15)', border: '1px solid #ffd84e', borderRadius: '50%', width: '32px', height: '32px', display: 'grid', placeItems: 'center', color: '#ffd84e'}}>
                      <Music size={16} />
                    </div>
                    <div>
                      <small style={{color: '#94a3b8', display: 'block', fontSize: '11px'}}>ĐANG PHÁT NHẠC NỀN</small>
                      <strong style={{color: '#ffd84e', fontSize: '13.5px'}}>{bgAudio.title || 'Nhạc Nền GoldZone'}</strong>
                    </div>
                  </div>
                  <span style={{fontSize: '11px', background: 'rgba(255,255,255,0.08)', padding: '3px 8px', borderRadius: '6px', color: '#cbd5e1', textTransform: 'uppercase'}}>
                    {bgAudio.source || 'Online'}
                  </span>
                </div>
              )}
            </div>
          )}

          {activeTab === 'info' && (
            <div className="settingsSection infoSection">
              <div className="infoBrand">
                <Sparkles size={28} className="goldIcon" />
                <h4>GOLDZONE CASINO VIP</h4>
                <p>Nền tảng giải trí trực tuyến đỉnh cao</p>
              </div>
              <div className="infoDetails">
                <div className="infoItem">
                  <span>Phiên bản:</span>
                  <strong>v2.4.0 Live Gold</strong>
                </div>
                <div className="infoItem">
                  <span>Âm thanh chuẩn:</span>
                  <strong>Web Audio API High-Res</strong>
                </div>
                <div className="infoItem">
                  <span>Hỗ trợ thiết bị:</span>
                  <strong>Tối ưu hóa Mobile & Desktop</strong>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="settingsModalFooter">
          <button className="settingsDoneBtn" onClick={onClose}>
            <Check size={16} /> ĐÃ HIỂU / ĐÓNG
          </button>
        </div>
      </div>
    </div>
  );
}
