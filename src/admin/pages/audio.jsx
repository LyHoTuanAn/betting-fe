import React, {useEffect, useState} from 'react';
import {
  Check, CheckCircle2, CheckSquare, Copy, ExternalLink, Globe, HelpCircle,
  Info, Layers, Link2, ListMusic, Music, Pause, Play, PlayCircle, Plus,
  Radio, RefreshCw, RotateCw, Save, Shuffle, Sliders, Square, Trash2,
  Volume2, VolumeX
} from 'lucide-react';
import {Card, Empty, Field, Loading, Pill, StatTile, Toggle} from '../ui.jsx';
import {api, session} from '../api.js';
import {
  DEFAULT_AUDIO_CONFIG,
  fetchAudioConfig,
  getNextTrack,
  parseAudioSource,
  PRESET_AUDIO_TRACKS,
  saveAudioConfig
} from '../../shared/audioSources.js';

/**
 * Chỉ nguồn 'direct' (file MP3/WAV) mới phát nền được thật sự. Ba nguồn nhúng
 * còn lại đều vướng chính sách của chính nền tảng đó, không phải lỗi cấu hình —
 * nói thẳng ra đây để admin không mất công dò tại sao chọn xong vẫn im lặng.
 */
const EMBED_WARNINGS = {
  youtube: 'YouTube bắt buộc hiện khung video ở góc màn hình người chơi, và chỉ có tiếng sau khi họ tự bấm nút.',
  spotify: 'Khung nhúng Spotify chỉ cho nghe thử 30 giây mỗi bài và không bao giờ tự phát.',
  zingmp3: 'Khung nhúng Zing MP3 không tự phát được, và Zing có thể chặn nhúng từ tên miền khác.',
  custom: 'Đường dẫn không phải file âm thanh trực tiếp — trình duyệt có thể không phát được.'
};

const SourceWarning = ({source}) => EMBED_WARNINGS[source] ? (
  <div style={{display: 'flex', gap: '8px', alignItems: 'flex-start', padding: '10px 12px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.45)', fontSize: '12.5px', lineHeight: 1.5, color: '#fbbf24'}}>
    <Info size={15} style={{flexShrink: 0, marginTop: '1px'}} />
    <span><b>Không tự phát được.</b> {EMBED_WARNINGS[source]} Muốn nhạc nổi lên ngay khi người chơi vào sảnh, hãy dùng bài có nguồn <b>Direct Audio (MP3/WAV)</b>.</span>
  </div>
) : null;

export default function AudioPage({notify}) {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewTrackUrl, setPreviewTrackUrl] = useState(null);
  const [urlInput, setUrlInput] = useState('');
  const [titleInput, setTitleInput] = useState('');
  const [descInput, setDescInput] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    fetchAudioConfig().then(cfg => {
      setConfig(cfg);
      setUrlInput(cfg.url || '');
      setTitleInput(cfg.title || '');
      setDescInput(cfg.description || '');
      setLoading(false);
    });
  }, []);

  if (loading || !config) return <Loading label="Đang tải cấu hình âm thanh..." />;

  const tracks = config.tracks || PRESET_AUDIO_TRACKS;
  const activeUrl = config.url || '';
  const parsedInput = parseAudioSource(urlInput);
  const parsedActive = parseAudioSource(activeUrl);
  const selectedTracksCount = tracks.filter(t => t.enabled !== false).length;

  // Lưu cấu hình chung đồng bộ trực tiếp vào Database máy chủ
  const persistConfig = async (newConfig, successMessage = 'Đã lưu cài đặt âm thanh!') => {
    setConfig(newConfig);
    setSaving(true);
    try {
      // 1. Lưu LocalStorage & bắn event nội bộ
      localStorage.setItem('goldzone_audio_config', JSON.stringify(newConfig));
      window.dispatchEvent(new CustomEvent('goldzone:audio_config_updated', {detail: newConfig}));

      // 2. Lưu vào Database máy chủ qua API Admin Banners
      try {
        const existing = await api.get('/admin/banners').catch(() => null);
        const list = existing?.banners || [];
        const found = list.find(b => b.tag === 'AUDIO_SYSTEM' || b.title === 'GOLDZONE_AUDIO_CONFIG');
        const payload = {
          title: 'GOLDZONE_AUDIO_CONFIG',
          subtitle: JSON.stringify(newConfig),
          image: '/assets/home-banner.webp',
          tag: 'AUDIO_SYSTEM',
          actionScreen: 'url',
          actionUrl: '',
          actionLabel: 'AUDIO',
          enabled: true,
          sortOrder: 9999
        };

        if (found) {
          await api.patch(`/admin/banners/${found.id}`, payload);
        } else {
          await api.post('/admin/banners', payload);
        }
      } catch (err) {
        console.warn('Lỗi khi lưu Database banner:', err);
      }

      notify.show(successMessage, 'ok');
    } catch (err) {
      notify.show('Lỗi khi lưu: ' + (err.message || 'Thử lại sau'), 'fail');
    } finally {
      setSaving(false);
    }
  };

  // Kích hoạt một bài làm bài đang phát
  const handleActivateTrack = (track) => {
    const updated = {
      ...config,
      url: track.url,
      title: track.title,
      description: track.description || '',
      source: track.source || parseAudioSource(track.url).source,
      activeTrackId: track.id
    };
    persistConfig(updated, `🟢 Đang phát: "${track.title}"`);
  };

  // Bật/tắt 1 bài trong danh sách phát (Checkbox per track)
  const handleToggleTrackInPlaylist = (trackId) => {
    const updatedTracks = tracks.map(t => {
      if (t.id === trackId) {
        return {...t, enabled: !(t.enabled !== false)};
      }
      return t;
    });
    persistConfig({...config, tracks: updatedTracks}, 'Đã cập nhật danh sách bài phát');
  };

  // Chọn tất cả bài / Bỏ chọn tất cả bài
  const handleSelectAllTracks = (selectAll = true) => {
    const updatedTracks = tracks.map(t => ({...t, enabled: selectAll}));
    persistConfig(
      {...config, tracks: updatedTracks},
      selectAll ? `Đã chọn tất cả ${tracks.length} bài hát vào danh sách phát` : 'Đã bỏ chọn tất cả bài hát'
    );
  };

  // Thêm bài hát mới từ URL (Mặc định kích hoạt phát ngay)
  const handleAddTrackToLibrary = (activateImmediately = true) => {
    if (!urlInput.trim()) {
      return notify.show('Vui lòng nhập đường dẫn URL bài hát', 'warn');
    }

    const parsed = parseAudioSource(urlInput);
    const newTrack = {
      id: 't_' + Date.now(),
      title: titleInput.trim() || parsed.label,
      url: urlInput.trim(),
      source: parsed.source,
      description: descInput.trim(),
      enabled: true
    };

    const newTracks = [newTrack, ...tracks.filter(t => t.url !== newTrack.url)];
    const updated = {
      ...config,
      tracks: newTracks,
      ...(activateImmediately ? {
        url: newTrack.url,
        title: newTrack.title,
        description: newTrack.description,
        source: newTrack.source,
        activeTrackId: newTrack.id
      } : {})
    };

    setShowAddModal(false);
    setUrlInput('');
    setTitleInput('');
    setDescInput('');
    persistConfig(updated, activateImmediately ? `🟢 Đã thêm và chuyển sang phát ngay: "${newTrack.title}"` : 'Đã thêm bài hát vào thư viện!');
  };

  const handleDeleteTrack = (id) => {
    const updatedTracks = tracks.filter(t => t.id !== id);
    persistConfig({...config, tracks: updatedTracks}, 'Đã xóa bài hát khỏi danh sách');
  };

  const getSourceBadge = (source) => {
    switch (source) {
      case 'youtube':
        return <span style={{background: '#ff000022', color: '#ff4d4d', padding: '3px 8px', borderRadius: '6px', fontWeight: 600, fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px'}}><PlayCircle size={13} /> YouTube</span>;
      case 'spotify':
        return <span style={{background: '#1db95422', color: '#1ed760', padding: '3px 8px', borderRadius: '6px', fontWeight: 600, fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px'}}><Music size={13} /> Spotify</span>;
      case 'zingmp3':
        return <span style={{background: '#8a2be222', color: '#ba68c8', padding: '3px 8px', borderRadius: '6px', fontWeight: 600, fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px'}}><Radio size={13} /> Zing MP3</span>;
      case 'direct':
        return <span style={{background: '#f59e0b22', color: '#fbbf24', padding: '3px 8px', borderRadius: '6px', fontWeight: 600, fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px'}}><Volume2 size={13} /> MP3 Direct</span>;
      default:
        return <span style={{background: '#6366f122', color: '#818cf8', padding: '3px 8px', borderRadius: '6px', fontWeight: 600, fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px'}}><Globe size={13} /> Web Audio</span>;
    }
  };

  return (
    <div className="stack">
      {/* THỐNG KÊ NHANH */}
      <div className="statRow">
        <StatTile
          label="Trạng thái phát nhạc"
          value={config.enabled ? 'ĐANG BẬT' : 'ĐANG TẮT'}
          hint={config.enabled ? 'Phát tự động cho người chơi' : 'Đang tắt toàn bộ nhạc nền'}
        />
        <StatTile
          label="Chế độ phát hiện tại"
          value={
            config.playMode === 'single' ? 'Phát 1 bài đơn lẻ'
            : config.playMode === 'all' ? 'Phát tất cả bài'
            : 'Phát danh sách chọn'
          }
          hint={config.shuffle ? 'Đang bật Trộn bài (Shuffle)' : 'Phát tuần tự theo danh sách'}
        />
        <StatTile
          label="Số bài được chọn phát"
          value={`${selectedTracksCount} / ${tracks.length} bài`}
          hint="Có thể bật/tắt từng bài hát"
        />
      </div>

      {/* Bài đang phát dùng nguồn nhúng thì báo ngay, đừng để admin tự dò */}
      {activeUrl && <SourceWarning source={parsedActive.source} />}

      {/* CẤU HÌNH CHẾ ĐỘ PHÁT NHIỀU & TÙY CHỌN */}
      <Card title="Cài Đặt Chế Độ Phát Nhạc (Single / Playlist / All)">
        <div style={{padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '16px'}}>
          {/* Bật / Tắt Master */}
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: 'var(--panel-2)', borderRadius: '12px'}}>
            <div>
              <strong style={{fontSize: '15px', color: 'var(--text)'}}>Bật phát nhạc nền trên Web</strong>
              <p style={{margin: '3px 0 0', fontSize: '13px', color: 'var(--muted)'}}>
                Tự động phát âm thanh êm dịu khi người chơi vào trang chủ sảnh game.
              </p>
            </div>
            <Toggle
              checked={config.enabled}
              onChange={val => persistConfig({...config, enabled: val}, val ? 'Đã bật nhạc nền' : 'Đã tắt nhạc nền')}
            />
          </div>

          {/* CHỌN CHẾ ĐỘ PHÁT */}
          <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
            <label style={{fontSize: '14px', fontWeight: 600, color: 'var(--text)'}}>
              Chọn chế độ phát nhạc:
            </label>

            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px'}}>
              {/* Option 1: Playlist (Phát các bài được chọn) */}
              <div
                onClick={() => persistConfig({...config, playMode: 'playlist'}, 'Đã chuyển sang chế độ: Phát danh sách bài được chọn')}
                style={{
                  padding: '14px',
                  background: (config.playMode === 'playlist' || !config.playMode) ? 'rgba(240, 180, 41, 0.14)' : 'var(--panel-2)',
                  border: `1.5px solid ${(config.playMode === 'playlist' || !config.playMode) ? 'var(--gold)' : 'var(--line)'}`,
                  borderRadius: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  transition: 'all 0.15s'
                }}
              >
                <div style={{color: 'var(--gold)', marginTop: '2px'}}><ListMusic size={20} /></div>
                <div>
                  <strong style={{color: (config.playMode === 'playlist' || !config.playMode) ? 'var(--gold)' : 'var(--text)', fontSize: '14.5px', display: 'block', marginBottom: '3px'}}>
                    Phát danh sách chọn ({selectedTracksCount} bài)
                  </strong>
                  <small style={{color: 'var(--muted)', fontSize: '12.5px', lineHeight: 1.4, display: 'block'}}>
                    Chỉ phát tuần tự các bài có dấu tích xanh <b>[✓]</b> được chọn bên dưới.
                  </small>
                </div>
              </div>

              {/* Option 2: Play All (Phát tất cả) */}
              <div
                onClick={() => persistConfig({...config, playMode: 'all'}, 'Đã chuyển sang chế độ: Phát toàn bộ tất cả bài hát')}
                style={{
                  padding: '14px',
                  background: config.playMode === 'all' ? 'rgba(240, 180, 41, 0.14)' : 'var(--panel-2)',
                  border: `1.5px solid ${config.playMode === 'all' ? 'var(--gold)' : 'var(--line)'}`,
                  borderRadius: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  transition: 'all 0.15s'
                }}
              >
                <div style={{color: 'var(--gold)', marginTop: '2px'}}><Layers size={20} /></div>
                <div>
                  <strong style={{color: config.playMode === 'all' ? 'var(--gold)' : 'var(--text)', fontSize: '14.5px', display: 'block', marginBottom: '3px'}}>
                    Phát tất cả ({tracks.length} bài)
                  </strong>
                  <small style={{color: 'var(--muted)', fontSize: '12.5px', lineHeight: 1.4, display: 'block'}}>
                    Tự động phát lần lượt qua tất cả bài hát trong thư viện không giới hạn.
                  </small>
                </div>
              </div>

              {/* Option 3: Single Track (Chỉ phát 1 bài đơn lẻ) */}
              <div
                onClick={() => persistConfig({...config, playMode: 'single'}, 'Đã chuyển sang chế độ: Chỉ phát 1 bài duy nhất')}
                style={{
                  padding: '14px',
                  background: config.playMode === 'single' ? 'rgba(240, 180, 41, 0.14)' : 'var(--panel-2)',
                  border: `1.5px solid ${config.playMode === 'single' ? 'var(--gold)' : 'var(--line)'}`,
                  borderRadius: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  transition: 'all 0.15s'
                }}
              >
                <div style={{color: 'var(--gold)', marginTop: '2px'}}><Radio size={20} /></div>
                <div>
                  <strong style={{color: config.playMode === 'single' ? 'var(--gold)' : 'var(--text)', fontSize: '14.5px', display: 'block', marginBottom: '3px'}}>
                    Phát 1 bài đơn lẻ
                  </strong>
                  <small style={{color: 'var(--muted)', fontSize: '12.5px', lineHeight: 1.4, display: 'block'}}>
                    Chỉ phát và lặp lại duy nhất bài đang được kích hoạt.
                  </small>
                </div>
              </div>
            </div>
          </div>

          {/* CÁC TÙY CHỌN TRỘN BÀI & PHÒNG GAME */}
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px'}}>
            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--panel-2)', borderRadius: '10px'}}>
              <div>
                <strong style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                  <Shuffle size={16} color="var(--gold)" /> Trộn bài ngẫu nhiên (Shuffle)
                </strong>
                <small style={{display: 'block'}}>Đổi thứ tự bài hát ngẫu nhiên khi chuyển bài</small>
              </div>
              <Toggle
                checked={!!config.shuffle}
                onChange={val => persistConfig({...config, shuffle: val}, val ? 'Đã bật chế độ phát ngẫu nhiên' : 'Đã chuyển sang phát tuần tự')}
              />
            </div>

            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--panel-2)', borderRadius: '10px'}}>
              <div>
                <strong>Phát trong game</strong>
                <small style={{display: 'block'}}>Tiếp tục phát khi vào Nổ Hũ / Bắn Cá / Tài Xỉu</small>
              </div>
              <Toggle
                checked={config.playInGames !== false}
                onChange={val => persistConfig({...config, playInGames: val})}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* DANH SÁCH BÀI HÁT & CHỌN TỪNG BÀI / CHỌN TẤT CẢ */}
      <Card
        title={`Thư Viện Bài Hát (${selectedTracksCount}/${tracks.length} bài được chọn phát)`}
        action={
          <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
            <button className="sm ghost" onClick={() => handleSelectAllTracks(true)}>
              <CheckSquare size={14} /> Chọn tất cả
            </button>
            <button className="sm ghost" onClick={() => handleSelectAllTracks(false)}>
              <Square size={14} /> Bỏ chọn tất cả
            </button>
            <button className="primary sm" onClick={() => setShowAddModal(!showAddModal)}>
              <Plus size={15} /> Thêm URL bài hát
            </button>
          </div>
        }
      >
        <div style={{padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px'}}>
          {/* POPUP/KHUNG THÊM BÀI HÁT MỚI TỪ URL */}
          {showAddModal && (
            <div style={{padding: '18px', background: '#0a0e16', border: '1.5px solid var(--gold)', borderRadius: '14px', marginBottom: '8px', display: 'flex', flexDirection: 'column', gap: '14px'}}>
              <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                <strong style={{color: 'var(--gold)', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <Plus size={18} /> Thêm bài hát mới (YouTube, Zing MP3, Spotify, Direct MP3)
                </strong>
                <button className="sm ghost" onClick={() => setShowAddModal(false)}>Hủy</button>
              </div>

              <Field label="Dán đường dẫn URL bài hát hoặc video">
                <input
                  value={urlInput}
                  onChange={e => setUrlInput(e.target.value)}
                  placeholder="Ví dụ: https://www.youtube.com/watch?v=kXYiU_JCYtU hoặc file .mp3..."
                />
              </Field>

              {urlInput && (
                <>
                  <div style={{display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--muted)'}}>
                    <span>Nhận diện nguồn:</span>
                    {getSourceBadge(parsedInput.source)}
                    <b style={{color: 'var(--text)'}}>{parsedInput.label}</b>
                  </div>
                  <SourceWarning source={parsedInput.source} />
                </>
              )}

              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px'}}>
                <Field label="Tên bài hát">
                  <input
                    value={titleInput}
                    onChange={e => setTitleInput(e.target.value)}
                    placeholder="Ví dụ: Nhạc EDM Sôi Động 2026"
                  />
                </Field>
                <Field label="Mô tả / Thể loại">
                  <input
                    value={descInput}
                    onChange={e => setDescInput(e.target.value)}
                    placeholder="Ví dụ: Nhạc sàn quẩy nổ hũ"
                  />
                </Field>
              </div>

              <div style={{display: 'flex', gap: '10px', justifyContent: 'flex-end'}}>
                <button
                  type="button"
                  className="ghost sm"
                  onClick={() => handleAddTrackToLibrary(false)}
                >
                  Thêm vào danh sách
                </button>
                <button
                  type="button"
                  className="primary sm"
                  onClick={() => handleAddTrackToLibrary(true)}
                >
                  <Check size={16} /> Thêm & Kích hoạt phát ngay
                </button>
              </div>
            </div>
          )}

          {/* DANH SÁCH BÀI HÁT CHI TIẾT */}
          {tracks.map((track, idx) => {
            const isActive = activeUrl === track.url;
            const isIncludedInPlaylist = track.enabled !== false;
            const isPreviewing = previewTrackUrl === track.url;
            const parsedTrack = parseAudioSource(track.url);

            return (
              <div
                key={track.id || idx}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  padding: '14px 18px',
                  background: isActive ? 'rgba(240, 180, 41, 0.14)' : isIncludedInPlaylist ? 'var(--panel-2)' : 'rgba(0,0,0,0.2)',
                  border: `1.5px solid ${isActive ? 'var(--gold)' : isIncludedInPlaylist ? 'var(--line)' : 'rgba(255,255,255,0.05)'}`,
                  borderRadius: '12px',
                  opacity: isIncludedInPlaylist || isActive ? 1 : 0.65,
                  transition: 'all 0.2s',
                  boxShadow: isActive ? '0 0 16px rgba(240, 180, 41, 0.18)' : 'none'
                }}
              >
                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px'}}>
                  {/* Cột trái: Checkbox chọn bài & Tên bài */}
                  <div style={{display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0}}>
                    {/* Checkbox tích chọn bài này vào playlist */}
                    <button
                      type="button"
                      onClick={() => handleToggleTrackInPlaylist(track.id)}
                      style={{
                        background: isIncludedInPlaylist ? 'rgba(52, 211, 153, 0.15)' : 'rgba(255,255,255,0.05)',
                        border: `1.5px solid ${isIncludedInPlaylist ? '#34d399' : '#4b5563'}`,
                        borderRadius: '6px',
                        width: '26px',
                        height: '26px',
                        display: 'grid',
                        placeItems: 'center',
                        color: isIncludedInPlaylist ? '#34d399' : 'transparent',
                        cursor: 'pointer',
                        padding: 0,
                        flexShrink: 0
                      }}
                      title={isIncludedInPlaylist ? 'Bài này đang được chọn phát trong playlist (Bấm để bỏ)' : 'Bấm để thêm bài này vào danh sách phát'}
                    >
                      <Check size={16} strokeWidth={3} />
                    </button>

                    {/* Nút Play / Active */}
                    <button
                      type="button"
                      onClick={() => handleActivateTrack(track)}
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: isActive ? 'linear-gradient(180deg, #ffd84e, #c98207)' : 'rgba(255,255,255,0.06)',
                        color: isActive ? '#1a1202' : '#ffd84e',
                        border: `1.5px solid ${isActive ? '#ffd84e' : 'rgba(255,255,255,0.12)'}`,
                        display: 'grid',
                        placeItems: 'center',
                        cursor: 'pointer',
                        padding: 0,
                        flexShrink: 0
                      }}
                      title={isActive ? 'Bài hát này đang phát' : 'Bấm để phát bài này ngay'}
                    >
                      {isActive ? <Check size={18} strokeWidth={3} /> : <Play size={15} />}
                    </button>

                    <div style={{minWidth: 0}}>
                      <div style={{display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '2px'}}>
                        <strong style={{color: isActive ? 'var(--gold)' : 'var(--text)', fontSize: '14.5px'}}>
                          {track.title}
                        </strong>
                        {getSourceBadge(track.source || parsedTrack.source)}
                        {isActive && <Pill tone="ok">🟢 ĐANG PHÁT</Pill>}
                        {isIncludedInPlaylist && !isActive && <span style={{fontSize: '11px', color: '#34d399', background: 'rgba(52,211,153,0.1)', padding: '2px 6px', borderRadius: '4px'}}>ĐÃ CHỌN TRONG PLAYLIST</span>}
                      </div>
                      <small style={{color: 'var(--muted)', display: 'block', wordBreak: 'break-all'}}>
                        {track.description || track.url}
                      </small>
                    </div>
                  </div>

                  {/* Cột phải: Các nút hành động */}
                  <div style={{display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0}}>
                    <button
                      type="button"
                      className="sm ghost"
                      onClick={() => setPreviewTrackUrl(isPreviewing ? null : track.url)}
                      title="Nghe thử bài hát"
                    >
                      {isPreviewing ? <Pause size={14} /> : <Play size={14} />} {isPreviewing ? 'Dừng' : 'Nghe thử'}
                    </button>

                    <button
                      type="button"
                      className={isActive ? 'primary sm' : 'ghost sm'}
                      disabled={isActive || saving}
                      onClick={() => handleActivateTrack(track)}
                    >
                      {isActive ? '✓ Đang phát' : 'Phát bài này'}
                    </button>

                    {tracks.length > 1 && (
                      <button
                        type="button"
                        className="danger sm"
                        onClick={() => handleDeleteTrack(track.id)}
                        title="Xóa khỏi thư viện"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* KHUNG NGHE THỬ TRỰC TIẾP */}
                {isPreviewing && (
                  <div style={{padding: '12px', background: '#090d14', borderRadius: '10px', border: '1px solid var(--line)', marginTop: '4px'}}>
                    {parsedTrack.source === 'direct' ? (
                      <audio controls src={parsedTrack.directUrl} autoPlay style={{width: '100%', height: '36px'}} />
                    ) : parsedTrack.embedUrl ? (
                      <div style={{borderRadius: '8px', overflow: 'hidden', height: parsedTrack.source === 'spotify' ? '152px' : '180px'}}>
                        <iframe
                          title={`Preview ${track.title}`}
                          src={parsedTrack.embedUrl}
                          width="100%"
                          height="100%"
                          allow="autoplay; encrypted-media"
                          style={{border: 0}}
                        />
                      </div>
                    ) : (
                      <p style={{margin: 0, color: 'var(--fail)'}}>Không thể tải khung phát cho URL này.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
