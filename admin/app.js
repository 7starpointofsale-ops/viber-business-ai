async function loadData() {
  const res = await fetch("/api/prices");
  const data = await res.json();
  document.getElementById("output").textContent =
    JSON.stringify(data, null, 2);
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
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  alert("Saved ✅");
  loadData();
}

loadData();