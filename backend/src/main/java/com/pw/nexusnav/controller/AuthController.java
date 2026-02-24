package com.pw.nexusnav.controller;

import com.pw.nexusnav.dto.ApiResponse;
import com.pw.nexusnav.dto.AuthLoginRequest;
import com.pw.nexusnav.dto.VerifyConfigRequest;
import com.pw.nexusnav.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<Map<String, Object>>> login(@Valid @RequestBody AuthLoginRequest request) {
        if (!authService.isSecurityEnabled()) {
            return ResponseEntity.ok(ApiResponse.ok(Map.of(
                    "authenticated", true,
                    "securityEnabled", false
            )));
        }
        if (!authService.validatePassword(request.getPassword())) {
            return ResponseEntity.status(401).body(ApiResponse.error("Invalid password"));
        }

        String token = authService.createSession();
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, authService.buildSessionCookie(token).toString())
                .body(ApiResponse.ok(Map.of(
                        "authenticated", true,
                        "securityEnabled", true,
                        "sessionTimeoutMinutes", authService.getSessionTimeoutMinutes()
                )));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Map<String, Object>>> logout(HttpServletRequest request) {
        String token = authService.extractSessionToken(request);
        authService.clearSession(token);
        boolean securityEnabled = authService.isSecurityEnabled();
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, authService.buildClearSessionCookie().toString())
                .body(ApiResponse.ok(Map.of(
                        "authenticated", false,
                        "securityEnabled", securityEnabled,
                        "sessionTimeoutMinutes", authService.getSessionTimeoutMinutes()
                )));
    }

    @GetMapping("/session")
    public ApiResponse<Map<String, Object>> session(HttpServletRequest request) {
        boolean securityEnabled = authService.isSecurityEnabled();
        String token = authService.extractSessionToken(request);
        boolean authenticated = !securityEnabled || (token != null && authService.isSessionValid(token));
        Map<String, Object> payload = new HashMap<>();
        payload.put("authenticated", authenticated);
        payload.put("securityEnabled", securityEnabled);
        payload.put("sessionTimeoutMinutes", authService.getSessionTimeoutMinutes());
        return ApiResponse.ok(payload);
    }

    @PostMapping("/verify-config")
    public ResponseEntity<ApiResponse<Map<String, Object>>> verifyConfig(@Valid @RequestBody VerifyConfigRequest request) {
        if (!authService.validatePassword(request.getPassword())) {
            return ResponseEntity.status(401).body(ApiResponse.error("Invalid password"));
        }

        String token = authService.createConfigVerifyToken();
        return ResponseEntity.ok(ApiResponse.ok(Map.of("verifyToken", token, "expiresInSeconds", 300)));
    }
}
