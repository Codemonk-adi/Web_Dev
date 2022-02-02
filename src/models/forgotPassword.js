const mongoose = require("mongoose");
const bcrypt = require("bcrypt");


const forgotPasswordSchema = new mongoose.Schema({
    id: {
        type: Schema.Types.ObjectId,
        ref: User
    },
    token: {
        type: String,
    },
    expiryTime: {
        type: Date 
    }
});

forgotPasswordSchema.methods = {
    verify: (date) => {
        return date < this.expiryTime;
    }
}


userSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});


module.exports = mongoose.model("ForgotPassword", userSchema);