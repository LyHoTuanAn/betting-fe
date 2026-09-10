import {useState} from 'react';
import {Coins} from 'lucide-react';
import {GoldAmbient} from './GoldAmbient.jsx';
import {api} from './api.js';

export function AuthScreen({onAuthenticated}){
 const [mode,setMode]=useState('login'),[form,setForm]=useState({username:'',password:'',displayName:''}),[error,setError]=useState(''),[loading,setLoading]=useState(false);
 const submit=async e=>{e.preventDefault();setLoading(true);setError('');try{const data=await api(`/auth/${mode}`,{method:'POST',body:JSON.stringify(form)});onAuthenticated(data)}catch(err){setError(err.display || err.message)}finally{setLoading(false)}};
 return <div className="authScreen"><GoldAmbient/><div className="authCard"><div className="authCoin"><Coins/></div><small>GOLDZONE</small><h1>{mode==='login'?'Chào mừng trở lại':'Tạo tài khoản mới'}</h1><p>Kho báu và những cuộc chơi đang chờ bạn.</p><form onSubmit={submit}>{mode==='register'&&<label>Tên hiển thị<input value={form.displayName} onChange={e=>setForm({...form,displayName:e.target.value})} placeholder="Tên của bạn" autoComplete="name"/></label>}<label>Tên đăng nhập<input value={form.username} onChange={e=>setForm({...form,username:e.target.value})} placeholder="player123" autoComplete="username"/></label><label>Mật khẩu<input type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="Tối thiểu 8 ký tự" autoComplete={mode==='login'?'current-password':'new-password'}/></label>{error&&<div className="formError">{error}</div>}<button className="authSubmit" disabled={loading}>{loading?'ĐANG XỬ LÝ':mode==='login'?'ĐĂNG NHẬP':'TẠO TÀI KHOẢN'}</button></form><button className="authSwitch" onClick={()=>{setMode(mode==='login'?'register':'login');setError('')}}>{mode==='login'?'Chưa có tài khoản? Đăng ký ngay':'Đã có tài khoản? Đăng nhập'}</button></div></div>;
}
