// stock_out.js
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let selectedStartDate = null;
let selectedEndDate = null;

function closeDateFilter() {
  document.getElementById('dateFilterModal').style.display = 'none';
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

let allItems = [];

function populateItemDropdown() {
  const data = getData();
  allItems = [...new Set(data
    .filter(entry => entry.type === "in")
    .map(entry => entry.item)
  )].sort();
  
  filterItems();
}

function filterItems() {
  const searchTerm = document.getElementById('itemSearch').value.toLowerCase();
  const dropdownItems = document.getElementById('dropdownItems');
  dropdownItems.innerHTML = '';
  
  const filteredItems = allItems.filter(item => 
    item.toLowerCase().includes(searchTerm)
  );
  
  if (filteredItems.length === 0) {
    dropdownItems.innerHTML = '<div class="empty-dropdown">No items found</div>';
    return;
  }
  
  filteredItems.forEach(item => {
    const itemElement = document.createElement('div');
    itemElement.className = 'dropdown-item';
    
    const availableStock = calculateCurrentStock(item);
    
    itemElement.innerHTML = `
      <span>${item}</span>
      <span class="stock-count">${availableStock} available</span>
    `;
    
    itemElement.onclick = function() {
      selectItem(item);
    };
    dropdownItems.appendChild(itemElement);
  });
}

function selectItem(item) {
  document.getElementById('selectedItem').textContent = item;
  document.getElementById('item').value = item;
  closeDropdown();
  document.getElementById('qty').focus();
}

function toggleDropdown() {
  const dropdown = document.getElementById('itemDropdown');
  if (dropdown.style.display === 'block') {
    closeDropdown();
  } else {
    populateItemDropdown();
    dropdown.style.display = 'block';
    document.getElementById('itemSearch').focus();
  }
}

function closeDropdown() {
  document.getElementById('itemDropdown').style.display = 'none';
}

function addStockOut() {
  try {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) {
      showNotification('User not authenticated', true);
      return;
    }

    const itemInput = document.getElementById('item');
    const qtyInput = document.getElementById('qty');
    const personInput = document.getElementById('person');
    const reasonInput = document.getElementById('reason');

    if (!itemInput || !qtyInput || !personInput) {
      console.error('Required form elements not found');
      showNotification('Form elements missing', true);
      return;
    }

    const item = itemInput.value.trim();
    const qty = parseInt(qtyInput.value.trim());
    const person = personInput.value.trim();
    const reason = reasonInput ? reasonInput.value.trim() : '';

    if (!item || isNaN(qty) || !person) {
      showNotification('Please fill all required fields', true, false);
      return;
    }

    if (qty <= 0) {
      showNotification('Quantity must be a positive number', true);
      return;
    }

    const availableStock = calculateCurrentStock(item);
    if (qty > availableStock) {
      showNotification(`Cannot stock out ${qty} ${item} - only ${availableStock} available`, true);
      return;
    }

    const { date, time } = getCurrentDateTime();
    const data = getData();
    
    const newEntry = {
      type: "out",
      item,
      qty,
      person,
      reason,
      date,
      time
    };
    
    data.push(newEntry);
    saveData(data);
    
    logAdminActivity(
      `${qty} ${item} to ${person}${reason ? ' (' + reason + ')' : ''}`,
      currentUser.username,
      'stock-out'
    );
    
    showNotification(`${person} took ${qty} ${item}${reason ? ' (' + reason + ')' : ''}`);
    
    const newStock = availableStock - qty;
    if (newStock < 5) {
      showNotification(`Warning: Low stock for ${item} (${newStock} remaining)`, true);
    }
    
    clearForm();
    loadData();
  } catch (error) {
    console.error('Error in addStockOut:', error);
    showNotification('An error occurred while processing your request', true);
  }
}

function calculateCurrentStock(itemName) {
  const data = getData();
  return data.reduce((total, entry) => {
    if (entry.item === itemName) {
      return total + (entry.type === 'in' ? entry.qty : -entry.qty);
    }
    return total;
  }, 0);
}

function clearForm() {
  const itemDisplay = document.getElementById('selectedItem');
  const itemInput = document.getElementById('item');
  const qtyInput = document.getElementById('qty');
  const personInput = document.getElementById('person');
  const reasonInput = document.getElementById('reason');

  if (itemDisplay) itemDisplay.textContent = 'Select item';
  if (itemInput) itemInput.value = '';
  if (qtyInput) qtyInput.value = '';
  if (personInput) personInput.value = '';
  if (reasonInput) reasonInput.value = '';
}

function loadData() {
  const keyword = document.getElementById("search").value.toLowerCase();
  const data = getData();
  const tbody = document.querySelector("#stock-table tbody");
  tbody.innerHTML = "";

  const filteredData = data.filter(entry => {
    if (entry.type !== "out") return false;
    
    if (keyword) {
      const searchStr = `${entry.item} ${entry.qty} ${entry.person} ${entry.reason || ''} ${entry.date} ${entry.time}`.toLowerCase();
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
        <td colspan="7" class="empty-state">No stock out records found</td>
      </tr>
    `;
    return;
  }

  filteredData.forEach((entry, i) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${entry.item}</td>
      <td>${entry.qty}</td>
      <td>${entry.person}</td>
      <td>${entry.reason || '-'}</td>
      <td class="date-column">${entry.date}</td>
      <td class="time-column">${entry.time}</td>
      <td>
        <button class="action-btn" onclick="editStock(${i})">
          <i class="fas fa-edit"></i>
        </button>
        <button class="action-btn" onclick="deleteStock(${i})">
          <i class="fas fa-trash"></i>
        </button>
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
  
  if (data[index] && data[index].type === "out") {
    const deletedItem = data[index];
    data.splice(index, 1);
    saveData(data);
    
    logAdminActivity(
      `deleted stock out: ${deletedItem.qty} ${deletedItem.item}`,
      currentUser.username,
      'delete'
    );
    
    showNotification(`Deleted stock out: ${deletedItem.qty} ${deletedItem.item}`);
    loadData();
  }
}

function editStock(index) {
  const data = getData();
  const entry = data[index];
  if (!entry || entry.type !== "out") return;

  document.getElementById('selectedItem').textContent = entry.item;
  document.getElementById('item').value = entry.item;
  document.getElementById('qty').value = entry.qty;
  document.getElementById('person').value = entry.person;
  document.getElementById('reason').value = entry.reason || '';

  const fab = document.querySelector('.fab');
  fab.innerHTML = '<i class="fas fa-save"></i>';
  fab.onclick = function() {
    addStockOut();
    fab.innerHTML = '<i class="fas fa-plus"></i>';
    fab.onclick = addStockOut;
  };
}

function toggleDateFilter() {
  const modal = document.getElementById('dateFilterModal');
  modal.style.display = modal.style.display === 'block' ? 'none' : 'block';
  if (modal.style.display === 'block') {
    renderCalendarPreview();
  }
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

document.addEventListener('DOMContentLoaded', function() {
  loadData();
  populateItemDropdown();
  
  window.addEventListener('stockDataChanged', function() {
    populateItemDropdown();
    loadData();
  });

  const container = document.getElementById('stock-out-container');
  if (container) {
    container.addEventListener('scroll', function() {
      if (this.scrollTop > 0) {
        this.classList.add('scrolled');
      } else {
        this.classList.remove('scrolled');
      }
    });
  }

  if (document.getElementById('stock-table')) {
    loadData();
    populateItemDropdown();
    
    window.addEventListener('stockDataChanged', function() {
      populateItemDropdown();
      loadData();
    });

    const formContainer = document.querySelector('.form-container');
    if (formContainer) {
      formContainer.addEventListener('submit', function(e) {
        e.preventDefault();
        addStockOut();
      });
    }
  }
});