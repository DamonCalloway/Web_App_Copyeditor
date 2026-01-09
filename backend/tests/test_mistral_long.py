"""
Test script to reproduce and verify Mistral response corruption on long messages.
This tests the call_bedrock_converse function directly.
"""
import os
import sys
import asyncio
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / '.env')

import boto3


def test_mistral_converse_direct():
    """Test Mistral via Bedrock Converse API directly with a long prompt"""
    
    # Get credentials
    aws_access_key = os.environ.get('AWS_ACCESS_KEY_ID', '')
    aws_secret_key = os.environ.get('AWS_SECRET_ACCESS_KEY', '')
    aws_region = os.environ.get('AWS_REGION', 'us-east-1')
    
    if not aws_access_key or not aws_secret_key:
        print("ERROR: AWS credentials not configured")
        return False
    
    print(f"Using AWS Region: {aws_region}")
    
    # Initialize client
    bedrock_runtime = boto3.client(
        service_name='bedrock-runtime',
        region_name=aws_region,
        aws_access_key_id=aws_access_key,
        aws_secret_access_key=aws_secret_key
    )
    
    # Test with a long prompt that previously caused corruption
    long_prompt = """Please provide a detailed explanation of the following topics. 
    Be comprehensive and thorough in your response:

    1. The history and evolution of artificial intelligence from the 1950s to present day
    2. Key milestones in machine learning development
    3. The difference between supervised, unsupervised, and reinforcement learning
    4. Current challenges in AI safety and alignment
    5. Future predictions for AI development in the next decade

    Please structure your response with clear headings and bullet points where appropriate.
    Include specific examples and dates where possible.
    """
    
    model_id = os.environ.get('BEDROCK_MISTRAL_MODEL_ID', 'mistral.mistral-large-2407-v1:0')
    print(f"Testing model: {model_id}")
    print(f"Prompt length: {len(long_prompt)} chars")
    
    # Build messages
    messages = [
        {
            "role": "user",
            "content": [{"text": long_prompt}]
        }
    ]
    
    system_content = [{"text": "You are a helpful AI assistant. Provide detailed, well-structured responses."}]
    
    try:
        print("\nCalling Bedrock Converse API...")
        response = bedrock_runtime.converse(
            modelId=model_id,
            messages=messages,
            system=system_content,
            inferenceConfig={
                "maxTokens": 4000,
                "temperature": 0.7,
                "topP": 0.9
            }
        )
        
        # Extract response
        output_message = response.get('output', {}).get('message', {})
        content_blocks = output_message.get('content', [])
        
        response_text = ""
        for block in content_blocks:
            if 'text' in block:
                text_content = block['text']
                if isinstance(text_content, bytes):
                    text_content = text_content.decode('utf-8', errors='replace')
                response_text += str(text_content)
        
        print(f"\nResponse length: {len(response_text)} chars")
        print(f"Stop reason: {response.get('stopReason', 'unknown')}")
        print(f"Usage: {response.get('usage', {})}")
        
        # Check for corruption patterns
        corruption_patterns = [
            "th seCMOS",
            "yor title",
            "th e ",
            "  th",
            "\x00",
        ]
        
        is_corrupted = False
        for pattern in corruption_patterns:
            if pattern in response_text:
                print(f"\n!!! CORRUPTION DETECTED: Found pattern '{pattern}'")
                is_corrupted = True
        
        # Print first 2000 chars of response
        print("\n" + "="*60)
        print("RESPONSE (first 2000 chars):")
        print("="*60)
        print(response_text[:2000])
        print("\n" + "="*60)
        
        if is_corrupted:
            print("\n❌ TEST FAILED: Response appears corrupted")
            return False
        else:
            print("\n✅ TEST PASSED: Response looks clean")
            return True
            
    except Exception as e:
        print(f"\n❌ ERROR: {type(e).__name__}: {e}")
        return False


if __name__ == "__main__":
    success = test_mistral_converse_direct()
    sys.exit(0 if success else 1)
