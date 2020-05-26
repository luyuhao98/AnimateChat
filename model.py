import onnxruntime as ort
import numpy as np
from scipy.spatial import ConvexHull
from skimage.transform import resize
from pdb import set_trace
import imageio
import io
import base64
from PIL import Image

class Model(object):

    """callable model"""

    def __init__(self,path):
        """load sess"""
        self.sess = ort.InferenceSession(path)
    def __call__(self, inp):
        """Run inference session

        :inp: input of the model
        :returns: the output of the model

        """
        input_dict = {}
        inp_names = self.sess.get_inputs()
        for i in range(len(inp_names)):
            input_dict[inp_names[i].name] = inp[i]
        return self.sess.run(None, input_dict)

class Animator(object):

    """Docstring for Animator. """

    def __init__(self,config = None):
        """load model """
        if not config:
            config = {
                    'kp_detector': 'models/kp_detector.onnx',
                    'generator' : 'models/generatorx.onnx',
                    'adaptMovementScale': True,
                    'useRelativeMovement': True,
                    'useRelativeJacobian': True
                    }
        self.kpDetector = Model(config['kp_detector'])
        self.generator = Model(config['generator'])
        self.adaptMovementScale = config['adaptMovementScale']
        self.useRelativeMovement = config['useRelativeMovement']
        self.useRelativeJacobian = config['useRelativeJacobian']

        self.kpTarget = {}
        self.target = {}
        self.kpDrivingInitial = {}

    def __js2NpImg(self, inp):
        """convert js image to numpy fromat
        :inp: js image
        :return numpy format
        """
        # set_trace()
        inp = io.BytesIO(base64.b64decode(inp[23:]))
        inp = imageio.imread(inp)
        inp = resize(inp,(256,256))
        inp = inp[np.newaxis].astype(np.float32).transpose(0, 3, 1, 2)
        return inp


    def __np2JsImg(self, inp):
        """convert numpy image to js format
        :inp: numpy format
        :return js image
        """
        # set_trace()

        image_out = Image.fromarray(inp)
        buffer = io.BytesIO()
        image_out.save(buffer, format="PNG")
        base64_str = "data:image/png;base64," + base64.b64encode(buffer.getvalue()).decode("utf-8")
        return base64_str

    def __getKpValue(self, inp):
        """
        :inp: js image
        :return: kpValue
        """
        npInp = self.__js2NpImg(inp)
        return self.kpDetector([npInp])

    def setTarget(self, target,token):
        # set kpTarget
        # self.target = __js2NpImg(target)

        img = Image.open(target).convert('RGB');
        nptarget =np.array(img).astype(np.uint8);
        nptarget = resize(nptarget, (256, 256));
        self.target[token] = nptarget[np.newaxis].astype(np.float32).transpose(0, 3, 1, 2)

        self.kpTarget[token] = self.kpDetector([self.target[token]])

    def setDrivingInitial(self, drivingInitial,token):
        #set kpDrivingInitial
        self.kpDrivingInitial[token] = self.__getKpValue(drivingInitial)

    def __normalizeKp(self,kpDriving,token):
        # def normalize_kp(kp_source, kp_driving, kp_driving_initial, adapt_movement_scale=False,
                     # use_relative_movement=False, use_relative_jacobian=False):
        if self.adaptMovementScale:
            sourceArea = ConvexHull(self.kpTarget[token][0][0]).volume
            drivingArea = ConvexHull(self.kpDrivingInitial[token][0][0]).volume
            adaptMovementScale = np.sqrt(sourceArea) / np.sqrt(drivingArea)
        else:
            adaptMovementScale = 1

        kpNew = []
        if self.useRelativeMovement:
            kpValueDiff = (kpDriving[0] - self.kpDrivingInitial[token][0])
            kpValueDiff *= adaptMovementScale
            kpNew.append(kpValueDiff + self.kpTarget[token][0])

            if self.useRelativeJacobian:
                jacobianDiff = np.matmul(kpDriving[1], np.linalg.inv(self.kpDrivingInitial[token][1]))
                kpNew.append(np.matmul(jacobianDiff, self.kpTarget[token][1]))
        else:
            kpNew = kpDriving

        return kpNew

    def make_animation(self,drivingFrame,token):
        """
        :drivingFrame: js image
        """
        kpDriving = self.__getKpValue(drivingFrame)
        kpNorm = self.__normalizeKp(kpDriving,token)

        inp = [self.target[token], kpNorm[0], np.linalg.inv(kpNorm[1]),self.kpTarget[token][0],self.kpTarget[token][1]]
        out = self.generator(inp)
        out = (np.transpose(out[0], [0, 2, 3, 1])[0]*255).astype(np.uint8)
        return self.__np2JsImg(out)

    def unload(self,token):
        try:
            del self.target[token]
        except Exception as e:
            print(e)
        try:
            del self.kpTarget[token]
        except Exception as e:
            print(e)
        try:
            del self.kpDrivingInitial[token]
        except Exception as e:
            print(e)
