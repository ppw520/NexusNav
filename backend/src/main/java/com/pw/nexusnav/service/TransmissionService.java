package com.pw.nexusnav.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.pw.nexusnav.dto.TorrentStatsDTO;
import com.pw.nexusnav.dto.TorrentStatusBreakdownDTO;
import com.pw.nexusnav.entity.CardEntity;
import com.pw.nexusnav.repository.CardRepository;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import java.util.Locale;
import java.util.Optional;

@Service
public class TransmissionService {

    private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(5);
    private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(8);
    private static final String[] RPC_ENDPOINTS = {"/transmission/rpc", "/rpc"};

    private final CardRepository cardRepository;
    private final CardTypeSchemaService cardTypeSchemaService;
    private final SecretStoreService secretStoreService;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public TransmissionService(
            CardRepository cardRepository,
            CardTypeSchemaService cardTypeSchemaService,
            SecretStoreService secretStoreService,
            ObjectMapper objectMapper
    ) {
        this.cardRepository = cardRepository;
        this.cardTypeSchemaService = cardTypeSchemaService;
        this.secretStoreService = secretStoreService;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder().connectTimeout(CONNECT_TIMEOUT).build();
    }

    public TorrentStatsDTO fetchStats(String cardId) {
        TransmissionCardConfig config = requireTransmissionCard(cardId);
        RpcFetchResult rpcResult = fetchWithEndpointFallback(config);

        JsonNode statsArgs = rpcResult.sessionStats().path("arguments");
        long downloadSpeed = extractLong(statsArgs, "downloadSpeed");
        long uploadSpeed = extractLong(statsArgs, "uploadSpeed");
        int totalCount = extractInt(statsArgs, "torrentCount");
        int activeCount = extractInt(statsArgs, "activeTorrentCount");

        TorrentStatusBreakdownDTO breakdown = buildBreakdown(rpcResult.torrentList());
        if (totalCount <= 0) {
            JsonNode torrents = rpcResult.torrentList().path("arguments").path("torrents");
            totalCount = torrents.isArray() ? torrents.size() : 0;
        }
        if (activeCount <= 0) {
            activeCount = breakdown.downloading() + breakdown.seeding() + breakdown.checking() + breakdown.queued();
        }

        return new TorrentStatsDTO(
                downloadSpeed,
                uploadSpeed,
                activeCount,
                totalCount,
                breakdown,
                System.currentTimeMillis(),
                "proxy"
        );
    }

    private RpcFetchResult fetchWithEndpointFallback(TransmissionCardConfig config) {
        IllegalStateException lastError = null;
        for (String endpoint : RPC_ENDPOINTS) {
            try {
                String sessionId = null;
                JsonNode sessionStats = sendRpcRequest(config, endpoint, "session-stats", null, sessionId);
                sessionId = extractSessionId(sessionStats, sessionId);
                ObjectNode torrentGetArgs = objectMapper.createObjectNode();
                ArrayNode fields = torrentGetArgs.putArray("fields");
                fields.add("status");
                fields.add("error");
                JsonNode torrentList = sendRpcRequest(config, endpoint, "torrent-get", torrentGetArgs, sessionId);
                return new RpcFetchResult(sessionStats, torrentList);
            } catch (IllegalStateException ex) {
                lastError = ex;
            }
        }
        if (lastError == null) {
            throw new IllegalStateException("Transmission 请求失败");
        }
        throw lastError;
    }

    private JsonNode sendRpcRequest(
            TransmissionCardConfig config,
            String endpoint,
            String method,
            ObjectNode arguments,
            String sessionId
    ) {
        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("method", method);
        if (arguments != null) {
            payload.set("arguments", arguments);
        }

        String payloadText;
        try {
            payloadText = objectMapper.writeValueAsString(payload);
        } catch (IOException e) {
            throw new IllegalStateException("序列化 Transmission 请求失败");
        }

        HttpResponse<String> response = sendRequest(config, endpoint, payloadText, sessionId);
        if (response.statusCode() == 409) {
            String retrySessionId = response.headers().firstValue("X-Transmission-Session-Id").orElse(null);
            if (!StringUtils.hasText(retrySessionId)) {
                throw new IllegalStateException("Transmission 会话协商失败");
            }
            response = sendRequest(config, endpoint, payloadText, retrySessionId);
        }

        int statusCode = response.statusCode();
        if (statusCode < 200 || statusCode >= 300) {
            throw new IllegalStateException(resolveErrorReason(statusCode, response.body()));
        }

        String body = response.body();
        if (!StringUtils.hasText(body)) {
            return objectMapper.createObjectNode();
        }
        JsonNode result;
        try {
            result = objectMapper.readTree(body);
        } catch (IOException e) {
            throw new IllegalStateException("Transmission 返回的 JSON 无法解析");
        }

        String status = result.path("result").asText("");
        if (!"success".equalsIgnoreCase(status)) {
            throw new IllegalStateException("Transmission RPC 调用失败：" + (StringUtils.hasText(status) ? status : "unknown"));
        }
        return result;
    }

    private String extractSessionId(JsonNode response, String currentSessionId) {
        if (StringUtils.hasText(currentSessionId)) {
            return currentSessionId;
        }
        return null;
    }

    private HttpResponse<String> sendRequest(
            TransmissionCardConfig config,
            String endpoint,
            String payload,
            String sessionId
    ) {
        URI uri = URI.create(config.baseUrl() + endpoint);
        HttpRequest.Builder builder = HttpRequest.newBuilder(uri)
                .timeout(REQUEST_TIMEOUT)
                .header("Accept", "application/json")
                .header("Content-Type", "application/json")
                .header("Authorization", "Basic " + buildBasicAuth(config.username(), config.password()));

        if (StringUtils.hasText(sessionId)) {
            builder.header("X-Transmission-Session-Id", sessionId);
        }

        HttpRequest request = builder
                .POST(HttpRequest.BodyPublishers.ofString(payload))
                .build();

        try {
            return httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Transmission 请求被中断");
        } catch (IOException e) {
            throw new IllegalStateException("Transmission 请求失败：" + e.getMessage());
        }
    }

    private String resolveErrorReason(int statusCode, String responseBody) {
        if (statusCode == 401 || statusCode == 403) {
            return "Transmission 认证失败";
        }
        if (statusCode == 404) {
            return "Transmission RPC 路径不存在";
        }
        if (StringUtils.hasText(responseBody)) {
            return "Transmission 请求失败（" + statusCode + "）：" + truncate(responseBody.trim(), 180);
        }
        return "Transmission 请求失败（" + statusCode + "）";
    }

    private String truncate(String value, int maxLength) {
        if (!StringUtils.hasText(value) || value.length() <= maxLength) {
            return value;
        }
        return value.substring(0, maxLength) + "...";
    }

    private String buildBasicAuth(String username, String password) {
        String token = username + ":" + password;
        return Base64.getEncoder().encodeToString(token.getBytes(StandardCharsets.UTF_8));
    }

    private TorrentStatusBreakdownDTO buildBreakdown(JsonNode torrentGetResponse) {
        JsonNode torrents = torrentGetResponse.path("arguments").path("torrents");
        if (!torrents.isArray()) {
            return new TorrentStatusBreakdownDTO(0, 0, 0, 0, 0, 0, 0, 0);
        }

        int downloading = 0;
        int seeding = 0;
        int paused = 0;
        int queued = 0;
        int checking = 0;
        int stalled = 0;
        int error = 0;
        int unknown = 0;

        for (JsonNode torrent : torrents) {
            int errorCode = torrent.path("error").asInt(0);
            if (errorCode > 0) {
                error++;
                continue;
            }

            int status = torrent.path("status").asInt(-1);
            switch (status) {
                case 0 -> paused++;
                case 1, 2 -> checking++;
                case 3, 5 -> queued++;
                case 4 -> downloading++;
                case 6 -> seeding++;
                default -> unknown++;
            }
        }

        return new TorrentStatusBreakdownDTO(downloading, seeding, paused, queued, checking, stalled, error, unknown);
    }

    private long extractLong(JsonNode node, String fieldName) {
        JsonNode value = node.get(fieldName);
        if (value != null && value.canConvertToLong()) {
            return value.asLong(0L);
        }
        return 0L;
    }

    private int extractInt(JsonNode node, String fieldName) {
        JsonNode value = node.get(fieldName);
        if (value != null && value.canConvertToInt()) {
            return value.asInt(0);
        }
        return 0;
    }

    private TransmissionCardConfig requireTransmissionCard(String cardId) {
        CardEntity card = cardRepository.findById(cardId)
                .orElseThrow(() -> new IllegalArgumentException("卡片不存在：" + cardId));
        String cardType = Optional.ofNullable(card.getCardType())
                .map(value -> value.toLowerCase(Locale.ROOT))
                .orElse("");
        if (!ConfigModel.CARD_TYPE_TRANSMISSION.equals(cardType)) {
            throw new IllegalArgumentException("卡片类型不是 Transmission：" + cardId);
        }

        String baseUrl = cardTypeSchemaService.firstNonBlankUrl(card.getConfig());
        if (!StringUtils.hasText(baseUrl)) {
            throw new IllegalArgumentException("Transmission 地址不能为空：" + cardId);
        }
        String username = trimToNull(cardTypeSchemaService.getTextConfig(card.getConfig(), "username"));
        if (!StringUtils.hasText(username)) {
            throw new IllegalArgumentException("Transmission 用户名不能为空：" + cardId);
        }
        String password = trimToNull(secretStoreService.resolveCardSecret(card, "password"));
        if (!StringUtils.hasText(password)) {
            throw new IllegalArgumentException("Transmission 密码未配置：" + cardId);
        }

        return new TransmissionCardConfig(stripTrailingSlash(baseUrl), username, password);
    }

    private String firstNonBlank(String... values) {
        if (values == null) {
            return null;
        }
        for (String value : values) {
            if (StringUtils.hasText(value)) {
                return value;
            }
        }
        return null;
    }

    private String trimToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private String stripTrailingSlash(String value) {
        String current = value.trim();
        while (current.endsWith("/")) {
            current = current.substring(0, current.length() - 1);
        }
        return current;
    }

    private record TransmissionCardConfig(String baseUrl, String username, String password) {
    }

    private record RpcFetchResult(JsonNode sessionStats, JsonNode torrentList) {
    }
}
