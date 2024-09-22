import mongoose from "mongoose";

const url = process.env.DB_URL;

export const connect = async ()=>{
    await mongoose.connect(url)
    console.log('db is connected')
}