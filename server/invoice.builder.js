const fs = require("fs");
const path = require("path");

function buildInvoiceHTML(data) {
  const itemsHTML = data.items.map((i, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td>${i.name}</td>
      <td>${i.qty}</td>
      <td>${i.price}</td>
      <td>${i.total}</td>
    </tr>
  `).join("");

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Invoice</title>

<style>
  body {
    font-family: Arial;
    padding: 30px;
    color: #222;
  }

  .header {
    text-align: center;
  }

  .logo {
    width: 80px;
    margin-bottom: 10px;
  }

  h1 {
    margin: 0;
  }

  .info {
    margin-top: 10px;
    font-size: 13px;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 20px;
  }

  th, td {
    border: 1px solid #ddd;
    padding: 8px;
    font-size: 13px;
    text-align: center;
  }

  th {
    background: #f3f3f3;
  }

  .total {
    text-align: right;
    margin-top: 20px;
    font-size: 18px;
    font-weight: bold;
  }

  .footer {
    margin-top: 40px;
    text-align: center;
    font-size: 12px;
    color: #666;
  }
</style>

</head>

<body>

<div class="header">
  <img class="logo" src="https://i.imgur.com/your-logo.png" />
  <h1>7Star Printing</h1>
  <div class="info">
    Invoice ID: ${data.id}<br>
    Date: ${new Date().toLocaleString()}
  </div>
</div>

<table>
  <tr>
    <th>#</th>
    <th>Item</th>
    <th>Qty</th>
    <th>Price</th>
    <th>Total</th>
  </tr>
  ${itemsHTML}
</table>

<div class="total">
  GRAND TOTAL: ${data.total} Ks
</div>

<div class="footer">
  Thank you for your business ❤️
</div>

</body>
</html>
  `;
}

module.exports = { buildInvoiceHTML };