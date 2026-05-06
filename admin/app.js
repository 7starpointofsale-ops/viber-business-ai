let db = {};

async function load() {
  db = await (await fetch('/api/prices')).json();
  render();
}

async function save() {
  await fetch('/api/save-v2', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({
      category: newCategory.value || category.value,
      item: item.value,
      size: size.value,
      paper: paper.value,
      side: side.value,
      price: price.value
    })
  });

  item.value = "";
  size.value = "";
  paper.value = "";
  side.value = "";
  price.value = "";

  load();
}

async function deleteCategory() {
  await fetch('/api/delete-category', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ category: category.value })
  });

  load();
}

async function updatePrice(id, price) {
  await fetch('/api/update-entry', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ entryId: id, price })
  });

  load();
}

async function deleteEntry(id) {
  await fetch('/api/delete-entry', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ entryId: id })
  });

  load();
}

function render() {
  list.innerHTML = "";

  db.categories.forEach(c => {

    let div = document.createElement("div");
    div.className = "card";

    div.innerHTML = `<div class="cat">📁 ${c.name}</div>`;

    c.items.forEach(i => {

      let html = `<b>${i.name}</b><br>`;

      i.entries?.forEach(e => {
        html += `
          📏 ${e.size} | ${e.gsm}gsm | ${e.side}
          <input value="${e.price}" onchange="updatePrice('${e.id}', this.value)">
          <button onclick="deleteEntry('${e.id}')">❌</button>
          <br>
        `;
      });

      div.innerHTML += html;
    });

    list.appendChild(div);
  });
}

load();