const jwt = require('jsonwebtoken');
const multer = require('multer');

const storage = multer.memoryStorage();

exports.upload = multer({ storage });

exports.requireSignin = (req, res, next) => {
    if(req.headers.authorization) {
        const token = req.headers.authorization.split(" ")[1];
        const user = jwt.verify(token, process.env.JWT_SECRET);
        if(!user.isVerified && req.route.path!="/editProfile") {
            console.log(req.route.path);
            return res.status(400).json({message: 'You need to update your profile before continuing.'});
        }
        req.user = user;
    } else {
        return res.status(400).json({ message: 'Authorization required' });
    }
    next();
}