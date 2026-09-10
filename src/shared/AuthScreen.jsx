import {useState} from 'react';
import {AlertCircle, CheckCircle2, Coins, Eye, EyeOff, Lock, User, UserCheck} from 'lucide-react';
import {GoldAmbient} from './GoldAmbient.jsx';
import {api} from './api.js';

export function AuthScreen({onAuthenticated}) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    displayName: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const validate = () => {
    const errors = {};
    const cleanUsername = form.username.trim();
    const cleanPassword = form.password;
    const cleanDisplayName = form.displayName.trim();

    // 1. Kiểm tra Tên đăng nhập
    if (!cleanUsername) {
      errors.username = 'Vui lòng nhập tên đăng nhập';
    } else if (cleanUsername.length < 3) {
      errors.username = 'Tên đăng nhập phải có tối thiểu 3 ký tự';
    } else if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
      errors.username = 'Tên đăng nhập chỉ gồm chữ, số và dấu gạch dưới (không chứa khoảng trắng)';
    }

    // 2. Kiểm tra Mật khẩu
    if (!cleanPassword) {
      errors.password = 'Vui lòng nhập mật khẩu';
    } else if (cleanPassword.length < 8) {
      errors.password = 'Mật khẩu phải có tối thiểu 8 ký tự';
    }

    // 3. Quy tắc riêng cho Đăng Ký
    if (mode === 'register') {
      if (!cleanDisplayName) {
        errors.displayName = 'Vui lòng nhập tên hiển thị';
      } else if (cleanDisplayName.length < 2) {
        errors.displayName = 'Tên hiển thị phải có ít nhất 2 ký tự';
      }

      if (!form.confirmPassword) {
        errors.confirmPassword = 'Vui lòng nhập lại mật khẩu xác nhận';
      } else if (cleanPassword !== form.confirmPassword) {
        errors.confirmPassword = 'Mật khẩu xác nhận không khớp với mật khẩu đã nhập';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const mapServerError = (err) => {
    const raw = (err.message || '').toLowerCase();
    if (raw.includes('already exists') || raw.includes('tồn tại') || raw.includes('duplicate')) {
      return 'Tên đăng nhập này đã được sử dụng. Vui lòng chọn tên khác.';
    }
    if (raw.includes('invalid') || raw.includes('không chính xác') || raw.includes('unauthorized') || raw.includes('401')) {
      return 'Tên đăng nhập hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.';
    }
    if (raw.includes('password') && (raw.includes('short') || raw.includes('8'))) {
      return 'Mật khẩu không hợp lệ, yêu cầu tối thiểu 8 ký tự.';
    }
    return err.display || err.message || 'Không thể kết nối máy chủ. Vui lòng thử lại.';
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setError('');
    try {
      const payload = {
        username: form.username.trim().toLowerCase(),
        password: form.password
      };
      if (mode === 'register') {
        payload.displayName = form.displayName.trim();
      }

      const data = await api(`/auth/${mode}`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      onAuthenticated(data);
    } catch (err) {
      setError(mapServerError(err));
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (targetMode) => {
    setMode(targetMode);
    setError('');
    setFieldErrors({});
    setForm({
      username: form.username,
      password: '',
      confirmPassword: '',
      displayName: form.displayName
    });
  };

  const getPasswordStrength = (pass) => {
    if (!pass) return {label: '', color: ''};
    if (pass.length < 8) return {label: 'Quá ngắn (tối thiểu 8 ký tự)', color: '#f87171'};
    if (pass.length < 10) return {label: 'Mức độ: Vừa', color: '#fbbf24'};
    return {label: 'Mức độ: Mạnh & An toàn', color: '#34d399'};
  };

  const strength = mode === 'register' ? getPasswordStrength(form.password) : null;

  return (
    <div className="authScreen">
      <GoldAmbient />
      <div className="authCard">
        <div className="authCoin">
          <Coins />
        </div>
        <small>GOLDZONE CASINO</small>
        <h1>{mode === 'login' ? 'Đăng Nhập Tài Khoản' : 'Đăng Ký Tài Khoản'}</h1>
        <p>{mode === 'login' ? 'Đăng nhập để trải nghiệm kho game đỉnh cao.' : 'Tạo tài khoản nhận ngay ngập tràn quà tặng tân thủ.'}</p>

        {error && (
          <div className="formErrorBox">
            <AlertCircle size={18} className="errorIcon" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={submit} noValidate>
          {mode === 'register' && (
            <div className={`authFieldWrap ${fieldErrors.displayName ? 'hasError' : ''}`}>
              <label>
                <span>Tên hiển thị (Nickname)</span>
                <div className="authInputRow">
                  <UserCheck size={18} className="inputIcon" />
                  <input
                    value={form.displayName}
                    onChange={e => {
                      setForm({...form, displayName: e.target.value});
                      if (fieldErrors.displayName) setFieldErrors({...fieldErrors, displayName: null});
                    }}
                    placeholder="Ví dụ: Thần Bài Hoàng Kim"
                    autoComplete="name"
                    maxLength={32}
                  />
                </div>
              </label>
              {fieldErrors.displayName && <p className="fieldErrorText">{fieldErrors.displayName}</p>}
            </div>
          )}

          <div className={`authFieldWrap ${fieldErrors.username ? 'hasError' : ''}`}>
            <label>
              <span>Tên đăng nhập</span>
              <div className="authInputRow">
                <User size={18} className="inputIcon" />
                <input
                  value={form.username}
                  onChange={e => {
                    setForm({...form, username: e.target.value});
                    if (fieldErrors.username) setFieldErrors({...fieldErrors, username: null});
                  }}
                  placeholder="Từ 3 ký tự (vd: player888)"
                  autoComplete="username"
                  autoCapitalize="none"
                  maxLength={30}
                />
              </div>
            </label>
            {fieldErrors.username && <p className="fieldErrorText">{fieldErrors.username}</p>}
          </div>

          <div className={`authFieldWrap ${fieldErrors.password ? 'hasError' : ''}`}>
            <label>
              <span>Mật khẩu</span>
              <div className="authInputRow">
                <Lock size={18} className="inputIcon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => {
                    setForm({...form, password: e.target.value});
                    if (fieldErrors.password) setFieldErrors({...fieldErrors, password: null});
                  }}
                  placeholder="Tối thiểu 8 ký tự"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  className="eyeBtn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>
            {fieldErrors.password && <p className="fieldErrorText">{fieldErrors.password}</p>}
            {strength && strength.label && (
              <p className="strengthText" style={{color: strength.color}}>
                {strength.label}
              </p>
            )}
          </div>

          {mode === 'register' && (
            <div className={`authFieldWrap ${fieldErrors.confirmPassword ? 'hasError' : ''}`}>
              <label>
                <span>Xác nhận lại mật khẩu</span>
                <div className="authInputRow">
                  <Lock size={18} className="inputIcon" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={form.confirmPassword}
                    onChange={e => {
                      setForm({...form, confirmPassword: e.target.value});
                      if (fieldErrors.confirmPassword) setFieldErrors({...fieldErrors, confirmPassword: null});
                    }}
                    placeholder="Nhập lại chính xác mật khẩu trên"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="eyeBtn"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? 'Ẩn mật khẩu xác nhận' : 'Hiện mật khẩu xác nhận'}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </label>
              {fieldErrors.confirmPassword && <p className="fieldErrorText">{fieldErrors.confirmPassword}</p>}
            </div>
          )}

          <button className="authSubmit" type="submit" disabled={loading}>
            {loading ? 'ĐANG XỬ LÝ...' : mode === 'login' ? 'ĐĂNG NHẬP NGAY' : 'TẠO TÀI KHOẢN MIỄN PHÍ'}
          </button>
        </form>

        <button
          className="authSwitch"
          type="button"
          onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
        >
          {mode === 'login' ? 'Chưa có tài khoản? 👉 Đăng ký ngay' : 'Đã có tài khoản? 👉 Đăng nhập'}
        </button>
      </div>
    </div>
  );
}

