const jwt = require('jsonwebtoken');

function verifyAuthToken (req, res, next) {
    const token = req.header('auth-token');
    if(!token) return res.status(401).json({message: 'Access denied'});

    try{
        const verified = jwt.verify(token, process.env.TOKEN_SECRET)
        req.user = verified;
        next();
    } catch(err){
        res.status(400).json({message: err.message});
    }
}   

function verifyRefreshToken (req, res, next) {
    const token = req.header('refresh-token');
    if(!token) return res.status(401).json({message: 'Access denied'});

    try{
        const verified = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET)
        req.user = verified;
        next();
    } catch(err){
        res.status(400).json({message: err.message});
    }
}

module.exports.verifyAuthToken = verifyAuthToken;
module.exports.verifyRefreshToken = verifyRefreshToken;