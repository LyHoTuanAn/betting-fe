import {useEffect, useMemo, useState} from 'react';
import {
  ArrowDownLeft, ArrowUpRight, CheckCircle2, ChevronRight,
  Clock, Coins, Dice5, Dna, FileText, Filter, Flame,
  Gamepad2, Gift, History, Plus, RefreshCw, Sparkles, Trophy, Wallet, XCircle
} from 'lucide-react';
import {api} from '../shared/api.js';
import {money} from '../shared/format.js';
import {Topbar} from '../shared/Topbar.jsx';
import {Nav} from './Nav.jsx';

const FILTER_TABS = [
  {key: 'all', label: 'Tất cả'},
  {key: 'slot', label: 'Nổ Hũ'},
  {key: 'dice', label: 'Tài Xỉu'},
  {key: 'fish', label: 'Bắn Cá'},
  {key: 'wallet', label: 'Nạp / Rút'}
];

export function HistoryPage({
  setScreen,
  balance,
  sound,
  setSound,
  token,
  openPanel,
  goHome
}) {
  const [items, setItems] = useState([]);
  const [walletRequests, setWalletRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [limit, setLimit] = useState(100);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api('/transactions?limit=' + limit, {token}).catch(() => ({items: []})),
      api('/wallet/requests', {token}).catch(() => ({items: []}))
    ]).then(([txData, walletData]) => {
      setItems(txData.items || []);
      setWalletRequests(walletData.items || []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [token, limit]);

  // Thống kê tổng quan
  const stats = useMemo(() => {
    let totalBet = 0;
    let totalPayout = 0;
    let totalDeposit = 0;
    let totalWithdraw = 0;

    items.forEach(it => {
      const amt = Number(it.amount) || 0;
      if (it.type === 'GAME_BET') {
        totalBet += Math.abs(amt);
      } else if (it.type === 'GAME_PAYOUT') {
        totalPayout += amt;
      } else if (it.type === 'DEPOSIT' || it.type === 'DAILY_BONUS' || it.type === 'WELCOME_BONUS') {
        totalDeposit += amt;
      } else if (it.type === 'WITHDRAW') {
        totalWithdraw += Math.abs(amt);
      }
    });

    const netProfit = totalPayout - totalBet;

    return {
      totalBet,
      totalPayout,
      netProfit,
      count: items.length
    };
  }, [items]);

  // Bộ lọc dữ liệu
  const filteredItems = useMemo(() => {
    if (filter === 'all') return items;
    if (filter === 'slot') return items.filter(it => it.description?.toLowerCase().includes('nổ hũ') || it.description?.toLowerCase().includes('slot'));
    if (filter === 'dice') return items.filter(it => it.description?.toLowerCase().includes('tài xỉu') || it.description?.toLowerCase().includes('dice'));
    if (filter === 'fish') return items.filter(it => it.description?.toLowerCase().includes('bắn cá') || it.description?.toLowerCase().includes('fish'));
    if (filter === 'wallet') {
      return items.filter(it => ['DEPOSIT', 'WITHDRAW', 'DAILY_BONUS', 'WELCOME_BONUS', 'ADJUSTMENT'].includes(it.type));
    }
    return items;
  }, [items, filter]);

  const getItemIcon = (item) => {
    const desc = (item.description || '').toLowerCase();
    const type = item.type;
    if (desc.includes('nổ hũ') || desc.includes('slot')) return <Sparkles className="txIcon slot" />;
    if (desc.includes('tài xỉu') || desc.includes('dice')) return <Dice5 className="txIcon dice" />;
    if (desc.includes('bắn cá') || desc.includes('fish')) return <Flame className="txIcon fish" />;
    if (type === 'DAILY_BONUS' || type === 'WELCOME_BONUS') return <Gift className="txIcon bonus" />;
    if (type === 'DEPOSIT') return <ArrowDownLeft className="txIcon deposit" />;
    if (type === 'WITHDRAW') return <ArrowUpRight className="txIcon withdraw" />;
    return <Coins className="txIcon default" />;
  };

  return (
    <div className="screen historyScreen">
      <Topbar
        home={false}
        balance={balance}
        onBack={goHome || (() => setScreen('lobby'))}
        sound={sound}
        setSound={setSound}
        onProfile={() => setScreen('profile')}
        onWallet={() => openPanel ? openPanel('wallet') : setScreen('profile')}
      />

      <main className="historyMain">
        <header className="historyHeader">
          <div className="historyTitleRow">
            <div>
              <div className="historyBadge"><History size={14} /> SAO KÊ TÀI KHOẢN</div>
              <h1>LỊCH SỬ GIAO DỊCH</h1>
              <p>Chi tiết các ván cược, nhận thưởng và lịch sử nạp rút của bạn</p>
            </div>
            <button className="historyReloadBtn" onClick={loadData} disabled={loading} title="Làm mới">
              <RefreshCw size={16} className={loading ? 'spinning' : ''} />
            </button>
          </div>

          {/* 4 THẺ THỐNG KÊ */}
          <div className="historyStatGrid">
            <div className="historyStatCard">
              <span className="statLabel"><Coins size={14} /> Tổng cược</span>
              <strong className="statVal bet">{money(stats.totalBet)}</strong>
            </div>
            <div className="historyStatCard">
              <span className="statLabel"><Trophy size={14} /> Tổng thắng</span>
              <strong className="statVal win">{money(stats.totalPayout)}</strong>
            </div>
            <div className="historyStatCard">
              <span className="statLabel"><Sparkles size={14} /> Lợi nhuận</span>
              <strong className={'statVal ' + (stats.netProfit >= 0 ? 'profit' : 'loss')}>
                {stats.netProfit >= 0 ? '+' : ''}{money(stats.netProfit)}
              </strong>
            </div>
            <div className="historyStatCard">
              <span className="statLabel"><FileText size={14} /> Tổng giao dịch</span>
              <strong className="statVal">{stats.count}</strong>
            </div>
          </div>
        </header>

        {/* TABS LỌC */}
        <div className="historyTabs">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.key}
              className={'historyTab ' + (filter === tab.key ? 'active' : '')}
              onClick={() => setFilter(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* DANH SÁCH GIAO DỊCH */}
        <div className="historyListSection">
          {loading ? (
            <div className="historyLoading">
              <Coins size={32} className="spinning" />
              <span>Đang tải lịch sử giao dịch...</span>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="historyEmpty">
              <History size={48} />
              <h3>Chưa có giao dịch nào</h3>
              <p>Các giao dịch và lượt chơi của bạn sẽ hiển thị tại đây.</p>
              <button className="historyPlayBtn" onClick={() => setScreen('slot')}>
                <Gamepad2 size={16} /> Chơi ngay Nổ Hũ
              </button>
            </div>
          ) : (
            <div className="historyItemGrid">
              {filteredItems.map(item => {
                const amt = Number(item.amount) || 0;
                const isPositive = amt >= 0;
                return (
                  <article key={item.id} className="historyCard">
                    <div className="historyCardLeft">
                      <div className={'historyIconWrap ' + (isPositive ? 'pos' : 'neg')}>
                        {getItemIcon(item)}
                      </div>
                      <div className="historyCardInfo">
                        <strong>{item.description}</strong>
                        <div className="historyCardTime">
                          <Clock size={12} /> {new Date(item.createdAt).toLocaleString('vi-VN')}
                        </div>
                      </div>
                    </div>

                    <div className="historyCardRight">
                      <div className={'historyAmount ' + (isPositive ? 'positive' : 'negative')}>
                        {isPositive ? '+' : ''}{money(amt)} <small>VÀNG</small>
                      </div>
                      {item.balanceAfter !== undefined && item.balanceAfter !== null && (
                        <div className="historyBalanceAfter">
                          Dư: {money(item.balanceAfter)}
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {/* YÊU CẦU NẠP RÚT NẾU LỌC WALLET */}
        {(filter === 'all' || filter === 'wallet') && walletRequests.length > 0 && (
          <section className="walletRequestsSection">
            <h3><Wallet size={18} /> Yêu cầu Nạp / Rút đang xử lý</h3>
            <div className="requestGrid">
              {walletRequests.map(req => (
                <div key={req.id} className="requestItemCard">
                  <div className="reqHead">
                    <span className={'reqType ' + req.type.toLowerCase()}>
                      {req.type === 'DEPOSIT' ? 'NẠP TIỀN' : 'RÚT TIỀN'}
                    </span>
                    <b className={'reqStatus ' + req.status.toLowerCase()}>
                      {req.status === 'PENDING' ? 'CHỜ DUYỆT' : req.status === 'APPROVED' ? 'ĐÃ DUYỆT' : 'TỪ CHỐI'}
                    </b>
                  </div>
                  <div className="reqAmount">{money(req.amount)} vàng</div>
                  <small className="reqTime">{new Date(req.createdAt).toLocaleString('vi-VN')}</small>
                  {req.note && <p className="reqNote">Ghi chú: {req.note}</p>}
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <Nav setScreen={setScreen} active="history" />
    </div>
  );
}
