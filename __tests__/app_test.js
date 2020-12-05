const chai = require('chai');
const expect = chai.expect;
const chaiHttp = require('chai-http');
const app = require('../app');
const bcrypt = require('bcrypt');
const RefreshToken = require('../models/RefreshToken');
const User = require('../models/User');
const sinon = require('sinon');

var clock;
before(function () {
    clock = sinon.useFakeTimers({
       now: 1483228800000
   });
});

after(function () {
    clock.restore();
});
// Configure chai
chai.use(chaiHttp);
chai.should();

let REFRESH_TOKEN;
let AUTH_TOKEN;
const INVALID_REFRESH_TOKEN = 'eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ';


let registerUserId;
let RefreshTokenId;

describe('POST /api/user/register', () =>{
    it('should return validation errors if request is invaild', (done) =>{
        chai.request(app)
            .post('/api/user/register')
            .set({'content-type': 'application/json'})
            .send({name: 'Mario lucifer', email: 'mariolucifer', password: '123456'})
            .end((err, res) => {
                if(err) throw err;
                res.body.message.should.be.eql('"email" must be a valid email')
                done();
            })
    })
    it('Able to register and return user._id', (done) =>{
        chai.request(app)
            .post('/api/user/register')
            .set({'content-type': 'application/json'})
            .send({name: 'Mario lucifer', email: 'mariolucifer@gmail.com', password: '123456'})
            .end((err, res) => {
                if(err) throw err;
                registerUserId = res.body.user;
                expect(res.body.user).not.to.be.undefined;
                done();
            })
    })
    it('Should not register if email already exist', (done) =>{
        chai.request(app)
            .post('/api/user/register')
            .set({'content-type': 'application/json'})
            .send({name: 'Dangerous Dave', email: 'mariolucifer@gmail.com', password: '123456'})
            .end((err, res) => {
                if(err) throw err;
                res.body.message.should.be.eql('Email already exists');
                done();
            })
    })
    it('should store hashed password', async () =>{
        try {
            const user = await User.findOne({_id: registerUserId});
            if(!user || !user.password) expect(true).to.be.false;
            const validPass = await bcrypt.compare('123456', user.password);
            if(!validPass) expect(true).to.be.false;
            else expect(true).to.be.true;
        } catch (error) {
            console.log(error.message);
            expect(true).to.be.false;
        }
    })
})

describe('POST /api/user/login', () =>{
    it('Able to handle invalid data', (done) =>{
        chai.request(app)
            .post('/api/user/login')
            .set({'content-type': 'application/json'})
            .send({email: 'mariolucifer', password: '123456'})
            .end((err, res) =>{
                if(err) throw err;
                res.body.should.be.eql('"email" must be a valid email');
                done();
            })
    })
    it('Should not login is not registered', (done) =>{
        chai.request(app)
            .post('/api/user/login')
            .set({'content-type': 'application/json'})
            .send({email: 'mariolucifer@hotmail.com', password: '1234564566'})
            .end((err, res) => {
                if(err) throw err;
                res.body.message.should.be.eql('Email not found');
                done();
            })
    })
    it('should not login if password is incorrect', (done) =>{
        chai.request(app)
            .post('/api/user/login')
            .set({'content-type': 'application/json'})
            .send({email: 'mariolucifer@gmail.com', password: '1234564566'})
            .end((err, res) => {
                if(err) throw err;
                res.body.message.should.be.eql('password is wrong');
                done();
            })
    })
    it('Should login user and return/set auth/refresh tokens', (done) =>{
        chai.request(app)
            .post('/api/user/login')
            .set({'content-type': 'application/json'})
            .send({email: 'mariolucifer@gmail.com', password: '123456'})
            .end((err, res) => {
                if(err) throw err;
                AUTH_TOKEN = res.body['auth-token'];
                REFRESH_TOKEN = res.body['refresh-token'];
                RefreshTokenId = res.body['refresh-token-id'];
                expect(RefreshTokenId).not.to.be.undefined;
                expect(AUTH_TOKEN).not.be.undefined;
                expect(REFRESH_TOKEN).not.be.undefined;
                expect(res.header['auth-token']).not.be.undefined;
                expect(res.header['refresh-token']).not.be.undefined;
                done();
            })
    })
    it('Should refresh-token should be stored in database', async () =>{
        try {
            const token = await RefreshToken.findOne({_id: RefreshTokenId});
            expect(token).not.to.be.undefined;
        } catch (error) {
            console.log(error.message);
            expect(true).to.be.false;
        }
    })
})

describe('GET api/user/me', () => {
    it('Acess denied if user have no token', (done) => {
      chai.request(app)
          .get('/api/user/me')
          .set({'content-type': 'application/json'})
          .send({})
          .end((err, res) =>{
              if(err) throw err;
              res.body.message.should.be.eql('Access denied');
              done();
          })
    });
    it('Acess denied if not invalid token', (done) =>{
        chai.request(app)
          .get('/api/user/me')
          .set({'content-type': 'application/json', 'auth-token': INVALID_REFRESH_TOKEN})
          .send({})
          .end((err, res) =>{
              if(err) throw err;
              res.body.message.should.be.eql('jwt malformed');
              done();
          })
    })
    it('should return user if authenticated', (done) => {
        clock.tick(30000);
        chai.request(app)
        .get('/api/user/me')
        .set({'content-type': 'application/json', 'auth-token': AUTH_TOKEN})
        .send({})
        .end((err, res) =>{
            if(err) throw err;
            expect(res.body._id).not.to.be.undefined;
            expect(res.body.name).not.to.be.undefined;
            expect(res.body.email).not.to.be.undefined;
            expect(res.body.password).not.to.be.undefined;
            done();
        })
    });
    it('should not login if token expired after 24h', (done) =>{
        clock.tick(86500000);
        chai.request(app)
            .get('/api/user/me')
            .set({'content-type': 'application/json', 'auth-token': AUTH_TOKEN})
            .send({})
            .end((err, res) =>{
                if(err) throw err;
                res.body.message.should.be.eql('jwt expired');
                done();
            })
    })
});

describe('GET /api/user/newAuthToken', () =>{
    it('Should set/return new-Auth-token/refresh-token valid for 24h if refresh token valid', (done) =>{
        chai.request(app)
            .get('/api/user/newAuthToken')
            .set({'content-type': 'application/json', 'refresh-token': REFRESH_TOKEN})
            .send({})
            .end((err, res) => {
                if(err) throw err;
                expect(res.header['auth-token']).not.be.undefined;
                expect(res.header['refresh-token']).not.be.undefined;
                res.header['refresh-token'].should.be.eql(REFRESH_TOKEN);
                AUTH_TOKEN = res.header['auth-token'];
                REFRESH_TOKEN = res.header['refresh-token'];
                done();
            })
    })
    it('new Auth-token should be valid for 24h', (done) => {
        clock.tick(300000);
        chai.request(app)
        .get('/api/user/me')
        .set({'content-type': 'application/json', 'auth-token': AUTH_TOKEN})
        .send({})
        .end((err, res) =>{
            if(err) throw err;
            expect(res.body._id).not.to.be.undefined;
            expect(res.body.name).not.to.be.undefined;
            expect(res.body.email).not.to.be.undefined;
            expect(res.body.password).not.to.be.undefined;
            done();
        })
    });
    it('Should not generate new-auth-token if refresh token is invalid', (done) =>{
        chai.request(app)
            .get('/api/user/newAuthToken')
            .set({'content-type': 'application/json', 'refresh-token': INVALID_REFRESH_TOKEN})
            .send({})
            .end((err, res) => {
                if(err) throw err;
                res.body.message.should.be.eql('jwt malformed');
                done();
            })
    })
    it('should not generate new-auth-token if without refresh token', (done) =>{
        chai.request(app)
          .get('/api/user/newAuthToken')
          .set({'content-type': 'application/json'})
          .send({})
          .end((err, res) =>{
              if(err) throw err;
              res.body.message.should.be.eql('Access denied');
              done();
          })
    })
})

describe('DELETE /api/user/logout', (done) =>{
    it('Should not logout if does not have refresh-token', (done) =>{
        chai.request(app)
            .delete('/api/user/logout')
            .set({'content-type': 'application/json'})
            .send({})
            .end((err, res) =>{
                if(err) throw err;
                res.body.message.should.be.eql('Access denied');
                done()
            })
    })
    it('should not logout if refresh-token is invalid', (done) =>{
        chai.request(app)
            .delete('/api/user/logout')
            .set({'content-type': 'application/json', 'refresh-token': INVALID_REFRESH_TOKEN})
            .send({})
            .end((err, res) =>{
                if(err) throw err;
                res.body.message.should.be.eql('jwt malformed');
                done()
            })
    })
    it('User should logged out and auth/refresh tokens should be undefined in response-header', (done) =>{
        chai.request(app)
            .delete('/api/user/logout')
            .set({'content-type': 'application/json', 'refresh-token': REFRESH_TOKEN})
            .send({})
            .end((err, res) =>{
                if(err) throw err;
                expect(res.header['auth-token']).to.be.undefined;
                expect(res.header['refresh-token']).to.be.undefined;
                res.body.message.should.be.eql('Successfully logged out');
                done();
            })  
    })
    it('refresh token should be removed from database', async() =>{
        try {
            const token = await RefreshToken.findOne({_id: RefreshTokenId});
            expect(token).to.be.null;
        } catch (error) {
            console.log(error.message);
            expect(true).to.be.false;
        }
    })
})
