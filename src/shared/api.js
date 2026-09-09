export const API_URL=import.meta.env.VITE_API_URL||'/api';
export const api=async(path,{token,...options}={})=>{
 const headers={'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})};
 if(path.startsWith('/games/')&&options.method==='POST')headers['X-Idempotency-Key']=crypto.randomUUID();
 let response=await fetch(API_URL+path,{...options,headers}),data=await response.json().catch(()=>({}));
 if(response.status===401&&token&&localStorage.getItem('goldzone_refresh')){
  const refreshed=await fetch(API_URL+'/auth/refresh',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({refreshToken:localStorage.getItem('goldzone_refresh')})});
  if(refreshed.ok){const session=await refreshed.json();localStorage.setItem('goldzone_token',session.token);localStorage.setItem('goldzone_refresh',session.refreshToken);window.dispatchEvent(new CustomEvent('goldzone:token',{detail:session.token}));response=await fetch(API_URL+path,{...options,headers:{...headers,Authorization:`Bearer ${session.token}`}});data=await response.json().catch(()=>({}))}
 }
 if(!response.ok)throw new Error(data.error||'Không thể kết nối máy chủ');return data;
};
