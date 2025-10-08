export const calculateProfitPercentage = (costPrice: number, salePrice: number): string => {
  if (!costPrice || costPrice <= 0 || !salePrice || salePrice <= 0) return "";
  
  const profit = salePrice - costPrice;
  const percentage = (profit / salePrice) * 100;
  return percentage.toFixed(2);
};

export const calculateSalePrice = (costPrice: number, percentage: number): string => {
  if (!costPrice || costPrice <= 0 || !percentage || percentage <= 0) return "";
  
  const percentageValue = percentage / 100;
  const salePrice = costPrice / (1 - percentageValue);
  return salePrice.toFixed(2);
};
