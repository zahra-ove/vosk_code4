// creating socket io 
const socket = io.connect('http://127.0.0.1:3000/');



let track = null;
let stream;
let src;
let mediaRecorder
let timeslice = 10000;

let chunks = [];
let constraint = { audio: { noiseSuppression: true, echoCancellation: true }, video: false };
// let constraint = { audio: true, video: false };
let listen = false; //microphone is off
let uniqString = null;

async function start(constraint) {

    if(!uniqString) {
        uniqString = (new Date%9e6).toString(36);    //create unique string to identify current stream
    }

    try {
        stream = await navigator.mediaDevices.getUserMedia(constraint);
        track = stream.getAudioTracks()[0];
        console.log('stream: ');
        console.log(stream);

        mediaRecorder = new MediaRecorder(stream);
        console.log(mediaRecorder);
        mediaRecorder.start();

        mediaRecorder.ondataavailable = function(e) {
            let d=new Date();
            console.log(d.toLocaleTimeString()); //returns time (e.g. "6:08:25 PM"));

            let data_chunk = e.data;
            chunks.push(data_chunk);


            let blob = new Blob(chunks, { 'type': 'audio/webm; codecs=opus' });
            // blob.text().then(text => console.log(text));
            
            // let uniqString = (new Date%9e6).toString(36);
            // let audioURL = URL.createObjectURL(blob);
            socket.emit('data', {blob: blob, id:uniqString});
        }

        mediaRecorder.onstop = function(e) {
            var blob = new Blob(chunks, { 'type': 'audio/webm; codecs=opus' });
            console.log(blob);
            // let uniqString = (new Date%9e6).toString(36);
            // let audioURL = URL.createObjectURL(blob);
            // socket.emit('data', {blob: blob, id:uniqString});
            socket.emit('stop', {id:uniqString});

            stream.getAudioTracks().forEach(track => {
                    track.stop();
            });

            uniqString = null;
        }

        mediaRecorder.onerror = function(e) {
            console.log(e);
            console.log(e.error);
        }

    } catch (e) {
        console.log(e);
    }
}


document.getElementById('audio').addEventListener('click', () => {
    if (!listen) {
        start(constraint);
        listen = true;
        console.log('start audio recrding ...');
    } else {
        mediaRecorder.stop();
        listen = false;
        console.log('stop audio recrding ...');
    }
});

socket.on('res', data=>{
    // console.log(JSON.parse(data));
    console.log(data);
});
