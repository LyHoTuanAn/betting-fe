import {useEffect, useState} from 'react';
import {LogOut, X} from 'lucide-react';
import {api} from './api.js';
import {money} from './format.js';
import {Popup, usePopup} from './Popup.jsx';
import {WalletView} from './WalletView.jsx';

export function AccountPanel({view,onClose,user,token,setUser,onLogout}){
 // Kết quả lưu hồ sơ và yêu cầu nạp/rút đều báo bằng popup.
 const notice=usePopup();
 const setMessage=text=>notice.show(text, /lỗi|không|thất bại/i.test(text)?'fail':'ok');
 const [items,setItems]=useState([]),[name,setName]=useState(user.displayName);
 useEffect(()=>{if(view==='history')api('/transactions',{token}).then(data=>setItems(data.items)).catch(err=>setMessage(err.display || err.message))},[view,token]);
 const save=async()=>{try{const data=await api('/me',{token,method:'PATCH',body:JSON.stringify({displayName:name})});setUser(data.user);setMessage('Đã lưu hồ sơ')}catch(err){setMessage(err.display || err.message)}};
 // Số dư đổi sau khi rút/nạp: đồng bộ lại người dùng để topbar hiện đúng.
 const syncBalance=balance=>setUser(current=>current?{...current,balance}:current);
 return <div className="panelBackdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><section className="accountPanel"><button className="panelClose" onClick={onClose}><X/></button>{view==='history'?<><h2>Lịch sử giao dịch</h2><p className="panelLead">100 giao dịch gần nhất</p><div className="transactionList">{items.length?items.map(item=><article key={item.id}><div><strong>{item.description}</strong><small>{new Date(item.createdAt).toLocaleString('vi-VN')}</small></div><span className={item.amount>=0?'positive':'negative'}>{item.amount>=0?'+':''}{money(item.amount)}</span></article>):<div className="emptyState">Chưa có giao dịch</div>}</div></>:view==='wallet'?<WalletView token={token} onBalanceChange={syncBalance} notify={(text,tone)=>notice.show(text,tone||'ok')}/>:<><div className="profileHero"><img src="/assets/home-avatar.webp" alt="Ảnh đại diện" loading="eager" decoding="async"/><div><small>THÀNH VIÊN</small><h2>{user.displayName}</h2><p>@{user.username}</p></div></div><label className="profileField">Tên hiển thị<input value={name} onChange={e=>setName(e.target.value)}/></label><button className="panelAction" onClick={save}>Lưu thay đổi</button><button className="logoutBtn" onClick={onLogout}><LogOut/> Đăng xuất</button></>}<Popup popup={notice.popup} onClose={notice.close}/></section></div>;
}
