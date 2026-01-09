#!/usr/bin/env python3

import requests
import sys
import json
import time
from datetime import datetime
from pathlib import Path
import tempfile
import os

class AssessmentEditorAPITester:
    def __init__(self, base_url="https://claude-rag-chat.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.project_id = None
        self.conversation_id = None
        self.file_id = None

    def log_test(self, name, success, details="", response_data=None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details,
            "response_data": response_data
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'} if not files else {}

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                if files:
                    response = requests.post(url, files=files, timeout=30)
                else:
                    response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)

            success = response.status_code == expected_status
            response_data = None
            
            try:
                response_data = response.json()
            except:
                response_data = response.text

            details = f"Status: {response.status_code}, Expected: {expected_status}"
            if not success:
                details += f", Response: {response_data}"

            self.log_test(name, success, details, response_data)
            return success, response_data

        except Exception as e:
            self.log_test(name, False, f"Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        success, response = self.run_test(
            "Root API endpoint",
            "GET",
            "",
            200
        )
        return success

    def test_create_project(self):
        """Test project creation"""
        project_data = {
            "name": f"Test Project {datetime.now().strftime('%H%M%S')}",
            "description": "Test project for API testing",
            "instructions": "Test instructions for AI",
            "memory": "Test memory context"
        }
        
        success, response = self.run_test(
            "Create project",
            "POST",
            "projects",
            200,
            data=project_data
        )
        
        if success and response:
            self.project_id = response.get('id')
            print(f"   Created project ID: {self.project_id}")
        
        return success

    def test_get_projects(self):
        """Test getting projects list"""
        success, response = self.run_test(
            "Get projects list",
            "GET",
            "projects",
            200
        )
        return success

    def test_get_project_detail(self):
        """Test getting project details"""
        if not self.project_id:
            self.log_test("Get project detail", False, "No project ID available")
            return False
            
        success, response = self.run_test(
            "Get project detail",
            "GET",
            f"projects/{self.project_id}",
            200
        )
        return success

    def test_update_project(self):
        """Test updating project"""
        if not self.project_id:
            self.log_test("Update project", False, "No project ID available")
            return False
            
        update_data = {
            "instructions": "Updated instructions for testing",
            "memory": "Updated memory context"
        }
        
        success, response = self.run_test(
            "Update project",
            "PUT",
            f"projects/{self.project_id}",
            200,
            data=update_data
        )
        return success

    def test_star_project(self):
        """Test starring/unstarring project"""
        if not self.project_id:
            self.log_test("Star project", False, "No project ID available")
            return False
            
        success, response = self.run_test(
            "Toggle star project",
            "PUT",
            f"projects/{self.project_id}/star",
            200
        )
        return success

    def test_file_upload(self):
        """Test file upload"""
        if not self.project_id:
            self.log_test("File upload", False, "No project ID available")
            return False
        
        # Create a test text file
        test_content = "This is a test file for the assessment editor.\nIt contains sample content for testing file upload functionality."
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
            f.write(test_content)
            temp_file_path = f.name
        
        try:
            with open(temp_file_path, 'rb') as f:
                files = {'file': ('test_file.txt', f, 'text/plain')}
                success, response = self.run_test(
                    "Upload file",
                    "POST",
                    f"projects/{self.project_id}/files",
                    200,
                    files=files
                )
                
                if success and response:
                    self.file_id = response.get('id')
                    print(f"   Uploaded file ID: {self.file_id}")
                
                return success
        finally:
            os.unlink(temp_file_path)

    def test_get_project_files(self):
        """Test getting project files"""
        if not self.project_id:
            self.log_test("Get project files", False, "No project ID available")
            return False
            
        success, response = self.run_test(
            "Get project files",
            "GET",
            f"projects/{self.project_id}/files",
            200
        )
        return success

    def test_create_conversation(self):
        """Test creating conversation"""
        if not self.project_id:
            self.log_test("Create conversation", False, "No project ID available")
            return False
            
        conv_data = {
            "project_id": self.project_id,
            "name": f"Test Conversation {datetime.now().strftime('%H%M%S')}"
        }
        
        success, response = self.run_test(
            "Create conversation",
            "POST",
            "conversations",
            200,
            data=conv_data
        )
        
        if success and response:
            self.conversation_id = response.get('id')
            print(f"   Created conversation ID: {self.conversation_id}")
        
        return success

    def test_get_conversations(self):
        """Test getting project conversations"""
        if not self.project_id:
            self.log_test("Get conversations", False, "No project ID available")
            return False
            
        success, response = self.run_test(
            "Get project conversations",
            "GET",
            f"projects/{self.project_id}/conversations",
            200
        )
        return success

    def test_get_recent_conversations(self):
        """Test getting recent conversations"""
        success, response = self.run_test(
            "Get recent conversations",
            "GET",
            "conversations/recent?limit=5",
            200
        )
        return success

    def test_get_messages(self):
        """Test getting conversation messages"""
        if not self.conversation_id:
            self.log_test("Get messages", False, "No conversation ID available")
            return False
            
        success, response = self.run_test(
            "Get conversation messages",
            "GET",
            f"conversations/{self.conversation_id}/messages",
            200
        )
        return success

    def test_chat_with_ai(self):
        """Test chat with AI (Claude Sonnet 4.5)"""
        if not self.conversation_id:
            self.log_test("Chat with AI", False, "No conversation ID available")
            return False
            
        chat_data = {
            "conversation_id": self.conversation_id,
            "message": "Hello! This is a test message. Please respond briefly.",
            "include_knowledge_base": True
        }
        
        print("   Sending message to Claude Sonnet 4.5...")
        success, response = self.run_test(
            "Chat with AI",
            "POST",
            "chat",
            200,
            data=chat_data
        )
        
        if success and response:
            print(f"   AI Response: {response.get('response', '')[:100]}...")
        
        return success

    def test_storage_config(self):
        """Test storage configuration endpoints"""
        success, response = self.run_test(
            "Get storage config",
            "GET",
            "storage/config",
            200
        )
        return success

    def test_file_download(self):
        """Test file download"""
        if not self.file_id:
            self.log_test("File download", False, "No file ID available")
            return False
            
        # Test download endpoint (should return file or redirect)
        url = f"{self.api_url}/files/{self.file_id}/download"
        try:
            response = requests.get(url, timeout=30)
            success = response.status_code in [200, 302]  # 200 for direct file, 302 for redirect
            self.log_test("File download", success, f"Status: {response.status_code}")
            return success
        except Exception as e:
            self.log_test("File download", False, f"Error: {str(e)}")
            return False

    def cleanup_test_data(self):
        """Clean up test data"""
        print("\n🧹 Cleaning up test data...")
        
        # Delete file
        if self.file_id:
            self.run_test(
                "Delete test file",
                "DELETE",
                f"files/{self.file_id}",
                200
            )
        
        # Delete conversation
        if self.conversation_id:
            self.run_test(
                "Delete test conversation",
                "DELETE",
                f"conversations/{self.conversation_id}",
                200
            )
        
        # Delete project
        if self.project_id:
            self.run_test(
                "Delete test project",
                "DELETE",
                f"projects/{self.project_id}",
                200
            )

    def run_all_tests(self):
        """Run all API tests"""
        print(f"🚀 Starting Assessment Editor API Tests")
        print(f"📍 Base URL: {self.base_url}")
        print(f"🔗 API URL: {self.api_url}")
        print("=" * 60)
        
        # Basic API tests
        self.test_root_endpoint()
        
        # Project tests
        self.test_create_project()
        self.test_get_projects()
        self.test_get_project_detail()
        self.test_update_project()
        self.test_star_project()
        
        # File tests
        self.test_file_upload()
        self.test_get_project_files()
        self.test_file_download()
        
        # Conversation tests
        self.test_create_conversation()
        self.test_get_conversations()
        self.test_get_recent_conversations()
        self.test_get_messages()
        
        # AI Chat test (this might take longer)
        self.test_chat_with_ai()
        
        # Storage config test
        self.test_storage_config()
        
        # Cleanup
        self.cleanup_test_data()
        
        # Print results
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print("❌ Some tests failed!")
            failed_tests = [r for r in self.test_results if not r['success']]
            print("\nFailed tests:")
            for test in failed_tests:
                print(f"  - {test['test']}: {test['details']}")
            return 1

def main():
    tester = AssessmentEditorAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())