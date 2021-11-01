// start point
const prism = require('prism-media');
const fs = require('fs');
// const fs = require('fs').promises;  // fs promise supported in Node.js 10 or 11
var wav = require('wav');
const { v4: uuidv4 } = require('uuid')
const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const path = require('path');
// var ss = require('socket.io-stream'); // not used
const vosk = require('vosk');
const { Readable } = require("stream");
const ffmpeg = require('ffmpeg');
const { Z_DEFLATED } = require('zlib');

//----- constatns
SAMPLE_RATE = 16000;
let received_audio = null;
let id = null;
let STT =  [];
//-----


app.set('view engine', 'ejs');
app.use(express.static('public'));

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.get('/', (req, res) => {
    res.render('index');
});


//============== api routes start ==============//
// app.get('/api/v1/voice/:id/get', function(req, res) {

//     let wanted_stt = STT.find(stt => stt.id === req.params.id);
//     if(!wanted_stt) res.status(404).send('تکست مورد نظر یافت نشد');

//     console.log(wanted_stt);
//     // res.send(JSON.stringify(wanted_stt));
//     res.send(wanted_stt);
// });
//============== api routes end ==============//
let dir = './audios';
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, {
        recursive: true
    });
}




// MODEL_PATH = "models/farsi-model-big"; //model path for big persian model
MODEL_PATH = "models/farsi-model-small"; //model path for small persian model
// const model = new vosk.Model(MODEL_PATH); //load vosk model
// console.log('vosk model loaded');


// const transcoder = new prism.FFmpeg({
//     args: [
//       '-analyzeduration', '0',
//       '-loglevel', '0',
//       '-f', 's16le',
//       '-ar', '16000',
//       '-ac', '1',
//     ],
//   });
//   const opus = new prism.opus.Encoder({ rate: 16000, channels: 1});



io.on('connection', socket => {
    console.log('someone connecting to socketio');


    // socket.on('data', data => {
    //     // TODO: FFMPEG 
    //     // TODO: VOSK   

    //     socket.emit('sendback', data.time);
    //  });


    socket.on('data', data => {    
        console.log('new data arrived');

        received_audio = data.blob;
        id = data.id;

        // get time for now
        let d=new Date();
        let current_time = d.toLocaleTimeString();
        console.log('time 76: ', current_time);


        let sttIndx = STT.find(stt => stt.id == id);   //object
        console.log('line 80: ', sttIndx);

        console.log('---------------------------------');

        if(!sttIndx) {
            let currentTime = Date.now(); //time as unique string
            let uuid_var = uuidv4(); // unique code
            let file = `original_${uuid_var}_audio_${currentTime}.webm`;
            let converted_file = `convetred_${uuid_var}_audio_${currentTime}.webm`;

            //save in STT array
            STT.push({id:id, result:null, raw_received_audio:received_audio, original_file:file, converterd_file:converted_file, rec:null, partial_result:[]});
            console.log(received_audio);
            console.log(id);
            console.log(STT);
        }

        //--------------
        // const dddd = received_audio
        // .pipe(transcoder)
        // .pipe(opus);
        // // const dddd = received_audio.pipe(transcoder);
        // console.log('changing format to PCM 16bit 16KHz mono')
        // console.log(dddd);



        // fs.writeFile('test.webm', dddd)
        //     .then(() => {
        //         console.log('JSON saved');
        //     })
        //     .catch(er => {
        //         console.log(er);
        //     });

        //--------------

        // FILE_NAME = file;
        // let FILE_FULL_DIR = dir + '/' + file;
        // let CONVERTED_FILE_FULL_DIR = dir + '/' + converted_file;

        // // open function with filename, file opening mode and callback function
        // fs.open(file, 'w', function(err, file) {
        //     if (err) {
        //         throw err;
        //         console.log('err occured line 93');
        //     }
        //     console.log('File is opened in write mode.');
        // });
        // const stream = fs.createWriteStream(path.join(__dirname, './audios/' +
        //     file));
        // stream.write(received_audio);


        let r = to_wav_converter(id, received_audio, socket);

    });

    socket.on('stop', data => {
        console.log('speech stopped');
        let audio_id = data.id;
        console.log('id found: ' + id);
        console.log('total object:')
        console.log(STT);
        let sttIndx = STT.find(stt => stt.id.toString() == audio_id.toString());    // related object
        console.log('object related to this id: ');
        console.log(sttIndx);

        //todo: send total result for this stream to browser
    });


});







const hostname = '127.0.0.1';
const port = process.env.PORT || 3000;

server.listen(port, hostname, () => {
    console.log(`Server running at http: //${hostname}:${port}/`);
});


async function to_wav_converter(sampleId, receivedAudio, socket) 
{
    
    let sttIndx = STT.find(stt => stt.id === sampleId);    // related object
    console.log('from here in to_wav_converter function: ');
    console.log(sttIndx);
    console.log('recognizer is: ', sttIndx.rec);


    let file_full_dir = dir + '/' + sttIndx.original_file;
    let converted_file_full_dir = dir + '/' + sttIndx.converterd_file;


    //===========

    //todo: create write stream
    fs.writeFile(file_full_dir, receivedAudio, (error) => {
        if (error) throw error;
        else {
            console.log('file is written successfully');

                                                // get current time
                                                let d3=new Date();
                                                let current_time3 = d3.toLocaleTimeString();
                                                console.log('time after writing data to file: ' , current_time3);
    
            try {
                var process = new ffmpeg(file_full_dir);
                process.then(function(receivedAudio) {
                    // receivedAudio.setVideoFormat('wav') //convert to wav format
                    receivedAudio.setAudioChannels(1)
                            .setAudioFrequency(16000)
                            .setVideoBitRate(256)
                            .save(converted_file_full_dir, function(err, file) {
                                if (!err) {
                                    // get current time
                                    let d4=new Date();
                                    let current_time4 = d4.toLocaleTimeString();
                                    console.log('time after ffmpeg finished its work: ' , current_time4);

                                    console.log('ffmpeg process finished, line 180');
                                    console.log('Audio file after ffpmeg conversion: ' + file);
                                    //================ added
                                    if (!fs.existsSync(MODEL_PATH)) {
                                        console.log("Please download the model from https://alphacephei.com/vosk/models and unpack as " + MODEL_PATH + " in the current folder.")
                                        process.exit()
                                    }
        
                                    vosk.setLogLevel(0);

                                    const model = new vosk.Model(MODEL_PATH); //load vosk model
                                    console.log('vosk model loaded');

                                    const wfReader = new wav.Reader();
                                    const wfReadable = new Readable().wrap(wfReader);
        
                                    wfReader.on('format', async({ audioFormat, sampleRate, channels }) => {
                                        console.log('we are here in wfReader format section');
                                        console.log('audioFormat: ' + audioFormat);
                                        console.log('sampleRate: ' + sampleRate);
                                        console.log('channels: ' + channels);
        
                                        if (audioFormat != 1 || channels != 1) {
                                            console.error("Audio file must be WAV format mono PCM.");
                                            process.exit(1);
                                        }
                                        // const rec = new vosk.Recognizer({ model: model, sampleRate: sampleRate });
                                        const rec = new vosk.Recognizer({ model: model, sampleRate: SAMPLE_RATE });
                                        sttIndx.rec = rec;

                                        // rec.setMaxAlternatives(10);
                                        rec.setWords(true);

                                        let r = null;   

                                        for await (const data of wfReadable) {
                                            const end_of_speech = rec.acceptWaveform(data);
                                            console.log('we are here in end_of_speech ' + end_of_speech);
                                            if (end_of_speech) {
                                                console.log('end_of_speech: ', end_of_speech);

                                                r = rec.result();
                                                sttIndx.partial_result.push(r);
                                            }
                                        }

                                         // get current time
                                         let d=new Date();
                                         let current_time = d.toLocaleTimeString();

                                         console.log('time after vosk process: ' , current_time);
                                         console.log('-----------------+++----------------');

                                        // console.log('rec final result:');
                                        // let finalResult = rec.finalResult(rec);
                                        // console.log(JSON.stringify(finalResult, null, 4));
                                        //----
                                        // let signleSTT = {id: id, result:JSON.stringify(rec.finalResult(rec))};
        
                                        // let sttIndx = STT.find(stt => stt.id === sampleId);

                                        //----
                                        // sttIndx.result = JSON.stringify(finalResult);
        
                                        // console.log(sttIndx);
                                        // console.log(STT);
        
                                        // console.log(sttIndx.result);

                                        // socket.emit('res', sttIndx.result);
                                        socket.emit('res', r);

                                        console.log('partial result from this result:');
                                        console.log(sttIndx.partial_result);
                                        //----
        
                                        rec.free();
                                        // get current time
                                        let dd=new Date();
                                        let current_time2 = dd.toLocaleTimeString();

                                        console.log('recognizer is free now at: ', current_time2);

                                        return await Promise.resolve(sttIndx);   //--- added for test
                                    });
        
                                    console.log('from line 251, written file is delivered to vosk');
                                    // let readableFile = fs.createReadStream(converted_file_full_dir);
                                    // readableFile.pipe(wfReader);
        

                                    fs.createReadStream(converted_file_full_dir).pipe(wfReader).on('finish', 
                                        function (err) {
                                            model.free();
                                            // get current time
                                            let d=new Date();
                                            let current_time = d.toLocaleTimeString();

                                            console.log('model is free now at: ', current_time);
                                    });
                                    //================ added
                                } else {
                                    console.log('error occured in ffmpeg conversion');
                                }
        
                            });
        
                        
                        
                    },
                    function(err) {
                        console.log('Error: ' + err);
                    });
            } catch (e) {
                console.log(e.code);
                console.log(e.msg);
            }
        }
    });

}
