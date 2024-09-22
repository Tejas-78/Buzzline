import UserModel from "./users.schema.js"
export default class UserRepository{
    async signUp(name,email,hashPassword){
            // create instanceof user model
            const user = new UserModel({name:name,email:email,password:hashPassword,
                })
            const newUser= await user.save()  
            return newUser
    }

    async findByEmail(email){
        try{
         const validUser=await UserModel.findOne({email})
        if(validUser){
            return validUser;
        }
        else{
            return null
        }
    }
    catch(err){
        console.log(err)

    }
    }

    async getById(id) {
        try {
            const validUser = await UserModel.findById(id); 
            return validUser || null; 
        } catch (err) {
            throw err

        }
    }
    
    async getAll() {
        try {
            const users = await UserModel.find();
            return users || []; 
        } catch (err) {
            throw err
        }
    }

    async updateUser(userId, userData) {
        try {
            const user = await UserModel.findById(userId);
            if (user) {
                if (userData.name) user.name = userData.name;
                if (userData.email) user.email = userData.email;
                if (userData.password) user.password = await hashPassword(userData.password); 
                if (userData.gender) user.gender = userData.gender;
                const updatedUser = await user.save();
                return updatedUser;
            } else {
                return null; 
            }
        } catch (err) { 
            console.log(err)

        }
    }
    
    
}