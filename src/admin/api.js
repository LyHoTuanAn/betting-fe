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

/** Giữ nguyên `status`, `code`, `details` và mã tra cứu từ API để màn hình dùng lại. */
export class ApiError extends Error {
  constructor(message, {status = 0, code = 'UNKNOWN', details = null, requestId = ''} = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
  }
  get display() { return this.requestId && this.status >= 500 ? `${this.message} (mã lỗi: ${this.requestId.slice(0, 8)})` : this.message; }
}

const NETWORK_ERROR = 'Không kết nối được máy chủ. Kiểm tra kết nối mạng rồi thử lại.';

const statusMessage = status =>
  status === 0 ? NETWORK_ERROR
  : status === 401 ? 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.'
  : status === 403 ? 'Tài khoản này không có quyền thực hiện thao tác.'
  : status === 404 ? 'Không tìm thấy chức năng này trên máy chủ.'
  : status === 409 ? 'Dữ liệu đã thay đổi, hãy tải lại rồi thử lại.'
  : status === 429 ? 'Thao tác quá nhanh, vui lòng chờ một lát.'
  : status === 502 || status === 503 || status === 504 ? 'Máy chủ đang bảo trì hoặc quá tải, vui lòng thử lại sau ít phút.'
  : `Máy chủ trả về lỗi ${status}.`;

/** Gộp câu chính với chi tiết từng trường, để admin biết ô nào cần sửa. */
const messageOf = (data, status) => {
  const base = data?.error || statusMessage(status);
  const details = Array.isArray(data?.details) ? data.details.map(item => item?.message).filter(Boolean) : [];
  const extra = details.filter(message => message !== base);
  return extra.length ? `${base} (${extra.join('; ')})` : base;
};

// Proxy hoặc server chết trả về HTML/rỗng chứ không phải JSON; đọc dạng text rồi
// mới thử parse để không nuốt mất status thật.
const parse = async response => {
  const body = await response.text().catch(() => '');
  if (!body) return null;
  try { return JSON.parse(body); } catch { return null; }
};

const send = async (path, options) => {
  try { return await fetch(API_URL + path, options); }
  catch { throw new ApiError(NETWORK_ERROR, {status: 0, code: 'NETWORK_ERROR'}); }
};

async function request(path, options = {}) {
  const token = session.token;
  const headers = {'Content-Type': 'application/json', ...(token ? {Authorization: `Bearer ${token}`} : {})};
  let response = await send(path, {...options, headers});
  let data = await parse(response);

  // Access token chỉ sống 15 phút, còn admin thường mở bảng điều khiển cả buổi,
  // nên một lần 401 được đổi token rồi phát lại đúng một lần.
  if (response.status === 401 && localStorage.getItem(REFRESH_KEY)) {
    const refreshed = await send('/auth/refresh', {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({refreshToken: localStorage.getItem(REFRESH_KEY)})
    });
    if (!refreshed.ok) { session.clear(); throw new ApiError('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.', {status: 401, code: 'SESSION_EXPIRED'}); }
    const next = await refreshed.json();
    session.save(next);
    response = await send(path, {...options, headers: {...headers, Authorization: `Bearer ${next.token}`}});
    data = await parse(response);
  }

  if (!response.ok) throw new ApiError(messageOf(data, response.status), {
    status: response.status,
    code: data?.code || `HTTP_${response.status}`,
    details: data?.details || null,
    requestId: data?.requestId || response.headers.get('X-Request-Id') || ''
  });
  return data ?? {};
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, {method: 'POST', body: JSON.stringify(body ?? {})}),
  del: (path) => request(path, {method: 'DELETE'}),
  patch: (path, body) => request(path, {method: 'PATCH', body: JSON.stringify(body)}),
  put: (path, body) => request(path, {method: 'PUT', body: JSON.stringify(body ?? {})}),
  delete: (path) => request(path, {method: 'DELETE'}),
  login: async (username, password) => {
    const data = await request('/auth/login', {method: 'POST', body: JSON.stringify({username, password})});
    if (data.user.role !== 'ADMIN') throw new ApiError('Tài khoản này không có quyền quản trị', {status: 403, code: 'ADMIN_REQUIRED'});
    session.save(data);
    return data.user;
  },
  logout: () => { session.clear(); }
};

export const money = (n) => new Intl.NumberFormat('vi-VN').format(Math.round(Number(n) || 0));
export const percent = (n, digits = 2) => n == null ? '—' : `${(Number(n) * 100).toFixed(digits)}%`;
export const when = (value) => new Date(value).toLocaleString('vi-VN', {day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'});
