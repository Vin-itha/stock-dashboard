```text
Overview

The Stock Broker Dashboard is a real-time trading simulator where users can log in, subscribe to stocks,
monitor live price changes, buy/sell shares with virtual money, track trade history, and set price alerts.
This project uses Node.js + Express + Socket.IO for live market updates and Chart.js for sparkline mini-charts.

Requirements

Before running the project, make sure you have installed:
| Software | Version      |
| -------- | ------------ |
| Node.js  | v14 or above |
| npm      | Latest       |

Project Folder Structure


STOCK DASHBOARD/
│
├── public/
│   ├── index.html        (Login Page)
│   ├── dashboard.html    (Trading Dashboard)
│   ├── client.js         (Frontend logic + sockets)
│   ├── login.js          (Login script)
│   ├── style.css         (Styling)
│
├── server.js             (Backend + WebSocket server)
├── package.json
└── package-lock.json


Technologies Used
| Area                   | Tools                 |
| ---------------------- | --------------------- |
| Frontend               | HTML, CSS, JavaScript |
| Backend                | Node.js, Express      |
| Realtime communication | Socket.IO             |
| Graphs                 | Chart.js              |
| Authentication         | LocalStorage (no DB)  |

Setup & Running the Application
1️⃣ Install Dependencies

Open the project folder in terminal and run:
npm install

2️⃣ Start the Server
node server.js

3️⃣ Open the Application in Browser
http://localhost:3000

🔐 How to Use the Application
👉 Step 1: Log In

Open the login page

Enter any email and password (no database authentication)

Email is stored locally to identify the user session

👉 Step 2: Subscribe to Stocks

Click “Watch STOCK” buttons to subscribe/unsubscribe

Subscribed stocks appear as cards

👉 Step 3: Trading

Inside each stock card:
| Button   | Purpose                           |
| -------- | --------------------------------- |
|   Buy    | Purchase 1 share at current price |
|   Sell   | Sell 1 share if owned             |

Cash balance and net worth update automatically.

👉 Step 4: Price Alerts

Enter a price value in the Alert box of a stock

A notification banner will appear when live price reaches that value

👉 Step 5: Trade History

Recent trades appear in a table (max 6 history entries)
