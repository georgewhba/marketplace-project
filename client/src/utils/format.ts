export const formatCurrency = (val: number | string) => parseFloat(String(val)).toLocaleString('ar-EG') + ' ج.م';

export const formatDate = (dateString: string) => {
  const d = new Date(dateString);
  return d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
};
