import json

from PIL import Image
from flask import Flask, jsonify, request, make_response
from flask import render_template
from pdb import set_trace
from model import Animator
from secrets import token_urlsafe

animator = Animator()

app = Flask(__name__)
@app.route('/')
def index():
    resp = make_response(render_template('index.html'))
    resp.set_cookie('token',token_urlsafe(4));
    return resp

@app.route('/api/uploadtarget', methods=['POST'])
def uploadTarget():
        # target = Image.open(request.files['target'])
        target = request.files['target']
        global animator
        animator.setTarget(target,request.cookies.get("token"))
        return '200'
@app.route('/api/uploadDI', methods=['POST'])
def uploadDI():

        # target = Image.open(request.files['target'])
        # set_trace()
        DI = request.data
        global animator
        animator.setDrivingInitial(DI,request.cookies.get("token"))
        return '200'

@app.route('/api/animate', methods=['POST'])
def animate():
        # target = Image.open(request.files['target'])
        # set_trace()
        driver = request.data
        global animator
        frame = animator.make_animation(driver,request.cookies.get("token"))
        # print('animate')
        return jsonify(frame)

@app.route('/api/unload', methods=['GET'])
def unload():
        set_trace()
        global animator
        animator.unload(request.cookies.get("token"))
        return '200'

@app.route('/debug',methods=['GET'])
def debug():
    global animator
    set_trace()
    return ''



if __name__ == '__main__':
    app.run(threaded=True)
