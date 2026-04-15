const CURRENCY_SYMBOLS = {
  USD: '$',
  EUR: '\u20AC',
  CAD: 'C$',
  JPY: '\u00A5',
  GBP: '\u00A3',
  TRY: '\u20BA',
};

export function formatMoney(money) {
  if (!money) return '';
  const symbol = CURRENCY_SYMBOLS[money.currencyCode] || money.currencyCode;
  const decimal = Math.abs(money.nanos || 0) / 1000000000;
  const amount = Number(money.units || 0) + decimal;
  return `${symbol}${amount.toFixed(2)}`;
}
