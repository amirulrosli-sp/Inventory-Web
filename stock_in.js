// stock_in.js
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let selectedStartDate = null;
let selectedEndDate = null;

function toggleDateFilter() {
  const modal = document.getElementById('dateFilterModal');
  modal.style.display = modal.style.display === 'block' ? 'none' : 'block';
  if (modal.style.display === 'block') {
    renderCalendarPreview();
  }
}

function closeDateFilter() {
  document.getElementById('dateFilterModal').style.display = 'none';
}

function applyDateFilter() {
  try {
    closeDateFilter();
    loadData();
  } catch (error) {
    console.error('Error applying date filter:', error);
    showNotification('Error applying date filter', true);
  }
}

function clearDateFilter() {
  selectedStartDate = null;
  selectedEndDate = null;
  renderCalendarPreview();
  loadData();
}

function isSameDay(date1, date2) {
  if (!date1 || !date2) return false;
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
}

function isDateInRange(date, start, end) {
  if (!start || !end) return false;
  return date >= start && date <= end;
}

function renderCalendarPreview() {
  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
  
  document.getElementById('calendarMonthTitle').textContent = 
    `${monthNames[currentMonth]} ${currentYear}`;
  
  const calendarGrid = document.querySelector('.simple-date-grid');
  const headers = Array.from(calendarGrid.querySelectorAll('.simple-date-day-header'));
  calendarGrid.innerHTML = '';
  headers.forEach(header => calendarGrid.appendChild(header));
  
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();
  const prevMonthStartDay = firstDay === 0 ? 6 : firstDay - 1;
  
  for (let i = prevMonthStartDay; i > 0; i--) {
    const dayElement = document.createElement('div');
    dayElement.className = 'simple-date-day other-month';
    dayElement.textContent = prevMonthDays - i + 1;
    calendarGrid.appendChild(dayElement);
  }
  
  for (let day = 1; day <= daysInMonth; day++) {
    const dayElement = document.createElement('div');
    dayElement.className = 'simple-date-day';
    dayElement.textContent = day;
    
    const currentDate = new Date(currentYear, currentMonth, day);
    
    if (selectedStartDate && isSameDay(currentDate, selectedStartDate)) {
      dayElement.classList.add('range-start');
    } else if (selectedEndDate && isSameDay(currentDate, selectedEndDate)) {
      dayElement.classList.add('range-end');
    } else if (selectedStartDate && selectedEndDate && 
               isDateInRange(currentDate, selectedStartDate, selectedEndDate)) {
      dayElement.classList.add('in-range');
    }
    
    dayElement.onclick = function() {
      const currentDate = new Date(currentYear, currentMonth, day);
      
      if (!selectedStartDate || (selectedStartDate && selectedEndDate)) {
        selectedStartDate = currentDate;
        selectedEndDate = null;
      } else if (currentDate < selectedStartDate) {
        selectedEndDate = selectedStartDate;
        selectedStartDate = currentDate;
      } else {
        selectedEndDate = currentDate;
      }
      
      renderCalendarPreview();
    };
    
    calendarGrid.appendChild(dayElement);
  }
  
  const cellsAdded = firstDay > 0 ? (firstDay - 1) + daysInMonth : daysInMonth;
  const daysNextMonth = Math.max(0, 35 - cellsAdded);
  for (let day = 1; day <= daysNextMonth; day++) {
    const dayElement = document.createElement('div');
    dayElement.className = 'simple-date-day other-month';
    dayElement.textContent = day;
    calendarGrid.appendChild(dayElement);
  }
  
  updateRangeDisplay();
}

function changeMonth(offset) {
  currentMonth += offset;
  
  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear--;
  } else if (currentMonth > 11) {
    currentMonth = 0;
    currentYear++;
  }
  
  renderCalendarPreview();
}

function updateRangeDisplay() {
  const rangeText = document.getElementById('selectedRangeText');
  if (!selectedStartDate) {
    rangeText.textContent = 'Select a date range by clicking start and end dates';
    return;
  }
  
  const startStr = selectedStartDate.toLocaleDateString();
  
  if (!selectedEndDate) {
    rangeText.textContent = `Selected: ${startStr}`;
    return;
  }
  
  const endStr = selectedEndDate.toLocaleDateString();
  rangeText.textContent = `Selected: ${startStr} to ${endStr}`;
  
  const diffTime = Math.abs(selectedEndDate - selectedStartDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  rangeText.innerHTML += `<div>${diffDays} days selected</div>`;
}

function getData() {
  const data = localStorage.getItem('stockData');
  try {
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

function saveData(data) {
  localStorage.setItem('stockData', JSON.stringify(data));
  window.dispatchEvent(new Event('stockDataChanged'));
  localStorage.setItem('stockDataUpdated', Date.now());
}

function getCurrentDateTime() {
  const now = new Date();
  return {
    date: now.toLocaleDateString(),
    time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };
}

function logAdminActivity(action, username, type) {
  const activity = {
    action,
    username,
    type,
    timestamp: new Date().toISOString()
  };
  
  const activities = JSON.parse(localStorage.getItem('adminActivities') || '[]');
  activities.push(activity);
  localStorage.setItem('adminActivities', JSON.stringify(activities));
}

function addStock() {
  try {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    if (!currentUser) {
      window.location.href = 'index.html';
      return false;
    }
    
    if (currentUser.role !== 'admin') {
      console.error('Access denied for user:', currentUser.username, 'Role:', currentUser.role);
      
      const notificationMessage = '⛔ Access Denied: Only administrators can add stock';
      const tempToast = document.createElement('div');
      tempToast.className = 'notification-toast warning force-show';
      tempToast.innerHTML = `
        <div class="toast-message">${notificationMessage}</div>
        <div class="toast-progress" style="animation-duration: 5s;"></div>
      `;
      document.body.appendChild(tempToast);
      
      setTimeout(() => {
        tempToast.classList.add('show');
        setTimeout(() => {
          tempToast.classList.remove('show');
          setTimeout(() => tempToast.remove(), 500);
        }, 5000);
      }, 10);
      
      return false;
    }

    const item = document.getElementById("item").value.trim();
    const normalizedItem = item.toLowerCase();
    const qty = parseFloat(document.getElementById("qty").value.trim());
    const price = parseFloat(document.getElementById("price").value.trim());
    const supplier = document.getElementById("supplier").value.trim();
    const receiver = document.getElementById("receiver").value.trim();
    const note = document.getElementById("note").value.trim();

    if (!item || !qty || !price || !supplier || !receiver) {
      showNotification('Please fill all required fields', true, false);
      return false;
    }

    if (qty <= 0 || price <= 0) {
      showNotification('Quantity and price must be positive numbers', true);
      return false;
    }

    const { date, time } = getCurrentDateTime();
    const data = getData();
    
    const newEntry = {
      type: "in",
      item: normalizedItem,
      displayItem: item,
      qty,
      price,
      totalPrice: qty * price,
      supplier,
      receiver,
      note,
      date,
      time
    };
    
    data.push(newEntry);
    saveData(data);
    
    logAdminActivity(
      `${qty} ${item} from ${supplier}`,
      currentUser.username,
      'stock-in'
    );
    
    showNotification(`${receiver} received ${qty} ${item} from ${supplier}`);
    clearForm();
    loadData();
    return true;
    
  } catch (error) {
    console.error('Error in addStock:', error);
    showNotification('An error occurred while processing your request', true);
    return false;
  }
}

function calculateTotal() {
  const qty = parseFloat(document.getElementById("qty").value) || 0;
  const price = parseFloat(document.getElementById("price").value) || 0;
  const total = qty * price;
  document.getElementById("total-price").value = total.toFixed(2);
}

function clearForm() {
  document.getElementById("item").value = "";
  document.getElementById("qty").value = "";
  document.getElementById("price").value = "";
  document.getElementById("total-price").value = "";
  document.getElementById("supplier").value = "";
  document.getElementById("receiver").value = "";
  document.getElementById("note").value = "";
}

function loadData() {
  const keyword = document.getElementById("search").value.toLowerCase();
  const data = getData();
  const tbody = document.querySelector("#stock-table tbody");
  tbody.innerHTML = "";

  const filteredData = data.filter(entry => {
    if (entry.type !== "in") return false;
    
    if (keyword) {
      const searchStr = `${entry.item} ${entry.qty} ${entry.supplier} ${entry.receiver} ${entry.note || ''} ${entry.date} ${entry.time}`.toLowerCase();
      if (!searchStr.includes(keyword)) return false;
    }
    
    if (selectedStartDate || selectedEndDate) {
      try {
        const entryDate = new Date(entry.date);
        if (selectedStartDate && !selectedEndDate) {
          if (!isSameDay(entryDate, selectedStartDate)) {
            return false;
          }
        } else if (selectedStartDate && selectedEndDate) {
          if (!isDateInRange(entryDate, selectedStartDate, selectedEndDate)) {
            return false;
          }
        }
      } catch (e) {
        console.error('Error parsing date:', e);
        return true;
      }
    }
    
    return true;
  });

  if (filteredData.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10" class="empty-state">No stock in records found</td>
      </tr>
    `;
    return;
  }

  filteredData.forEach((entry, i) => {
    const actualIndex = data.findIndex(e => 
      e.type === "in" && 
      e.item.toLowerCase() === entry.item.toLowerCase() && 
      e.qty === entry.qty && 
      e.date === entry.date && 
      e.time === entry.time
    );
    
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${entry.displayItem || entry.item}</td>
      <td>${entry.qty}</td>
      <td>${entry.price.toFixed(2)}</td>
      <td>${entry.totalPrice.toFixed(2)}</td>
      <td>${entry.supplier}</td>
      <td>${entry.receiver}</td>
      <td>${entry.note || '-'}</td>
      <td class="date-column">${entry.date}</td>
      <td class="time-column">${entry.time}</td>
      <td>
        <button class="action-btn" onclick="editStock(${actualIndex})"><i class="fas fa-edit"></i></button>
        <button class="action-btn" onclick="deleteStock(${actualIndex})"><i class="fas fa-trash"></i></button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function deleteStock(index) {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  if (!currentUser) {
    showNotification('User not authenticated', true);
    return;
  }

  if (!confirm("Are you sure you want to delete this entry?")) return;
  const data = getData();
  
  if (data[index] && data[index].type === "in") {
    const deletedItem = data[index];
    data.splice(index, 1);
    saveData(data);
    
    logAdminActivity(
      `deleted stock in: ${deletedItem.qty} ${deletedItem.displayItem || deletedItem.item}`,
      currentUser.username,
      'delete'
    );
    
    showNotification(`Deleted stock in: ${deletedItem.qty} ${deletedItem.displayItem || deletedItem.item}`);
    loadData();
  }
}

function editStock(index) {
  const data = getData();
  const entry = data[index];
  if (!entry || entry.type !== "in") return;

  document.getElementById("item").value = entry.displayItem || entry.item;
  document.getElementById("qty").value = entry.qty;
  document.getElementById("price").value = entry.price;
  document.getElementById("total-price").value = entry.totalPrice;
  document.getElementById("supplier").value = entry.supplier;
  document.getElementById("receiver").value = entry.receiver;
  document.getElementById("note").value = entry.note || '';

  const fab = document.querySelector('.fab');
  fab.innerHTML = '<i class="fas fa-save"></i>';
  fab.onclick = function() {
    addStock();
    fab.innerHTML = '<i class="fas fa-plus"></i>';
    fab.onclick = addStock;
  };
}

document.addEventListener('DOMContentLoaded', () => {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));

  if (!currentUser) {
    window.location.href = 'index.html';
    return;
  }

  if (currentUser.role !== 'admin') {
    const notificationMessage = '⛔ Access Denied: Only administrators can access Stock In';
    const tempToast = document.createElement('div');
    tempToast.className = 'notification-toast warning force-show';
    tempToast.innerHTML = `
      <div class="toast-message">${notificationMessage}</div>
      <div class="toast-progress" style="animation-duration: 5s;"></div>
    `;
    document.body.appendChild(tempToast);

    setTimeout(() => {
      tempToast.classList.add('show');
      setTimeout(() => {
        tempToast.classList.remove('show');
        setTimeout(() => tempToast.remove(), 500);
      }, 5000);
    }, 10);

    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 5500);
    return;
  }

  document.getElementById("qty").addEventListener("input", calculateTotal);
  document.getElementById("price").addEventListener("input", calculateTotal);
  loadData();
});

document.addEventListener('DOMContentLoaded', function() {
  const container = document.getElementById('stock-in-container');
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