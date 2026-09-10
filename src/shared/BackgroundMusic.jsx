import React, {useEffect, useRef, useState} from 'react';
import {getSoundVolume, unlockAudioContext} from './audio.js';
import {fetchAudioConfig, getNextTrack, parseAudioSource} from './audioSources.js';

let isYTApiLoading = false;
let isYTApiLoaded = false;

function loadYouTubeIframeApi() {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (window.YT && window.YT.Player) {
    isYTApiLoaded = true;
    return Promise.resolve(window.YT);
  }
  return new Promise((resolve) => {
    const check = () => {
      if (window.YT && window.YT.Player) {
        isYTApiLoaded = true;
        resolve(window.YT);
      } else {
        setTimeout(check, 100);
      }
    };

    if (!isYTApiLoading && !document.getElementById('yt-iframe-api-script')) {
      isYTApiLoading = true;
      const tag = document.createElement('script');
      tag.id = 'yt-iframe-api-script';
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }
    check();
  });
}

/**
 * Chọn bài đang phát từ cấu hình. Phải quét hết `activeTrackId` trước rồi mới
 * tới `url`: gộp hai điều kiện vào cùng một vòng `find` khiến bài đứng đầu mảng
 * thắng chỉ vì được duyệt trước, nên bài admin vừa kích hoạt hay bị bỏ qua.
 */
function pickTrack(cfg) {
  if (!cfg) return null;
  const tracks = Array.isArray(cfg.tracks) ? cfg.tracks : [];
  if (!tracks.length) return cfg.url ? {url: cfg.url, title: cfg.title, source: cfg.source} : null;
  return (cfg.activeTrackId && tracks.find(t => t.id === cfg.activeTrackId))
    || (cfg.url && tracks.find(t => t.url === cfg.url))
    || tracks[0];
}

export function BackgroundMusic({sound = true}) {
  const [config, setConfig] = useState(null);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [volume, setVolume] = useState(() => getSoundVolume());
  const [isPlaying, setIsPlaying] = useState(false);

  const audioRef = useRef(null);
  const ytPlayerRef = useRef(null);
  const containerRef = useRef(null);
  const hasInteractedRef = useRef(false);

  // Giữ giá trị mới nhất cho bộ bắt cử chỉ, để nó không phải gắn lại mỗi lần đổi
  // âm lượng. Gắn lại đồng nghĩa chạy lại cả khối dưới, tức tải lại cấu hình và
  // nhảy về bài đầu danh sách ngay giữa lúc đang nghe.
  const soundRef = useRef(sound);
  const volumeRef = useRef(volume);
  useEffect(() => { soundRef.current = sound; volumeRef.current = volume; }, [sound, volume]);

  // 1. Tải cấu hình nhạc nền đúng một lần & lắng nghe các sự kiện cập nhật
  useEffect(() => {
    const applyConfig = (cfg) => {
      if (!cfg) return;
      setConfig(cfg);
      setCurrentTrack(pickTrack(cfg));
    };

    fetchAudioConfig().then(applyConfig);

    const handleConfigUpdate = (e) => applyConfig(e.detail);
    const handleVolumeChange = (e) => setVolume(e.detail);
    const handleStorage = (e) => {
      if (e.key !== 'goldzone_audio_config' || !e.newValue) return;
      try { applyConfig(JSON.parse(e.newValue)); } catch {}
    };

    window.addEventListener('goldzone:audio_config_updated', handleConfigUpdate);
    window.addEventListener('goldzone:volume', handleVolumeChange);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('goldzone:audio_config_updated', handleConfigUpdate);
      window.removeEventListener('goldzone:volume', handleVolumeChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // 1b. Cử chỉ đầu tiên của người dùng là thứ duy nhất mở khóa được âm thanh có
  // tiếng trên Chrome/Safari — không có cách nào lách. Gắn một lần cho cả vòng
  // đời component, và giữ nguyên tới khi phát được: cử chỉ sớm nhất có thể rơi
  // vào lúc thẻ audio chưa kịp render nên phải bắt cả những cử chỉ sau đó.
  useEffect(() => {
    const handleGesture = () => {
      hasInteractedRef.current = true;
      // Dùng lại đúng một AudioContext dùng chung. Bản cũ tạo mới mỗi cú click và
      // không đóng, cạn hạn mức ~6 context của trình duyệt rồi giết luôn tiếng game.
      unlockAudioContext();

      if (!soundRef.current || volumeRef.current <= 0.001) return;

      if (audioRef.current) {
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      }
      if (ytPlayerRef.current?.playVideo) {
        try {
          ytPlayerRef.current.unMute();
          ytPlayerRef.current.setVolume(Math.round(volumeRef.current * 100));
          ytPlayerRef.current.playVideo();
          setIsPlaying(true);
        } catch {}
      }
    };

    // Bỏ 'scroll': cuộn trang không được Chrome tính là cử chỉ mở khóa, giữ lại
    // chỉ tổ chạy hàm này liên tục. 'keydown' thì có tính.
    const events = ['pointerdown', 'click', 'touchstart', 'keydown'];
    events.forEach(name => window.addEventListener(name, handleGesture, {passive: true}));
    return () => events.forEach(name => window.removeEventListener(name, handleGesture));
  }, []);

  const activeTrack = currentTrack || (config ? {url: config.url, title: config.title, source: config.source} : null);
  const parsed = activeTrack?.url ? parseAudioSource(activeTrack.url) : null;

  // Xử lý chuyển bài tự động khi bài hiện tại phát hết
  const handleTrackEnded = () => {
    if (!config) return;
    const mode = config.playMode || 'playlist';

    if (mode === 'single') {
      // Lặp lại bài hiện tại
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      }
      if (ytPlayerRef.current && ytPlayerRef.current.playVideo) {
        ytPlayerRef.current.seekTo(0);
        ytPlayerRef.current.playVideo();
      }
      return;
    }

    // Chế độ Playlist hoặc All: Tìm bài kế tiếp
    const next = getNextTrack(config, activeTrack);
    if (next) {
      setCurrentTrack(next);
    }
  };

  // Một bài chết (CDN chặn hotlink, link đổi chủ) không được phép làm đứng cả
  // danh sách. Bỏ qua nó và đi tiếp, nhưng đếm số lần bỏ để không quay vòng vô
  // hạn khi cả danh sách đều hỏng.
  const skippedRef = useRef(0);
  const handleTrackError = () => {
    if (!config) return;
    const pool = (config.tracks || []).filter(t => t.enabled !== false);
    if (skippedRef.current >= pool.length) return;
    skippedRef.current += 1;
    const next = getNextTrack(config, activeTrack);
    if (next && next.url !== activeTrack?.url) setCurrentTrack(next);
  };

  // 2. Khởi tạo và phát Direct Audio
  useEffect(() => {
    if (!audioRef.current || !config || parsed?.source !== 'direct') return;
    const el = audioRef.current;
    if (!config.enabled || !sound || volume <= 0.001) {
      el.pause();
      setIsPlaying(false);
    } else {
      el.volume = Math.max(0, Math.min(1, volume));
      el.play().then(() => { setIsPlaying(true); skippedRef.current = 0; }).catch(() => {});
    }
  }, [config, sound, volume, parsed?.source, activeTrack?.url]);

  // 3. Khởi tạo YouTube IFrame Player nếu nguồn là YouTube
  useEffect(() => {
    if (!config || !config.enabled || parsed?.source !== 'youtube' || !parsed.videoId) {
      if (ytPlayerRef.current) {
        try { ytPlayerRef.current.destroy(); } catch {}
        ytPlayerRef.current = null;
      }
      return;
    }

    let isMounted = true;

    loadYouTubeIframeApi().then((YT) => {
      if (!isMounted || !YT || !containerRef.current) return;

      if (ytPlayerRef.current) {
        try { ytPlayerRef.current.destroy(); } catch {}
      }

      try {
        ytPlayerRef.current = new YT.Player(containerRef.current, {
          videoId: parsed.videoId,
          playerVars: {
            autoplay: 1,
            mute: 1, // Bắt đầu ở chế độ mute để trình duyệt 100% cho phép chạy ngầm
            controls: 0,
            loop: config.playMode === 'single' ? 1 : 0,
            playlist: config.playMode === 'single' ? parsed.videoId : undefined,
            playsinline: 1,
            rel: 0,
            showinfo: 0,
            modestbranding: 1,
            origin: window.location.origin
          },
          events: {
            onReady: (event) => {
              // Bắt đầu phát ngầm
              event.target.playVideo();
              if (hasInteractedRef.current && sound && volume > 0.001) {
                event.target.unMute();
                event.target.setVolume(Math.round(volume * 100));
                setIsPlaying(true);
              }
            },
            onStateChange: (event) => {
              if (event.data === window.YT.PlayerState.PLAYING) {
                if (hasInteractedRef.current && sound && volume > 0.001) {
                  try {
                    event.target.unMute();
                    event.target.setVolume(Math.round(volume * 100));
                  } catch {}
                }
                setIsPlaying(true);
              } else if (event.data === window.YT.PlayerState.PAUSED) {
                setIsPlaying(false);
              } else if (event.data === window.YT.PlayerState.ENDED) {
                handleTrackEnded();
              }
            }
          }
        });
      } catch (err) {
        console.warn('Cannot init YT Player:', err);
      }
    });

    return () => {
      isMounted = false;
      if (ytPlayerRef.current) {
        try { ytPlayerRef.current.destroy(); } catch {}
        ytPlayerRef.current = null;
      }
    };
  }, [activeTrack?.url, config?.enabled, config?.playMode, parsed?.videoId]);

  // 4. Đồng bộ âm lượng khi thay đổi
  useEffect(() => {
    const isMuted = !config?.enabled || !sound || volume <= 0.001;

    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.pause();
      } else {
        audioRef.current.volume = Math.max(0, Math.min(1, volume));
        audioRef.current.play().catch(() => {});
      }
    }

    if (ytPlayerRef.current && ytPlayerRef.current.setVolume) {
      try {
        if (isMuted) {
          ytPlayerRef.current.pauseVideo();
        } else {
          ytPlayerRef.current.unMute();
          ytPlayerRef.current.setVolume(Math.round(volume * 100));
          ytPlayerRef.current.playVideo();
        }
      } catch {}
    }
  }, [config?.enabled, sound, volume]);

  if (!config || !config.enabled || !activeTrack) return null;

  const isExternalEmbed = parsed?.source === 'youtube' || parsed?.source === 'spotify' || parsed?.source === 'zingmp3' || parsed?.source === 'soundcloud';

  return (
    <>
      {/* 1. Direct Audio (Hoàn toàn ẩn ngầm, phát chuẩn 100%) */}
      {parsed?.source === 'direct' && (
        <audio
          ref={audioRef}
          src={parsed.directUrl}
          loop={config.playMode === 'single'}
          onEnded={handleTrackEnded}
          onError={handleTrackError}
          preload="auto"
          autoPlay
          style={{display: 'none'}}
        />
      )}

      {/* 2. YouTube / Spotify / Zing MP3 (Ẩn hoàn toàn 100% trong khung nhìn, không hiển thị video) */}
      {isExternalEmbed && (
        <div
          style={{
            position: 'fixed',
            bottom: '0px',
            right: '0px',
            width: '1px',
            height: '1px',
            opacity: 0.001,
            pointerEvents: 'none',
            zIndex: -9999,
            overflow: 'hidden'
          }}
        >
          {/* Khung nhúng YouTube Player */}
          {parsed?.source === 'youtube' && (
            <div
              id="yt-bg-audio-slot"
              ref={containerRef}
              style={{width: '200px', height: '200px'}}
            />
          )}

          {/* Khung nhúng Spotify / Zing MP3 */}
          {parsed?.source !== 'youtube' && parsed?.embedUrl && (
            <iframe
              title="External Music Widget"
              src={parsed.embedUrl}
              allow="autoplay; encrypted-media"
              style={{border: 0, width: '200px', height: '200px'}}
            />
          )}
        </div>
      )}
    </>
  );
}


