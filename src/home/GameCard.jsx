import {ChevronRight} from 'lucide-react';

export function GameCard({type,title,sub,onClick}){return <article className={'gameCard '+type}><button className="cardHit" aria-label={'Mở '+title} onClick={onClick}><div className="cardArt"><img src={`/assets/home-${type}.webp`} alt={title} loading="eager" decoding="async"/></div><div className="cardInfo"><div><h3>{title}</h3><p>{sub}</p></div><span className="playBtn">CHƠI NGAY <ChevronRight/></span></div></button></article>}
