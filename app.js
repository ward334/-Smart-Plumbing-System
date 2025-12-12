/**
 * SPS - Smart Plumbing System
 * Standalone JavaScript for Hackathon Demo
 * =========================================
 */

// ============ DATA STORE ============
const SPSData = {
  sensors: [
    { id: 1, name: "Sensor #1", description: "Main Pipe", location: "Upper floor – Kitchen", x: 30, y: 25, status: "active" },
    { id: 2, name: "Sensor #2", description: "Secondary Pipe", location: "Ground floor – Bathroom", x: 70, y: 45, status: "active" },
    { id: 3, name: "Sensor #3", description: "Branch Pipe", location: "Basement – Utility Room", x: 50, y: 75, status: "active" }
  ],
  alerts: [],
  blueprintImage: "images/blueprint-bg.png"
};

// Load data from localStorage
function loadData() {
  const savedAlerts = localStorage.getItem("sps-alerts");
  if (savedAlerts) {
    SPSData.alerts = JSON.parse(savedAlerts);
  }
  
  const savedSensors = localStorage.getItem("sps-sensors");
  if (savedSensors) {
    SPSData.sensors = JSON.parse(savedSensors);
  }
  
  const savedBlueprint = localStorage.getItem("sps-blueprint");
  if (savedBlueprint) {
    SPSData.blueprintImage = savedBlueprint;
  }
}

// Save data to localStorage
function saveData() {
  localStorage.setItem("sps-alerts", JSON.stringify(SPSData.alerts));
  localStorage.setItem("sps-sensors", JSON.stringify(SPSData.sensors));
  localStorage.setItem("sps-blueprint", SPSData.blueprintImage);
}

// ============ UTILITY FUNCTIONS ============
function formatDate(date) {
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function showToast(message, type = "info") {
  // Remove existing toast
  const existingToast = document.querySelector(".toast");
  if (existingToast) {
    existingToast.remove();
  }
  
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  // Trigger animation
  setTimeout(() => toast.classList.add("show"), 10);
  
  // Remove after 3 seconds
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function navigateTo(page) {
  window.location.href = page;
}

// ============ SENSOR FUNCTIONS ============
function getSensorById(id) {
  return SPSData.sensors.find(s => s.id === id);
}

function updateSensorStatus(id, status) {
  const sensor = getSensorById(id);
  if (sensor) {
    sensor.status = status;
    saveData();
  }
}

function simulateLeak(sensorId = null) {
  let targetSensor;
  
  if (sensorId) {
    targetSensor = getSensorById(sensorId);
  } else {
    // Random sensor
    const activeSensors = SPSData.sensors.filter(s => s.status === "active");
    if (activeSensors.length === 0) {
      showToast("All sensors already have leaks!", "error");
      return null;
    }
    targetSensor = activeSensors[Math.floor(Math.random() * activeSensors.length)];
  }
  
  if (!targetSensor) {
    showToast("Sensor not found!", "error");
    return null;
  }
  
  // Update sensor status
  targetSensor.status = "leak";
  
  // Create alert
  const alert = {
    id: Date.now().toString(),
    sensorId: targetSensor.id,
    type: "leak",
    severity: "high",
    message: `Leak detected in ${targetSensor.name}`,
    location: targetSensor.location,
    timestamp: new Date().toISOString(),
    isRead: false
  };
  
  SPSData.alerts.unshift(alert);
  saveData();
  
  return alert;
}

function resetSystem() {
  SPSData.sensors.forEach(sensor => {
    sensor.status = "active";
  });
  saveData();
  showToast("System reset successfully!", "success");
}

// ============ DASHBOARD STATS ============
function getDashboardStats() {
  const totalSensors = SPSData.sensors.length;
  const activeSensors = SPSData.sensors.filter(s => s.status === "active").length;
  const leakingSensors = SPSData.sensors.filter(s => s.status === "leak").length;
  const warningSensors = SPSData.sensors.filter(s => s.status === "warning").length;
  
  // Get today's alerts
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const alertsToday = SPSData.alerts.filter(a => new Date(a.timestamp) >= today).length;
  
  // Calculate health percentage
  let healthPercentage = 100;
  healthPercentage -= leakingSensors * 15;
  healthPercentage -= warningSensors * 5;
  healthPercentage -= alertsToday * 2;
  healthPercentage = Math.max(0, Math.min(100, healthPercentage));
  
  return {
    totalSensors,
    activeSensors,
    leakingSensors,
    warningSensors,
    alertsToday,
    healthPercentage
  };
}

// ============ BLUEPRINT FUNCTIONS ============
function renderSensors(container) {
  // Clear existing sensors
  container.querySelectorAll(".sensor-point").forEach(el => el.remove());
  
  SPSData.sensors.forEach(sensor => {
    const point = document.createElement("div");
    point.className = `sensor-point ${sensor.status === "leak" ? "leak" : sensor.status === "warning" ? "warning" : sensor.status === "offline" ? "offline" : ""}`;
    point.style.left = `${sensor.x}%`;
    point.style.top = `${sensor.y}%`;
    point.dataset.sensorId = sensor.id;
    
    // Add warning icon for leak
    if (sensor.status === "leak") {
      point.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
    }
    
    // Tooltip on hover
    point.addEventListener("mouseenter", (e) => showSensorTooltip(e, sensor));
    point.addEventListener("mouseleave", hideSensorTooltip);
    point.addEventListener("click", () => showSensorDetails(sensor));
    
    container.appendChild(point);
  });
}

function showSensorTooltip(event, sensor) {
  let tooltip = document.querySelector(".sensor-tooltip");
  if (!tooltip) {
    tooltip = document.createElement("div");
    tooltip.className = "tooltip sensor-tooltip";
    document.body.appendChild(tooltip);
  }
  
  const statusText = sensor.status === "leak" ? "⚠️ LEAK DETECTED" : 
                     sensor.status === "warning" ? "⚡ Warning" :
                     sensor.status === "offline" ? "🔌 Offline" : "✓ Active";
  
  tooltip.innerHTML = `
    <strong>${sensor.name}</strong><br>
    ${sensor.description}<br>
    📍 ${sensor.location}<br>
    Status: ${statusText}
  `;
  
  const rect = event.target.getBoundingClientRect();
  tooltip.style.left = `${rect.left + rect.width / 2}px`;
  tooltip.style.top = `${rect.top - 10}px`;
  tooltip.style.transform = "translate(-50%, -100%)";
  tooltip.classList.add("visible");
}

function hideSensorTooltip() {
  const tooltip = document.querySelector(".sensor-tooltip");
  if (tooltip) {
    tooltip.classList.remove("visible");
  }
}

function showSensorDetails(sensor) {
  showToast(`${sensor.name}: ${sensor.description} - ${sensor.location}`, "info");
}

// ============ MODAL FUNCTIONS ============
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add("active");
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove("active");
  }
}

function closeAllModals() {
  document.querySelectorAll(".modal-overlay").forEach(modal => {
    modal.classList.remove("active");
  });
}

// Close modal on overlay click
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("modal-overlay")) {
    e.target.classList.remove("active");
  }
});

// Close modal on ESC key
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeAllModals();
  }
});

// ============ CHART FUNCTIONS ============
function renderLeakChart(container) {
  // Generate mock data for last 7 days
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const data = [2, 5, 3, 7, 4, 6, 3];
  const maxValue = Math.max(...data);
  
  container.innerHTML = "";
  
  data.forEach((value, index) => {
    const bar = document.createElement("div");
    bar.className = "bar";
    bar.style.height = `${(value / maxValue) * 100}%`;
    
    const label = document.createElement("span");
    label.className = "bar-label";
    label.textContent = days[index];
    bar.appendChild(label);
    
    container.appendChild(bar);
  });
}

// ============ BLUEPRINT UPLOAD ============
function handleBlueprintUpload(input) {
  const file = input.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      SPSData.blueprintImage = e.target.result;
      saveData();
      
      // Update image on page
      const blueprintImg = document.querySelector(".blueprint-image");
      if (blueprintImg) {
        blueprintImg.src = SPSData.blueprintImage;
      }
      
      showToast("Blueprint uploaded successfully!", "success");
    };
    reader.readAsDataURL(file);
  }
}

// ============ ALERTS FUNCTIONS ============
function renderAlerts(container) {
  container.innerHTML = "";
  
  if (SPSData.alerts.length === 0) {
    container.innerHTML = `
      <div class="text-center py-6">
        <p class="text-muted">No alerts recorded yet.</p>
        <p class="text-muted" style="font-size: 0.875rem;">Simulate a leak to see alerts here.</p>
      </div>
    `;
    return;
  }
  
  SPSData.alerts.forEach(alert => {
    const sensor = getSensorById(alert.sensorId);
    const alertEl = document.createElement("div");
    alertEl.className = `alert-item ${alert.type}`;
    alertEl.innerHTML = `
      <div class="alert-icon ${alert.type}">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </div>
      <div class="alert-content">
        <div class="alert-title">Leak Detected</div>
        <div class="alert-message">${alert.message}</div>
        <div class="alert-location">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          ${alert.location}
        </div>
      </div>
      <div class="alert-time">${formatDate(alert.timestamp)}</div>
    `;
    
    alertEl.addEventListener("click", () => {
      // Navigate to blueprint and highlight sensor
      localStorage.setItem("sps-highlight-sensor", alert.sensorId);
      navigateTo("blueprint.html");
    });
    
    container.appendChild(alertEl);
  });
}

// ============ INITIALIZATION ============
function initApp() {
  loadData();
  
  // Check for highlighted sensor (from alerts page)
  const highlightSensorId = localStorage.getItem("sps-highlight-sensor");
  if (highlightSensorId) {
    localStorage.removeItem("sps-highlight-sensor");
    setTimeout(() => {
      const sensorPoint = document.querySelector(`[data-sensor-id="${highlightSensorId}"]`);
      if (sensorPoint) {
        sensorPoint.style.transform = "translate(-50%, -50%) scale(1.5)";
        sensorPoint.style.boxShadow = "0 0 20px var(--primary)";
        setTimeout(() => {
          sensorPoint.style.transform = "";
          sensorPoint.style.boxShadow = "";
        }, 2000);
      }
    }, 500);
  }
}

// Initialize on DOM ready
document.addEventListener("DOMContentLoaded", initApp);

// ============ EXPORT FOR GLOBAL ACCESS ============
window.SPS = {
  data: SPSData,
  simulateLeak,
  resetSystem,
  getDashboardStats,
  renderSensors,
  renderAlerts,
  renderLeakChart,
  handleBlueprintUpload,
  openModal,
  closeModal,
  showToast,
  navigateTo,
  saveData,
  loadData
};
