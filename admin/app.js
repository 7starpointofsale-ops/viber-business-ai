let db = {};

// =======================
// LOAD DB
// =======================
async function load() {
  const res = await fetch('/api/prices');
  db = await res.json();

  renderCategory();
  renderList();
}

// =======================
// CATEGORY RENDER
// =======================
function renderCategory() {
  category.innerHTML = "";

  db.categories.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.name;
    opt.textContent = c.name;
    category.appendChild(opt);
  });
}

// =======================
// SAVE (CATEGORY + ITEM)
// =======================
async function save() {
  let cat = newCategory.value.trim() || category.value;

  if (!cat || !item.value || !price.value) {
    alert("Fill required fields");
    return;
  }

  await fetch('/api/save-v2', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({
      category: cat,
      item: item.value,
      size: size.value,
      paper: paper.value,
      side: side.value,
      price: price.value
    })
  });

  newCategory.value = "";
  item.value = "";
  size.value = "";
  paper.value = "";
  side.value = "";
  price.value = "";

  await load();
}

// =======================
// DELETE CATEGORY
// =======================
async function deleteCategory() {
  if (!category.value) return;

  if (!confirm("Delete category?")) return;

  await fetch('/api/delete-category', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ category: category.value })
  });

  await load();
}

// =======================
// DELETE ITEMS
// =======================
async function deleteSelected() {
  const ids = [...document.querySelectorAll("input[type=checkbox]:checked")]
    .map(x => x.value);

  if (!ids.length) {
    alert("Select items first");
    return;
  }

  await fetch('/api/delete-items', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ ids })
  });

  await load();
}

// =======================
// RENDER LIST (CLEAN + WORKING)
// =======================
function renderList() {
  list.innerHTML = "";

  db.categories.forEach(cat => {

    const box = document.createElement("div");
    box.style.border = "1px solid #ddd";
    box.style.padding = "10px";
    box.style.margin = "10px";
    box.style.borderRadius = "8px";
    box.style.background = "#fff";

    box.innerHTML = `<h3>📁 ${cat.name}</h3>`;

    cat.items.forEach(item => {

      const div = document.createElement("div");
      div.style.marginLeft = "10px";

      let html = `<b>📄 ${item.name}</b><br>`;

      item.entries?.forEach(e => {
        html += `
          <div style="margin-left:15px;">
            <input type="checkbox" value="${e.id}">
            ${e.size || "-"} | ${e.gsm || "-"}gsm | ${e.side || "-"} → ${e.price} Ks
          </div>
        `;
      });

      div.innerHTML = html;
      box.appendChild(div);
    });

    list.appendChild(box);
  });
}

// =======================
load();