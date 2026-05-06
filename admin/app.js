let db = {};

async function load() {
  db = await (await fetch("/api/prices")).json();
  render();
}

async function save() {
  await fetch("/api/save-v2", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      category: category.value,
      item: item.value,
      size: size.value,
      gsm: gsm.value,
      s1: s1.value,
      s2: s2.value,
      lamination: lam.value,
      remark: remark.value
    })
  });

  clearForm();
  load();
}

function clearForm() {
  category.value = "";
  item.value = "";
  size.value = "";
  gsm.value = "";
  s1.value = "";
  s2.value = "";
  lam.value = "";
  remark.value = "";
}

async function updatePrice(id, field, value) {
  await fetch("/api/update-entry", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, field, value })
  });

  load();
}

async function deleteItem(id) {
  await fetch("/api/delete-entry", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id })
  });

  load();
}

function render() {
  list.innerHTML = "";

  (db.categories || []).forEach((c, cIdx) => {
    let html = `
      <div class="box">
        <h3>📁 ${c.name}</h3>

        <table>
          <tr>
            <th>Item</th>
            <th>Size</th>
            <th>GSM</th>
            <th>1 Side</th>
            <th>2 Side</th>
            <th>Lamination</th>
            <th>Remark</th>
            <th>Action</th>
          </tr>
    `;

    (c.items || []).forEach((i, idx) => {
      const id = i.id || `${cIdx}_${idx}`;

      html += `
        <tr>
          <td>${i.item || "-"}</td>
          <td>${i.size || "-"}</td>
          <td>${i.gsm ?? "-"}</td>

          <td>
            <input value="${i.s1 ?? 0}"
              onchange="updatePrice('${id}','s1',this.value)">
          </td>

          <td>
            <input value="${i.s2 ?? 0}"
              onchange="updatePrice('${id}','s2',this.value)">
          </td>

          <td>${i.lamination ?? "-"}</td>

          <td>${i.remark ?? "-"}</td>

          <td>
            <button onclick="deleteItem('${id}')">❌</button>
          </td>
        </tr>
      `;
    });

    html += `</table></div>`;
    list.innerHTML += html;
  });
}

load();