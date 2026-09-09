// Must mirror the server's zod schemas in goldzone-be/src/routes/game.routes.ts
// (and the WS shoot guard in server.ts); anything outside these ranges is
// rejected with a bare "Dữ liệu không hợp lệ".
export const BET_LIMITS={slot:{min:1000,max:1000000},dice:{min:1000,max:10000000},fish:{min:100,max:10000},wallet:{min:50000,max:100000000}};
