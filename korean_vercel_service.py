from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import requests
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint for monitoring"""
    return jsonify({
        "status": "OK",
        "service": "Korean TTS",
        "platform": "Vercel"
    })

@app.route('/korean-audio', methods=['GET'])
def korean_audio_proxy():
    """Proxy Korean TTS audio requests"""
    try:
        url = request.args.get('url')
        if not url:
            return jsonify({"error": "URL parameter required"}), 400
        
        logger.info(f"Proxying audio request: {url[:100]}...")
        
        # Make request to Google TTS
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        # Return audio with proper headers
        return Response(
            response.content,
            mimetype='audio/mpeg',
            headers={
                'Content-Disposition': 'attachment; filename="korean_audio.mp3"',
                'Access-Control-Allow-Origin': '*'
            }
        )
        
    except requests.exceptions.Timeout:
        logger.error("TTS request timeout")
        return jsonify({"error": "Request timeout"}), 408
    except requests.exceptions.RequestException as e:
        logger.error(f"TTS request failed: {str(e)}")
        return jsonify({"error": "TTS service unavailable"}), 503
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/korean-audio-info', methods=['POST'])
def korean_audio_info():
    """Get Korean audio information"""
    try:
        data = request.get_json()
        text = data.get('text', '') if data else ''
        
        if not text:
            return jsonify({"error": "Text parameter required"}), 400
        
        # Generate Google TTS URL
        google_tts_url = f"https://translate.google.com/translate_tts?ie=UTF-8&q={text}&tl=ko&client=tw-ob"
        
        return jsonify({
            "text": text,
            "language": "ko",
            "service": "Google TTS",
            "audio_url": f"/korean-audio?url={google_tts_url}",
            "status": "ready"
        })
        
    except Exception as e:
        logger.error(f"Audio info error: {str(e)}")
        return jsonify({"error": "Failed to generate audio info"}), 500

@app.route('/', methods=['GET'])
def index():
    """Root endpoint"""
    return jsonify({
        "service": "Korean TTS Service",
        "platform": "Vercel",
        "endpoints": {
            "health": "/health",
            "audio_proxy": "/korean-audio?url=<tts_url>",
            "audio_info": "/korean-audio-info (POST)"
        }
    })

# Vercel serverless function handler
def handler(request):
    return app(request.environ, lambda status, headers: None)

if __name__ == '__main__':
    # Local development
    port = int(os.environ.get('PORT', 6790))
    app.run(host='0.0.0.0', port=port, debug=False)
