/** Khóa game của server ánh xạ sang màn hình của client; cả sảnh lẫn router đều cần. */
export const GAME_SCREEN={SLOT:'slot',DICE:'dice',FISH:'fish'};
/**
 * Dùng khi chưa gọi được catalog: sảnh vẫn có game để vào, và một game admin
 * đã tắt thì server chặn ngay ở lượt cược đầu tiên kèm lý do.
 */
export const FALLBACK_GAMES=[
 {key:'SLOT',name:'NỔ HŨ HOÀNG KIM',subtitle:'Kho báu đang chờ bạn'},
 {key:'DICE',name:'ĐẠI CHIẾN TÀI XỈU',subtitle:'Thử vận may ngay'},
 {key:'FISH',name:'BẮN CÁ ĐẠI DƯƠNG',subtitle:'Chinh phục thủy cung'}
];
