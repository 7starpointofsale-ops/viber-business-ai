async function loadData() {
  const res = await fetch("/api/prices");
  const data = await res.json();

  const tbody = document.getElementById("tableBody");
  tbody.innerHTML = "";

  data.categories.forEach(cat => {
    cat.items.forEach(item => {
      for (const size in item.sizes) {
        const s = item.sizes[size];

        tbody.innerHTML += `
          <tr>
            <td>${cat.name}</td>
            <td>${item.name}</td>
            <td>${size}</td>
            <td>${s["1"] || 0}</td>
            <td>${s["2"] || 0}</td>
          </tr>
        `;
      }
    });
  });
}

async function addItem() {
  await fetch("/api/add-item", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
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

loadData();