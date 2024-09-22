import '../../env.js'
import mongoose from "mongoose";
import UserModel from './users.schema.js'
import jwt from "jsonwebtoken";
import bcrypt from 'bcrypt'
import UserRepository from "./user.repo.js";
import { ApplicationError } from "../../error/applicationError.js";

const userRepository = new UserRepository();

export default class UserController{
    
async  signUp(req, res, next) {
    try {
        const { name, email, password } = req.body;
        console.log(name,email,password)
        const hashPassword = await bcrypt.hash(password, 12);
        const user = await userRepository.signUp(name, email, hashPassword);
        if (user) {
            console.log(user)
            return res.status(201).json({
                Id:user._id, 
                Name:user.name,
                Email:user.email, 

        });
        } else {
             throw new ApplicationError('Error signing up',400);
        }
    } catch (err) {
        console.error(err);
        if (err instanceof mongoose.Error.ValidationError) {
            return res.status(422).json({
                errors: Object.values(err.errors).map(e => e.message),
            });
        }
        next(err);
    }
}


async signIn(req, res, next) {
    try {
        const { email, password } = req.body;
        const user = await userRepository.findByEmail(email);

        if (!user) {
            throw new ApplicationError('Email is not registered', 422);
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new ApplicationError('Password is incorrect', 401);
        }

        // Generate JWT token
        const token = jwt.sign(
            {
                userId: user._id,
                email: user.email,
            },
            process.env.JWT_SECRETKEY,
            {
                expiresIn: '5h', // Token expiration time
            }
        );

        // Return token and user info in the response (instead of setting a cookie)
        res.status(200).json({
            token, // Include the JWT token
            Name: user.name,
            message: 'Login successful'
        });
    } catch (err) {
        next(err);
    }
}


async currentUser(req,res,next){
    try {
        const userId = req.user.userId;
        const user = await userRepository.getById(userId);
    
        if (!user) {
          return res.status(404).json({ message: 'User not found' });
        }

        // Send user details including profile photo
        res.status(200).json(user);
      } catch (error) {
        next(error);
      }
}
    async  logOut(req, res, next) {
        try {
            res.clearCookie('token', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
            });
    
            res.status(200).json({ message: 'Successfully logged out' });
        } catch (err) {
            next(err);
        }
    }
    
        async logoutAll(req, res, next) {
            try {
                const user = await UserModel.findById(req.userId);
                // console.log(req.userId)
                // console.log(user)
                if (user) {
                    user.tokenVersion += 1;
                    await user.save();
                    res.clearCookie('token', {
                        httpOnly: true,
                        secure: process.env.NODE_ENV === 'production',
                        sameSite: 'strict',
                    });
    
                    return res.status(200).json({ message: 'Successfully logged out from all devices' });
                } else {
                    throw new ApplicationError('User not found', 404);
                }
            } catch (err) {
                next(err);
            }
        }

        async getById(req, res, next) {
            try {
                const userId = req.query.userId;
                if (!userId) {
                    throw new ApplicationError('User ID is required', 400); 
                }
        
                const user = await userRepository.getById(userId);
                if (user) {
                    return res.status(200).json({ 
                        Id:user._id, 
                        Name: user.name,
                        Email: user.email,
                        MobileNumber:user.mobileNumber,
                        Gender: user.gender
                    });
                } else {
                    throw new ApplicationError('User not found', 404);
                }
            } catch (err) {
                next(err);  
            }
        }


        async getAll(req, res, next) {
            try {
                const users = await userRepository.getAll();
                if (users.length > 0) {
                    return res.status(200).json(users);
                } else {
                    throw new ApplicationError('User not found', 404);
                }
            } catch (err) {
                next(err);
            }
        }

        async updateUser(req, res, next) {
            try {
                const userId = req.userId; 
                const { name, email, password, gender } = req.body;
                const userData = { name, email, password, gender };
                const user = await userRepository.updateUser(userId, userData);
                if (user) {
                    return res.status(200).json({
                        success:true,
                        Name: user.name,
                        Email: user.email,
                        Gender: user.gender
                    });
                } else {
                    throw new ApplicationError('User not found', 404);
                }
            } catch (err) {
                next(err); 
            }
        }
          
}