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

  await fetch('/api/add-item', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  load();
}

async function load() {
  try {
    const res = await fetch('/api/prices');
    const db = await res.json();

    const box = document.getElementById("list");
    box.innerHTML = "";

    db.categories.forEach(cat => {
      const div = document.createElement("div");
      div.className = "card";

      let html = `<h3>📁 ${cat.name}</h3>`;

      cat.items.forEach(item => {
        html += `<b>📄 ${item.name}</b><br>`;

        if (item.type === "table") {
          for (let s in item.prices) {
            const p = item.prices[s];
            html += `${s} → ${p["1"]} / ${p["2"]}<br>`;
          }
        }

        if (item.type === "sqft") {
          html += `1 sqft → ${item.price} Ks<br>`;
        }

        if (item.type === "fixed") {
          for (let s in item.prices) {
            html += `${s} → ${item.prices[s]} Ks<br>`;
          }
        }

        html += "<hr>";
      });

      div.innerHTML = html;
      box.appendChild(div);
    });

  } catch (err) {
    console.log("LOAD ERROR:", err);
    document.getElementById("list").innerHTML = "❌ API error";
  }
}

load();