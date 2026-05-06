let db = {};

// =======================
async function load() {
  const res = await fetch('/api/prices');
  db = await res.json();

  renderCategory();
  renderList();
}

// =======================
function renderCategory() {
  category.innerHTML = "";

  db.categories.forEach(c => {
    let opt = document.createElement("option");
    opt.value = c.name;
    opt.innerText = c.name;
    category.appendChild(opt);
  });
}

// =======================
// SAVE (FIXED SYNC)
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

  await load(); // 🔥 IMPORTANT FIX
}

// =======================
// DELETE CATEGORY (FIXED)
// =======================
async function deleteCategory() {
  if (!category.value) return;

  if (!confirm("Delete category?")) return;

  await fetch('/api/delete-category', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ category: category.value })
  });

  await load(); // 🔥 FIX
}

// =======================
async function deleteSelected() {
  const ids = [...document.querySelectorAll("input[type=checkbox]:checked")]
    .map(x => x.value);

  if (!ids.length) return alert("Select items");

  await fetch('/api/delete-items', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ ids })
  });

  await load(); // 🔥 FIX
}

// =======================
// RENDER (PREMIUM UI FIX)
// =======================
function renderList() {
  list.innerHTML = "";

  db.categories.forEach(cat => {

    let box = document.createElement("div");
    box.className = "box";

    box.innerHTML = `<div class="cat">📁 ${cat.name}</div>`;

    cat.items.forEach(item => {

      let html = `<div class="item">📄 ${item.name}</div>`;

      item.entries?.forEach(e => {
        html += `
          <div class="row">
            <input type="checkbox" value="${e.id}">
            ${e.size || "-"} | ${e.gsm || "-"}gsm | ${e.side || "-"} → ${e.price} Ks
          </div>
        `;
      });

      box.innerHTML += html;
    });

    list.appendChild(box);
  });
}

load();