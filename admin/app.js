async function save() {
  const data = {
    category: document.getElementById("category").value,
    item: document.getElementById("item").value,
    type: document.getElementById("type").value,
    size: document.getElementById("size").value,
    side1: document.getElementById("side1").value,
    side2: document.getElementById("side2").value,
    price: document.getElementById("price").value
  };

  await fetch("/api/add-item", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });

  alert("Saved");
}