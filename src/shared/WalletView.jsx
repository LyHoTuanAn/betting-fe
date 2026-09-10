import {useCallback, useEffect, useState} from 'react';
import {AlertTriangle, ArrowDownToLine, ArrowUpFromLine, Check, Copy, Landmark, Loader2, Lock, Wallet} from 'lucide-react';
import {api} from './api.js';
import {money} from './format.js';

/**
 * Ví người chơi theo SRS mục 21: nạp bằng cách chuyển khoản vào tài khoản Timo
 * với nội dung là username, rút bằng cách gửi yêu cầu cho admin chuyển tay.
 *
 * Ba con số số dư luôn lấy từ server (`GET /api/wallet`) chứ không tự tính ở
 * client: tiền có thể được cộng bởi worker đọc email bất cứ lúc nào, nên số dư
 * trong bộ nhớ trang gần như chắc chắn đã cũ.
 */

const STATUS = {
  PENDING: {label: 'Chờ duyệt', tone: 'pending'},
  APPROVED: {label: 'Đã chuyển', tone: 'approved'},
  REJECTED: {label: 'Từ chối', tone: 'rejected'}
};

const QUICK_AMOUNTS = [100_000, 500_000, 1_000_000, 5_000_000];

/** Nút chép: `navigator.clipboard` không có ở http nội bộ nên có đường lùi. */
function CopyButton({value, label}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(String(value));
      else {
        const helper = document.createElement('textarea');
        helper.value = String(value);
        helper.style.position = 'fixed';
        helper.style.opacity = '0';
        document.body.appendChild(helper);
        helper.select();
        document.execCommand('copy');
        helper.remove();
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch { /* chép hỏng thì người dùng vẫn tự bôi đen được, không cần báo lỗi */ }
  };
  return (
    <button type="button" className={'wvCopy' + (copied ? ' copied' : '')} onClick={copy} aria-label={`Sao chép ${label}`}>
      {copied ? <Check size={15} /> : <Copy size={15} />}
    </button>
  );
}

export function WalletView({token, onBalanceChange, notify}) {
  const [tab, setTab] = useState('deposit');
  const [wallet, setWallet] = useState(null);
  const [info, setInfo] = useState(null);
  const [infoError, setInfoError] = useState('');
  const [withdrawals, setWithdrawals] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [busy, setBusy] = useState(false);

  const [amount, setAmount] = useState(500_000);
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');

  const refresh = useCallback(async () => {
    const [walletData, withdrawData, depositData] = await Promise.all([
      api('/wallet', {token}),
      api('/wallet/withdrawals', {token}).catch(() => ({items: []})),
      api('/wallet/deposits', {token}).catch(() => ({items: []}))
    ]);
    setWallet(walletData);
    setWithdrawals(withdrawData.items || []);
    setDeposits(depositData.items || []);
    onBalanceChange?.(walletData.balance);
  }, [token, onBalanceChange]);

  useEffect(() => {
    refresh().catch(err => notify?.(err.display || err.message));
    // Thông tin chuyển khoản hỏng không được chặn cả trang ví: người chơi vẫn
    // phải xem được số dư và tạo yêu cầu rút.
    api('/wallet/deposit-info', {token})
      .then(setInfo)
      .catch(err => setInfoError(err.display || err.message));
  }, [token]);

  const submitWithdraw = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      const data = await api('/wallet/withdraw', {
        token, method: 'POST',
        body: JSON.stringify({
          amount: Number(amount),
          bankName: bankName.trim(),
          accountNumber: accountNumber.trim(),
          accountName: accountName.trim()
        })
      });
      setWallet(data.wallet);
      setWithdrawals(current => [data.request, ...current]);
      onBalanceChange?.(data.wallet.balance);
      notify?.(`Đã gửi yêu cầu rút ${money(data.request.amount)}. Admin sẽ chuyển khoản và xác nhận.`, 'ok');
    } catch (err) {
      notify?.(err.display || err.message, 'fail');
    } finally {
      setBusy(false);
    }
  };

  const canWithdraw = Number(amount) > 0 && bankName.trim().length >= 2
    && /^[0-9]{6,32}$/.test(accountNumber.trim()) && accountName.trim().length >= 2;

  return (
    <div className="walletView">
      <h2>Ví GoldZone</h2>

      <div className="wvBalances">
        <div className="wvBalanceMain">
          <span>Tổng số dư</span>
          <strong><Wallet size={18} /> {wallet ? money(wallet.balance) : '—'}</strong>
        </div>
        <div className="wvBalanceSplit">
          <div><span>Khả dụng</span><b className="ok">{wallet ? money(wallet.availableBalance) : '—'}</b></div>
          <div><span><Lock size={11} /> Đang khoá</span><b className={wallet?.lockedBalance ? 'locked' : ''}>{wallet ? money(wallet.lockedBalance) : '—'}</b></div>
        </div>
      </div>

      <div className="wvTabs">
        <button className={tab === 'deposit' ? 'active' : ''} onClick={() => setTab('deposit')}><ArrowDownToLine size={15} /> Nạp tiền</button>
        <button className={tab === 'withdraw' ? 'active' : ''} onClick={() => setTab('withdraw')}><ArrowUpFromLine size={15} /> Rút tiền</button>
      </div>

      {tab === 'deposit' ? (
        <div className="wvPane">
          {infoError ? <p className="wvAlert"><AlertTriangle size={16} /> {infoError}</p> : !info ? (
            <p className="wvLoading"><Loader2 size={16} /> Đang lấy thông tin chuyển khoản...</p>
          ) : (
            <>
              <div className="wvBankCard">
                <div className="wvBankHead"><Landmark size={18} /> Chuyển khoản tới</div>
                <div className="wvRow"><span>Ngân hàng</span><b>{info.bankName}</b></div>
                <div className="wvRow"><span>Số tài khoản</span><b>{info.accountNumber}<CopyButton value={info.accountNumber} label="số tài khoản" /></b></div>
                <div className="wvRow"><span>Tên tài khoản</span><b>{info.accountName}</b></div>
              </div>

              {/* Nội dung chuyển khoản là mấu chốt của cả luồng nạp tự động:
                  sai một ký tự thì giao dịch rơi vào UNMATCHED và phải chờ
                  admin xử lý tay, nên nó được làm nổi bật hơn hẳn phần còn lại. */}
              <div className="wvContentBox">
                <span>NỘI DUNG CHUYỂN KHOẢN</span>
                <strong>{info.transferContent}<CopyButton value={info.transferContent} label="nội dung chuyển khoản" /></strong>
              </div>

              <p className="wvAlert"><AlertTriangle size={16} /> {info.note}</p>
              <p className="wvHint">Tiền vào tài khoản thường được cộng tự động trong vòng 1–2 phút sau khi ngân hàng gửi thông báo.</p>
            </>
          )}

          {deposits.length > 0 && (
            <div className="wvList">
              <h3>Lịch sử nạp</h3>
              {deposits.map(item => (
                <article key={item.id}>
                  <div><strong>+{money(item.amount)}</strong><small>{new Date(item.transactionTime).toLocaleString('vi-VN')} · {item.bankTransactionId}</small></div>
                  <b className="approved">Đã cộng</b>
                </article>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="wvPane">
          <form className="wvForm" onSubmit={submitWithdraw}>
            <label>Số tiền rút
              <input type="number" min={50_000} step={50_000} value={amount} onChange={e => setAmount(e.target.value)} />
            </label>
            <div className="quickAmountChips">
              {QUICK_AMOUNTS.map(value => (
                <button type="button" key={value} className={'quickChip ' + (Number(amount) === value ? 'active' : '')} onClick={() => setAmount(value)}>
                  {money(value)}
                </button>
              ))}
            </div>
            <label>Ngân hàng
              <input value={bankName} placeholder="VD: Vietcombank" onChange={e => setBankName(e.target.value)} />
            </label>
            <label>Số tài khoản
              <input value={accountNumber} inputMode="numeric" placeholder="Chỉ gồm chữ số" onChange={e => setAccountNumber(e.target.value.replace(/\D/g, ''))} />
            </label>
            <label>Tên chủ tài khoản
              <input value={accountName} placeholder="NGUYEN VAN A" onChange={e => setAccountName(e.target.value.toUpperCase())} />
            </label>

            <p className="wvHint">Khả dụng: <b>{wallet ? money(wallet.availableBalance) : '—'}</b>. Số tiền rút bị khoá ngay khi gửi yêu cầu và chỉ trừ hẳn khi admin xác nhận đã chuyển khoản.</p>
            <button className="panelAction" disabled={busy || !canWithdraw}>{busy ? 'Đang gửi...' : 'Gửi yêu cầu rút'}</button>
          </form>

          <div className="wvList">
            <h3>Yêu cầu rút</h3>
            {withdrawals.length ? withdrawals.map(item => {
              const status = STATUS[item.status] || {label: item.status, tone: ''};
              return (
                <article key={item.id}>
                  <div>
                    <strong>-{money(item.amount)}</strong>
                    <small>{new Date(item.createdAt).toLocaleString('vi-VN')}{item.bankName ? ` · ${item.bankName} ${item.accountNumber}` : ''}</small>
                    {item.note && <small className="wvNote">Ghi chú: {item.note}</small>}
                  </div>
                  <b className={status.tone}>{status.label}</b>
                </article>
              );
            }) : <div className="emptyState">Chưa có yêu cầu rút nào</div>}
          </div>
        </div>
      )}
    </div>
  );
}
