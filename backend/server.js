const express = require('express');
const mongodb = require('mongodb');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const router = express();
const nodemailer = require("nodemailer")
const Mail = require('nodemailer/lib/mailer');
router.use(express.json())
router.use(cors())
dotenv.config()

const mongoClient = mongodb.MongoClient;
const DB_URL   = process.env.DB_URL || "mongodb://127.0.0.1:27017";
const PORT = process.env.PORT||5000;
const EMAIL = process.env.EMAIL;
const PASSWORD = process.env.PASSWORD;

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: EMAIL,
        pass: PASSWORD,
    }
})

const hashGenerator = async (plainPassword) => {

    const salted = await bcrypt.genSalt(salt);
    const hash = await bcrypt.hash(plainPassword,salted)
    return hash;

}

const hashValidator = async(plainPassword,hashedPassword) => {
    const result  = await bcrypt.compare(plainPassword,hashedPassword);
    return result;
}


router.post('/register',async (req,res)=> {
    try{

        const client = await mongoClient.connect(DB_URL,{ useNewUrlParser: true, useUnifiedTopology: true })
        const db = client.db('otpgenerator')
        let otp = Math.floor(Math.random() * 10000) + 1;
        const data = {
           email:req.body.email,
           otp:otp.toString()
        }
        await db.collection("otp").insertOne(data);
        client.close();
        let info = await transporter.sendMail({
          from: '"Otp generation Request" <no-reply@checkmailvj.com>', // sender address
          to: req.body.email, // list of receivers
          subject: `Otp for login using - ${req.body.email}`, // Subject line
          text: `Enter the otp to verify login - ${otp}`, // plain text body
        })
    
        res.json({message:"Mail sent with otp",statusCode:200})
    }
    catch(error){
        console.log(error)
        res.sendStatus(500);
    }
})

router.post("/login",async(req,res)=> {
    try{
        const client = await mongoClient.connect(DB_URL,{ useNewUrlParser: true, useUnifiedTopology: true })
        const db = client.db('otpgenerator')
        const record = await db.collection('otp').findOne({ email: req.body.email });
        if(!record){
          res.status(404).json({message:"User not found"})
        }else {
            const checkUser= (req.body.otp===record.otp)?true:false;
            if(!checkUser){
              res.status(500).json({message:"Incorrect Otp"})
        }else {
            await db.collection('otp').deleteOne({otp:req.body.otp})
            res.status(200).json({message:"Verified Successful"})
           
        }

        } client.close()
    }catch(error){
            console.log(error)
    }
    
})

router.get("/test",async(req,res) => {
    res.send("Express test")
})

router.listen(PORT,()=>{
    console.log("Server is up and running")
})