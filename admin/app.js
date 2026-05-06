let db = {};

async function load() {
  db = await (await fetch('/api/prices')).json();
  render();
}

// =======================
// SAVE
// =======================
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

// =======================
// DELETE CATEGORY
// =======================
async function deleteCategory() {
  await fetch('/api/delete-category', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ category: category.value })
  });

  load();
}

// =======================
// EDIT ENABLE (SAFE)
// =======================
function openEdit(id) {
  document.getElementById("edit_" + id).style.display = "block";
}

// =======================
// SAVE EDIT
// =======================
async function saveEdit(id) {
  const price = document.getElementById("input_" + id).value;

  await fetch('/api/update-entry', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ entryId: id, price })
  });

  load();
}

// =======================
// DELETE ENTRY
// =======================
async function deleteEntry(id) {
  await fetch('/api/delete-entry', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ entryId: id })
  });

  load();
}

// =======================
// RENDER UI
// =======================
function render() {
  list.innerHTML = "";

  db.categories.forEach(c => {

    let box = document.createElement("div");
    box.className = "box";

    box.innerHTML = `<div class="cat">📁 ${c.name}</div>`;

    c.items.forEach(i => {

      let html = `<div class="item"><b>${i.name}</b></div>`;

      i.entries?.forEach(e => {

        html += `
          <div class="entry">
            📏 ${e.size} | ${e.gsm}gsm | ${e.side} → 
            <b>${e.price} Ks</b>

            <button class="edit" onclick="openEdit('${e.id}')">✏️ Edit</button>
            <button class="del" onclick="deleteEntry('${e.id}')">❌</button>

            <div class="editBox" id="edit_${e.id}">
              <input id="input_${e.id}" value="${e.price}">
              <button class="save" onclick="saveEdit('${e.id}')">Save</button>
            </div>
          </div>
        `;
      });

      box.innerHTML += html;
    });

    list.appendChild(box);
  });
}

load();