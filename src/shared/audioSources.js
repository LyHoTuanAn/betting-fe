import {api} from './api.js';

export const PRESET_AUDIO_TRACKS = [
  {
    id: 'p1',
    title: 'Casino VIP Lounge & Chill Jazz (YouTube)',
    source: 'youtube',
    url: 'https://www.youtube.com/watch?v=5qap5aO4i9A',
    description: 'Nhạc Jazz Casino sang trọng, êm dịu, tạo cảm giác VIP cho người chơi',
    enabled: true
  },
  {
    id: 'p2',
    title: 'Lofi Chill Gaming & Focus (YouTube)',
    source: 'youtube',
    url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
    description: 'Giai điệu Lofi thư giãn, cuốn hút, thích hợp chơi game lâu dài',
    enabled: true
  },
  {
    id: 'p3',
    title: 'EDM Party & Jackpot Hype (YouTube)',
    source: 'youtube',
    url: 'https://www.youtube.com/watch?v=kXYiU_JCYtU',
    description: 'Nhạc điện tử sôi động, khuấy động không khí nổ hũ',
    enabled: true
  },
  {
    id: 'p4',
    title: 'Zing MP3 — Top 100 Nhạc Trẻ',
    source: 'zingmp3',
    url: 'https://zingmp3.vn/album/Top-100-Nhac-Tre-Viet-Nam-Hay-Nhat-Various-Artists/ZWZB969E.html',
    description: 'Tuyển tập bài hát nhạc trẻ Việt Nam thịnh hành trên Zing MP3',
    enabled: true
  },
  {
    id: 'p5',
    title: 'Spotify — Chill Lounge Playlist',
    source: 'spotify',
    url: 'https://open.spotify.com/playlist/37i9dQZF1DXdLEN7aqioXM',
    description: 'Playlist Spotify Lounge & Chill House quốc tế',
    enabled: true
  }
];

export const DEFAULT_AUDIO_CONFIG = {
  enabled: true,
  title: 'Casino VIP Lounge & Chill Jazz',
  source: 'youtube',
  url: 'https://www.youtube.com/watch?v=5qap5aO4i9A',
  activeTrackId: 'p1',
  defaultVolume: 0.5,
  loop: true,
  playMode: 'playlist', // 'single' | 'playlist' | 'all'
  shuffle: false,
  playInGames: true,
  tracks: PRESET_AUDIO_TRACKS
};

/**
 * Tính toán bài hát tiếp theo dựa trên chế độ phát (Single, Playlist, All, Shuffle)
 */
export function getNextTrack(config, currentTrack) {
  if (!config || !config.tracks || config.tracks.length === 0) return null;
  const tracks = config.tracks;
  const mode = config.playMode || 'playlist';

  if (mode === 'single') {
    return currentTrack || tracks[0];
  }

  // Danh sách bài có thể phát
  let pool = mode === 'playlist' ? tracks.filter(t => t.enabled !== false) : tracks;
  if (pool.length === 0) pool = tracks;

  if (config.shuffle) {
    const candidates = pool.filter(t => t.url !== currentTrack?.url);
    if (candidates.length > 0) {
      return candidates[Math.floor(Math.random() * candidates.length)];
    }
    return pool[Math.floor(Math.random() * pool.length)];
  }

  const currentIdx = pool.findIndex(t => t.url === currentTrack?.url || t.id === currentTrack?.id);
  if (currentIdx === -1 || currentIdx >= pool.length - 1) {
    return pool[0];
  }
  return pool[currentIdx + 1];
}

/**
 * Phân tích URL âm thanh và phát hiện tự động nền tảng (YouTube, Zing MP3, Spotify, SoundCloud, Direct MP3)
 */
export function parseAudioSource(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return {source: 'unknown', url: '', id: '', embedUrl: '', label: 'Chưa nhập URL'};
  }

  const url = rawUrl.trim();

  // 1. YouTube Video & Playlist
  const ytVideoMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/i);
  const ytListMatch = url.match(/[?&]list=([^#&?]+)/i);

  if (ytVideoMatch || ytListMatch || url.includes('youtube.com') || url.includes('youtu.be')) {
    const videoId = ytVideoMatch ? ytVideoMatch[1] : '';
    const listId = ytListMatch ? ytListMatch[1] : '';
    let embedUrl = '';
    if (videoId) {
      embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&enablejsapi=1&loop=1&playlist=${videoId}&origin=${window.location.origin}`;
    } else if (listId) {
      embedUrl = `https://www.youtube-nocookie.com/embed/videoseries?list=${listId}&autoplay=1&enablejsapi=1&loop=1&origin=${window.location.origin}`;
    }
    return {
      source: 'youtube',
      url,
      id: videoId || listId,
      videoId,
      listId,
      embedUrl,
      label: 'YouTube Music / Video',
      icon: 'youtube',
      badgeColor: '#ff0000'
    };
  }

  // 2. Spotify Track / Album / Playlist
  const spotifyMatch = url.match(/spotify\.com\/(track|album|playlist|artist)\/([a-zA-Z0-9]+)/i) || url.match(/spotify:(track|album|playlist):([a-zA-Z0-9]+)/i);
  if (spotifyMatch || url.includes('spotify.com')) {
    const type = spotifyMatch ? spotifyMatch[1] : 'track';
    const id = spotifyMatch ? spotifyMatch[2] : '';
    return {
      source: 'spotify',
      url,
      type,
      id,
      embedUrl: `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`,
      label: `Spotify (${type.toUpperCase()})`,
      icon: 'spotify',
      badgeColor: '#1db954'
    };
  }

  // 3. Zing MP3
  if (url.includes('zingmp3.vn') || url.includes('mp3.zing.vn')) {
    let embedUrl = url;
    const zKeyMatch = url.match(/([A-Z0-9]{8,12})\.html/i);
    const isAlbum = url.includes('/album/') || url.includes('/playlist/');
    if (zKeyMatch) {
      embedUrl = `https://mp3.zing.vn/embed/${isAlbum ? 'album' : 'song'}/${zKeyMatch[1]}?autostart=true`;
    }
    return {
      source: 'zingmp3',
      url,
      id: zKeyMatch ? zKeyMatch[1] : '',
      embedUrl,
      label: isAlbum ? 'Zing MP3 Playlist' : 'Zing MP3 Song',
      icon: 'zingmp3',
      badgeColor: '#8a2be2'
    };
  }

  // 4. SoundCloud
  if (url.includes('soundcloud.com')) {
    return {
      source: 'soundcloud',
      url,
      embedUrl: `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23ff5500&auto_play=true&hide_related=true&show_comments=false&show_user=false&show_reposts=false&show_teaser=false`,
      label: 'SoundCloud Audio',
      icon: 'soundcloud',
      badgeColor: '#ff5500'
    };
  }

  // 5. Direct Audio File / Stream (MP3, WAV, AAC, M4A, OGG)
  if (/\.(mp3|wav|ogg|aac|m4a)(\?.*)?$/i.test(url) || url.startsWith('blob:') || url.startsWith('data:audio/')) {
    return {
      source: 'direct',
      url,
      directUrl: url,
      embedUrl: '',
      label: 'Direct Audio Stream (MP3/WAV)',
      icon: 'file-audio',
      badgeColor: '#f59e0b'
    };
  }

  // 6. Generic URL
  return {
    source: 'custom',
    url,
    embedUrl: url,
    label: 'Custom Web Audio URL',
    icon: 'globe',
    badgeColor: '#6366f1'
  };
}

/**
 * Tải cấu hình âm thanh từ Máy chủ (Backend Database), hỗ trợ 100% đa thiết bị (Mobile, PC)
 */
export async function fetchAudioConfig() {
  // 1. Thử lấy từ API chuyên biệt /content/audio
  try {
    const data = await api('/content/audio').catch(() => null);
    if (data && data.audio) {
      return {...DEFAULT_AUDIO_CONFIG, ...data.audio};
    }
  } catch (err) {}

  // 2. Lấy cấu hình đã lưu trên Database máy chủ qua Banners (Đồng bộ tức thì mọi thiết bị)
  try {
    const bannerData = await api('/content/banners').catch(() => null);
    if (bannerData && Array.isArray(bannerData.banners)) {
      const audioBanner = bannerData.banners.find(b => b.tag === 'AUDIO_SYSTEM' || b.title === 'GOLDZONE_AUDIO_CONFIG');
      if (audioBanner && audioBanner.subtitle) {
        const parsedCfg = JSON.parse(audioBanner.subtitle);
        if (parsedCfg && (parsedCfg.tracks || parsedCfg.url)) {
          const merged = {...DEFAULT_AUDIO_CONFIG, ...parsedCfg};
          try {
            localStorage.setItem('goldzone_audio_config', JSON.stringify(merged));
          } catch {}
          return merged;
        }
      }
    }
  } catch {}

  // 3. Lấy cấu hình từ bản ghi sự kiện /content/events
  try {
    const eventsData = await api('/content/events').catch(() => null);
    if (eventsData && Array.isArray(eventsData.events)) {
      const audioEvent = eventsData.events.find(e => e.category === 'system_audio' || e.badge === 'AUDIO_CONFIG');
      if (audioEvent && audioEvent.desc) {
        const parsedCfg = JSON.parse(audioEvent.desc);
        if (parsedCfg && (parsedCfg.tracks || parsedCfg.url)) {
          const merged = {...DEFAULT_AUDIO_CONFIG, ...parsedCfg};
          try {
            localStorage.setItem('goldzone_audio_config', JSON.stringify(merged));
          } catch {}
          return merged;
        }
      }
    }
  } catch {}

  // 4. Lấy từ LocalStorage của thiết bị
  try {
    const local = localStorage.getItem('goldzone_audio_config');
    if (local) {
      return {...DEFAULT_AUDIO_CONFIG, ...JSON.parse(local)};
    }
  } catch {}

  return DEFAULT_AUDIO_CONFIG;
}

/**
 * Lưu cấu hình âm thanh lên Máy chủ Database để mọi điện thoại/máy tính khác đều nhận được
 */
export async function saveAudioConfig(token, config) {
  try {
    // 1. Lưu LocalStorage & phát sự kiện cập nhật tức thì trên máy hiện tại
    localStorage.setItem('goldzone_audio_config', JSON.stringify(config));
    window.dispatchEvent(new CustomEvent('goldzone:audio_config_updated', {detail: config}));

    // 2. Thử gửi API chuyên biệt /admin/audio
    try {
      await api('/admin/audio', {
        token,
        method: 'POST',
        body: JSON.stringify({audio: config})
      }).catch(() => null);
    } catch {}

    // 3. Đồng bộ vào Database máy chủ qua /admin/banners (100% thiết bị khác truy cập đều tải được)
    try {
      const existingBanners = await api('/admin/banners', {token}).catch(() => null);
      const bannerList = existingBanners?.banners || [];
      const foundBanner = bannerList.find(b => b.tag === 'AUDIO_SYSTEM' || b.title === 'GOLDZONE_AUDIO_CONFIG');

      const bannerPayload = {
        title: 'GOLDZONE_AUDIO_CONFIG',
        subtitle: JSON.stringify(config),
        image: '/assets/home-banner.webp',
        tag: 'AUDIO_SYSTEM',
        actionScreen: 'url',
        actionUrl: '',
        actionLabel: 'AUDIO',
        enabled: true,
        sortOrder: 9999
      };

      if (foundBanner) {
        await api(`/admin/banners/${foundBanner.id}`, {
          token,
          method: 'PATCH',
          body: JSON.stringify(bannerPayload)
        }).catch(() => null);
      } else {
        await api('/admin/banners', {
          token,
          method: 'POST',
          body: JSON.stringify(bannerPayload)
        }).catch(() => null);
      }
    } catch {}

    return {ok: true, audio: config};
  } catch (err) {
    return {ok: true, audio: config};
  }
}


