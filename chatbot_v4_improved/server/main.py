from flask import Flask, jsonify, request
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

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Constants
TEMP_DIR = 'shots/'
API_KEY = os.getenv("AZURE_OPENAI_API_KEY")
ENDPOINT = os.getenv('AZURE_OPENAI_ENDPOINT')
MODEL = 'hj'

# Ensure temp directory exists
os.makedirs(TEMP_DIR, exist_ok=True)

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
                        add 'Here are some video shots about' at the beginning of the prompt"""
                        
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

@app.route('/api/search', methods=['POST'])
def search():
    try:
        item = request.get_json()
        text_query = item.get('prompt')
        
        if not text_query:
            return jsonify({"error": "No search prompt provided"}), 400
            
        logger.info(f"Searching for: {text_query}")
        result = contentApiSearch(text_query)
        
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error in search endpoint: {e}")
        logger.error(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

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