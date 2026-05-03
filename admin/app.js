async function loadData() {
  const res = await fetch("/api/prices");
  const data = await res.json();

  const tbody = document.getElementById("tableBody");
  tbody.innerHTML = "";

  data.categories.forEach(cat => {
    cat.items.forEach(item => {
      Object.keys(item.sizes).forEach(size => {

        const tr = document.createElement("tr");

        tr.innerHTML = `
          <td>${cat.name}</td>
          <td>${item.name}</td>
          <td>${size}</td>
          <td>${item.sizes[size]["1"]}</td>
          <td>${item.sizes[size]["2"] || "-"}</td>
          <td><button class="delete" onclick="del('${cat.name}','${item.name}','${size}')">X</button></td>
        `;

        tbody.appendChild(tr);
      });
    });
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

async function del(c,i,s){
  await fetch("/api/delete-item", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({category:c,item:i,size:s})
  });

  loadData();
}

loadData();