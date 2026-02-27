package com.pw.nexusnav.websocket;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jcraft.jsch.ChannelShell;
import com.jcraft.jsch.JSch;
import com.jcraft.jsch.Session;
import com.pw.nexusnav.entity.CardEntity;
import com.pw.nexusnav.repository.CardRepository;
import com.pw.nexusnav.service.ConfigModel;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.Properties;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

@Component
public class SshWebSocketHandler extends TextWebSocketHandler {

    private static final int CONNECT_TIMEOUT_MS = 10_000;
    private static final Logger log = LoggerFactory.getLogger(SshWebSocketHandler.class);

    private final ObjectMapper objectMapper;
    private final CardRepository cardRepository;
    private final Map<String, SshRuntime> runtimes = new ConcurrentHashMap<>();
    private final ExecutorService outputExecutor = Executors.newCachedThreadPool();

    public SshWebSocketHandler(ObjectMapper objectMapper, CardRepository cardRepository) {
        this.objectMapper = objectMapper;
        this.cardRepository = cardRepository;
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        log.info("SSH websocket closed: sessionId={}, code={}, reason={}",
                session.getId(),
                status != null ? status.getCode() : null,
                status != null ? status.getReason() : null);
        closeRuntime(session.getId());
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) {
        log.warn("SSH websocket transport error: sessionId={}", session.getId(), exception);
        closeRuntime(session.getId());
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        try {
            JsonNode payload = objectMapper.readTree(message.getPayload());
            String type = payload.path("type").asText("");
            switch (type) {
                case "connect" -> handleConnect(session, payload);
                case "input" -> handleInput(session, payload);
                case "resize" -> handleResize(session, payload);
                case "disconnect" -> {
                    closeRuntime(session.getId());
                    sendClosed(session);
                }
                default -> {
                    log.warn("Unsupported SSH websocket message type: sessionId={}, type={}", session.getId(), type);
                    sendError(session, "Unsupported message type");
                }
            }
        } catch (Exception ex) {
            log.warn("Invalid SSH websocket payload: sessionId={}", session.getId(), ex);
            sendError(session, StringUtils.hasText(ex.getMessage()) ? ex.getMessage() : "Invalid message payload");
        }
    }

    private void handleConnect(WebSocketSession session, JsonNode payload) {
        if (runtimes.containsKey(session.getId())) {
            sendError(session, "SSH session already connected");
            return;
        }
        String cardId = asText(session.getAttributes().get("cardId"));
        if (!StringUtils.hasText(cardId)) {
            log.warn("SSH connect rejected: sessionId={}, reason=missing cardId", session.getId());
            sendError(session, "Missing cardId");
            return;
        }

        CardEntity card = cardRepository.findById(cardId).orElse(null);
        if (card == null) {
            log.warn("SSH connect rejected: sessionId={}, cardId={}, reason=card not found", session.getId(), cardId);
            sendError(session, "Card not found");
            return;
        }

        String cardType;
        try {
            cardType = normalizeCardType(card.getCardType());
        } catch (Exception ex) {
            log.warn("SSH connect rejected: sessionId={}, cardId={}, reason=invalid card type",
                    session.getId(), cardId, ex);
            sendError(session, "Invalid card type");
            return;
        }
        if (!ConfigModel.CARD_TYPE_SSH.equals(cardType)) {
            log.warn("SSH connect rejected: sessionId={}, cardId={}, reason=not SSH card, cardType={}",
                    session.getId(), cardId, cardType);
            sendError(session, "Card is not SSH type");
            return;
        }

        String host = card.getSshHost();
        int port = normalizeSshPort(card.getSshPort());
        String username = card.getSshUsername();
        String authMode;
        try {
            authMode = normalizeSshAuthMode(card.getSshAuthMode());
        } catch (Exception ex) {
            log.warn("SSH connect rejected: sessionId={}, cardId={}, reason=invalid auth mode",
                    session.getId(), cardId, ex);
            sendError(session, "Invalid SSH auth mode");
            return;
        }
        if (!StringUtils.hasText(host) || !StringUtils.hasText(username)) {
            log.warn("SSH connect rejected: sessionId={}, cardId={}, reason=incomplete SSH config", session.getId(), cardId);
            sendError(session, "SSH card config is incomplete");
            return;
        }

        String password = payload.path("password").asText("");
        String privateKey = payload.path("privateKey").asText("");
        String passphrase = payload.path("passphrase").asText("");
        int cols = Math.max(40, payload.path("cols").asInt(120));
        int rows = Math.max(10, payload.path("rows").asInt(32));

        if (ConfigModel.SSH_AUTH_PASSWORD.equals(authMode) && !StringUtils.hasText(password)) {
            log.warn("SSH connect rejected: sessionId={}, cardId={}, reason=password missing", session.getId(), cardId);
            sendError(session, "Password is required");
            return;
        }
        if (ConfigModel.SSH_AUTH_PRIVATE_KEY.equals(authMode) && !StringUtils.hasText(privateKey)) {
            log.warn("SSH connect rejected: sessionId={}, cardId={}, reason=private key missing", session.getId(), cardId);
            sendError(session, "Private key is required");
            return;
        }

        try {
            log.info("SSH connect start: sessionId={}, cardId={}, host={}, port={}, username={}, authMode={}",
                    session.getId(), cardId, host, port, username, authMode);
            JSch jsch = new JSch();
            if (ConfigModel.SSH_AUTH_PRIVATE_KEY.equals(authMode)) {
                byte[] keyBytes = privateKey.getBytes(StandardCharsets.UTF_8);
                byte[] passphraseBytes = StringUtils.hasText(passphrase)
                        ? passphrase.getBytes(StandardCharsets.UTF_8)
                        : null;
                jsch.addIdentity("nexusnav-key", keyBytes, null, passphraseBytes);
            }

            Session sshSession = jsch.getSession(username, host, port);
            if (ConfigModel.SSH_AUTH_PASSWORD.equals(authMode)) {
                sshSession.setPassword(password);
            }
            Properties config = new Properties();
            config.put("StrictHostKeyChecking", "no");
            sshSession.setConfig(config);
            sshSession.connect(CONNECT_TIMEOUT_MS);

            ChannelShell channel = (ChannelShell) sshSession.openChannel("shell");
            channel.setPtyType("xterm-256color");
            channel.setPtySize(cols, rows, 0, 0);
            InputStream outputStream = channel.getInputStream();
            OutputStream inputWriter = channel.getOutputStream();
            channel.connect(CONNECT_TIMEOUT_MS);

            Future<?> outputTask = outputExecutor.submit(() -> streamOutput(session, outputStream));
            runtimes.put(session.getId(), new SshRuntime(sshSession, channel, inputWriter, outputTask));
            log.info("SSH connect success: sessionId={}, cardId={}, host={}, port={}, username={}",
                    session.getId(), cardId, host, port, username);
            sendJson(session, Map.of("type", "connected"));
        } catch (Exception ex) {
            closeRuntime(session.getId());
            log.warn("SSH connect failed: sessionId={}, cardId={}, host={}, port={}, username={}, error={}",
                    session.getId(), cardId, host, port, username, ex.getMessage(), ex);
            sendError(session, "SSH connect failed: " + ex.getMessage());
        }
    }

    private void handleInput(WebSocketSession session, JsonNode payload) {
        SshRuntime runtime = runtimes.get(session.getId());
        if (runtime == null) {
            log.warn("SSH input rejected: sessionId={}, reason=not connected", session.getId());
            sendError(session, "SSH session not connected");
            return;
        }
        String data = payload.path("data").asText("");
        if (!StringUtils.hasText(data)) {
            return;
        }
        runtime.write(data);
    }

    private void handleResize(WebSocketSession session, JsonNode payload) {
        SshRuntime runtime = runtimes.get(session.getId());
        if (runtime == null) {
            return;
        }
        int cols = Math.max(40, payload.path("cols").asInt(120));
        int rows = Math.max(10, payload.path("rows").asInt(32));
        runtime.resize(cols, rows);
    }

    private void streamOutput(WebSocketSession session, InputStream outputStream) {
        byte[] buffer = new byte[4096];
        try {
            while (session.isOpen()) {
                int read = outputStream.read(buffer);
                if (read < 0) {
                    break;
                }
                if (read == 0) {
                    continue;
                }
                String chunk = new String(buffer, 0, read, StandardCharsets.UTF_8);
                sendJson(session, Map.of("type", "output", "data", chunk));
            }
        } catch (Exception ex) {
            log.warn("SSH output stream interrupted: sessionId={}, error={}", session.getId(), ex.getMessage());
        } finally {
            closeRuntime(session.getId());
            sendClosed(session);
        }
    }

    private void closeRuntime(String webSocketSessionId) {
        SshRuntime runtime = runtimes.remove(webSocketSessionId);
        if (runtime != null) {
            runtime.close();
        }
    }

    private void sendClosed(WebSocketSession session) {
        sendJson(session, Map.of("type", "closed"));
    }

    private void sendError(WebSocketSession session, String message) {
        sendJson(session, Map.of("type", "error", "message", message));
    }

    private void sendJson(WebSocketSession session, Map<String, Object> payload) {
        if (!session.isOpen()) {
            return;
        }
        try {
            synchronized (session) {
                session.sendMessage(new TextMessage(objectMapper.writeValueAsString(payload)));
            }
        } catch (Exception ex) {
            log.warn("SSH websocket send failed: sessionId={}, error={}", session.getId(), ex.getMessage());
        }
    }

    private String normalizeCardType(String cardType) {
        if (!StringUtils.hasText(cardType)) {
            return ConfigModel.CARD_TYPE_GENERIC;
        }
        String normalized = cardType.trim().toLowerCase();
        if (!ConfigModel.CARD_TYPE_GENERIC.equals(normalized)
                && !ConfigModel.CARD_TYPE_SSH.equals(normalized)
                && !ConfigModel.CARD_TYPE_EMBY.equals(normalized)
                && !ConfigModel.CARD_TYPE_QBITTORRENT.equals(normalized)
                && !ConfigModel.CARD_TYPE_TRANSMISSION.equals(normalized)) {
            throw new IllegalArgumentException("Invalid cardType: " + cardType);
        }
        return normalized;
    }

    private String normalizeSshAuthMode(String authMode) {
        if (!StringUtils.hasText(authMode)) {
            return ConfigModel.SSH_AUTH_PASSWORD;
        }
        String normalized = authMode.trim().toLowerCase();
        if ("private_key".equals(normalized)) {
            normalized = ConfigModel.SSH_AUTH_PRIVATE_KEY;
        }
        if (!ConfigModel.SSH_AUTH_PASSWORD.equals(normalized) && !ConfigModel.SSH_AUTH_PRIVATE_KEY.equals(normalized)) {
            throw new IllegalArgumentException("Invalid sshAuthMode: " + authMode);
        }
        return normalized;
    }

    private int normalizeSshPort(Integer port) {
        if (port == null || port <= 0 || port > 65535) {
            return 22;
        }
        return port;
    }

    private String asText(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    private static class SshRuntime {
        private final Session sshSession;
        private final ChannelShell channel;
        private final OutputStream inputWriter;
        private final Future<?> outputTask;

        private SshRuntime(Session sshSession, ChannelShell channel, OutputStream inputWriter, Future<?> outputTask) {
            this.sshSession = sshSession;
            this.channel = channel;
            this.inputWriter = inputWriter;
            this.outputTask = outputTask;
        }

        private void write(String data) {
            try {
                inputWriter.write(data.getBytes(StandardCharsets.UTF_8));
                inputWriter.flush();
            } catch (Exception ignored) {
            }
        }

        private void resize(int cols, int rows) {
            try {
                channel.setPtySize(cols, rows, 0, 0);
            } catch (Exception ignored) {
            }
        }

        private void close() {
            try {
                inputWriter.close();
            } catch (Exception ignored) {
            }
            if (outputTask != null) {
                outputTask.cancel(true);
            }
            if (channel != null && channel.isConnected()) {
                channel.disconnect();
            }
            if (sshSession != null && sshSession.isConnected()) {
                sshSession.disconnect();
            }
        }
    }
}
