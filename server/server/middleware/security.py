import hashlib
import re
import time

from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin


class TamperDetectionMiddleware(MiddlewareMixin):
    """
    Middleware to detect request tampering, proxy interception tools
    (Burp Suite, OWASP ZAP, Fiddler, mitmproxy, etc.), and suspicious
    request patterns. Returns scary warning responses when tampering is detected.
    """

    # Known proxy/interception tool signatures in User-Agent or headers
    PROXY_TOOL_SIGNATURES = [
        "burp",
        "burpsuite",
        "portswigger",
        "owasp",
        "zap",
        "zaproxy",
        "fiddler",
        "fiddlercore",
        "telerik",
        "mitmproxy",
        "charles",
        "charlesproxy",
        "httptoolkit",
        "http-toolkit",
        "paros",
        "webscarab",
        "nikto",
        "sqlmap",
        "nmap",
        "havij",
        "acunetix",
        "nessus",
        "openvas",
        "w3af",
        "arachni",
        "wpscan",
        "dirbuster",
        "gobuster",
        "ffuf",
        "nuclei",
        "httpie",
        "insomnia",
    ]

    # Suspicious header names injected by proxy tools
    SUSPICIOUS_HEADERS = [
        "HTTP_X_BURP",
        "HTTP_X_ZAP",
        "HTTP_X_FORWARDED_SERVER",
        "HTTP_X_SCANNER",
        "HTTP_X_ATTACK",
        "HTTP_X_INJECT",
        "HTTP_X_CUSTOM_INJECT",
        "HTTP_X_PROXY_ID",
        "HTTP_X_MITMPROXY",
        "HTTP_X_CHARLES",
        "HTTP_X_FIDDLER",
        "HTTP_PROXY_CONNECTION",
        "HTTP_X_WIPP",
    ]

    # SQL injection patterns
    SQL_INJECTION_PATTERNS = [
        r"(\b(union|select|insert|update|delete|drop|alter|create|exec|execute)\b.*\b(from|into|table|database|where)\b)",
        r"(--|;|\/\*|\*\/|@@|@)",
        r"(\b(or|and)\b\s+\d+\s*=\s*\d+)",
        r"('(\s)*(or|and)(\s)*')",
        r"(\bwaitfor\b\s+\bdelay\b)",
        r"(\bbenchmark\b\s*\()",
        r"(\bsleep\b\s*\()",
    ]

    # XSS patterns
    XSS_PATTERNS = [
        r"<script[^>]*>",
        r"javascript\s*:",
        r"on(error|load|click|mouseover|focus|blur|submit|change|keyup|keydown)\s*=",
        r"<iframe[^>]*>",
        r"<object[^>]*>",
        r"<embed[^>]*>",
        r"<svg[^>]*on\w+\s*=",
        r"expression\s*\(",
        r"url\s*\(\s*['\"]?\s*data:",
    ]

    # Path traversal patterns
    PATH_TRAVERSAL_PATTERNS = [
        r"\.\./",
        r"\.\.\\",
        r"%2e%2e%2f",
        r"%2e%2e/",
        r"\.%2e/",
        r"%2e\./",
        r"etc/passwd",
        r"etc/shadow",
        r"windows/system32",
        r"boot\.ini",
        r"win\.ini",
    ]

    # Commonly scanned sensitive paths
    HONEYPOT_PATHS = [
        "/.env",
        "/.git",
        "/.git/config",
        "/.gitignore",
        "/wp-admin",
        "/wp-login",
        "/wp-login.php",
        "/wp-content",
        "/administrator",
        "/admin",
        "/phpmyadmin",
        "/phpinfo",
        "/phpinfo.php",
        "/config.php",
        "/configuration.php",
        "/.htaccess",
        "/.htpasswd",
        "/server-status",
        "/server-info",
        "/debug",
        "/trace",
        "/console",
        "/actuator",
        "/actuator/health",
        "/elmah.axd",
        "/web.config",
        "/.aws/credentials",
        "/.docker",
        "/Dockerfile",
        "/docker-compose.yml",
        "/.ssh",
        "/id_rsa",
        "/backup",
        "/db.sql",
        "/dump.sql",
        "/database.sql",
        "/.svn",
        "/.hg",
        "/robots.txt",
        "/sitemap.xml",
        "/.well-known",
        "/cgi-bin",
        "/shell",
        "/cmd",
        "/eval",
        "/xmlrpc.php",
    ]

    def _get_client_ip(self, request):
        """Extract the real client IP address."""
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            return x_forwarded_for.split(",")[0].strip()
        x_real_ip = request.META.get("HTTP_X_REAL_IP")
        if x_real_ip:
            return x_real_ip.strip()
        return request.META.get("REMOTE_ADDR", "unknown")

    def _collect_device_data(self, request):
        """Collect all available device/request data."""
        return {
            "ip_address": self._get_client_ip(request),
            "user_agent": request.META.get("HTTP_USER_AGENT", "N/A"),
            "method": request.method,
            "path": request.get_full_path(),
            "host": request.META.get("HTTP_HOST", "N/A"),
            "referer": request.META.get("HTTP_REFERER", "N/A"),
            "accept": request.META.get("HTTP_ACCEPT", "N/A"),
            "accept_language": request.META.get("HTTP_ACCEPT_LANGUAGE", "N/A"),
            "accept_encoding": request.META.get("HTTP_ACCEPT_ENCODING", "N/A"),
            "content_type": request.META.get("CONTENT_TYPE", "N/A"),
            "content_length": request.META.get("CONTENT_LENGTH", "N/A"),
            "connection": request.META.get("HTTP_CONNECTION", "N/A"),
            "server_protocol": request.META.get("SERVER_PROTOCOL", "N/A"),
            "server_port": request.META.get("SERVER_PORT", "N/A"),
            "remote_port": request.META.get("REMOTE_PORT", "N/A"),
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
            "is_secure": request.is_secure(),
            "is_ajax": request.headers.get("X-Requested-With") == "XMLHttpRequest",
        }

    def _generate_threat_id(self, request):
        """Generate a unique threat/trace ID for this request."""
        raw = f"{self._get_client_ip(request)}{time.time()}{request.get_full_path()}"
        return hashlib.sha256(raw.encode()).hexdigest()[:16].upper()

    def _check_proxy_tools(self, request):
        """Detect proxy/interception tools from headers and user agent."""
        user_agent = request.META.get("HTTP_USER_AGENT", "").lower()
        detections = []

        # Check User-Agent for known tool signatures
        for sig in self.PROXY_TOOL_SIGNATURES:
            if sig in user_agent:
                detections.append(f"Proxy tool signature detected in User-Agent: {sig}")

        # Check for suspicious headers injected by proxy tools
        for header in self.SUSPICIOUS_HEADERS:
            if header in request.META:
                detections.append(f"Suspicious header detected: {header}")

        # Check for empty or missing User-Agent (common with automated tools)
        if not user_agent or user_agent.strip() == "":
            detections.append("Missing User-Agent header (automated tool suspected)")

        # Check for Burp Suite specific certificate headers
        if request.META.get("HTTP_SEC_CH_UA", "").lower().find("burp") != -1:
            detections.append("Burp Suite certificate signature detected")

        return detections

    def _check_header_anomalies(self, request):
        """Detect header manipulation and anomalies."""
        anomalies = []
        user_agent = request.META.get("HTTP_USER_AGENT", "")

        # Check for contradictory headers (e.g., mobile UA but desktop accept headers)
        if user_agent:
            # Extremely long User-Agent (buffer overflow attempt)
            if len(user_agent) > 1000:
                anomalies.append(
                    "Abnormally long User-Agent header (possible buffer overflow attempt)"
                )

            # User-Agent containing suspicious characters
            if any(c in user_agent for c in ["<", ">", "{", "}", "|", "`", "^"]):
                anomalies.append("User-Agent contains suspicious characters")

        # Check Accept header anomalies
        accept = request.META.get("HTTP_ACCEPT", "")
        if (
            accept == "*/*"
            and request.method in ["GET"]
            and not request.headers.get("X-Requested-With")
        ):
            # Many automated tools send Accept: */* for GET requests
            # This alone isn't conclusive, but combined with other signals it's suspicious
            pass

        # Check for missing standard headers that browsers always send
        if request.method == "GET":
            standard_headers = [
                "HTTP_ACCEPT",
                "HTTP_ACCEPT_LANGUAGE",
                "HTTP_ACCEPT_ENCODING",
            ]
            missing = [h for h in standard_headers if h not in request.META]
            if len(missing) >= 2:
                anomalies.append(
                    f"Missing standard browser headers: {', '.join(missing)}"
                )

        # Check for HTTP/1.0 (often used by scanners)
        server_protocol = request.META.get("SERVER_PROTOCOL", "")
        if server_protocol == "HTTP/1.0":
            anomalies.append("Using HTTP/1.0 protocol (uncommon for modern browsers)")

        # Detect header injection attempts (newlines in header values)
        for key, value in request.META.items():
            if key.startswith("HTTP_") and isinstance(value, str):
                if "\r" in value or "\n" in value:
                    anomalies.append(f"Header injection attempt detected in {key}")

        return anomalies

    def _check_payload_tampering(self, request):
        """Check request body and query params for injection attempts."""
        tampering = []

        # Gather all input sources
        inputs_to_check = []

        # Query parameters
        for key, value in request.GET.items():
            inputs_to_check.append(("query_param", key, value))

        # POST data
        try:
            for key, value in request.POST.items():
                inputs_to_check.append(("post_data", key, value))
        except Exception:
            pass

        # Request body for JSON payloads
        if request.content_type and "json" in request.content_type.lower():
            try:
                body = request.body.decode("utf-8", errors="ignore")
                if body:
                    inputs_to_check.append(("json_body", "body", body))
            except Exception:
                pass

        # Check each input against patterns
        for source, key, value in inputs_to_check:
            value_str = str(value).lower()

            # SQL Injection check
            for pattern in self.SQL_INJECTION_PATTERNS:
                if re.search(pattern, value_str, re.IGNORECASE):
                    tampering.append(
                        f"SQL injection pattern detected in {source} '{key}'"
                    )
                    break

            # XSS check
            for pattern in self.XSS_PATTERNS:
                if re.search(pattern, value_str, re.IGNORECASE):
                    tampering.append(f"XSS pattern detected in {source} '{key}'")
                    break

            # Path traversal check
            for pattern in self.PATH_TRAVERSAL_PATTERNS:
                if re.search(pattern, value_str, re.IGNORECASE):
                    tampering.append(
                        f"Path traversal attempt detected in {source} '{key}'"
                    )
                    break

        # Check the URL path itself
        path = request.get_full_path().lower()
        for pattern in self.PATH_TRAVERSAL_PATTERNS:
            if re.search(pattern, path, re.IGNORECASE):
                tampering.append("Path traversal attempt detected in URL")
                break

        return tampering

    def _check_honeypot_paths(self, request):
        """Check if someone is probing for sensitive files/paths."""
        path = request.path.lower().rstrip("/")
        for honeypot in self.HONEYPOT_PATHS:
            if path == honeypot.rstrip("/") or path.startswith(honeypot):
                return f"Sensitive path probe detected: {request.path}"
        return None

    def _build_threat_response(self, request, detections, threat_type="TAMPERING"):
        """Build a scary JSON warning response for detected threats."""
        device_data = self._collect_device_data(request)
        threat_id = self._generate_threat_id(request)

        response_data = {
            "status": "BLOCKED",
            "threat_level": "CRITICAL",
            "threat_type": threat_type,
            "threat_id": f"THREAT-{threat_id}",
            "message": "⚠️ SECURITY VIOLATION DETECTED — YOUR REQUEST HAS BEEN BLOCKED",
            "warning": (
                "Your request has been intercepted by our security system. "
                "Tampering, interception, or manipulation of requests is strictly prohibited. "
                "Your device fingerprint, IP address, and all request metadata have been captured and logged."
            ),
            "detections": detections,
            "your_data": {
                "ip_address": device_data["ip_address"],
                "user_agent": device_data["user_agent"],
                "method": device_data["method"],
                "path": device_data["path"],
                "host": device_data["host"],
                "timestamp": device_data["timestamp"],
                "secure_connection": device_data["is_secure"],
            },
            "security_notice": (
                "All activities on this system are monitored and recorded. "
                "Evidence of unauthorized access, tampering, or exploitation attempts "
                "will be reported to relevant authorities. "
                "Unauthorized access is a violation of applicable cyber crime laws."
            ),
            "recommendations": [
                "Stop using interception/proxy tools against this application.",
                "Do not attempt to manipulate or replay requests.",
                "Do not attempt SQL injection, XSS, or other attack vectors.",
                "Continued attempts will result in permanent IP ban.",
                "Legal action may be pursued for persistent attacks.",
            ],
        }

        response = JsonResponse(response_data, status=403)
        response["X-Security-Status"] = "BLOCKED"
        response["X-Threat-ID"] = f"THREAT-{threat_id}"
        response["X-Warning"] = "Tampering-Detected"
        response["Cache-Control"] = "no-store, no-cache, must-revalidate"
        response["Pragma"] = "no-cache"
        return response

    def process_request(self, request):
        """Main entry point — check every incoming request for tampering."""
        all_detections = []

        # 1. Check for proxy/interception tools
        proxy_detections = self._check_proxy_tools(request)
        if proxy_detections:
            all_detections.extend(proxy_detections)

        # 2. Check for header anomalies/manipulation
        header_anomalies = self._check_header_anomalies(request)
        if header_anomalies:
            all_detections.extend(header_anomalies)

        # 3. Check for payload tampering (SQL injection, XSS, etc.)
        payload_tampering = self._check_payload_tampering(request)
        if payload_tampering:
            all_detections.extend(payload_tampering)

        # 4. Check for honeypot path probes
        honeypot = self._check_honeypot_paths(request)
        if honeypot:
            all_detections.append(honeypot)

        # If any threats were detected, block the request
        if all_detections:
            threat_type = "PROXY_TOOL" if proxy_detections else "TAMPERING"
            if payload_tampering:
                threat_type = "INJECTION_ATTEMPT"
            if honeypot:
                threat_type = "RECONNAISSANCE"

            return self._build_threat_response(request, all_detections, threat_type)

        # No threats — allow the request to proceed
        return None

    def process_response(self, request, response):
        """Add security headers to all responses."""
        # Add a subtle monitoring header to all responses
        response["X-Security"] = "Active"
        response["X-Content-Type-Options"] = "nosniff"
        return response
