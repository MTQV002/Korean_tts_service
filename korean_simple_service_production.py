#!/usr/bin/env python3
"""
Simple Korean TTS Service - Google TTS Only
Clean and reliable Korean Text-to-Speech for Fly.io deployment
"""

import requests
import urllib.parse
import json
import uuid
import re
import os
from flask import Flask, request, jsonify, Response
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route('/korean-audio-info', methods=['POST'])
def korean_audio_info():
    """
    Get Korean audio info - Google TTS Only
    Production version for Fly.io deployment
    """
    try:
        data = request.get_json()
        if not data or 'text' not in data:
            return jsonify({'error': 'Missing text parameter'}), 400
            
        text = data['text'].strip()
        if not text:
            return jsonify({'error': 'Empty text parameter'}), 400
        
        print(f"🎵 Getting audio for: '{text}'")
        
        audios = []
        sources_used = []
        
        # ONLY Google TTS - Simple and Reliable for production
        google_tts_url = f"https://translate.google.com/translate_tts?ie=UTF-8&q={urllib.parse.quote(text)}&tl=ko&client=tw-ob"
        audios.append({
            'url': f"/korean-audio?url={urllib.parse.quote(google_tts_url)}",
            'text': text,
            'accent': 'kr',
            'label': '🔊 Korean Audio',
            'quality': 'good',
            'priority': 1,
            'description': 'Korean Text-to-Speech'
        })
        sources_used.append('google_tts')
        print(f"✅ Google TTS ready for: '{text}'")
        
        result = {
            'audios': audios,
            'sources_used': sources_used,
            'primary_source': sources_used[0] if sources_used else 'none',
            'total_sources': len(audios),
            'recommendation': 'Google TTS provides reliable Korean pronunciation'
        }
        
        print(f"📊 Audio result for '{text}': {len(audios)} sources, primary: {result['primary_source']}")
        
        return jsonify(result)
        
    except Exception as e:
        print(f"❌ Error in korean_audio_info: {e}")
        # Emergency fallback - Google TTS only
        google_tts_url = f"https://translate.google.com/translate_tts?ie=UTF-8&q={urllib.parse.quote(data.get('text', ''))}&tl=ko&client=tw-ob"
        return jsonify({
            'audios': [{
                'url': f"/korean-audio?url={urllib.parse.quote(google_tts_url)}",
                'accent': 'kr',
                'label': '🔊 GOOGLE TTS (Emergency)',
                'quality': 'good',
                'priority': 2
            }],
            'sources_used': ['google_tts_emergency'],
            'primary_source': 'google_tts_emergency',
            'error': str(e)
        })

@app.route('/korean-audio', methods=['GET', 'POST'])
def korean_audio():
    """
    Proxy TTS audio để bypass CORS - Production version
    """
    if request.method == 'POST':
        # Handle POST request with JSON body
        data = request.get_json()
        if data and 'text' in data:
            text = data['text']
            tts_url = f"https://translate.google.com/translate_tts?ie=UTF-8&q={urllib.parse.quote(text)}&tl=ko&client=tw-ob"
            
            try:
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'audio/mpeg,audio/*;q=0.9,*/*;q=0.8',
                    'Referer': 'https://translate.google.com/'
                }
                
                response = requests.get(tts_url, stream=True, timeout=10, headers=headers)
                response.raise_for_status()
                
                return Response(response.content, content_type='audio/mpeg')
                
            except Exception as e:
                print(f"❌ POST TTS error: {e}")
                return jsonify({'error': f'TTS generation failed: {e}'}), 500
        else:
            return jsonify({'error': 'Missing text parameter in POST body'}), 400
    
    else:
        # Handle GET request with URL parameter
        url = request.args.get('url')
        if not url:
            return 'Missing URL parameter', 400
        
        print(f"🎵 Proxying audio from: {url}")
            
        try:
            # Google TTS headers
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'audio/mpeg,audio/*;q=0.9,*/*;q=0.8',
                'Referer': 'https://translate.google.com/'
            }
            
            response = requests.get(url, stream=True, timeout=15, headers=headers)
            
            if response.status_code != 200:
                print(f"❌ HTTP Error {response.status_code}")
                return f'HTTP Error {response.status_code}', response.status_code
            
            # Detect content type
            content_type = response.headers.get('content-type', 'audio/mpeg')
            
            # Simple filename generation for production
            try:
                # Parse URL to extract the 'q' parameter (the Korean text)
                parsed_url = urllib.parse.urlparse(url)
                query_params = urllib.parse.parse_qs(parsed_url.query)
                korean_text = query_params.get('q', [''])[0]
                
                # Create simple, safe filename
                if korean_text:
                    # Use timestamp for unique, simple filename
                    import time
                    timestamp = str(int(time.time()))[-6:]  # Last 6 digits
                    filename = f"korean_{timestamp}.mp3"
                else:
                    filename = "korean_audio.mp3"
            except:
                filename = "korean_audio.mp3"
            
            # Return the audio content with auto-download (safe ASCII filename)
            return Response(response.content, content_type=content_type, headers={
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Content-Disposition': f'attachment; filename="{filename}"'
            })
            
        except requests.exceptions.Timeout:
            error_msg = f'Timeout error when accessing: {url}'
            print(f"❌ {error_msg}")
            return error_msg, 408
            
        except requests.exceptions.RequestException as e:
            error_msg = f'Request error: {e}'
            print(f"❌ {error_msg}")
            return error_msg, 500
            
        except Exception as e:
            error_msg = f'Unexpected error: {e}'
            print(f"❌ {error_msg}")
            return error_msg, 500

@app.route('/health')
def health():
    """Health check endpoint for Fly.io"""
    return jsonify({
        'status': 'healthy',
        'service': 'Korean Simple TTS',
        'features': ['google_tts_only', 'auto_download', 'korean_filename'],
        'version': '2.1-production',
        'platform': 'fly.io'
    })

@app.route('/')
def index():
    """Root endpoint with service info"""
    return jsonify({
        'service': 'Korean Simple TTS Service',
        'version': '2.1-production',
        'endpoints': {
            'korean_audio_info': '/korean-audio-info (POST)',
            'korean_audio': '/korean-audio (GET/POST)', 
            'health': '/health (GET)'
        },
        'status': 'running',
        'platform': 'fly.io'
    })

if __name__ == '__main__':
    # Get port from environment variable (Fly.io sets this)
    port = int(os.environ.get('PORT', 6790))
    
    print("🚀 Starting Korean Simple TTS Service (Production)")
    print(f"🔊 Korean TTS: http://0.0.0.0:{port}/korean-audio-info")
    print("📥 Auto-save MP3 files with Korean filename")
    print(f"💚 Health check: http://0.0.0.0:{port}/health")
    print("⏹️  Press Ctrl+C to stop")
    
    try:
        app.run(host='0.0.0.0', port=port, debug=False)
    except KeyboardInterrupt:
        print("\n🛑 Service stopped by user")
