async function loadData() {
  const res = await fetch("/api/prices");
  const data = await res.json();

  const tbody = document.getElementById("tableBody");
  tbody.innerHTML = "";

  data.categories.forEach(cat => {

    let first = true;

    cat.items.forEach(item => {

      Object.keys(item.sizes).forEach(size => {

        const row = document.createElement("tr");

        row.innerHTML = `
          <td>${first ? cat.name : ""}</td>
          <td>${item.name}</td>
          <td>${size}</td>
          <td>${item.sizes[size]["1"] || 0}</td>
          <td>${item.sizes[size]["2"] || 0}</td>
          <td>
            <button class="delete" onclick="deleteItem('${cat.name}','${item.name}','${size}')">
              Delete
            </button>
          </td>
        `;

        first = false;
        tbody.appendChild(row);
      });

    });

  });
}

async function addItem() {
  await fetch("/api/add-item", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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

async function deleteItem(category, item, size) {
  await fetch("/api/delete-item", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ category, item, size })
  });

  loadData();
}

loadData();