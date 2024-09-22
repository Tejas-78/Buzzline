import express from 'express'
import UserController from './user.controller.js';
import jwtAuth from '../../middleware/jwt-auth.middleware.js';

const userRouter = express.Router();
const userContollerObj = new UserController();

userRouter.post('/signup',(req,res,next)=>{
    userContollerObj.signUp(req,res,next)
});
userRouter.post('/signin',(req,res,next)=>{
    userContollerObj.signIn(req,res,next)
});

userRouter.get('/',jwtAuth,(req,res,next)=>{
    userContollerObj.getAll(req,res,next)
});

userRouter.get('/current',jwtAuth,(req,res,next)=>{
    userContollerObj.currentUser(req,res,next)
});


export default userRouter

