#LLM requirements
from llama_cpp import Llama

#Image Diffusion Requirements
import torch
import gc
from diffusers import StableDiffusionPipeline

#Audio Diffusion Requirements
from diffusers import AudioLDM2Pipeline
import scipy


#Loading the LLM
model_path = "[ENTER PATH TO MODEL]"

llm = ""

generation_kwargs = {
    "max_tokens":20000,
    "stop":["<|im_end|>"],
    "echo":False,
    "stream":True
}

system_message = "You are Omni, a large language model. Answer as concisely as possible."

history = """
<|im_start|>system
{system_message}<|im_end|>
""".format(system_message=system_message)

prompt_template = """
<|im_start|>user
{user_input}<|im_end|>
<|im_start|>assistant
"""


#Loading the Image Diffusion model
repo = "[ENTER PATH TO MODEL]"
seed = 42
weight_type = torch.float16

imagepipe = ""


#Loading the Audio Diffusion model
repo_id = "[ENTER PATH TO MODEL]"

audiopipe = ""





from flask import Flask, request, render_template, send_file
from flask_socketio import SocketIO, emit
import eventlet


app = Flask(__name__)
socketio = SocketIO(app)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/test')
def test():
    return render_template('index2.html')

@app.route('/text')
def chat():
    global llm
    global imagepipe
    global audiopipe

    imagepipe = ""
    audiopipe = ""
    gc.collect()
    torch.cuda.empty_cache()


    if llm == "":
        llm = Llama(model_path=model_path,n_ctx=4096,n_threads=8,n_gpu_layers=35)
    return render_template('text.html')

@app.route('/image')
def image():
    global imagepipe
    global llm
    global audiopipe

    llm = ""
    audiopipe = ""
    gc.collect()
    torch.cuda.empty_cache()

    if imagepipe == "":
        imagepipe = StableDiffusionPipeline.from_pretrained(repo, torch_dtype=weight_type)
        imagepipe.to("cuda")
    return render_template('image.html')

@app.route('/audio')
def audio():
    global audiopipe
    global llm
    global imagepipe

    llm = ""
    imagepipe = ""
    gc.collect()
    torch.cuda.empty_cache()

    if audiopipe == "":
        audiopipe = AudioLDM2Pipeline.from_pretrained(repo_id, torch_dtype=torch.float16)
        audiopipe = audiopipe.to("cuda")
    return render_template('audio.html')


@socketio.on('log')
def handle_log(data):
    print(data)

@socketio.on('userMessage')
def handle_user_message(json):
    global history
    id = len(history)
    prompt = prompt_template.format(user_input=json["userInput"])
    history += prompt
    output_stream = llm.create_completion(history, **generation_kwargs)
    output = ''
    for item in output_stream:
        print(item['choices'][0]['text'], end='')
        chunk = item['choices'][0]['text']
        output += chunk
        emit('aiMessage', {'content': chunk, 'id': id+1})
        eventlet.sleep(0)
    emit('streamEnd')
    history += output
    history += "<|im_end|>\n"
    print(history)

@socketio.on('generateImage')
def handle_generate_image(json):
    global imagepipe
    prompt = json["userInput"]
    image = imagepipe(prompt, num_inference_steps=1, guidance_scale=0,generator=torch.Generator(device="cuda").manual_seed(seed)).images[0]
    image.save("output.png")
    with open('output.png', 'rb') as f:
        image_data = f.read()
    emit('generatedImage', {'image': image_data})

@socketio.on('generateAudio')
def handle_generate_audio(json):
    global audiopipe
    prompt = json["userInput"]

    audio = audiopipe(prompt, num_inference_steps=200, audio_length_in_s=10.0).audios[0]
    scipy.io.wavfile.write("output.wav", rate=16000, data=audio)

    with open('output.wav', 'rb') as f:
        audio_data = f.read()
    emit('generatedAudio', {'url': "http://127.0.0.1:5000/fetch_audio"})

@app.route('/fetch_audio')
def fetch_audio():
    return send_file('output.wav', mimetype='audio/wav')

if __name__ == '__main__':
    socketio.run(app, debug=True)