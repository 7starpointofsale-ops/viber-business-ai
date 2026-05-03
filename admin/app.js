function toggle() {
  const t = document.getElementById("type").value;

  document.getElementById("tableBox").style.display =
    t === "table" ? "block" : "none";

  document.getElementById("fixedBox").style.display =
    t === "fixed" ? "block" : "none";
}

async function save() {
  const type = document.getElementById("type").value;

  const body = {
    category: category.value,
    item: item.value,
    type
  };

  if (type === "table") {
    body.size = size.value;
    body.side1 = side1.value;
    body.side2 = side2.value;
  }

  if (type === "fixed") {
    body.fixedValue = fixedValue.value;
    body.fixedPrice = fixedPrice.value;
  }

  await fetch("/api/add-item", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
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
              <td>${v["1"] || "-"}</td>
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