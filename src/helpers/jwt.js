const jwt = require("jsonwebtoken");

exports.generateJwtToken = (data, secret = process.env.JWT_SECRET) => {
    return jwt.sign(
        data,
        secret,
        {
            expiresIn: "1d",
        }
    );
};