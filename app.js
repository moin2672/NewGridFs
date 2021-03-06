const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const crypto = require('crypto'); //to generate the file names
const mongoose = require('mongoose');
const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const methodOverride = require('method-override');

const app = express();

//MiddleWare
app.use(bodyParser.json());
app.use(methodOverride('_method'));
//Setting View Engine
app.set('view engine', 'ejs');

//Mongo URI
const MongoURI = "mongodb+srv://meanapp:AEKzArBnCBP1ehTH@cluster0.fgaaw.mongodb.net/mongouploads";

//Create Mongo connection
const conn = mongoose.createConnection(MongoURI,{ useNewUrlParser: true, useUnifiedTopology: true });

//Initialize gfs - ref: https://github.com/aheckmann/gridfs-stream
let gfs;
conn.once('open', () => {
    //Init Stream
    gfs = Grid(conn.db, mongoose.mongo);
    gfs.collection('uploads');
    // all set!
})

//Create Storage Engine - ref: https://github.com/devconcept/multer-gridfs-storage
const storage = new GridFsStorage({
    url: MongoURI,
    file: (req, file) => {
        return new Promise((resolve, reject) => {
            crypto.randomBytes(16, (err, buf) => {
                if (err) {
                    return reject(err);
                }
                const filename = buf.toString('hex') + path.extname(file.originalname);
                const fileInfo = {
                    filename: filename,
                    bucketName: 'uploads'
                };
                resolve(fileInfo);
            });
        });
    }
});
const upload = multer({ storage });

// @route GET /
// @desc Loads form
app.get('/', (req, res) => {
    // res.render('index');
    gfs.files.find().toArray((err, files)=>{
        //Check if files
        if(!files || files.length === 0){
            // return res.status(404).json({err:'No files exists'});
            res.render('index',{files:false});
        }else{
            files.map(file=>{
                if(file.contentType==='image/jpeg'|| file.contentType==='image/png'){
                    file.isImage=true;
                }else{
                    file.isImage=false;
                }
            });
            res.render('index',{files:files});
        }

    });
});

// @route POST /upload
// @desc Uploads file to DB - upload.single('file') -> middleware with field name as file
app.post('/upload',upload.single('file'), (req, res)=>{
    // res.json({file:req.file});
    res.redirect('/');
})

// @route GET /files
// @desc Display all files in JSON
app.get('/files', (req, res)=>{
    gfs.files.find().toArray((err, files)=>{
        //Check if files
        if(!files || files.length === 0){
            return res.status(404).json({err:'No files exists'});
        }

        //Files exists
        return res.json({files});
    });
});

// @route GET /files/:filename
// @desc Display single file in JSON
app.get('/files/:filename', (req, res)=>{
    gfs.files.findOne({filename:req.params.filename},(err,file)=>{
        //Check if file
        if(!file || file.length === 0){
            return res.status(404).json({err:'No file exists'});
        }

        //File exists
        return res.json({file});
    });
});

// @route GET /image/:filename
// @desc Display Image
app.get('/image/:filename', (req, res)=>{
    gfs.files.findOne({filename:req.params.filename},(err,file)=>{
        //Check if file
        if(!file || file.length === 0){
            return res.status(404).json({err:'No file exists'});
        }

        //When file exist - check if image
        if(file.contentType==='image/jpeg' || file.contentType === 'image/png'){
            //Read Output to browser
            const readstream = gfs.createReadStream(file.filename);
            readstream.pipe(res);
        }else{
            res.status(404).json({
                err:"Not an image."
            });
        }
    });
});

// @route DELETE /files/:id
// @desc delete file

app.delete('/files/:id', (req, res)=>{
    console.log(req.params.id)
    gfs.remove({_id:req.params.id, root:'uploads'}, (err, gridStore)=> {
        if (err) {
            return res.status(404).json({err:err});
        }
        res.redirect('/');
    });
})

const port = 3500;

app.listen(port, () => console.log(`Server started on port ${port}`));
