const PRELOAD_GAME_ASSETS = [
 '/assets/home-banner.webp',
 '/assets/home-avatar.webp',
 '/assets/home-slot.webp',
 '/assets/home-dice.webp',
 '/assets/home-fish.webp',
 '/assets/slot-bg.webp',
 '/assets/fish-real-bg.webp',
 '/assets/fish-cannon-real.webp',
 '/assets/fish-real-clown.webp',
 '/assets/fish-real-blue.webp',
 '/assets/fish-real-lion.webp',
 '/assets/fish-real-arowana.webp',
 '/assets/fish-real-manta.webp',
 '/assets/fish-real-turtle.webp',
 '/assets/fish-real-squid.webp',
 '/assets/fish-real-shark.webp',
 '/assets/fish-real-dragon.webp',
 '/assets/fish-real-dragoncarp.webp',
 '/assets/fish-real-mermaid.webp'
];
if(typeof window !== 'undefined'){
 PRELOAD_GAME_ASSETS.forEach(src => {
  const img = new Image();
  img.decoding = 'async';
  img.src = src;
 });
}
