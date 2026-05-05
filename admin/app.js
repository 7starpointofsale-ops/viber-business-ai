let db = {};

// LOAD
async function load() {
  const res = await fetch('/api/prices');
  db = await res.json();
  renderCategory();
  renderList();
}

// CATEGORY
function renderCategory() {
  category.innerHTML = "";
  db.categories.forEach(c => {
    let o = document.createElement("option");
    o.value = c.name;
    o.innerText = c.name;
    category.appendChild(o);
  });
}

// SAVE
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
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify(data)
  });

  item.value=""; size.value=""; price.value=""; newCategory.value="";
  load();
}

// DELETE CATEGORY
async function deleteCategory() {
  if (!confirm("Delete category?")) return;

  await fetch('/api/delete-category', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({category:category.value})
  });

  load();
}

// MULTI DELETE
async function deleteSelected() {
  const ids = [...document.querySelectorAll("input[type=checkbox]:checked")]
    .map(x => x.value);

  if (!ids.length) return alert("Select first");

  await fetch('/api/delete-items', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ids})
  });

  load();
}

// RENDER
function renderList() {
  list.innerHTML = "";

  db.categories.forEach(cat => {

    let c = document.createElement("div");
    c.className = "cat";
    c.innerText = "📁 " + cat.name;
    list.appendChild(c);

    cat.items.forEach(item => {

      let d = document.createElement("div");
      d.className = "card";

      let html = `<b>${item.name}</b><br>`;

      if (item.entries) {
        item.entries.forEach(e => {
          html += `
            <input type="checkbox" value="${e.id}">
            ${e.size} ${(e.paper && !isNaN(e.paper)) ? e.paper+"g" : ""} ${e.side ? e.side+" side" : ""} → ${e.price} Ks<br>
          `;
        });
      }

      d.innerHTML = html;
      list.appendChild(d);
    });
  });
}

load();