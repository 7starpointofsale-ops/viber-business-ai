@"
async function save() {
  const data = {
    category: category.value,
    item: item.value,
    type: type.value,
    size: size.value,
    side1: side1.value,
    side2: side2.value,
    price: price.value
  };

  await fetch('/api/add-item', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(data)
  });

  load();
}

async function load() {
  const res = await fetch('/api/prices');
  const db = await res.json();

  let html = '';

  db.categories.forEach(cat => {
    html += '<h3>'+cat.name+'</h3>';

    cat.items.forEach(item => {
      html += '<b>'+item.name+'</b><br>';

      if (item.type === 'sqft') {
        html += '1 sqft = '+item.price+' Ks<br>';
      }

      if (item.prices) {
        for (let s in item.prices) {
          let p = item.prices[s];

          if (typeof p === 'object') {
            html += s+' → '+p["1"]+'/'+p["2"]+'<br>';
          } else {
            html += s+' → '+p+' Ks<br>';
          }
        }
      }

      html += '<hr>';
    });
  });

  document.getElementById('list').innerHTML = html;
}

load();
"@ | Out-File -Encoding utf8 admin\js\app.js