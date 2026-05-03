function toggleMode() {
  const type = document.getElementById("type").value;

  document.getElementById("tableMode").style.display =
    type === "table" ? "block" : "none";

  document.getElementById("fixedMode").style.display =
    type === "fixed" ? "block" : "none";
}

// ===================== LOAD
async function loadData() {
  const res = await fetch("/api/prices");
  const data = await res.json();

  const tbody = document.getElementById("tableBody");
  tbody.innerHTML = "";

  data.categories.forEach(cat => {
    cat.items.forEach(item => {

      const sizes = item.sizes;

      Object.keys(sizes).forEach(size => {
        const val = sizes[size];

        const row = document.createElement("tr");

        row.innerHTML = `
          <td>${cat.name}</td>
          <td>${item.name}</td>
          <td>${size}</td>
          <td>${val["1"] ?? "-"}</td>
          <td>${val["2"] ?? "-"}</td>
          <td>
            <button class="delete" onclick="deleteItem('${cat.name}','${item.name}','${size}')">
              X
            </button>
          </td>
        `;

        tbody.appendChild(row);
      });
    });
  });
}

// ===================== ADD (FIXED + TABLE BOTH SUPPORT)
async function addItem() {
  const type = document.getElementById("type").value;

  let body = {
    category: document.getElementById("category").value,
    item: document.getElementById("item").value,
    type
  };

  if (type === "table") {
    body.size = document.getElementById("size").value;
    body.side1 = document.getElementById("side1").value;
    body.side2 = document.getElementById("side2").value;
  }

  if (type === "fixed") {
    body.fixedValue = document.getElementById("fixedValue").value;
    body.fixedPrice = document.getElementById("fixedPrice").value;
  }

  await fetch("/api/add-item", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  alert("Saved ✅");
  loadData();
}

// ===================== DELETE
async function deleteItem(category, item, size) {
  await fetch("/api/delete-item", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ category, item, size })
  });

  loadData();
}

loadData();