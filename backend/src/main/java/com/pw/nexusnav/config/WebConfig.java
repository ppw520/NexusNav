package com.pw.nexusnav.config;

import com.pw.nexusnav.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.util.StringUtils;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.List;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final AuthService authService;
    private final NexusNavProperties properties;

    public WebConfig(AuthService authService, NexusNavProperties properties) {
        this.authService = authService;
        this.properties = properties;
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOriginPatterns(resolveAllowedOrigins(properties.getSecurity().getAllowedOrigins()))
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true);
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new AuthInterceptor(authService))
                .addPathPatterns("/api/v2/**")
                .excludePathPatterns(
                        "/api/v2/auth/login",
                        "/api/v2/auth/session",
                        "/api/v2/auth/logout"
                );
    }

    static class AuthInterceptor implements HandlerInterceptor {

        private final AuthService authService;

        AuthInterceptor(AuthService authService) {
            this.authService = authService;
        }

        @Override
        public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
            if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
                return true;
            }
            if (!authService.isSecurityEnabled()) {
                return true;
            }

            String token = authService.extractSessionToken(request);
            if (token != null && authService.isSessionValid(token)) {
                return true;
            }

            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.getWriter().write("{\"code\":401,\"message\":\"未登录或会话已过期\",\"data\":null}");
            return false;
        }
    }

    static String[] resolveAllowedOrigins(List<String> configuredOrigins) {
        List<String> sanitized = configuredOrigins == null
                ? List.of()
                : configuredOrigins.stream()
                .filter(StringUtils::hasText)
                .map(String::trim)
                .filter(origin -> !"*".equals(origin))
                .toList();
        if (sanitized.isEmpty()) {
            return new String[]{"http://localhost:*", "http://127.0.0.1:*"};
        }
        return sanitized.toArray(String[]::new);
    }
}
