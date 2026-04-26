function buildDailySaleNumber(sequence) {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const seq = String(sequence).padStart(5, '0');
  return `V-${y}${m}${d}-${seq}`;
}

module.exports = {
  buildDailySaleNumber
};
