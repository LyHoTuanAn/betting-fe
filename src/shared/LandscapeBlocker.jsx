import { useEffect } from 'react';
import { Smartphone, RotateCcw } from 'lucide-react';

export function LandscapeBlocker() {
  useEffect(() => {
    const lockPortrait = async () => {
      try {
        if (window.screen?.orientation?.lock) {
          await window.screen.orientation.lock('portrait');
        }
      } catch (_) {}
    };

    lockPortrait();
    window.addEventListener('orientationchange', lockPortrait);
    return () => window.removeEventListener('orientationchange', lockPortrait);
  }, []);

  return (
    <div className="portraitLockOverlay" role="dialog" aria-modal="true">
      <div className="portraitLockCard">
        <div className="portraitLockIconWrap">
          <Smartphone className="portraitPhoneIcon" size={44} />
          <RotateCcw className="portraitRotateIcon" size={20} />
        </div>
        <h2 className="portraitLockTitle">VUI LÒNG XOAY DỌC THIẾT BỊ</h2>
        <p className="portraitLockSub">
          Trò chơi được thiết kế tối ưu cho chế độ màn hình dọc trên điện thoại.
        </p>
        <div className="portraitBadge">
          <span>📱 KHÓA MÀN HÌNH DỌC (PORTRAIT ONLY)</span>
        </div>
      </div>
    </div>
  );
}
