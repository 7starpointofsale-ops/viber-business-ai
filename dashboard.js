const express = require("express");
const { orders } = require("./data");

const app = express();

app.get("/", (req,res)=>{
  let html = `
  <h2>📊 POS DASHBOARD</h2>
  <table border="1" cellpadding="10">
    <tr>
      <th>Material</th>
      <th>Qty</th>
      <th>Unit</th>
      <th>Total</th>
    </tr>
  `;

  orders.forEach(o=>{
    html += `
      <tr>
        <td>${o.mat}</td>
        <td>${o.qty}</td>
        <td>${o.unit}</td>
        <td>${o.total}</td>
      </tr>
    `;
  });

  html += `</table>`;
  res.send(html);
});

app.listen(4000, ()=>{
  console.log("DASHBOARD RUNNING 4000");
});