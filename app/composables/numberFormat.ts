export const numberFormat = (num: number, digits: number) => {
  const lookup = [
    { value: 1, symbol: "" },
    { value: 1e3, symbol: "k" },
    { value: 1e6, symbol: "M" },
    { value: 1e9, symbol: "G" },
    { value: 1e12, symbol: "T" },
    { value: 1e15, symbol: "P" },
    { value: 1e18, symbol: "E" }
  ];
  const trimTrailingZeros = (value: string) =>
    value.includes(".") ? value.replace(/0+$/, "").replace(/\.$/, "") : value;
  const item = lookup.findLast(item => num >= item.value);

  return item ? trimTrailingZeros((num / item.value).toFixed(digits)).concat(item.symbol) : "0";
}