const router = require('express').Router();
const User = require('../models/User');
const RefreshToken =require('../models/RefreshToken');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { verifyAuthToken, verifyRefreshToken } = require('./verifyToken');
const {registerValidation, loginValidation} = require('./validation');

const generateAuthToken = (user_id) => {
    return jwt.sign({_id: user_id}, process.env.TOKEN_SECRET, {expiresIn: '24h'});
}


router.post('/register', async (req, res) =>{
    const {error} = registerValidation(req.body);
    if(error) return res.status(400).json({message: error.details[0].message});
    // checking if the user already is in the database
    const emailExist = await User.findOne({email: req.body.email});
    if(emailExist) return res.status(400).json({message: 'Email already exists'});
    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(req.body.password, salt);
    // create new User
    const user = new User({
        name:req.body.name,
        email: req.body.email,
        password: hashPassword
    });
    try {
        const savedUser = await user.save();
        res.json({user: savedUser._id});
    } catch (error) {
        res.status(400).json({message: error.message})
    }
})

// Login
router.post('/login',async (req, res) =>{
    const {error} = loginValidation(req.body);
    if(error) return res.status(400).json(error.details[0].message);
    // checking if the email exist
    const user = await User.findOne({email: req.body.email});
    if(!user) return res.status(400).json({message: 'Email not found'});
    // password is correct
    const validPass = await bcrypt.compare(req.body.password, user.password);
    if(!validPass) return res.status(400).json({message: "password is wrong"})
    // create and assign a token
    const authToken = generateAuthToken(user._id);
    const newRefreshToken = new RefreshToken({
        token: jwt.sign({_id: user._id}, process.env.REFRESH_TOKEN_SECRET),
    })
    try {
        const refreshToken = await newRefreshToken.save();
        res.header('auth-token', authToken);
        res.header('refresh-token', refreshToken.token);
        res.json({'auth-token': authToken, 'refresh-token': refreshToken.token, 'refresh-token-id': refreshToken._id});
    } catch (error) {
        res.status(500).json({message: error.message});
    }
})

// generate New Auth-Token
router.get('/newAuthToken', verifyRefreshToken, async (req, res) =>{
    try {
        const refreshToken = await RefreshToken.findOne({token: req.header('refresh-token')});
        if(!refreshToken) return res.sendStatus(400);
        const authToken = generateAuthToken(req.user._id);
        res.header('auth-token', authToken);
        res.header('refresh-token', req.header('refresh-token'));
        res.json({'auth-token': authToken, 'refresh-token': req.header('refresh-token')});
    } catch (error) {
        res.send(400).json(error.message);
    }
})

// logout
router.delete('/logout', verifyRefreshToken, async (req, res) =>{
    const refreshToken = req.header('refresh-token');
    try {
        const token = await RefreshToken.deleteOne({token: refreshToken});
        res.json({token_id: token, message: 'Successfully logged out'});
    } catch (error) {
        res.status(500).json({message: error.message});
    }
})

// get user details
router.get('/me', verifyAuthToken, async (req, res) => {
    try {
        const userdata = await User.findOne({_id: req.user._id})
        if(!userdata) return res.sendStatus(500);
        res.json(userdata);
    } catch (error) {
        res.status(429).json({message: 'Access Denied'})
    }
})



module.exports = router;