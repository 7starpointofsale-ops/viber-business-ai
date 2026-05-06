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

  load();
}

async function updatePrice(id, price) {
  await fetch("/api/update-entry", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, price })
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

  db.categories.forEach(c => {
    let html = `
      <div class="box">
        <h3>📁 ${c.name}</h3>

        <table>
          <tr>
            <th>Item</th>
            <th>Size</th>
            <th>GSM</th>
            <th>1S</th>
            <th>2S</th>
            <th>Action</th>
          </tr>
    `;

    c.items.forEach(i => {
      html += `
        <tr>
          <td>${i.item}</td>
          <td>${i.size}</td>
          <td>${i.gsm}</td>

          <td>
            <input value="${i.s1}" onchange="updatePrice('${i.id}', this.value)">
          </td>

          <td>${i.s2}</td>

          <td>
            <button onclick="deleteItem('${i.id}')">❌</button>
          </td>
        </tr>
      `;
    });

    html += `</table></div>`;
    list.innerHTML += html;
  });
}

load();