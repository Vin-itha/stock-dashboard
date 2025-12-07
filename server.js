const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files from 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Initial Stock Data
const AVAILABLE_STOCKS = ['GOOG', 'TSLA', 'AMZN', 'META', 'NVDA'];
let stockPrices = {
    'GOOG': 140.00,
    'TSLA': 250.00,
    'AMZN': 130.00,
    'META': 300.00,
    'NVDA': 450.00
};

// 1. Simulate Market Changes (Updates every second)
setInterval(() => {
    AVAILABLE_STOCKS.forEach(stock => {
        // Fluctuate price by -2% to +2%
        const volatility = (Math.random() * 0.04) - 0.02; 
        const change = stockPrices[stock] * volatility;
        stockPrices[stock] = parseFloat((stockPrices[stock] + change).toFixed(2));
    });

    // Broadcast new prices to ALL connected clients
    io.emit('market-update', stockPrices);
}, 1000);

// 2. Handle User Connections
io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    // Handle User Login
    socket.on('login', (email) => {
        // In a real app, we would validate against a DB here
        console.log(`User logged in: ${email}`);
        // Send the list of available stocks to the client
        socket.emit('init-data', { available: AVAILABLE_STOCKS });
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});