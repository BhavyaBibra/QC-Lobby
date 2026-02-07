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
        
        # #region agent log
        import json, time; open('/Users/gargichandna/Desktop/QC Lobby/.cursor/debug.log','a').write(json.dumps({"hypothesisId":"B_http","location":"n8n.py:trigger_qc_job","message":"Calling n8n webhook","data":{"webhook_url":self.webhook_url,"job_id":job_id,"callback_base_url":self.callback_base_url},"timestamp":int(time.time()*1000),"sessionId":"debug-session"})+'\n')
        # #endregion
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                self.webhook_url,
                json=payload,
                headers=self._get_headers()
            )
            
            print(f"[n8n] Response status: {response.status_code}")
            print(f"[n8n] Response body: {response.text[:500]}")
            
            # #region agent log
            import json, time; open('/Users/gargichandna/Desktop/QC Lobby/.cursor/debug.log','a').write(json.dumps({"hypothesisId":"B_http","location":"n8n.py:trigger_qc_job:response","message":"n8n response received","data":{"status_code":response.status_code,"response_text":response.text[:200]},"timestamp":int(time.time()*1000),"sessionId":"debug-session"})+'\n')
            # #endregion
            
            # n8n should respond quickly with acknowledgment
            if response.status_code >= 400:
                raise Exception(f"n8n webhook failed: {response.status_code} - {response.text}")
            
            try:
                return response.json()
            except Exception:
                return {"status": "queued", "raw_response": response.text}
    
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
