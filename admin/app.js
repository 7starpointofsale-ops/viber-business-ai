async function loadData() {
  const res = await fetch("/api/prices");
  const data = await res.json();

  const container = document.getElementById("container");
  container.innerHTML = "";

  if (!data.categories) return;

  data.categories.forEach(cat => {

    let catDiv = document.createElement("div");
    catDiv.className = "category";

    catDiv.innerHTML = `<h3>📁 ${cat.name}</h3>`;

    cat.items.forEach(item => {

      let itemDiv = document.createElement("div");
      itemDiv.className = "item";

      let html = `<b>${item.name}</b><br>`;

      Object.keys(item.sizes).forEach(size => {
        html += `
          📐 ${size} - 
          1Side: ${item.sizes[size]["1"]} Ks | 
          2Side: ${item.sizes[size]["2"] || "-"} Ks
          <button onclick="deleteItem('${cat.name}','${item.name}','${size}')">❌</button>
          <br>
        `;
      });

      itemDiv.innerHTML = html;
      catDiv.appendChild(itemDiv);
    });

    container.appendChild(catDiv);
  });
}

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

async function deleteItem(category, item, size) {
  await fetch("/api/delete-item", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ category, item, size })
  });

  loadData();
}

loadData();