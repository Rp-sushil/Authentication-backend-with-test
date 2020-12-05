const router = require('express').Router();
const {verifyAuthToken} = require('./verifyToken');

router.get('/', verifyAuthToken, (req, res) =>{
    res.json({posts: {'title': 'new title', "description": 'this is descriptiopn'}})
})


module.exports = router;