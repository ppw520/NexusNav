package com.pw.nexusnav.config;

import com.pw.nexusnav.service.AuthService;
import com.pw.nexusnav.websocket.SshWebSocketHandler;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.util.StringUtils;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;
import org.springframework.web.socket.server.HandshakeInterceptor;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Map;

@Configuration
@EnableWebSocket
public class SshWebSocketConfig implements WebSocketConfigurer {

    private static final Logger log = LoggerFactory.getLogger(SshWebSocketConfig.class);
    private final SshWebSocketHandler sshWebSocketHandler;
    private final AuthService authService;

    public SshWebSocketConfig(SshWebSocketHandler sshWebSocketHandler, AuthService authService) {
        this.sshWebSocketHandler = sshWebSocketHandler;
        this.authService = authService;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(sshWebSocketHandler, "/ws/ssh")
                .addInterceptors(new HandshakeInterceptor() {
                    @Override
                    public boolean beforeHandshake(
                            ServerHttpRequest request,
                            ServerHttpResponse response,
                            WebSocketHandler wsHandler,
                            Map<String, Object> attributes
                    ) {
                        String cardId = UriComponentsBuilder.fromUri(request.getURI())
                                .build()
                                .getQueryParams()
                                .getFirst("cardId");
                        if (!StringUtils.hasText(cardId)) {
                            log.warn("SSH websocket handshake rejected: reason=missing cardId, uri={}", request.getURI());
                            return false;
                        }
                        attributes.put("cardId", cardId.trim());

                        if (!authService.isSecurityEnabled()) {
                            return true;
                        }
                        if (!(request instanceof ServletServerHttpRequest servletRequest)) {
                            log.warn("SSH websocket handshake rejected: reason=non-servlet request, uri={}", request.getURI());
                            return false;
                        }
                        HttpServletRequest rawRequest = servletRequest.getServletRequest();
                        String token = authService.extractSessionToken(rawRequest);
                        boolean valid = token != null && authService.isSessionValid(token);
                        if (!valid) {
                            log.warn("SSH websocket handshake rejected: reason=unauthorized, cardId={}", cardId.trim());
                        }
                        return valid;
                    }

                    @Override
                    public void afterHandshake(
                            ServerHttpRequest request,
                            ServerHttpResponse response,
                            WebSocketHandler wsHandler,
                            Exception exception
                    ) {
                    }
                })
                .setAllowedOriginPatterns("*");
    }
}
