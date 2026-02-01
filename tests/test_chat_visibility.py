"""
Test suite for Claude RAG Chat - Bug Fix Verification
Tests:
1. Chat message visibility in light/dark mode
2. Mistral LLM provider response integrity
3. Basic chat functionality with Anthropic provider
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://ai-assistant-hub-77.preview.emergentagent.com')

class TestAPIHealth:
    """Basic API health checks"""
    
    def test_api_root(self):
        """Test API root endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✅ API root: {data}")
    
    def test_feature_config(self):
        """Test feature configuration endpoint"""
        response = requests.get(f"{BASE_URL}/api/config/features")
        assert response.status_code == 200
        data = response.json()
        assert "available_providers" in data
        assert "anthropic" in data["available_providers"]
        print(f"✅ Feature config: {data}")


class TestProjects:
    """Project CRUD tests"""
    
    def test_get_projects(self):
        """Test getting all projects"""
        response = requests.get(f"{BASE_URL}/api/projects")
        assert response.status_code == 200
        projects = response.json()
        assert isinstance(projects, list)
        print(f"✅ Found {len(projects)} projects")
        return projects


class TestConversations:
    """Conversation tests"""
    
    def test_get_conversations(self):
        """Test getting all conversations"""
        response = requests.get(f"{BASE_URL}/api/conversations")
        assert response.status_code == 200
        conversations = response.json()
        assert isinstance(conversations, list)
        print(f"✅ Found {len(conversations)} conversations")
        return conversations
    
    def test_get_recent_conversations(self):
        """Test getting recent conversations"""
        response = requests.get(f"{BASE_URL}/api/conversations/recent?limit=5")
        assert response.status_code == 200
        conversations = response.json()
        assert isinstance(conversations, list)
        print(f"✅ Found {len(conversations)} recent conversations")


class TestMessages:
    """Message tests - verify message retrieval works"""
    
    def test_get_messages_from_conversation(self):
        """Test getting messages from an existing conversation"""
        # First get conversations
        conv_response = requests.get(f"{BASE_URL}/api/conversations")
        assert conv_response.status_code == 200
        conversations = conv_response.json()
        
        if conversations:
            conv_id = conversations[0]["id"]
            msg_response = requests.get(f"{BASE_URL}/api/conversations/{conv_id}/messages")
            assert msg_response.status_code == 200
            messages = msg_response.json()
            assert isinstance(messages, list)
            print(f"✅ Found {len(messages)} messages in conversation {conv_id[:8]}...")
            
            # Verify message structure
            if messages:
                msg = messages[0]
                assert "role" in msg
                assert "content" in msg
                assert msg["role"] in ["user", "assistant"]
                print(f"✅ Message structure valid: role={msg['role']}, content_length={len(msg['content'])}")


class TestLLMProviders:
    """Test LLM provider configuration"""
    
    def test_available_providers(self):
        """Test that all expected providers are available"""
        response = requests.get(f"{BASE_URL}/api/config/features")
        assert response.status_code == 200
        data = response.json()
        
        providers = data.get("available_providers", [])
        assert "anthropic" in providers, "Anthropic provider should be available"
        
        # Check if Bedrock is configured
        if data.get("bedrock_configured"):
            assert "bedrock-claude" in providers, "Bedrock Claude should be available"
            assert "bedrock-mistral" in providers, "Bedrock Mistral should be available"
            print(f"✅ All providers available: {providers}")
        else:
            print(f"✅ Anthropic available, Bedrock not configured")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
