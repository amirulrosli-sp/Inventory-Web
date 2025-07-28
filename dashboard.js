// dashboard.js
let chart;
let filteredItems = null;

function loadDashboard() {
  const data = JSON.parse(localStorage.getItem('stockData')) || [];
  let totalIn = 0, totalOut = 0;
  const stockLevels = {};
  const itemDisplayNames = {}; // Store original display names
  const recentIn = [];
  const recentOut = [];

  // Calculate totals and stock levels
  data.forEach(entry => {
    const qty = parseFloat(entry.qty) || 0;
    const itemKey = entry.item.toLowerCase(); // Use lowercase for comparison
    const displayName = entry.displayItem || entry.item; // Use displayItem if available

    if (!itemDisplayNames[itemKey]) {
      itemDisplayNames[itemKey] = displayName; // Store the original display name
    }

    if (entry.type === "in") {
      totalIn += qty;
      recentIn.push(entry);
      stockLevels[itemKey] = (stockLevels[itemKey] || 0) + qty;
    } 
    else if (entry.type === "out") {
      totalOut += qty;
      recentOut.push(entry);
      stockLevels[itemKey] = (stockLevels[itemKey] || 0) - qty;
    }
  });

  // Apply filters to the stock table if any
  let displayStockLevels = {...stockLevels};
  if (filteredItems && filteredItems.length > 0) {
    displayStockLevels = Object.keys(stockLevels)
      .filter(key => filteredItems.includes(key))
      .reduce((obj, key) => {
        obj[key] = stockLevels[key];
        return obj;
      }, {});
  }

  // Update summary cards
  document.getElementById("total-in").textContent = totalIn.toFixed(2);
  document.getElementById("total-out").textContent = totalOut.toFixed(2);

  // Find most frequent item (case-insensitive)
  const itemCounts = {};
  data.forEach(entry => {
    const itemKey = entry.item.toLowerCase();
    itemCounts[itemKey] = (itemCounts[itemKey] || 0) + 1;
  });
  
  let mostFrequentItem = "-";
  let maxCount = 0;
  
  for (const [itemKey, count] of Object.entries(itemCounts)) {
    if (count > maxCount) {
      maxCount = count;
      // Find the first entry with this item to get the display name
      const entry = data.find(e => e.item.toLowerCase() === itemKey);
      mostFrequentItem = entry?.displayItem || entry?.item || itemKey;
    }
  }
  
  document.getElementById("most-item").textContent = mostFrequentItem;

  // Update stock levels table with filtered items
  updateStockTable(displayStockLevels, itemDisplayNames);

  // Update recent transactions
  updateRecentTransactions(recentIn, recentOut);

  // Draw chart with filtered items
  drawChart(stockLevels, itemDisplayNames);
}

function updateStockTable(stockLevels, itemDisplayNames) {
  const tbody = document.querySelector("#stock-level-table tbody");
  tbody.innerHTML = "";
  
  if (Object.keys(stockLevels).length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="2" class="empty-state">No stock data available</td>
      </tr>
    `;
  } else {
    Object.entries(stockLevels).forEach(([itemKey, qty]) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${itemDisplayNames[itemKey] || itemKey}</td>
        <td>${qty}</td>
      `;
      tbody.appendChild(row);
    });
  }
}

function updateRecentTransactions(recentIn, recentOut) {
  // Sort by date/time
  recentIn.sort((a, b) => new Date(b.date + ' ' + b.time) - new Date(a.date + ' ' + a.time));
  recentOut.sort((a, b) => new Date(b.date + ' ' + b.time) - new Date(a.date + ' ' + a.time));

  // Update tables
  updateRecentTable('recent-in-table', recentIn.slice(0, 5));
  updateRecentTable('recent-out-table', recentOut.slice(0, 5));
}

function updateRecentTable(tableId, entries) {
  const tbody = document.querySelector(`#${tableId} tbody`);
  tbody.innerHTML = "";

  if (entries.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-state">No recent transactions</td></tr>`;
    return;
  }

  entries.forEach(entry => {
    const row = document.createElement("tr");
    if (entry.type === "in") {
      row.innerHTML = `
        <td>${entry.displayItem || entry.item}</td>
        <td>${entry.qty}</td>
        <td>${entry.price ? entry.price.toFixed(2) : '-'}</td>
        <td>${entry.totalPrice ? entry.totalPrice.toFixed(2) : '-'}</td>
        <td class="date-column">${entry.date}</td>
        <td class="time-column">${entry.time}</td>
      `;
    } else {
      row.innerHTML = `
        <td>${entry.displayItem || entry.item}</td>
        <td>${entry.qty}</td>
        <td>${entry.person}</td>
        <td>${entry.reason || '-'}</td>
        <td class="date-column">${entry.date}</td>
        <td class="time-column">${entry.time}</td>
      `;
    }
    tbody.appendChild(row);
  });
}

function drawChart(stockLevels, itemDisplayNames) {
  const ctx = document.getElementById('stockChart').getContext('2d');
  
  if (chart) {
    chart.destroy();
  }

  // Apply filters if any
  let filteredStockLevels = {...stockLevels};
  if (filteredItems && filteredItems.length > 0) {
    filteredStockLevels = Object.keys(stockLevels)
      .filter(key => filteredItems.includes(key))
      .reduce((obj, key) => {
        obj[key] = stockLevels[key];
        return obj;
      }, {});
  }

  const labels = Object.keys(filteredStockLevels).map(key => itemDisplayNames[key] || key);
  const values = Object.values(filteredStockLevels);

  if (labels.length === 0) {
    document.getElementById('stockChart').style.display = 'none';
    return;
  }

  document.getElementById('stockChart').style.display = 'block';

  // Dynamic color generator
  const generateColors = (count) => {
    const colors = [];
    const hueStep = 360 / count;
    for (let i = 0; i < count; i++) {
      const hue = Math.floor(i * hueStep);
      colors.push(`hsl(${hue}, 70%, 60%)`);
    }
    return colors;
  };

  chart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: generateColors(labels.length), // Use dynamic colors
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.raw || 0;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = Math.round((value / total) * 100);
              return `${label}: ${value} (${percentage}%)`;
            }
          }
        }
      }
    }
  });
}

function exportToExcel() {
  const data = JSON.parse(localStorage.getItem('stockData')) || [];
  if (data.length === 0) {
    showNotification('No data to export', true);
    return;
  }

  // Create workbook
  const wb = XLSX.utils.book_new();
  
  // Prepare stock data
  const stockData = data.map(entry => ({
    Type: entry.type === 'in' ? 'Stock In' : 'Stock Out',
    Item: entry.displayItem || entry.item, // Use displayItem if available
    Quantity: entry.qty,
    'Unit Price': entry.price || '',
    'Total Price': entry.totalPrice || '',
    Supplier: entry.supplier || '',
    'Received By': entry.receiver || '',
    'Taken By': entry.person || '',
    Reason: entry.reason || '',
    Note: entry.note || '',
    Date: entry.date,
    Time: entry.time
  }));

  const ws = XLSX.utils.json_to_sheet(stockData);
  XLSX.utils.book_append_sheet(wb, ws, 'Inventory Data');
  
  // Generate and download file
  const date = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `Inventory_Export_${date}.xlsx`);
  showNotification('Export completed successfully');
}

function showFilterDialog() {
  const data = JSON.parse(localStorage.getItem('stockData')) || [];
  const stockLevels = getCurrentStockLevels(data);
  const container = document.getElementById('filterItemsContainer');
  
  container.innerHTML = `
    <div class="filter-controls">
      <button onclick="toggleSelectAll(true)" class="select-all-btn">Select All</button>
      <button onclick="toggleSelectAll(false)" class="unselect-all-btn">Unselect All</button>
    </div>
  `;
  
  Object.keys(stockLevels).forEach(itemKey => {
    const itemName = getDisplayNameForItem(data, itemKey);
    const div = document.createElement('div');
    div.className = 'filter-item';
    div.innerHTML = `
      <input type="checkbox" id="filter-${itemKey}" ${!filteredItems || filteredItems.includes(itemKey) ? 'checked' : ''}>
      <label for="filter-${itemKey}">${itemName}</label>
    `;
    container.appendChild(div);
  });
  
  document.getElementById('filterDialog').style.display = 'block';
}

function toggleSelectAll(select) {
  const checkboxes = document.querySelectorAll('#filterItemsContainer .filter-item input[type="checkbox"]');
  checkboxes.forEach(checkbox => {
    checkbox.checked = select;
  });
}

function closeFilterDialog() {
  document.getElementById('filterDialog').style.display = 'none';
}

function applyFilters() {
  const container = document.getElementById('filterItemsContainer');
  const checkboxes = container.querySelectorAll('input[type="checkbox"]');
  
  filteredItems = Array.from(checkboxes)
    .filter(checkbox => checkbox.checked)
    .map(checkbox => checkbox.id.replace('filter-', ''));
  
  closeFilterDialog();
  loadDashboard();
}

function getCurrentStockLevels(data) {
  const stockLevels = {};
  
  data.forEach(entry => {
    const qty = parseFloat(entry.qty) || 0;
    const itemKey = entry.item.toLowerCase();
    
    if (entry.type === "in") {
      stockLevels[itemKey] = (stockLevels[itemKey] || 0) + qty;
    } else if (entry.type === "out") {
      stockLevels[itemKey] = (stockLevels[itemKey] || 0) - qty;
    }
  });
  
  return stockLevels;
}

function getDisplayNameForItem(data, itemKey) {
  const entry = data.find(e => e.item.toLowerCase() === itemKey);
  return entry?.displayItem || entry?.item || itemKey;
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
  loadDashboard();
  
  // Listen for data changes
  window.addEventListener('stockDataChanged', loadDashboard);
  window.addEventListener('storage', function(e) {
    if (e.key === 'stockData' || e.key === 'stockDataUpdated') {
      loadDashboard();
    }
  });
});

document.addEventListener('DOMContentLoaded', function() {
  const container = document.getElementById('stockLevelsContainer');
  if (container) {
    container.addEventListener('scroll', function() {
      if (this.scrollTop > 0) {
        this.classList.add('scrolled');
      } else {
        this.classList.remove('scrolled');
      }
    });
  }
});