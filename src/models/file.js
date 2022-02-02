const mongoose = require("mongoose");
const user = require("./user");

const scheduleSchema = new mongoose.Schema({
    taskName: {
        type: String,
        required: true,
        trim: true,
        index: true,
    },
    taskCode: {
        type: String,
        required: true,
        trim: true,
        index: true,
    },
    duration: {
        type: Number,
        required: true,
    },
    start: {
        type: Date,
        required: true,
    },
    finish: {
        type: Date,
        required: true,
    },
    critical: {
        type: Boolean,
    },
    trade : {
        type: String,
        required: true,
    },
    space: {
        type: String,
        required: true,
    },
    predecessor: {
        type: String,
        required: true,
    },
}, {
    timestamps: true
});

const changeSchema = new mongoose.Schema({
    PCO: {
        type: String,
        required: true,
    },
    CE_Scope: {
        type: String,
        required: true,
    },
    activity: {
        
    }
});

// userSchema.virtual("fullName").get(function () {
//   return `${this.firstName} ${this.lastName}`;
// });

// userSchema.methods = {
//   authenticate: async function (password) {
//     return await bcrypt.compare(password, this.hash_password);
//   },
// };

module.exports = mongoose.model("Dashboard", dashboardSchema);