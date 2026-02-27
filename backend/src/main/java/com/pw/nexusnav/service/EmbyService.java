package com.pw.nexusnav.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.pw.nexusnav.dto.EmbyMediaBreakdownItemDTO;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pw.nexusnav.dto.EmbyStatsDTO;
import com.pw.nexusnav.dto.EmbyTaskDTO;
import com.pw.nexusnav.dto.EmbyTaskRunResultDTO;
import com.pw.nexusnav.entity.CardEntity;
import com.pw.nexusnav.repository.CardRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

@Service
public class EmbyService {

    private static final Logger log = LoggerFactory.getLogger(EmbyService.class);
    private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(5);
    private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(8);
    private static final List<String> MEDIA_COUNT_KEYS = List.of(
            "MovieCount",
            "SeriesCount",
            "EpisodeCount",
            "SongCount",
            "AlbumCount",
            "MusicVideoCount",
            "TrailerCount",
            "BoxSetCount",
            "BookCount",
            "PhotoCount",
            "ProgramCount"
    );

    private final CardRepository cardRepository;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public EmbyService(CardRepository cardRepository, ObjectMapper objectMapper) {
        this.cardRepository = cardRepository;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder().connectTimeout(CONNECT_TIMEOUT).build();
    }

    public EmbyStatsDTO fetchStats(String cardId) {
        EmbyCardConfig config = requireEmbyCard(cardId);

        JsonNode counts = sendJsonRequest(config, "GET", "/Items/Counts");
        List<EmbyMediaBreakdownItemDTO> mediaBreakdown = fetchLibraryBreakdown(config);
        if (mediaBreakdown.isEmpty()) {
            mediaBreakdown = buildTypeBreakdown(counts);
        }
        long mediaTotal = mediaBreakdown.stream().mapToLong(EmbyMediaBreakdownItemDTO::count).sum();
        if (mediaTotal <= 0) {
            mediaTotal = countMediaTotalFromCounts(counts);
        }

        JsonNode sessions = sendJsonRequest(config, "GET", "/Sessions?ActiveWithinSeconds=300");
        int onlineSessions = sessions.isArray() ? sessions.size() : 0;
        int playingSessions = countPlayingSessions(sessions);

        return new EmbyStatsDTO(
                mediaTotal,
                mediaBreakdown,
                onlineSessions,
                playingSessions,
                System.currentTimeMillis(),
                "proxy"
        );
    }

    public List<EmbyTaskDTO> listTasks(String cardId) {
        EmbyCardConfig config = requireEmbyCard(cardId);
        return listTasks(config);
    }

    public EmbyTaskRunResultDTO runTask(String cardId, String taskId) {
        if (!StringUtils.hasText(taskId)) {
            throw new IllegalArgumentException("taskId is required");
        }

        EmbyCardConfig config = requireEmbyCard(cardId);
        List<EmbyTaskDTO> tasks = listTasks(config);
        EmbyTaskDTO targetTask = tasks.stream()
                .filter(task -> task.id().equals(taskId))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Task not found: " + taskId));

        sendRequest(config, "POST", "/ScheduledTasks/Running/" + encodeSegment(taskId));
        log.info("Emby task triggered: cardId={}, taskId={}", cardId, taskId);

        return new EmbyTaskRunResultDTO(
                taskId,
                targetTask.name(),
                true,
                targetTask.state(),
                "Task triggered",
                System.currentTimeMillis(),
                "proxy"
        );
    }

    private List<EmbyTaskDTO> listTasks(EmbyCardConfig config) {
        JsonNode response = sendJsonRequest(config, "GET", "/ScheduledTasks");
        JsonNode items = response;
        if (response != null && response.isObject() && response.has("Items")) {
            items = response.get("Items");
        }
        if (items == null || !items.isArray()) {
            return List.of();
        }

        List<EmbyTaskDTO> tasks = new ArrayList<>();
        for (JsonNode node : items) {
            String id = text(node, "Id", "id");
            if (!StringUtils.hasText(id)) {
                continue;
            }
            String name = text(node, "Name", "name");
            if (!StringUtils.hasText(name)) {
                name = id;
            }
            String description = text(node, "Description", "description");
            String module = text(node, "Category", "category", "Module", "module");
            String state = text(node, "State", "state");
            if (!StringUtils.hasText(state)) {
                state = "Unknown";
            }
            boolean isRunning = node.path("IsRunning").asBoolean(false)
                    || "running".equalsIgnoreCase(state)
                    || "cancelling".equalsIgnoreCase(state);
            String lastRunAt = resolveLastRunAt(node);
            String lastResult = resolveLastResult(node);

            tasks.add(new EmbyTaskDTO(id, name, description, module, state, isRunning, lastRunAt, lastResult));
        }

        tasks.sort(Comparator
                .comparing((EmbyTaskDTO task) -> taskModuleSortKey(task.module()), String.CASE_INSENSITIVE_ORDER)
                .thenComparing(EmbyTaskDTO::name, String.CASE_INSENSITIVE_ORDER));
        return tasks;
    }

    private int countPlayingSessions(JsonNode sessions) {
        if (sessions == null || !sessions.isArray()) {
            return 0;
        }
        int total = 0;
        for (JsonNode session : sessions) {
            if (session.hasNonNull("NowPlayingItem") || session.path("PlayState").hasNonNull("PositionTicks")) {
                total++;
            }
        }
        return total;
    }

    private List<EmbyMediaBreakdownItemDTO> fetchLibraryBreakdown(EmbyCardConfig config) {
        JsonNode foldersResponse;
        try {
            foldersResponse = sendJsonRequest(config, "GET", "/Items?IncludeItemTypes=CollectionFolder&Recursive=true&Limit=200");
        } catch (Exception ex) {
            log.warn("Emby library breakdown fetch failed: cardId={}, reason={}", config.cardId(), ex.getMessage());
            return List.of();
        }

        JsonNode items = extractItemsNode(foldersResponse);
        if (items == null || !items.isArray()) {
            return List.of();
        }

        List<EmbyMediaBreakdownItemDTO> libraries = new ArrayList<>();
        for (JsonNode folder : items) {
            String libraryId = text(folder, "Id", "id");
            String libraryName = text(folder, "Name", "name");
            if (!StringUtils.hasText(libraryId) || !StringUtils.hasText(libraryName)) {
                continue;
            }
            try {
                JsonNode countResponse = sendJsonRequest(
                        config,
                        "GET",
                        "/Items?ParentId=" + encodeSegment(libraryId) + "&Recursive=true&Limit=0"
                );
                long count = countResponse.path("TotalRecordCount").asLong(0L);
                if (count > 0) {
                    libraries.add(new EmbyMediaBreakdownItemDTO(libraryName, count));
                }
            } catch (Exception ex) {
                log.warn("Emby library count fetch failed: cardId={}, library={}", config.cardId(), libraryName);
            }
        }

        libraries.sort(Comparator.comparingLong(EmbyMediaBreakdownItemDTO::count).reversed());
        return libraries;
    }

    private List<EmbyMediaBreakdownItemDTO> buildTypeBreakdown(JsonNode counts) {
        if (counts == null || !counts.isObject()) {
            return List.of();
        }

        List<EmbyMediaBreakdownItemDTO> items = new ArrayList<>();
        for (String key : MEDIA_COUNT_KEYS) {
            JsonNode value = counts.get(key);
            if (value != null && value.canConvertToLong()) {
                long count = value.asLong(0L);
                if (count > 0) {
                    items.add(new EmbyMediaBreakdownItemDTO(key, count));
                }
            }
        }

        if (!items.isEmpty()) {
            return items;
        }

        for (var iterator = counts.fields(); iterator.hasNext(); ) {
            var entry = iterator.next();
            if (entry.getKey().endsWith("Count") && entry.getValue().canConvertToLong()) {
                long count = entry.getValue().asLong(0L);
                if (count > 0) {
                    items.add(new EmbyMediaBreakdownItemDTO(entry.getKey(), count));
                }
            }
        }

        return items;
    }

    private long countMediaTotalFromCounts(JsonNode counts) {
        if (counts == null || !counts.isObject()) {
            return 0L;
        }
        long total = 0L;
        for (var iterator = counts.fields(); iterator.hasNext(); ) {
            var entry = iterator.next();
            if (entry.getKey().endsWith("Count") && entry.getValue().canConvertToLong()) {
                total += entry.getValue().asLong(0L);
            }
        }
        return total;
    }

    private JsonNode extractItemsNode(JsonNode response) {
        if (response == null) {
            return null;
        }
        if (response.isArray()) {
            return response;
        }
        if (response.isObject() && response.has("Items")) {
            return response.get("Items");
        }
        return null;
    }

    private String resolveLastResult(JsonNode task) {
        String direct = text(task, "LastExecutionResult", "LastResult", "Result");
        if (StringUtils.hasText(direct)) {
            return direct;
        }

        JsonNode resultNode = task.get("LastExecutionResult");
        if (resultNode != null && resultNode.isObject()) {
            String status = text(resultNode, "Status", "State");
            String message = text(resultNode, "Message", "ErrorMessage", "Details");
            if (StringUtils.hasText(status) && StringUtils.hasText(message)) {
                return status + ": " + message;
            }
            return firstNonBlank(status, message);
        }

        return null;
    }

    private String resolveLastRunAt(JsonNode task) {
        String direct = text(task, "LastExecutionTimeUtc", "LastExecutionDate", "LastRunTime");
        if (StringUtils.hasText(direct)) {
            return direct;
        }

        JsonNode resultNode = task.get("LastExecutionResult");
        if (resultNode != null && resultNode.isObject()) {
            return firstNonBlank(
                    text(resultNode, "StartTimeUtc", "StartDate", "Date"),
                    text(resultNode, "EndTimeUtc", "EndDate")
            );
        }
        return null;
    }

    private JsonNode sendJsonRequest(EmbyCardConfig config, String method, String path) {
        HttpResponse<String> response = sendRequest(config, method, path);
        String body = response.body();
        if (!StringUtils.hasText(body)) {
            return objectMapper.createObjectNode();
        }
        try {
            return objectMapper.readTree(body);
        } catch (IOException e) {
            throw new IllegalStateException("Emby response is not valid JSON");
        }
    }

    private HttpResponse<String> sendRequest(EmbyCardConfig config, String method, String path) {
        URI uri = buildUri(config.baseUrl(), path, config.apiKey());
        HttpRequest request = HttpRequest.newBuilder(uri)
                .timeout(REQUEST_TIMEOUT)
                .header("Accept", "application/json")
                .header("X-Emby-Token", config.apiKey())
                .method(method, HttpRequest.BodyPublishers.noBody())
                .build();

        HttpResponse<String> response;
        try {
            response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Emby request interrupted");
        } catch (IOException e) {
            throw new IllegalStateException("Emby request failed: " + e.getMessage());
        }

        int statusCode = response.statusCode();
        if (statusCode >= 200 && statusCode < 300) {
            return response;
        }

        String reason = resolveErrorReason(statusCode, response.body());
        log.warn("Emby request failed: cardId={}, status={}, path={}", config.cardId(), statusCode, path);
        throw new IllegalStateException(reason);
    }

    private URI buildUri(String baseUrl, String path, String apiKey) {
        String normalizedPath = path.startsWith("/") ? path : "/" + path;
        String separator = normalizedPath.contains("?") ? "&" : "?";
        String encodedKey = URLEncoder.encode(apiKey, StandardCharsets.UTF_8);
        return URI.create(baseUrl + normalizedPath + separator + "api_key=" + encodedKey);
    }

    private String resolveErrorReason(int statusCode, String responseBody) {
        if (statusCode == 401 || statusCode == 403) {
            return "Emby authentication failed";
        }
        if (statusCode == 404) {
            return "Emby API endpoint not found";
        }
        String detail = firstNonBlank(
                readJsonText(responseBody, "Message"),
                readJsonText(responseBody, "ErrorMessage"),
                readJsonText(responseBody, "message"),
                truncate(responseBody, 180)
        );
        if (StringUtils.hasText(detail)) {
            return "Emby request failed (" + statusCode + "): " + detail;
        }
        return "Emby request failed (" + statusCode + ")";
    }

    private String readJsonText(String payload, String fieldName) {
        if (!StringUtils.hasText(payload) || !StringUtils.hasText(fieldName)) {
            return null;
        }
        try {
            JsonNode node = objectMapper.readTree(payload);
            JsonNode value = node.get(fieldName);
            return value != null && !value.isNull() ? value.asText() : null;
        } catch (IOException ignored) {
            return null;
        }
    }

    private String truncate(String value, int maxLength) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        String trimmed = value.trim();
        if (trimmed.length() <= maxLength) {
            return trimmed;
        }
        return trimmed.substring(0, maxLength) + "...";
    }

    private String text(JsonNode node, String... names) {
        if (node == null || names == null) {
            return null;
        }
        for (String name : names) {
            if (!StringUtils.hasText(name)) {
                continue;
            }
            JsonNode value = node.get(name);
            if (value != null && !value.isNull()) {
                String text = value.asText();
                if (StringUtils.hasText(text)) {
                    return text;
                }
            }
        }
        return null;
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

    private String taskModuleSortKey(String module) {
        if (!StringUtils.hasText(module)) {
            return "~";
        }
        return module.trim().toLowerCase(Locale.ROOT);
    }

    private String encodeSegment(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private EmbyCardConfig requireEmbyCard(String cardId) {
        CardEntity card = cardRepository.findById(cardId)
                .orElseThrow(() -> new IllegalArgumentException("Card not found: " + cardId));
        String cardType = Optional.ofNullable(card.getCardType())
                .map(value -> value.toLowerCase(Locale.ROOT))
                .orElse("");
        if (!ConfigModel.CARD_TYPE_EMBY.equals(cardType)) {
            throw new IllegalArgumentException("Card is not an emby card: " + cardId);
        }

        String baseUrl = firstNonBlank(card.getUrl(), card.getLanUrl(), card.getWanUrl());
        if (!StringUtils.hasText(baseUrl)) {
            throw new IllegalArgumentException("Emby card url is required: " + cardId);
        }
        String apiKey = card.getEmbyApiKey();
        if (!StringUtils.hasText(apiKey)) {
            throw new IllegalArgumentException("Emby API key is required: " + cardId);
        }

        return new EmbyCardConfig(cardId, stripTrailingSlash(baseUrl), apiKey.trim());
    }

    private String stripTrailingSlash(String value) {
        String current = value.trim();
        while (current.endsWith("/")) {
            current = current.substring(0, current.length() - 1);
        }
        return current;
    }

    private record EmbyCardConfig(String cardId, String baseUrl, String apiKey) {
    }
}
