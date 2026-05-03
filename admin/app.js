function toggle() {
  const t = document.getElementById("type").value;

  document.getElementById("sizeBox").style.display =
    (t === "normal" || t === "mixed") ? "block" : "none";

  document.getElementById("qtyBox").style.display =
    (t === "fixed" || t === "mixed") ? "block" : "none";
}

async function save() {
  await fetch("/api/add-item", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      category: category.value,
      item: item.value,
      type: type.value,
      size: size.value,
      side1: side1.value,
      side2: side2.value,
      qty: qty.value,
      price: price.value
    })
  });

  load();
}

async function load() {
  const res = await fetch("/api/prices");
  const data = await res.json();

  const tb = document.getElementById("tb");
  tb.innerHTML = "";

  data.categories.forEach(cat => {
    cat.items.forEach(item => {

      Object.keys(item.prices).forEach(k => {
        const v = item.prices[k];

        if (typeof v === "object") {
          tb.innerHTML += `
            <tr>
              <td>${cat.name}</td>
              <td>${item.name}</td>
              <td>${k}</td>
              <td>${v["1"]}</td>
              <td>${v["2"] || "-"}</td>
            </tr>
          `;
        } else {
          tb.innerHTML += `
            <tr>
              <td>${cat.name}</td>
              <td>${item.name}</td>
              <td>${k}</td>
              <td>${v}</td>
              <td>-</td>
            </tr>
          `;
        }
      });

    });
  });
}

load();