from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv
from openai import AzureOpenAI
import os
import logging
import traceback
from graphql import contentApiSearch
from describe import describeVideo
import ffmpeg
import glob
import shutil
import json
from search import text_search
import boto3  

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

app = Flask(__name__, static_folder='../public', static_url_path='')
CORS(app)

# Constants
TEMP_DIR = 'public/shots/'
API_KEY = os.getenv("AZURE_OPENAI_API_KEY")
ENDPOINT = os.getenv('AZURE_OPENAI_ENDPOINT')
MODEL = 'hj'

# Ensure temp directory exists
os.makedirs(TEMP_DIR, exist_ok=True)

@app.route('/shots/<path:filename>')
def serve_shot(filename):
    return send_from_directory('public/shots', filename)

@app.route('/api/chat', methods=['POST'])
def respond():
    try:
        data = request.get_json()
        chat_history = data.get('chatHistory')
        
        if not chat_history:
            return jsonify({"error": "No chat history provided"}), 400
            
        client = AzureOpenAI(
            api_key=API_KEY,
            api_version="2024-02-15-preview",
            azure_endpoint=ENDPOINT
        )

        system_prompt = """You are a search assistant. Based on user prompt you provide a search prompt 
                        that finds the related parts of videos in the database. Your output should be a 
                        short prompt, which the search system will use to find the related content. 
                        Just return the prompt, add nothing more to your response. Specifically, do not 
                        add 'Here are some video shots about' at the beginning of the prompt
                        -Do not add October 2023 in the prompts"""
                        
        my_history = [{"role": "system", "content": system_prompt}]
        my_history.extend(chat_history) 
        
        bot_message = client.chat.completions.create(
            model=MODEL,
            messages=my_history
        )
            
        text_query = bot_message.choices[0].message.content
        respond = {"role": "assistant", "content": text_query}
        
        return jsonify(respond)
    except Exception as e:
        logger.error(f"Error in chat endpoint: {e}")
        logger.error(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

@app.route('/api/test', methods=['GET'])
def test():
    print("Test endpoint called")
    return jsonify({"status": "success", "message": "Server is working"})

@app.route('/api/saveOutput', methods=['POST'])
def saveOutput():
    try:
        print("Received request")
        item = request.get_json()
        print("Request JSON:", item)
        
        if not item:
            return jsonify({"error": "No data received"}), 400
            
        output = item.get('output')
        if not output:
            return jsonify({"error": "No output data in request"}), 400
            
        print("Received output:", output)
        
        # Use os.path.join to create the correct path
        output_path = os.path.join(os.getcwd(), "public", "shots", "output.json")
        print("Saving to path:", output_path)
        
        # Ensure the directory exists
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        try:
            with open(output_path, "w") as json_file:
                json.dump(output, json_file, indent=4)
            print(f"Successfully wrote to {output_path}")
        except Exception as write_error:
            print(f"Error writing file: {write_error}")
            return jsonify({"error": f"Failed to write file: {str(write_error)}"}), 500
            
        return jsonify({"status": "success", "message": "Output saved successfully"})
    except Exception as e:
        print(f"Error in saveOutput endpoint: {e}")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

@app.route('/api/search', methods=['POST'])
def search():
    try:
        item = request.get_json()
        text_query = item.get('prompt')
        
        if not text_query:
            return jsonify({"error": "No search prompt provided"}), 400
            
        logger.info(f"Searching for: {text_query}")
        # result = contentApiSearch(text_query)
        session = boto3.Session(profile_name='tr-reuters-devops-sandbox')  
        s3_client = session.client('s3')  
        result = text_search(text_query)
        for item in result:
            item['entity']['video'] = s3_client.generate_presigned_url('get_object',  
                                                Params={'Bucket': 'a206709-archive',  
                                                        'Key': f"videoSearchDemo/{item['entity']['videoPath']}"},  
                                                ExpiresIn=3600)   
            print(item['entity']['video'])
        
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error in search endpoint: {e}")
        logger.error(traceback.format_exc())
        return jsonify({"error": str(e)}), 500


@app.route('/api/downloadVideos', methods=['POST'])


def downloadVideos():
    try:
        item = request.get_json()
        shots = item.get('shots')
        if not shots:
            return jsonify({"error": "No shots provided"}), 400
        clean_temp_directory()
        downloaded_videos = []
        inputs = []
        id = 0
        for i, shot in enumerate(shots):
            # video = shot['video_url']
            video = shot['entity']['video']
            # duration = shot['entity']['duration']
            duration = get_video_duration(video)
            print(duration)
            # shot_start = shot['entity']['shotStart']
            shot_start = time_to_seconds(shot['entity']['shotStart'])
            # shot_end = shot['entity']['shotEnd']
            shot_end = time_to_seconds(shot['entity']['shotEnd'])
            shot_name = f"{TEMP_DIR}shot_{i}"
            if shot_start == 0 and shot_end == duration:
                filename = f"{shot_name}_0_{shot_end}.MP4"
                extract_clip(video, 0, shot_end, filename)
                addInput(i, filename, shot_start, shot_end, id, inputs)
                id += 1
            elif shot_start == 0:
                filename = f"{shot_name}_{shot_start}_{shot_end}.MP4"
                extract_clip(video, 0, shot_end, filename)
                addInput(i, filename, shot_start, shot_end, id, inputs)
                id += 1
                filename = f"{shot_name}_{shot_end}_{duration}.MP4"
                extract_clip(video, shot_end, duration, filename)
                addInput(i, filename, shot_end, duration, id, inputs)
                id += 1
            elif shot_end == duration:
                filename = f"{shot_name}_0_{shot_start}.MP4"
                extract_clip(video, 0, shot_start, filename)
                addInput(i, filename, 0, shot_start, id, inputs)
                id += 1
                filename = f"{shot_name}_{shot_start}_{shot_end}.MP4"
                extract_clip(video, shot_start, shot_end, filename)
                addInput(i, filename, shot_start, shot_end, id, inputs)
                id += 1
            else:
                filename = f"{shot_name}_0_{shot_start}.MP4"
                extract_clip(video, 0, shot_start, filename)
                addInput(i, filename, 0, shot_start, id, inputs)
                id += 1
                filename = f"{shot_name}_{shot_start}_{shot_end}.MP4"
                extract_clip(video, shot_start, shot_end, filename)
                addInput(i, filename, shot_start, shot_end, id, inputs)
                id += 1
                filename = f"{shot_name}_{shot_end}_{duration}.MP4"
                extract_clip(video, shot_end, duration, filename)
                addInput(i, filename, shot_end, duration, id, inputs)
                id += 1


        with open("public/shots/inputs.json", "w") as json_file:
                json.dump(inputs, json_file, indent=4)
        return jsonify({
            'status': 'success',
            'message': 'Videos downloaded successfully'
        })
    except Exception as e:
        logger.error(f"Error in downloadVideos endpoint: {e}")
        logger.error(traceback.format_exc())
        return jsonify({"error": str(e)}), 500
def addInput(i, video, shot_start, shot_end, id, inputs):
    # Add the input to the inputs list
    input = {}
    input['id'] = id
    input['type'] = "video"
    input['durationInFrames'] = (shot_end - shot_start) * 30
    input['from'] = shot_start * 30
    input['width'] = 1280
    input['height'] = 720
    input['left'] = 0
    input['top'] = 0
    input['row'] = i
    input['rotation'] = 0
    input['isDragging'] = False
    input['content'] = "Local Video File"
    input['src'] = video
    input['videoStartTime'] = 0
    input['styles'] = {
        "opacity": 1,
        "zIndex": 100,
        "transform": "none",
        "objectFit": "contain"
        }
    inputs.append(input)
@app.route('/api/videoEdit', methods=['POST'])
def videoEdit():
    try:
        item = request.get_json()
        shots = item.get('shots')
        
        if not shots:
            return jsonify({"error": "No shots provided"}), 400
            
        # Clean temp directory
        clean_temp_directory()
        
        downloaded_videos = []
        
        for i, shot in enumerate(shots):
            video = shot['video_url']
            start = shot['entity']['shotStart']
            end = shot['entity']['shotEnd']
            shot_name = f"{TEMP_DIR}shot_{i}_{start}_{end}.MP4"
            
            try:
                extract_clip(video, start, end, shot_name)
                downloaded_videos.append(shot_name)
            except Exception as e:
                logger.error(f"Error extracting clip: {e}")
                # Continue with other clips even if one fails
        
        if not downloaded_videos:
            return jsonify({"error": "Failed to extract any clips"}), 500
            
        combine_shots(downloaded_videos)
        
        # Construct description (commented out for now)
        # descriptions = [shot['entity'].get('description', '') for shot in shots]
        # video_description = describeVideo("--".join(descriptions))
        
        return jsonify({
            'status': 'success', 
            'output_key': f'{TEMP_DIR}output.MP4'
        })
    except Exception as e:
        logger.error(f"Error in videoEdit endpoint: {e}")
        logger.error(traceback.format_exc())
        return jsonify({"error": str(e)}), 500
    finally:
        # Keep output.MP4, but clean up individual clips
        for file in downloaded_videos:
            try:
                os.remove(file)
            except:
                pass

def clean_temp_directory():
    """Clean temporary directory but keep the directory itself"""
    if os.path.exists(TEMP_DIR):
        videos = glob.glob(f"{TEMP_DIR}*.MP4")
        for video in videos:
            try:
                os.remove(video)
            except Exception as e:
                logger.warning(f"Could not remove {video}: {e}")

def extract_clip(video_path, start, end, output_name):
    """Extract a clip from a video"""
    logger.info(f"Extracting clip {start}-{end} from {video_path}")
    (
        ffmpeg.input(video_path, ss=start, to=end)
        .output(output_name)
        .run(quiet=True, overwrite_output=True)
    )
def get_video_duration(file_path):
    probe = ffmpeg.probe(file_path)
    # Extract duration from video stream info
    duration = float(probe['format']['duration'])
    return duration
def time_to_seconds(time_str):
    hours, minutes, seconds = time_str.split(':')
    total_seconds = int(hours) * 3600 + int(minutes) * 60 + int(seconds)
    return total_seconds

def combine_shots(video_files):
    """Combine multiple video clips into one"""
    if not video_files:
        raise ValueError("No video files to combine")
        
    logger.info(f"Combining {len(video_files)} clips")
    
    inputs = [ffmpeg.input(filename) for filename in video_files]  
    stream_list = []  
    
    for input_stream in inputs:  
        # Scale each video to 1280x720  
        video = input_stream.video.filter('scale', width=1280, height=720)
        stream_list.append(video)  
        stream_list.append(input_stream.audio)  
        
    concatenated = ffmpeg.concat(  
        *stream_list, v=1, a=1, n=len(video_files)  
    ).node  
    
    output_video = concatenated[0]  
    output_audio = concatenated[1]  
    output = ffmpeg.output(output_video, output_audio, f'{TEMP_DIR}output.MP4')  
    ffmpeg.run(output, quiet=True, overwrite_output=True)  

if __name__ == '__main__':
    app.run(debug=True, port=8080)