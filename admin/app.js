async function loadData() {
  const res = await fetch("/api/prices");
  const data = await res.json();

  const tbody = document.getElementById("tableBody");
  tbody.innerHTML = "";

  data.categories.forEach(cat => {
    cat.items.forEach(item => {
      Object.keys(item.sizes).forEach(size => {

        const s = item.sizes[size];

        const row = document.createElement("tr");

        row.innerHTML = `
          <td>${cat.name}</td>
          <td>${item.name}</td>
          <td>${size}</td>

          <td>
            <input class="row-input" value="${s["1"]}" id="i1_${cat.name}_${item.name}_${size}">
          </td>

          <td>
            <input class="row-input" value="${s["2"] || ""}" id="i2_${cat.name}_${item.name}_${size}">
          </td>

          <td>
            <button class="edit" onclick="saveEdit('${cat.name}','${item.name}','${size}')">Save</button>
            <button class="delete" onclick="deleteItem('${cat.name}','${item.name}','${size}')">X</button>
          </td>
        `;

        tbody.appendChild(row);
      });
    });
  });
}

// ======================
// ADD ITEM
// ======================
async function addItem() {
  await fetch("/api/add-item", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({
      category: category.value,
      item: item.value,
      size: size.value,
      side1: side1.value,
      side2: side2.value
    })
  });

  loadData();
}

// ======================
// SAVE EDIT
// ======================
async function saveEdit(cat, item, size) {

  const i1 = document.getElementById(`i1_${cat}_${item}_${size}`).value;
  const i2 = document.getElementById(`i2_${cat}_${item}_${size}`).value;

  await fetch("/api/add-item", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({
      category: cat,
      item,
      size,
      side1: i1,
      side2: i2
    })
  });

  loadData();
}

// ======================
// DELETE
// ======================
async function deleteItem(category, item, size) {
  await fetch("/api/delete-item", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ category, item, size })
  });

  loadData();
}

loadData();