const API_URL = import.meta.env.VITE_API_URL || '/api';

// Khóa lưu riêng: đăng xuất khỏi trang quản trị không được đá văng phiên chơi
// game đang mở ở tab khác, và ngược lại.
const TOKEN_KEY = 'goldzone_admin_token';
const REFRESH_KEY = 'goldzone_admin_refresh';

export const session = {
  get token() { return localStorage.getItem(TOKEN_KEY); },
  save(data) { localStorage.setItem(TOKEN_KEY, data.token); localStorage.setItem(REFRESH_KEY, data.refreshToken); },
  clear() { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(REFRESH_KEY); }
};

async function request(path, options = {}) {
  const token = session.token;
  const headers = {'Content-Type': 'application/json', ...(token ? {Authorization: `Bearer ${token}`} : {})};
  let response = await fetch(API_URL + path, {...options, headers});
  let data = await response.json().catch(() => ({}));

  // Access token chỉ sống 15 phút, còn admin thường mở bảng điều khiển cả buổi,
  // nên một lần 401 được đổi token rồi phát lại đúng một lần.
  if (response.status === 401 && localStorage.getItem(REFRESH_KEY)) {
    const refreshed = await fetch(API_URL + '/auth/refresh', {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({refreshToken: localStorage.getItem(REFRESH_KEY)})
    });
    if (!refreshed.ok) { session.clear(); throw new ApiError('Phiên đăng nhập đã hết hạn', 'SESSION_EXPIRED'); }
    const next = await refreshed.json();
    session.save(next);
    response = await fetch(API_URL + path, {...options, headers: {...headers, Authorization: `Bearer ${next.token}`}});
    data = await response.json().catch(() => ({}));
  }

  if (!response.ok) throw new ApiError(data.error || 'Không thể kết nối máy chủ', data.code);
  return data;
}

class ApiError extends Error {
  constructor(message, code) { super(message); this.code = code; }
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, {method: 'POST', body: JSON.stringify(body ?? {})}),
  patch: (path, body) => request(path, {method: 'PATCH', body: JSON.stringify(body)}),
  login: async (username, password) => {
    const data = await request('/auth/login', {method: 'POST', body: JSON.stringify({username, password})});
    if (data.user.role !== 'ADMIN') throw new ApiError('Tài khoản này không có quyền quản trị', 'ADMIN_REQUIRED');
    session.save(data);
    return data.user;
  },
  logout: () => { session.clear(); }
};

export const money = (n) => new Intl.NumberFormat('vi-VN').format(Math.round(Number(n) || 0));
export const percent = (n, digits = 2) => n == null ? '—' : `${(Number(n) * 100).toFixed(digits)}%`;
export const when = (value) => new Date(value).toLocaleString('vi-VN', {day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'});
