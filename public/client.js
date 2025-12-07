const socket = io();

// ---------- STATE ----------
let currentUser = null;
let subscribedStocks = new Set();
let previousPrices = {};
let currentPrices = {};

let cashBalance = 10000.0;
let holdings = {};

let priceHistory = {};
let sparkCharts = {};

let priceAlerts = {};
let alertTriggered = {};
let alertTimeoutId = null;

// ➕ NEW: trade history
let tradeHistory = [];

// ---------- DOM ----------
const dashboardScreen = document.getElementById("dashboard-screen");

const availableContainer = document.getElementById("available-stocks");
const stockListContainer = document.getElementById("stock-list");
const emptyMsg = document.getElementById("empty-msg");
const cashDisplay = document.getElementById("cash-balance");
const netWorthDisplay = document.getElementById("net-worth");

const poCard = document.getElementById("portfolio-overview");
const poTotal = document.getElementById("po-total");
const poHigh = document.getElementById("po-high");
const poLow = document.getElementById("po-low");
const poAvg = document.getElementById("po-avg");

const alertBanner = document.getElementById("alert-banner");
const logoutBtn = document.getElementById("logout-btn");

//trade history DOM
const tradeBody = document.getElementById("trade-body");
const tradeEmptyMsg = document.getElementById("trade-empty-msg");

// profile DOM
const profileAvatarLetter = document.getElementById("profile-avatar-letter");
const profileName = document.getElementById("profile-name");
const profileEmail = document.getElementById("profile-email");
const profileWatchedCount = document.getElementById("profile-watched-count");

// ---------- INIT ON PAGE LOAD ----------
window.addEventListener("load", () => {
  const email = localStorage.getItem("stockUserEmail");
  if (!email) {
    // no login done → go back to login page
    window.location.href = "index.html";
    return;
  }

  currentUser = email;
  socket.emit("login", email);

  document.getElementById("user-display").innerText = email;

  // fill profile box
  if (profileEmail) profileEmail.innerText = email;
  if (profileName) {
    const namePart = email.split("@")[0];
    profileName.innerText = namePart || "Trader";
  }
  if (profileAvatarLetter) {
    profileAvatarLetter.innerText = (email[0] || "U").toUpperCase();
  }
  if (profileWatchedCount) {
    profileWatchedCount.innerText = subscribedStocks.size;
  }

  updatePortfolioSummary();
});

// ---------- ALERT BANNER ----------
function showAlertBanner(message) {
  if (!alertBanner) return;
  alertBanner.innerText = message;
  alertBanner.classList.remove("hidden");

  if (alertTimeoutId) clearTimeout(alertTimeoutId);
  alertTimeoutId = setTimeout(() => {
    alertBanner.classList.add("hidden");
  }, 5000);
}

// ---------- LOGOUT ----------
logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("stockUserEmail");
  window.location.href = "index.html";
});

// ---------- INIT AVAILABLE STOCKS ----------
socket.on("init-data", (data) => {
  availableContainer.innerHTML = "";
  data.available.forEach((ticker) => {
    holdings[ticker] = 0;
    priceHistory[ticker] = [];
    priceAlerts[ticker] = null;
    alertTriggered[ticker] = false;

    const btn = document.createElement("button");
    btn.innerText = `Watch ${ticker}`;
    btn.onclick = () => toggleSubscription(ticker, btn);
    availableContainer.appendChild(btn);
  });
});

// ---------- SUBSCRIBE / UNSUBSCRIBE ----------
function toggleSubscription(ticker, btnElement) {
  if (subscribedStocks.has(ticker)) {
    subscribedStocks.delete(ticker);
    btnElement.classList.remove("active");
    btnElement.innerText = `Watch ${ticker}`;
    const card = document.getElementById(`card-${ticker}`);
    if (card) card.remove();

    if (sparkCharts[ticker]) {
      sparkCharts[ticker].destroy();
      delete sparkCharts[ticker];
    }
  } else {
    subscribedStocks.add(ticker);
    btnElement.classList.add("active");
    btnElement.innerText = `Unwatch ${ticker}`;
  }

  emptyMsg.style.display = subscribedStocks.size === 0 ? "block" : "none";

  if (profileWatchedCount) {
    profileWatchedCount.innerText = subscribedStocks.size;
  }

  updatePortfolioSummary();
}

// ---------- REAL-TIME PRICE UPDATES ----------
socket.on("market-update", (prices) => {
  if (!currentUser) return;

  currentPrices = prices;

  for (const [ticker, price] of Object.entries(prices)) {
    if (!priceHistory[ticker]) priceHistory[ticker] = [];
    priceHistory[ticker].push(price);
    if (priceHistory[ticker].length > 50) {
      priceHistory[ticker].shift();
    }

    const target = priceAlerts[ticker];
    if (target != null && !alertTriggered[ticker] && price >= target) {
      alertTriggered[ticker] = true;
      showAlertBanner(
        `Alert: ${ticker} has reached $${price.toFixed(
          2
        )} (target $${target.toFixed(2)})`
      );
      const card = document.getElementById(`card-${ticker}`);
      if (card) card.classList.add("alert-active");
    }
  }

  updatePortfolioSummary();

  for (const [ticker, price] of Object.entries(prices)) {
    if (subscribedStocks.has(ticker)) {
      updateStockCard(ticker, price);
      updateSparkChart(ticker);
    }
  }
});

// ---------- STOCK CARD + MINI GRAPH ----------
function updateStockCard(ticker, price) {
  let card = document.getElementById(`card-${ticker}`);

  if (!card) {
    card = document.createElement("div");
    card.id = `card-${ticker}`;
    card.className = "stock-card";
    card.innerHTML = `
      <h3>${ticker}</h3>
      <div class="stock-price" id="price-${ticker}">...</div>

      <div class="spark-container">
        <canvas id="spark-${ticker}" class="spark-chart"></canvas>
      </div>

      <div class="trade-controls">
        <button onclick="buyStock('${ticker}')" class="buy-btn">Buy</button>
        <span id="qty-${ticker}">0 Owned</span>
        <button onclick="sellStock('${ticker}')" class="sell-btn">Sell</button>
      </div>
      <div class="alert-controls">
        <input type="number" step="0.01" min="0"
               id="alert-input-${ticker}" class="alert-input" placeholder="Alert">
        <button onclick="setAlert('${ticker}')" class="alert-btn">Set</button>
      </div>
      <p id="alert-status-${ticker}" class="alert-status">No alert set</p>
    `;
    stockListContainer.appendChild(card);

    initSparkChart(ticker);
  }

  const priceEl = document.getElementById(`price-${ticker}`);
  const prev = previousPrices[ticker] || 0;

  priceEl.innerText = `$${price.toFixed(2)}`;
  priceEl.className =
    "stock-price " + (price >= prev ? "price-up" : "price-down");

  previousPrices[ticker] = price;
}

// ---------- TRADING ----------
window.buyStock = function (ticker) {
  const price = currentPrices[ticker];
  if (!price) {
    alert("Price unavailable.");
    return;
  }
  if (cashBalance >= price) {
    const qty = 1; // buying 1 share per click
    cashBalance -= price;
    holdings[ticker]++;
    updateHoldingsUI(ticker);
    updatePortfolioSummary();
    recordTrade("BUY", ticker, price, qty);
  } else {
    alert("Not enough cash!");
  }
};

window.sellStock = function (ticker) {
  const price = currentPrices[ticker];
  if (!price) {
    alert("Price unavailable.");
    return;
  }
  if (holdings[ticker] > 0) {
    const qty = 1; // selling 1 share per click
    cashBalance += price;
    holdings[ticker]--;
    updateHoldingsUI(ticker);
    updatePortfolioSummary();
    recordTrade("SELL", ticker, price, qty);
  } else {
    alert("You don't own any shares of this stock!");
  }
};

function updateHoldingsUI(ticker) {
  const qtyEl = document.getElementById(`qty-${ticker}`);
  if (qtyEl) {
    qtyEl.innerText = `${holdings[ticker]} Owned`;
  }
}

// ---------- TRADE HISTORY UI ----------
function recordTrade(type, ticker, price, qty) {
  const now = new Date();
  const entry = {
    time: now.toLocaleTimeString(),
    ticker,
    type,
    price,
    qty,
    cashAfter: cashBalance,
  };

  // newest at top
  tradeHistory.unshift(entry);

  // keep only last 6 trades
  if (tradeHistory.length > 6) {
    tradeHistory.pop();
  }

  renderTradeHistory();
}

function renderTradeHistory() {
  if (!tradeBody || !tradeEmptyMsg) return;

  tradeBody.innerHTML = "";

  if (tradeHistory.length === 0) {
    tradeEmptyMsg.style.display = "inline";
    return;
  }
  tradeEmptyMsg.style.display = "none";

  tradeHistory.forEach((t) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${t.time}</td>
      <td>${t.ticker}</td>
      <td class="${t.type === "BUY" ? "trade-buy" : "trade-sell"}">
        ${t.type}
      </td>
      <td>$${t.price.toFixed(2)}</td>
      <td>${t.qty}</td>
      <td>$${t.cashAfter.toFixed(2)}</td>
    `;
    tradeBody.appendChild(row);
  });
}

// ---------- PRICE ALERTS ----------
window.setAlert = function (ticker) {
  const input = document.getElementById(`alert-input-${ticker}`);
  const status = document.getElementById(`alert-status-${ticker}`);
  if (!input) return;

  const raw = input.value.trim();
  const value = parseFloat(raw);

  if (!raw || isNaN(value) || value <= 0) {
    alert("Please enter a valid alert price.");
    return;
  }

  priceAlerts[ticker] = value;
  alertTriggered[ticker] = false;
  if (status) {
    status.innerText = `Alert set at $${value.toFixed(2)}`;
  }

  const card = document.getElementById(`card-${ticker}`);
  if (card) card.classList.remove("alert-active");
};

function updatePortfolioSummary() {
  let stockValue = 0;
  for (const [ticker, qty] of Object.entries(holdings)) {
    if (currentPrices[ticker]) {
      stockValue += qty * currentPrices[ticker];
    }
  }

  const totalNetWorth = cashBalance + stockValue;

  cashDisplay.innerText = `$${cashBalance.toFixed(2)}`;
  netWorthDisplay.innerText = `$${totalNetWorth.toFixed(2)}`;
  netWorthDisplay.style.color =
    totalNetWorth >= 10000 ? "#00ff00" : "#ff4444";

  const subscribedArray = Array.from(subscribedStocks);
  const subscribedPrices = subscribedArray
    .map((ticker) => currentPrices[ticker])
    .filter((p) => typeof p === "number");

  if (subscribedPrices.length === 0) {
    poCard.classList.add("hidden");
    poTotal.textContent = "0";
    poHigh.textContent = "--";
    poLow.textContent = "--";
    poAvg.textContent = "--";
    return;
  }

  poCard.classList.remove("hidden");

  const high = Math.max(...subscribedPrices);
  const low = Math.min(...subscribedPrices);
  const avg =
    subscribedPrices.reduce((sum, p) => sum + p, 0) /
    subscribedPrices.length;

  poTotal.textContent = subscribedArray.length;
  poHigh.textContent = `$${high.toFixed(2)}`;
  poLow.textContent = `$${low.toFixed(2)}`;
  poAvg.textContent = `$${avg.toFixed(2)}`;
}

// ---------- MINI CHARTS ----------
function initSparkChart(ticker) {
  const canvas = document.getElementById(`spark-${ticker}`);
  if (!canvas || sparkCharts[ticker]) return;

  const ctx = canvas.getContext("2d");
  sparkCharts[ticker] = new Chart(ctx, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          data: [],
          tension: 0.3,
          borderWidth: 1.2,
          pointRadius: 0
        }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { display: false },
        y: { display: false }
      }
    }
  });
}

function updateSparkChart(ticker) {
  const chart = sparkCharts[ticker];
  if (!chart) return;

  const history = priceHistory[ticker] || [];
  const labels = history.map((_, i) => i + 1);

  chart.data.labels = labels;
  chart.data.datasets[0].data = history;
  chart.update();
}
