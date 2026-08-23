/**
 * Generate an order number in format: MKT-YYYYMMDD-XXXXX
 * where XXXXX is a random 5-digit number.
 */
export function generateOrderNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = String(Math.floor(10000 + Math.random() * 90000));
  return `MKT-${year}${month}${day}-${random}`;
}
