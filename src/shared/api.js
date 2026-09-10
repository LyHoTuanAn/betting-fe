export const API_URL=import.meta.env.VITE_API_URL||'/api';

/**
 * Lỗi API mang đủ ngữ cảnh để màn hình quyết định được: `status` để biết có phải
 * hết phiên hay không, `code` để bắt đúng trường hợp, `details` là danh sách lỗi
 * từng trường do server trả về.
 */
export class ApiError extends Error{
 constructor(message,{status=0,code='UNKNOWN',details=null,requestId=''}={}){
  super(message);this.name='ApiError';this.status=status;this.code=code;this.details=details;this.requestId=requestId;
 }
 /** Câu đầy đủ để hiển thị: kèm mã tra cứu khi là lỗi máy chủ. */
 get display(){return this.requestId&&this.status>=500?`${this.message} (mã lỗi: ${this.requestId.slice(0,8)})`:this.message}
}

const NETWORK_ERROR='Không kết nối được máy chủ. Kiểm tra kết nối mạng rồi thử lại.';

/** HTTP status không kèm thân JSON thì tự dịch sang câu người dùng hiểu được. */
const statusMessage=status=>
 status===0?NETWORK_ERROR
 :status===401?'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.'
 :status===403?'Bạn không có quyền thực hiện thao tác này.'
 :status===404?'Không tìm thấy chức năng này trên máy chủ.'
 :status===408||status===504?'Máy chủ phản hồi quá lâu, vui lòng thử lại.'
 :status===413?'Dữ liệu gửi lên quá lớn.'
 :status===429?'Bạn thao tác quá nhanh, vui lòng chờ một lát.'
 :status===502||status===503?'Máy chủ đang bảo trì hoặc quá tải, vui lòng thử lại sau ít phút.'
 :`Máy chủ trả về lỗi ${status}.`;

/** Ghép thông báo chính với chi tiết từng trường để người dùng biết sửa ở đâu. */
const messageOf=(data,status)=>{
 const base=data?.error||statusMessage(status);
 const details=Array.isArray(data?.details)?data.details.map(item=>item?.message).filter(Boolean):[];
 const extra=details.filter(message=>message!==base);
 return extra.length?`${base} (${extra.join('; ')})`:base;
};

const parse=async response=>{
 const body=await response.text().catch(()=>'');
 if(!body)return null;
 try{return JSON.parse(body)}catch{return null} // 502/504 của proxy trả HTML, không phải JSON
};

const send=async(path,options)=>{
 try{return await fetch(API_URL+path,options)}
 catch{throw new ApiError(NETWORK_ERROR,{status:0,code:'NETWORK_ERROR'})}
};

export const api=async(path,{token,...options}={})=>{
 const headers={'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})};
 if(path.startsWith('/games/')&&options.method==='POST')headers['X-Idempotency-Key']=crypto.randomUUID();
 let response=await send(path,{...options,headers}),data=await parse(response);

 if(response.status===401&&token&&localStorage.getItem('goldzone_refresh')){
  const refreshed=await send('/auth/refresh',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({refreshToken:localStorage.getItem('goldzone_refresh')})});
  if(refreshed.ok){
   const session=await refreshed.json();
   localStorage.setItem('goldzone_token',session.token);localStorage.setItem('goldzone_refresh',session.refreshToken);
   window.dispatchEvent(new CustomEvent('goldzone:token',{detail:session.token}));
   response=await send(path,{...options,headers:{...headers,Authorization:`Bearer ${session.token}`}});
   data=await parse(response);
  }else{
   // Refresh hỏng nghĩa là phiên thật sự hết, nói thẳng thay vì lặp lại lỗi 401 của request gốc.
   localStorage.removeItem('goldzone_token');localStorage.removeItem('goldzone_refresh');
   window.dispatchEvent(new CustomEvent('goldzone:token',{detail:null}));
   throw new ApiError('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.',{status:401,code:'SESSION_EXPIRED'});
  }
 }

 if(!response.ok)throw new ApiError(messageOf(data,response.status),{
  status:response.status,code:data?.code||`HTTP_${response.status}`,details:data?.details||null,
  requestId:data?.requestId||response.headers.get('X-Request-Id')||''
 });
 return data??{};
};
