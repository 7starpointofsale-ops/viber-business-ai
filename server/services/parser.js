function parseMessage(msg) {
  msg = msg.toLowerCase();

  let qty = 1;
  let urgent = false;

  if (msg.includes("urgent")) urgent = true;

  const qtyMatch = msg.match(/\d+/);
  if (qtyMatch) qty = parseInt(qtyMatch[0]);

  let sizeMatch = msg.match(/\d+x\d+/);
  let size = sizeMatch ? sizeMatch[0] : null;

  return {
    raw: msg,
    qty,
    size,
    urgent
  };
}

module.exports = { parseMessage };