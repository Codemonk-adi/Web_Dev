const express = require('express');
const app = express();
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
const morgan = require('morgan');

//routes
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
//environment variables
require('dotenv').config({path:'src/.env'});

mongoose.connect(
    `${process.env.MONGO_URI}`,
    {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useCreateIndex: true,
        useFindAndModify: false,
    }
).then(() => {
    console.log("database connected");
});


app.use(cors());
app.use(express.json());
app.use(morgan('tiny'));

app.use('/public', express.static(path.join(__dirname, 'uploads')));
app.use('/api', authRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
});