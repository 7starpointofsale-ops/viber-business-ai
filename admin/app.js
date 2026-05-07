let db = {};

// ====================================
async function load() {

  const res = await fetch("/api/prices");

  db = await res.json();

  render();
}

// ====================================
async function save() {

  await fetch("/api/save-v2", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      category: category.value,
      item: item.value,
      size: size.value,
      gsm: gsm.value,
      s1: s1.value,
      s2: s2.value,
      lamination: lam.value,
      remark: remark.value,
      noSide: noSide.checked
    })
  });

  clearForm();

  load();
}

// ====================================
function clearForm() {

  category.value = "";
  item.value = "";
  size.value = "";
  gsm.value = "";
  s1.value = "";
  s2.value = "";
  lam.value = "";
  remark.value = "";

  noSide.checked = false;
}

// ====================================
async function updatePrice(id, field, value) {

  await fetch("/api/update-entry", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      id,
      field,
      value
    })
  });
}

// ====================================
async function deleteItem(id) {

  if (!confirm("Delete this item?")) {
    return;
  }

  await fetch("/api/delete-entry", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      id
    })
  });

  load();
}

// ====================================
function render() {

  list.innerHTML = "";

  (db.categories || []).forEach(c => {

    let html = `
      <div class="card">

        <div class="title">
          <h2>📁 ${c.name}</h2>
          <div class="badge">
            ${(c.items || []).length} items
          </div>
        </div>

        <table>

          <tr>
            <th>Item</th>
            <th>Size</th>
            <th>GSM</th>
            <th>1 Side</th>
            <th>2 Side</th>
            <th>Mode</th>
            <th>Delete</th>
          </tr>
    `;

    (c.items || []).forEach(i => {

      html += `
        <tr>

          <td>${i.item || "-"}</td>

          <td>${i.size || "-"}</td>

          <td>${i.gsm || "-"}</td>

          <td>
            <input
              value="${i.s1 || 0}"
              onchange="updatePrice('${i.id}','s1',this.value)"
            >
          </td>

          <td>
            <input
              value="${i.s2 || 0}"
              onchange="updatePrice('${i.id}','s2',this.value)"
            >
          </td>

          <td>
            ${i.noSide ? "FIXED" : "SIDE"}
          </td>

          <td>
            <button
              class="deleteBtn"
              onclick="deleteItem('${i.id}')"
            >
              ❌
            </button>
          </td>

        </tr>
      `;
    });

    html += `
        </table>
      </div>
    `;

    list.innerHTML += html;
  });
}

// ====================================
load();