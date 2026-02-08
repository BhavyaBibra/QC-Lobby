"""
n8n Integration Service

Handles communication between QC Lobby backend and n8n workflows.
- Sends job requests to n8n webhook
- Validates callbacks from n8n
"""

import httpx
from typing import Optional, Dict, Any
from app.core.config import settings


class N8NService:
    """Service for communicating with n8n workflows."""
    
    def __init__(self):
        self.webhook_url = settings.N8N_WEBHOOK_URL
        self.api_key = settings.N8N_API_KEY
        self.callback_base_url = settings.N8N_CALLBACK_BASE_URL
    
    def _get_headers(self) -> Dict[str, str]:
        """Get headers for n8n requests including auth."""
        return {
            "Content-Type": "application/json",
            "X-API-Key": self.api_key
        }
    
    async def trigger_qc_job(
        self,
        job_id: str,
        video_url: str,
        qc_mode: str,
        duration_sec: int,
        team_id: str,
        thumbnail_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Trigger a QC job in n8n.
        
        Args:
            job_id: Unique job identifier
            video_url: URL to the video file
            qc_mode: 'polisher' or 'guardian'
            duration_sec: Video duration in seconds
            team_id: Team identifier
            thumbnail_url: Optional thumbnail image URL
            
        Returns:
            Response from n8n webhook
        """
        payload = {
            "job_id": job_id,
            "video_url": video_url,
            "qc_mode": qc_mode,
            "duration_sec": duration_sec,
            "team_id": team_id,
        }
        
        if thumbnail_url:
            payload["thumbnail_url"] = thumbnail_url
        
        # Add callback URLs if configured
        if self.callback_base_url:
            payload["callback_urls"] = {
                "progress": f"{self.callback_base_url}/v1/callbacks/n8n/progress",
                "complete": f"{self.callback_base_url}/v1/callbacks/n8n/complete",
                "failed": f"{self.callback_base_url}/v1/callbacks/n8n/failed"
            }
        
        print(f"[n8n] Sending request to: {self.webhook_url}")
        print(f"[n8n] Payload: {payload}")
        print(f"[n8n] Headers: {self._get_headers()}")
        
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:  # Increased timeout for slower n8n workflows
                response = await client.post(
                    self.webhook_url,
                    json=payload,
                    headers=self._get_headers()
                )
        except httpx.TimeoutException:
            # n8n workflow takes longer than timeout - this is okay!
            # n8n is still processing and will send callback when done
            print(f"[n8n] Request timed out - n8n is likely still processing, will receive callback later")
            return {"status": "acknowledged", "message": "n8n request timed out but likely processing"}
        except httpx.RequestError as e:
            # Network error - this is a real failure
            print(f"[n8n] Network error: {e}")
            raise Exception(f"n8n network error: {e}")
        
        print(f"[n8n] Response status: {response.status_code}")
        print(f"[n8n] Response body: {response.text[:500] if response.text else '(empty)'}")
        
        # n8n should respond with acknowledgment or QC results
        if response.status_code >= 400:
            raise Exception(f"n8n webhook failed: {response.status_code} - {response.text}")
        
        # n8n might return empty body on success (just acknowledgment)
        if not response.text or response.text.strip() == "":
            print(f"[n8n] Empty response (accepted as acknowledgment)")
            return {"status": "acknowledged", "message": "n8n accepted the request"}
        
        try:
            response_json = response.json()
        except Exception:
            # If n8n returns non-JSON, it's likely an HTML error page or raw text
            raise Exception(
                f"n8n returned invalid response: {response.text[:200]}"
            )

        # If n8n returns the QC results directly (synchronous workflow), 
        # that's valid - just acknowledge and return
        if isinstance(response_json, list):
            print(f"[n8n] Received QC results directly ({len(response_json)} items) - workflow is synchronous")
            return {"status": "acknowledged", "message": "n8n returned results directly", "results": response_json}
        
        # Check for logical errors in the response body
        # n8n might return {"message": "Workflow is not active", "code": 400} with a 200 OK
        if isinstance(response_json, dict):
            # Check for error messages
            if response_json.get("message") and "error" in str(response_json.get("message")).lower():
                print(f"[n8n] Logical error in response: {response_json}")
                raise Exception(f"n8n workflow error: {response_json.get('message')}")
            # Any other dict response is fine (could be acknowledgment or status)
            return response_json
        
        # Anything else, just return it
        return response_json
    
    def validate_api_key(self, provided_key: str) -> bool:
        """
        Validate an API key from n8n callback.
        
        Args:
            provided_key: The API key provided in the callback request
            
        Returns:
            True if valid, False otherwise
        """
        return provided_key == self.api_key


# Singleton instance
n8n_service = N8NService()
