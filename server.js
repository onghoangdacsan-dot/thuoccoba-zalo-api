const express = require('express');
const app = express();
app.use(express.json());

app.post('/webhook', (req, res) => {
    console.log("Zalo gửi data:", req.body);
    res.status(200).send("OK");
});

app.listen(3000, () => console.log('Server chạy cổng 3000'));