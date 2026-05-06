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
// CATEGORY
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
// SAVE (FIXED STRUCTURE)
// =======================
async function save() {
  let cat = newCategory.value || category.value;

  const data = {
    category: cat,
    item: item.value,
    size: size.value,
    paper: paper.value,
    side: side.value,
    price: price.value
  };

  await fetch('/api/save-v2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  item.value = "";
  size.value = "";
  paper.value = "";
  side.value = "";
  price.value = "";
  newCategory.value = "";

  load();
}

// =======================
// DELETE CATEGORY
// =======================
async function deleteCategory() {
  if (!confirm("Delete category?")) return;

  await fetch('/api/delete-category', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ category: category.value })
  });

  load();
}

// =======================
// DELETE ITEMS
// =======================
async function deleteSelected() {
  const ids = [...document.querySelectorAll("input[type=checkbox]:checked")]
    .map(x => x.value);

  if (!ids.length) return alert("Select items");

  await fetch('/api/delete-items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids })
  });

  load();
}

// =======================
// RENDER LIST (FIXED DISPLAY)
// =======================
function renderList() {
  list.innerHTML = "";

  db.categories.forEach(cat => {

    let box = document.createElement("div");
    box.style.border = "1px solid #ccc";
    box.style.margin = "10px";
    box.style.padding = "10px";

    box.innerHTML = `<h3>📁 ${cat.name}</h3>`;

    cat.items.forEach(item => {

      let div = document.createElement("div");
      div.style.marginLeft = "10px";

      let html = `<b>${item.name}</b><br>`;

      if (item.entries) {
        item.entries.forEach(e => {
          html += `
            <input type="checkbox" value="${e.id}">
            ${e.size || "-"} | ${e.paper || "-"} | ${e.side || "-"} → ${e.price} Ks<br>
          `;
        });
      }

      div.innerHTML = html;
      box.appendChild(div);
    });

    list.appendChild(box);
  });
}

load();