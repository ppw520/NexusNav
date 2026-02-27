package com.pw.nexusnav.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pw.nexusnav.dto.TorrentStatsDTO;
import com.pw.nexusnav.dto.TorrentStatusBreakdownDTO;
import com.pw.nexusnav.entity.CardEntity;
import com.pw.nexusnav.repository.CardRepository;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.io.IOException;
import java.net.CookieManager;
import java.net.CookiePolicy;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Locale;
import java.util.Optional;

@Service
public class QbittorrentService {

    private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(5);
    private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(8);

    private final CardRepository cardRepository;
    private final ObjectMapper objectMapper;

    public QbittorrentService(CardRepository cardRepository, ObjectMapper objectMapper) {
        this.cardRepository = cardRepository;
        this.objectMapper = objectMapper;
    }

    public TorrentStatsDTO fetchStats(String cardId) {
        QbittorrentCardConfig config = requireQbittorrentCard(cardId);
        HttpClient client = buildClient();
        authenticate(client, config);

        JsonNode transferInfo = sendJsonRequest(client, config, "GET", "/api/v2/transfer/info", null);
        JsonNode allTorrents = sendJsonRequest(client, config, "GET", "/api/v2/torrents/info?filter=all", null);
        JsonNode activeTorrents = sendJsonRequest(client, config, "GET", "/api/v2/torrents/info?filter=active", null);

        TorrentStatusBreakdownDTO breakdown = buildBreakdown(allTorrents);
        int totalCount = allTorrents.isArray() ? allTorrents.size() : 0;
        int activeCount = activeTorrents.isArray()
                ? activeTorrents.size()
                : breakdown.downloading() + breakdown.seeding() + breakdown.checking() + breakdown.stalled() + breakdown.queued();

        long downloadSpeed = extractLong(transferInfo, "dl_info_speed", "dl_speed", "dlspeed");
        long uploadSpeed = extractLong(transferInfo, "up_info_speed", "up_speed", "upspeed");

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

    private HttpClient buildClient() {
        CookieManager cookieManager = new CookieManager();
        cookieManager.setCookiePolicy(CookiePolicy.ACCEPT_ALL);
        return HttpClient.newBuilder()
                .connectTimeout(CONNECT_TIMEOUT)
                .cookieHandler(cookieManager)
                .build();
    }

    private void authenticate(HttpClient client, QbittorrentCardConfig config) {
        String body = "username=" + urlEncode(config.username()) + "&password=" + urlEncode(config.password());
        HttpResponse<String> response = sendRequest(
                client,
                config,
                "POST",
                "/api/v2/auth/login",
                body,
                "application/x-www-form-urlencoded"
        );

        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new IllegalStateException(resolveErrorReason(response.statusCode(), response.body()));
        }
        String text = response.body() == null ? "" : response.body().trim();
        if (!text.equalsIgnoreCase("ok.") && !text.equalsIgnoreCase("ok")) {
            throw new IllegalStateException("qBittorrent authentication failed");
        }
    }

    private JsonNode sendJsonRequest(
            HttpClient client,
            QbittorrentCardConfig config,
            String method,
            String path,
            String body
    ) {
        HttpResponse<String> response = sendRequest(client, config, method, path, body, "application/json");
        int statusCode = response.statusCode();
        if (statusCode < 200 || statusCode >= 300) {
            throw new IllegalStateException(resolveErrorReason(statusCode, response.body()));
        }
        String payload = response.body();
        if (!StringUtils.hasText(payload)) {
            return objectMapper.createObjectNode();
        }
        try {
            return objectMapper.readTree(payload);
        } catch (IOException e) {
            throw new IllegalStateException("qBittorrent response is not valid JSON");
        }
    }

    private HttpResponse<String> sendRequest(
            HttpClient client,
            QbittorrentCardConfig config,
            String method,
            String path,
            String body,
            String contentType
    ) {
        String normalizedPath = path.startsWith("/") ? path : "/" + path;
        URI uri = URI.create(config.baseUrl() + normalizedPath);
        HttpRequest.Builder builder = HttpRequest.newBuilder(uri)
                .timeout(REQUEST_TIMEOUT)
                .header("Accept", "application/json");

        if (StringUtils.hasText(body)) {
            builder.header("Content-Type", contentType);
        }

        HttpRequest request = builder.method(
                method,
                StringUtils.hasText(body) ? HttpRequest.BodyPublishers.ofString(body) : HttpRequest.BodyPublishers.noBody()
        ).build();

        try {
            return client.send(request, HttpResponse.BodyHandlers.ofString());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("qBittorrent request interrupted");
        } catch (IOException e) {
            throw new IllegalStateException("qBittorrent request failed: " + e.getMessage());
        }
    }

    private TorrentStatusBreakdownDTO buildBreakdown(JsonNode allTorrents) {
        if (allTorrents == null || !allTorrents.isArray()) {
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

        for (JsonNode torrent : allTorrents) {
            String state = torrent.path("state").asText("").trim().toLowerCase(Locale.ROOT);
            if ("error".equals(state) || "missingfiles".equals(state)) {
                error++;
                continue;
            }
            switch (state) {
                case "downloading", "forceddl", "metadl" -> downloading++;
                case "uploading", "forcedup" -> seeding++;
                case "pauseddl", "pausedup" -> paused++;
                case "queueddl", "queuedup" -> queued++;
                case "checkingup", "checkingdl", "checkingresumedata" -> checking++;
                case "stalleddl", "stalledup" -> stalled++;
                default -> unknown++;
            }
        }

        return new TorrentStatusBreakdownDTO(downloading, seeding, paused, queued, checking, stalled, error, unknown);
    }

    private long extractLong(JsonNode node, String... fieldNames) {
        if (node == null || fieldNames == null) {
            return 0L;
        }
        for (String fieldName : fieldNames) {
            JsonNode value = node.get(fieldName);
            if (value != null && value.canConvertToLong()) {
                return value.asLong(0L);
            }
        }
        return 0L;
    }

    private String resolveErrorReason(int statusCode, String responseBody) {
        if (statusCode == 401 || statusCode == 403) {
            return "qBittorrent authentication failed";
        }
        if (statusCode == 404) {
            return "qBittorrent API endpoint not found";
        }
        if (StringUtils.hasText(responseBody)) {
            return "qBittorrent request failed (" + statusCode + "): " + truncate(responseBody.trim(), 180);
        }
        return "qBittorrent request failed (" + statusCode + ")";
    }

    private String truncate(String value, int maxLength) {
        if (!StringUtils.hasText(value) || value.length() <= maxLength) {
            return value;
        }
        return value.substring(0, maxLength) + "...";
    }

    private String urlEncode(String input) {
        return URLEncoder.encode(input, StandardCharsets.UTF_8);
    }

    private QbittorrentCardConfig requireQbittorrentCard(String cardId) {
        CardEntity card = cardRepository.findById(cardId)
                .orElseThrow(() -> new IllegalArgumentException("Card not found: " + cardId));
        String cardType = Optional.ofNullable(card.getCardType())
                .map(value -> value.toLowerCase(Locale.ROOT))
                .orElse("");
        if (!ConfigModel.CARD_TYPE_QBITTORRENT.equals(cardType)) {
            throw new IllegalArgumentException("Card is not a qBittorrent card: " + cardId);
        }

        String baseUrl = firstNonBlank(card.getUrl(), card.getLanUrl(), card.getWanUrl());
        if (!StringUtils.hasText(baseUrl)) {
            throw new IllegalArgumentException("qBittorrent card url is required: " + cardId);
        }
        String username = trimToNull(card.getQbittorrentUsername());
        if (!StringUtils.hasText(username)) {
            throw new IllegalArgumentException("qBittorrent username is required: " + cardId);
        }
        String password = trimToNull(card.getQbittorrentPassword());
        if (!StringUtils.hasText(password)) {
            throw new IllegalArgumentException("qBittorrent password is required: " + cardId);
        }

        return new QbittorrentCardConfig(stripTrailingSlash(baseUrl), username, password);
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

    private record QbittorrentCardConfig(String baseUrl, String username, String password) {
    }
}
