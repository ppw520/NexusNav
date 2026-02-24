package com.pw.nexusnav.service;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseCookie;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class AuthService {

    public static final String SESSION_COOKIE = "NX_SESSION";
    private static final int DEFAULT_TIMEOUT_MINUTES = 480;
    private static final BCryptPasswordEncoder BCRYPT = new BCryptPasswordEncoder();

    private final ConfigImportService configImportService;
    private final Map<String, Long> sessions = new ConcurrentHashMap<>();
    private final Map<String, Long> configVerifyTokens = new ConcurrentHashMap<>();

    public AuthService(ConfigImportService configImportService) {
        this.configImportService = configImportService;
    }

    public boolean validatePassword(String password) {
        if (!StringUtils.hasText(password)) {
            return false;
        }
        String configured = configImportService.getSystemConfig().getAdminPassword();
        return StringUtils.hasText(configured) && BCRYPT.matches(password, configured);
    }

    public boolean isSecurityEnabled() {
        return configImportService.getSystemConfig().getSecurity().isEnabled();
    }

    public int getSessionTimeoutMinutes() {
        int configured = configImportService.getSystemConfig().getSecurity().getSessionTimeoutMinutes();
        return configured > 0 ? configured : DEFAULT_TIMEOUT_MINUTES;
    }

    public String createSession() {
        String token = UUID.randomUUID().toString();
        sessions.put(token, Instant.now().plusSeconds((long) getSessionTimeoutMinutes() * 60).toEpochMilli());
        return token;
    }

    public boolean isSessionValid(String token) {
        if (!isSecurityEnabled()) {
            return true;
        }
        Long expireAt = sessions.get(token);
        if (expireAt == null) {
            return false;
        }
        if (expireAt < Instant.now().toEpochMilli()) {
            sessions.remove(token);
            return false;
        }
        return true;
    }

    public void clearSession(String token) {
        if (token != null) {
            sessions.remove(token);
        }
    }

    public String extractSessionToken(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return null;
        }
        for (Cookie cookie : cookies) {
            if (SESSION_COOKIE.equals(cookie.getName())) {
                return cookie.getValue();
            }
        }
        return null;
    }

    public ResponseCookie buildSessionCookie(String token) {
        return ResponseCookie.from(SESSION_COOKIE, token)
                .path("/")
                .httpOnly(true)
                .sameSite("Lax")
                .maxAge((long) getSessionTimeoutMinutes() * 60)
                .build();
    }

    public ResponseCookie buildClearSessionCookie() {
        return ResponseCookie.from(SESSION_COOKIE, "")
                .path("/")
                .httpOnly(true)
                .sameSite("Lax")
                .maxAge(0)
                .build();
    }

    public String createConfigVerifyToken() {
        String token = UUID.randomUUID().toString();
        configVerifyTokens.put(token, Instant.now().plusSeconds(300).toEpochMilli());
        return token;
    }

    public boolean consumeConfigVerifyToken(String token) {
        if (token == null || token.isBlank()) {
            return false;
        }
        Long expireAt = configVerifyTokens.remove(token);
        return expireAt != null && expireAt >= Instant.now().toEpochMilli();
    }
}
