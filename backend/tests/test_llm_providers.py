"""
Test suite for LLM Provider functionality
Tests all 8 providers: Anthropic, Bedrock Claude, Bedrock Mistral, Bedrock Llama 3, 
Bedrock Qwen3 VL, Bedrock Titan, OpenAI GPT-5, Google Gemini
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestFeatureConfig:
    """Test /api/config/features endpoint returns all 8 providers"""
    
    def test_feature_config_returns_all_providers(self):
        """Verify all 8 LLM providers are available"""
        response = requests.get(f"{BASE_URL}/api/config/features")
        assert response.status_code == 200
        
        data = response.json()
        
        # Check all expected providers are in the list
        expected_providers = [
            "anthropic",
            "bedrock-claude",
            "bedrock-mistral",
            "bedrock-llama3",
            "bedrock-qwen3",
            "bedrock-titan",
            "openai-gpt5",
            "gemini"
        ]
        
        available_providers = data.get("available_providers", [])
        
        for provider in expected_providers:
            assert provider in available_providers, f"Provider {provider} not found in available_providers"
        
        print(f"All 8 providers found: {available_providers}")
    
    def test_feature_config_has_required_fields(self):
        """Verify feature config has all required fields"""
        response = requests.get(f"{BASE_URL}/api/config/features")
        assert response.status_code == 200
        
        data = response.json()
        
        required_fields = [
            "extended_thinking_available",
            "web_search_available",
            "using_direct_anthropic_key",
            "bedrock_configured",
            "tavily_configured",
            "bedrock_web_search_available",
            "emergent_key_configured",
            "available_providers"
        ]
        
        for field in required_fields:
            assert field in data, f"Required field {field} not found in response"
        
        print(f"All required fields present: {list(data.keys())}")


class TestProjectProviderUpdate:
    """Test updating project LLM provider"""
    
    @pytest.fixture
    def test_project_id(self):
        """Get or create a test project"""
        # First try to find existing test project
        response = requests.get(f"{BASE_URL}/api/projects")
        assert response.status_code == 200
        
        projects = response.json()
        for project in projects:
            if project.get("name") == "History Items and Stimuli":
                return project["id"]
        
        # If not found, create one
        response = requests.post(f"{BASE_URL}/api/projects", json={
            "name": "TEST_LLM_Provider_Test",
            "description": "Test project for LLM provider testing"
        })
        assert response.status_code == 200
        return response.json()["id"]
    
    def test_update_project_to_gpt5(self, test_project_id):
        """Test updating project to use GPT-5 provider"""
        response = requests.put(
            f"{BASE_URL}/api/projects/{test_project_id}",
            json={"llm_provider": "openai-gpt5"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("llm_provider") == "openai-gpt5"
        print(f"Project updated to GPT-5 provider")
    
    def test_update_project_to_gemini(self, test_project_id):
        """Test updating project to use Gemini provider"""
        response = requests.put(
            f"{BASE_URL}/api/projects/{test_project_id}",
            json={"llm_provider": "gemini"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("llm_provider") == "gemini"
        print(f"Project updated to Gemini provider")
    
    def test_update_project_to_bedrock_claude(self, test_project_id):
        """Test updating project to use Bedrock Claude provider"""
        response = requests.put(
            f"{BASE_URL}/api/projects/{test_project_id}",
            json={"llm_provider": "bedrock-claude"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("llm_provider") == "bedrock-claude"
        print(f"Project updated to Bedrock Claude provider")
    
    def test_update_project_temperature_and_top_p(self, test_project_id):
        """Test updating project temperature and top_p settings"""
        response = requests.put(
            f"{BASE_URL}/api/projects/{test_project_id}",
            json={"temperature": 0.5, "top_p": 0.8}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("temperature") == 0.5
        assert data.get("top_p") == 0.8
        print(f"Project temperature and top_p updated successfully")


class TestChatWithProviders:
    """Test chat functionality with different providers"""
    
    @pytest.fixture
    def test_conversation(self):
        """Get or create a test conversation"""
        # First get a project
        response = requests.get(f"{BASE_URL}/api/projects")
        assert response.status_code == 200
        
        projects = response.json()
        project_id = None
        for project in projects:
            if project.get("name") == "History Items and Stimuli":
                project_id = project["id"]
                break
        
        if not project_id:
            pytest.skip("Test project not found")
        
        # Create a test conversation
        response = requests.post(f"{BASE_URL}/api/conversations", json={
            "project_id": project_id,
            "name": "TEST_Provider_Chat_Test"
        })
        assert response.status_code == 200
        
        conv = response.json()
        yield conv
        
        # Cleanup - delete the conversation
        requests.delete(f"{BASE_URL}/api/conversations/{conv['id']}")
    
    def test_chat_with_gpt5_provider(self, test_conversation):
        """Test sending a chat message with GPT-5 provider"""
        # First update the project to use GPT-5
        project_id = test_conversation["project_id"]
        response = requests.put(
            f"{BASE_URL}/api/projects/{project_id}",
            json={"llm_provider": "openai-gpt5"}
        )
        assert response.status_code == 200
        
        # Send a chat message
        response = requests.post(f"{BASE_URL}/api/chat", json={
            "conversation_id": test_conversation["id"],
            "message": "Hello, please respond with 'GPT-5 working' to confirm.",
            "include_knowledge_base": False,
            "extended_thinking": False,
            "web_search": False
        }, timeout=30)
        
        assert response.status_code == 200
        data = response.json()
        assert "response" in data
        assert len(data["response"]) > 0
        print(f"GPT-5 response: {data['response'][:100]}...")
    
    def test_chat_with_gemini_provider(self, test_conversation):
        """Test sending a chat message with Gemini provider"""
        # First update the project to use Gemini
        project_id = test_conversation["project_id"]
        response = requests.put(
            f"{BASE_URL}/api/projects/{project_id}",
            json={"llm_provider": "gemini"}
        )
        assert response.status_code == 200
        
        # Send a chat message
        response = requests.post(f"{BASE_URL}/api/chat", json={
            "conversation_id": test_conversation["id"],
            "message": "Hello, please respond with 'Gemini working' to confirm.",
            "include_knowledge_base": False,
            "extended_thinking": False,
            "web_search": False
        }, timeout=30)
        
        assert response.status_code == 200
        data = response.json()
        assert "response" in data
        assert len(data["response"]) > 0
        print(f"Gemini response: {data['response'][:100]}...")


class TestAPIHealth:
    """Basic API health checks"""
    
    def test_api_root(self):
        """Test API root endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        
        data = response.json()
        assert "message" in data
        assert "version" in data
        print(f"API version: {data.get('version')}")
    
    def test_projects_list(self):
        """Test projects list endpoint"""
        response = requests.get(f"{BASE_URL}/api/projects")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} projects")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
