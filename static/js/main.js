let global = {
    stream: null,
    constraints: {
        audio: true,
        video: { width: { exact: 256 }, height: { exact: 256 }, frameRate: { ideal: 30, max: 50 } }
    },
    orgVideo: null,
    orgVideoTrack: null,
    animateft: 50,
    width: 256,
    height: 256,
    c1: null,
    ctx1: null,
    T: false,
    DI: false,
    animating: false,
    sendanimate: true,
}

let faceAnimate = {

    showc1: async function() {
        while (global.T && global.DI && global.animating) {
            await this.computeFrame();
            await this.timeout(global.animateft);
        }
        return;
    },

    doLoad: function() {

        global.c1 = document.createElement("canvas")
        global.c1.width = global.width;
        global.c1.height = global.height;
        // global.c1 = document.getElementById("c1");
        global.ctx1 = global.c1.getContext("2d");

        global.c2 = document.createElement("canvas")
        global.c2.width = global.width;
        global.c2.height = global.height;
        // global.c1 = document.getElementById("c1");
        global.ctx2 = global.c2.getContext("2d");

        this.animateButton = document.getElementById('animate');
        this.animateButton.addEventListener("click", this.animate);
        this.animateButton.self = this;

        this.uploadtargetObj = document.getElementById('uploadtarget')
        this.uploadtargetObj.addEventListener('click', (event) => { event.target.value = null });
        this.uploadtargetObj.addEventListener('change', this.uploadtarget);
        this.uploadtargetObj.self = this;
    },

    uploadtarget: async function(inp) {
        global.animating = false;
        await this.self.timeout(1000)
        if (!inp.target.files.length)
            return;
        let formData = new FormData();
        formData.append("target", inp.target.files[0]);
        try {
            res = await fetch('./api/uploadtarget', {
                method: 'POST',
                body: formData
            })
            res = await res.json();
            global.T = true;
            this.self.animateButton.disabled = false;
            global.animateStream = global.c1.captureStream(30);
            global.doubleStream = global.c2.captureStream(30);
            global.animateVideo = document.getElementById('animate_video');
            global.animateVideo.srcObject = global.animateStream;
            global.animateVideo.style.display = 'inline';
            alert('Successfully upload target');

            img = new Image();
            img.onload = function() {
                global.ctx1.drawImage(img, 0, 0, global.width, global.height);
            };
            img.src = URL.createObjectURL(inp.target.files[0]);
        } catch (error) {
            alert('Fail to upload target')
        }
    },

    updateDI: async function() {
        let canvas = document.createElement("canvas");
        canvas.width = global.width;
        canvas.height = global.height;
        canvas.getContext('2d').drawImage(global.orgVideo, 0, 0, global.width, global.height);
        let img = document.createElement("img");
        img.src = canvas.toDataURL('image/jpeg');
        try {
            res = await fetch('./api/uploadDI', {
                method: 'POST',
                body: img.src,
            })
            res = await res.json()
            global.DI = true;
            alert('Successfully upload DI')
        } catch (error) {
            alert('Fail to  upload DI')
        }
    },

    timeout: function(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    animate: async function(e) {
        await this.self.updateDI();
        global.animating = true;
        await this.self.showc1();
    },

    computeFrame: async function() {

        let canvas = document.createElement("canvas");
        canvas.width = global.width;
        canvas.height = global.height;
        canvas.getContext('2d').drawImage(global.orgVideo, 0, 0, global.width, global.height);
        let img = document.createElement("img");
        img.src = canvas.toDataURL('image/jpeg');
        try {
            res = await fetch('./api/animate', {
                method: 'POST',
                body: img.src,
            })
            res = await res.json()
            img = new Image();
            img.onload = function() {
                global.ctx1.drawImage(img, 0, 0);
                if (global.sendanimate)
                    global.ctx2.drawImage(img, 0, 0);
                else {
                    global.ctx2.drawImage(global.orgVideo, 0, 0);
                }
            };
            img.src = res;
        } catch (error) {
            alert('Fail to animate!')
            global.animating = false;
        }
        return;
    },

};




let getMedia = {

    handleSuccess: function() {
        global.orgVideo = document.getElementById("org_video")
        global.orgVideo.style = 'display'
        global.orgstream = global.stream.clone();
        global.orgstream.removeTrack(global.orgstream.getAudioTracks()[0]);
        global.orgVideo.srcObject = global.orgstream;

        document.getElementById('animate').style = 'display';
        document.querySelector('#showVideo').style = 'display:none'
    },

    handleError: function(error) {
        if (error.name === 'ConstraintNotSatisfiedError') {
            const v = global.constraints.video;
            this.errorMsg(`The resolution ${v.width.exact}x${v.height.exact} px is not supported by your device.`);
        } else if (error.name === 'PermissionDeniedError') {
            this.errorMsg('Permissions have not been granted to use your camera and ' +
                'microphone, you need to allow the page access to your devices in ' +
                'order for the demo to work.');
        }
        this.errorMsg(`getUserMedia error: ${error.name}`, error);
    },

    errorMsg: function(msg, error) {
        const errorElement = document.querySelector('#errorMsg');
        errorElement.innerHTML += `<p>${msg}</p>`;
        if (typeof error !== 'undefined') {
            console.error(error);
        }
    },
    doLoad: function() {
        document.querySelector('#showVideo').addEventListener('click', e => this.init(e));
    },

    init: async function(error) {
        try {
            global.stream = await navigator.mediaDevices.getUserMedia(global.constraints);
            this.handleSuccess();
        } catch (e) {
            this.handleError(e);
        }
    }

};

let communication = {
    doLoad: function() {
        this.lastPeerId = null;
        this.peer = null;
        this.conn = null;
        this.call = null;
        this.myID = document.getElementById('myID');
        this.status = document.getElementById("cstatus");
        this.roomid = document.getElementById("roomid");
        document.getElementById('connect').self = this;

        document.getElementById('connect').addEventListener('click', this.join);
        this.init();
    },
    init: function() {
        this.peer = new Peer(null, {
            host: '59.110.242.215',
            // host: 'localhost',
            port: 8100,
            path: 'rooms',
            debug: 2
        });
        this.peer.self = this;
        this.peer.on('open', function(id) {
            if (this.id === null) {
                console.log("Received null id from peer open");
                this.id = this.self.lastPeerId;
            } else {
                this.self.lastPeerId = this.id;
            }
            console.log("ID:" + this.id);
            this.self.myID.innerHTML = 'ID:' + this.id;
            this.self.status.innerHTML = "Awaiting connection...";
        });
        this.peer.on('call', function(c) {
            // Answer the call, providing our mediaStream
            // call.answer(mediaStream);
            if (this.self.call && this.self.call.open) {
                c.on('open', function() {
                    setTimeout(function() { c.close(); }, 500);
                });
                return;
            }
            this.self.call = c;
            this.self.status.innerHTML = "Connected";
            this.self.ready4call();

            if (global.doubleStream) {
                global.sendStream = global.doubleStream.clone();
                global.sendStream.addTrack(global.stream.getAudioTracks()[0]);
            } else {
                global.sendStream = global.stream;
            }
            this.self.call.answer(global.sendStream);
        });
        this.peer.on('connection', function(c) {
            if (this.self.conn && this.self.conn.open) {
                c.on('open', function() {
                    c.send("Already connected to another client");
                    setTimeout(function() { c.close(); }, 500);
                });
                return;
            }
            this.self.conn = c;
            console.log("Connected to: " + this.self.conn.peer);
            this.self.status.innerHTML = "Connected";
            this.self.ready4conn();
        });
        this.peer.on('disconnected', function() {
            this.self.status.innerHTML = "Connection lost. Please reconnect";
            console.log('Connection lost. Please reconnect');

            // Workaround for peer.reconnect deleting previous id
            this.id = this.self.lastPeerId;
            this._lastServerId = this.self.lastPeerId;
            this.reconnect();
        });
        this.peer.on('close', function() {
            this.self.conn = null;
            this.self.call = null;
            this.self.status.innerHTML = "Connection destroyed. Please refresh";
            console.log('Connection destroyed');
        });
        this.peer.on('error', function(err) {
            console.log(err);
            alert('peer error' + err);
        });
    },
    setconnected: function() {
        document.getElementById('unconnected').style.display = 'none';
        document.getElementById('connected').style.display = 'inline';
        self = this;
        document.getElementById('streamop').addEventListener('change', function(data) {
            if (this.value === 'os') {
                // global.sendStream = global.stream;
                // self.call.close();
                global.sendanimate = false;
            } else {
                global.sendanimate = true;
            }

        })
        document.getElementById('disconnect_but').addEventListener('click', function(e) {
            if (self.call)
                self.call.close();
            if (self.conn)
                self.conn.close();
        })
    },
    ready4call: function() {
        this.call.self = this;
        this.call.on('stream', function(stream) {
            global.remoteVideo = document.getElementById('remote_video');
            global.remoteVideo.style.display = 'inline';
            global.remoteStream = stream;
            global.remoteVideo.srcObject = global.remoteStream;
            this.self.setconnected();
        });
        this.call.on('close', function() {
            global.remoteStream = null;
            document.getElementById('unconnected').style.display = 'inline';
            document.getElementById('connected').style.display = 'none';
            this.self.status.innerHTML = "Awaiting connection...";
            alert('Call has been closed');
            this.self.call = null;
        });
        this.call.on('error', function(err) {
            console.log(err);
            alert('call error' + err);
        });
    },
    ready4conn: function() {
        this.conn.self = this;
        this.conn.on('data', function(data) {
            this.self.status.innerHTML = "Connected to: " + this.peer;
            this.self.console.log("Connected to: " + this.peer);
            this.send('hello! I\'m ' + this.metadata);
        });
        this.conn.on('close', function() {
            this.self.status.innerHTML = "Connection reset<br>Awaiting connection...";
            this.self.conn = null;
        });
    },
    join: function() {
        // if (this.self.conn) {
        //     this.self.conn.close();
        // }
        // this.self.conn = this.self.peer.connect(this.self.roomid.value);
        // this.self.conn.metadata = 'jaja'
        // this.self.ready4conn();

        if (this.self.call) {
            this.self.call.close();
        }
        if (global.doubleStream) {
            global.sendStream = global.doubleStream.clone();
            global.sendStream.addTrack(global.stream.getAudioTracks()[0]);
        } else {
            global.sendStream = global.stream;
        }

        this.self.call = this.self.peer.call(this.self.roomid.value, global.sendStream);
        this.self.ready4call();
    }
};

$(window).on('beforeunload', function() {
    fetch('./api/unload', {
	method: 'GET',
    })
});
document.addEventListener("DOMContentLoaded", () => {
    getMedia.doLoad();
    faceAnimate.doLoad();
    communication.doLoad();
});
