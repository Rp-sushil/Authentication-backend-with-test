const mongooose = require('mongoose');

const tokenSchema = new mongooose.Schema({
    token:{
        type: String,
        require: true
    }
})

const RefreshToken = mongooose.model('tokens', tokenSchema);

module.exports = RefreshToken;