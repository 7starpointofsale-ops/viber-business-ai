let db = {};

// LOAD DATA
async function load() {
  const res = await fetch('/api/prices');
  db = await res.json();

  renderCategory();
  renderList();
}

// CATEGORY DROPDOWN
function renderCategory() {
  category.innerHTML = "";

  db.categories.forEach(c => {
    let opt = document.createElement("option");
    opt.value = c.name;
    opt.innerText = c.name;
    category.appendChild(opt);
  });
}

// SAVE
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

  load();
}

// DELETE
async function del(cat, itemName) {
  await fetch('/api/delete-item', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ category: cat, item: itemName })
  });

  load();
}

// RENDER LIST
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

      item.entries.forEach(e => {
        html += `${e.size} ${e.side ? e.side+" side" : ""} → ${e.price} Ks<br>`;
      });

      html += `
        <div class="actions">
          <button class="delete" onclick="del('${cat.name}','${item.name}')">Delete</button>
        </div>
      `;

      div.innerHTML = html;
      list.appendChild(div);
    });
  });
}

load();