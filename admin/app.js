async function loadData() {
  const res = await fetch("/api/prices");
  const data = await res.json();

  const tbody = document.getElementById("tableBody");
  tbody.innerHTML = "";

  data.categories.forEach(cat => {
    cat.items.forEach(item => {
      Object.keys(item.sizes).forEach(size => {

        const row = document.createElement("tr");

        row.innerHTML = `
          <td>${cat.name}</td>
          <td>${item.name}</td>
          <td>${size}</td>
          <td>${item.sizes[size]["1"]}</td>
          <td>${item.sizes[size]["2"]}</td>
          <td>
            <button class="delete" onclick="deleteItem('${cat.name}','${item.name}','${size}')">
              Delete
            </button>
          </td>
        `;

        tbody.appendChild(row);
      });
    });
  });
}

async function addItem() {
  const body = {
    category: document.getElementById("category").value,
    item: document.getElementById("item").value,
    size: document.getElementById("size").value,
    side1: document.getElementById("side1").value,
    side2: document.getElementById("side2").value
  };

  await fetch("/api/add-item", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  alert("Saved ✅");
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