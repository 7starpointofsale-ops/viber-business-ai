let editMode = null;

async function save() {
  const data = {
    category: category.value,
    item: item.value,
    type: type.value,
    size: size.value,
    side1: side1.value,
    side2: side2.value,
    price: price.value
  };

  await fetch('/api/add-item', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(data)
  });

  resetForm();
  load();
}

function resetForm() {
  category.value = "";
  item.value = "";
  size.value = "";
  side1.value = "";
  side2.value = "";
  price.value = "";
  editMode = null;
}

async function deleteItem(catName, itemName) {
  await fetch('/api/delete-item', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ category: catName, item: itemName })
  });

  load();
}

function editItem(cat, item) {
  category.value = cat.name;
  itemInput = item.name;
  item.value = item.name;
  type.value = item.type;

  editMode = { cat, item };
}

async function load() {
  const res = await fetch('/api/prices');
  const db = await res.json();

  const box = document.getElementById("list");
  box.innerHTML = "";

  db.categories.forEach(cat => {

    let catDiv = document.createElement("div");
    catDiv.innerHTML = `<div class="cat">📁 ${cat.name}</div>`;
    box.appendChild(catDiv);

    cat.items.forEach(item => {

      let div = document.createElement("div");
      div.className = "card";

      let html = `<b>${item.name}</b><br>`;

      if (item.type === "table") {
        for (let s in item.prices) {
          let p = item.prices[s];
          html += `${s} → ${p["1"]}/${p["2"]}<br>`;
        }
      }

      if (item.type === "sqft") {
        html += `1 sqft → ${item.price} Ks<br>`;
      }

      if (item.type === "fixed") {
        for (let s in item.prices) {
          html += `${s} → ${item.prices[s]} Ks<br>`;
        }
      }

      html += `
        <div class="actions">
          <button class="edit" onclick='editItem(${JSON.stringify(cat)}, ${JSON.stringify(item)})'>Edit</button>
          <button class="delete" onclick="deleteItem('${cat.name}','${item.name}')">Delete</button>
        </div>
      `;

      div.innerHTML = html;
      box.appendChild(div);
    });
  });
}

load();