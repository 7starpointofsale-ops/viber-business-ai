let db = {};

// =======================
// LOAD
// =======================
async function load() {
  const res = await fetch('/api/prices');
  db = await res.json();

  renderCategory();
  renderList();
}

// =======================
// CATEGORY DROPDOWN
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
// SAVE
// =======================
async function save() {

  let cat = newCategory.value || category.value;

  const data = {
    category: cat,
    item: item.value,
    size: size.value,
    side: side.value,
    price: price.value
  };

  await fetch('/api/save-v2', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(data)
  });

  newCategory.value = "";
  item.value = "";
  size.value = "";
  price.value = "";

  load(); // refresh
}

// =======================
// DELETE ITEM
// =======================
async function del(cat, itemName) {
  await fetch('/api/delete-item', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ category: cat, item: itemName })
  });

  load();
}

// =======================
// DELETE CATEGORY
// =======================
async function deleteCategory() {
  const cat = category.value;

  if (!confirm("Delete this category?")) return;

  await fetch('/api/delete-category', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ category: cat })
  });

  load();
}

// =======================
// MULTI DELETE (CHECKBOX)
// =======================
async function deleteSelected() {
  const checked = document.querySelectorAll("input[type=checkbox]:checked");

  if (checked.length === 0) {
    alert("No item selected");
    return;
  }

  const ids = Array.from(checked).map(el => el.value);

  await fetch('/api/delete-items', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ ids })
  });

  load();
}

// =======================
// RENDER LIST
// =======================
function renderList() {

  list.innerHTML = "";

  db.categories.forEach(cat => {

    let catDiv = document.createElement("div");
    catDiv.className = "cat";
    catDiv.innerText = "📁 " + cat.name;
    list.appendChild(catDiv);

    cat.items.forEach(item => {

      let div = document.createElement("div");
      div.className = "card";

      let html = `<b>${item.name}</b><br>`;

      // 🔥 FIX (entries safe)
      if (item.entries) {
        item.entries.forEach(e => {
          html += `
            <input type="checkbox" value="${e.id}">
            ${e.size} ${e.side ? e.side+" side" : ""} → ${e.price} Ks<br>
          `;
        });
      }

      html += `
        <br>
        <button class="delete" onclick="del('${cat.name}','${item.name}')">Delete Item</button>
      `;

      div.innerHTML = html;
      list.appendChild(div);
    });
  });
}

// =======================
load();