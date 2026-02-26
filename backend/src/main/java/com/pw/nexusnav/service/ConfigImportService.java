package com.pw.nexusnav.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pw.nexusnav.config.NexusNavProperties;
import com.pw.nexusnav.entity.AppMetaEntity;
import com.pw.nexusnav.entity.CardEntity;
import com.pw.nexusnav.entity.GroupEntity;
import com.pw.nexusnav.repository.AppMetaRepository;
import com.pw.nexusnav.repository.CardRepository;
import com.pw.nexusnav.repository.GroupRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.core.io.ClassPathResource;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Stream;

@Service
public class ConfigImportService {

    public static final String NAV_HASH_KEY = "nav_hash";
    public static final String NAV_VERSION_KEY = "nav_version";
    public static final String SYSTEM_HASH_KEY = "system_hash";
    public static final String SYSTEM_CONFIG_KEY = "system_config_json";
    private static final int MAX_BACKGROUND_IMAGE_BYTES = 512 * 1024;
    private static final int MAX_SEARCH_ICON_LENGTH = 2048;

    private static final BCryptPasswordEncoder BCRYPT = new BCryptPasswordEncoder();

    private final ObjectMapper objectMapper;
    private final GroupRepository groupRepository;
    private final CardRepository cardRepository;
    private final AppMetaRepository appMetaRepository;
    private final NexusNavProperties properties;

    public ConfigImportService(
            ObjectMapper objectMapper,
            GroupRepository groupRepository,
            CardRepository cardRepository,
            AppMetaRepository appMetaRepository,
            NexusNavProperties properties
    ) {
        this.objectMapper = objectMapper;
        this.groupRepository = groupRepository;
        this.cardRepository = cardRepository;
        this.appMetaRepository = appMetaRepository;
        this.properties = properties;
    }

    @PostConstruct
    public void init() {
        importConfig(true);
    }

    @Transactional
    public ImportResult importConfig(boolean prune) {
        byte[] navBytes = loadNavBytes();
        byte[] systemBytes = loadSystemBytes();

        String navHash = computeHash(navBytes);
        String systemHash = computeHash(systemBytes);

        boolean navChanged = isHashChanged(NAV_HASH_KEY, navHash);
        boolean systemChanged = isHashChanged(SYSTEM_HASH_KEY, systemHash);

        ConfigModel.NavModel navModel;
        ConfigModel.SystemModel systemModel;
        try {
            navModel = objectMapper.readValue(navBytes, ConfigModel.NavModel.class);
            systemModel = objectMapper.readValue(systemBytes, ConfigModel.SystemModel.class);
        } catch (IOException e) {
            throw new IllegalStateException("Invalid config JSON", e);
        }

        normalizeNavModel(navModel);
        normalizeSystemModel(systemModel);
        validateNavModel(navModel);
        validateSystemModel(systemModel);

        if (navChanged || prune) {
            syncNav(navModel, prune);
            upsertMeta(NAV_HASH_KEY, navHash);
            upsertMeta(NAV_VERSION_KEY, navModel.getVersion() == null ? "" : navModel.getVersion());
        }

        if (systemChanged) {
            upsertMeta(SYSTEM_HASH_KEY, systemHash);
            upsertMeta(SYSTEM_CONFIG_KEY, stringify(systemModel));
        } else if (appMetaRepository.findById(SYSTEM_CONFIG_KEY).isEmpty()) {
            upsertMeta(SYSTEM_CONFIG_KEY, stringify(systemModel));
        }

        boolean changed = navChanged || systemChanged;
        return new ImportResult(changed, changed ? "Config imported" : "Config hash unchanged");
    }

    public ConfigModel.SystemModel getSystemConfig() {
        ConfigModel.SystemModel model = appMetaRepository.findById(SYSTEM_CONFIG_KEY)
                .map(AppMetaEntity::getValue)
                .map(this::parseSystemConfig)
                .orElseGet(() -> {
                    byte[] systemBytes = loadSystemBytes();
                    return parseSystemConfig(new String(systemBytes));
                });
        normalizeSystemModel(model);
        validateSystemModel(model);
        return model;
    }

    public byte[] loadNavBytes() {
        String navPath = properties.getNavPath();
        if (StringUtils.hasText(navPath)) {
            Path path = Path.of(navPath);
            if (Files.exists(path)) {
                return readFile(path, "nav file");
            }
        }

        if (StringUtils.hasText(properties.getConfigPath())) {
            Path base = Path.of(properties.getConfigPath());
            Path sibling = base.resolveSibling("nav.json");
            if (Files.exists(sibling)) {
                return readFile(sibling, "nav sibling file");
            }
        }

        Path workspaceConfig = detectWorkspaceConfigPath("nav.json");
        if (workspaceConfig != null && Files.exists(workspaceConfig)) {
            return readFile(workspaceConfig, "workspace nav file");
        }

        ClassPathResource resource = new ClassPathResource("seed/nav.json");
        try (InputStream inputStream = resource.getInputStream()) {
            return inputStream.readAllBytes();
        } catch (IOException e) {
            throw new IllegalStateException("Cannot read classpath nav config", e);
        }
    }

    public byte[] loadSystemBytes() {
        if (StringUtils.hasText(properties.getConfigPath())) {
            Path path = Path.of(properties.getConfigPath());
            if (Files.exists(path)) {
                return readFile(path, "system config file");
            }
        }

        Path workspaceConfig = detectWorkspaceConfigPath("config.json");
        if (workspaceConfig != null && Files.exists(workspaceConfig)) {
            return readFile(workspaceConfig, "workspace system config file");
        }

        ClassPathResource resource = new ClassPathResource("seed/config.json");
        try (InputStream inputStream = resource.getInputStream()) {
            return inputStream.readAllBytes();
        } catch (IOException e) {
            throw new IllegalStateException("Cannot read classpath system config", e);
        }
    }

    public Path resolveWritableNavPath() {
        if (StringUtils.hasText(properties.getNavPath())) {
            return ensureParent(Path.of(properties.getNavPath()));
        }
        Path workspace = detectWorkspaceConfigPath("nav.json");
        if (workspace != null) {
            return ensureParent(workspace);
        }
        return ensureParent(Paths.get("config", "nav.json").toAbsolutePath().normalize());
    }

    public Path resolveWritableSystemPath() {
        if (StringUtils.hasText(properties.getConfigPath())) {
            return ensureParent(Path.of(properties.getConfigPath()));
        }
        Path workspace = detectWorkspaceConfigPath("config.json");
        if (workspace != null) {
            return ensureParent(workspace);
        }
        return ensureParent(Paths.get("config", "config.json").toAbsolutePath().normalize());
    }

    public ConfigModel.NavModel parseNav(byte[] payload) {
        try {
            ConfigModel.NavModel model = objectMapper.readValue(payload, ConfigModel.NavModel.class);
            normalizeNavModel(model);
            validateNavModel(model);
            return model;
        } catch (IOException e) {
            throw new IllegalStateException("Invalid nav config JSON", e);
        }
    }

    public ConfigModel.SystemModel parseSystem(byte[] payload) {
        try {
            ConfigModel.SystemModel model = objectMapper.readValue(payload, ConfigModel.SystemModel.class);
            normalizeSystemModel(model);
            validateSystemModel(model);
            return model;
        } catch (IOException e) {
            throw new IllegalStateException("Invalid system config JSON", e);
        }
    }

    public byte[] stringifyBytes(Object value) {
        try {
            return objectMapper.writerWithDefaultPrettyPrinter().writeValueAsBytes(value);
        } catch (IOException e) {
            throw new IllegalStateException("Cannot stringify config", e);
        }
    }

    private ConfigModel.SystemModel parseSystemConfig(String json) {
        try {
            return objectMapper.readValue(json, ConfigModel.SystemModel.class);
        } catch (IOException e) {
            throw new IllegalStateException("Invalid stored system config JSON", e);
        }
    }

    private void syncNav(ConfigModel.NavModel model, boolean prune) {
        Set<String> groupIds = new HashSet<>();
        for (ConfigModel.GroupItem item : model.getGroups()) {
            GroupEntity entity = groupRepository.findById(item.getId()).orElseGet(GroupEntity::new);
            entity.setId(item.getId());
            entity.setName(item.getName());
            entity.setOrderIndex(item.getOrderIndex());
            groupRepository.save(entity);
            groupIds.add(item.getId());
        }

        Set<String> cardIds = new HashSet<>();
        for (ConfigModel.CardItem item : model.getCards()) {
            GroupEntity group = groupRepository.findById(item.getGroupId())
                    .orElseThrow(() -> new IllegalStateException("Card group not found: " + item.getGroupId()));
            CardEntity entity = cardRepository.findById(item.getId()).orElseGet(CardEntity::new);
            entity.setId(item.getId());
            entity.setGroup(group);
            entity.setName(item.getName());
            entity.setLanUrl(item.getLanUrl());
            entity.setWanUrl(item.getWanUrl());
            String baseUrl = firstNonBlank(item.getUrl(), item.getLanUrl(), item.getWanUrl());
            entity.setUrl(baseUrl == null ? "" : baseUrl);
            entity.setOpenMode(normalizeOpenMode(item.getOpenMode()));
            entity.setIcon(item.getIcon());
            entity.setDescription(item.getDescription());
            entity.setOrderIndex(item.getOrderIndex());
            entity.setEnabled(item.isEnabled());
            entity.setHealthCheckEnabled(item.isHealthCheckEnabled());
            cardRepository.save(entity);
            cardIds.add(item.getId());
        }

        if (prune) {
            List<CardEntity> cardsToDelete = cardRepository.findAll().stream()
                    .filter(card -> !cardIds.contains(card.getId()))
                    .toList();
            if (!cardsToDelete.isEmpty()) {
                cardRepository.deleteAll(cardsToDelete);
            }
            groupRepository.findAll().stream()
                    .filter(group -> !groupIds.contains(group.getId()))
                    .forEach(groupRepository::delete);
        }
    }

    private void normalizeNavModel(ConfigModel.NavModel model) {
        if (model.getGroups() == null) {
            model.setGroups(new ArrayList<>());
        }
        if (model.getCards() == null) {
            model.setCards(new ArrayList<>());
        }
        for (ConfigModel.CardItem card : model.getCards()) {
            card.setOpenMode(normalizeOpenMode(card.getOpenMode()));
            String fallbackUrl = firstNonBlank(card.getUrl(), card.getLanUrl(), card.getWanUrl());
            card.setUrl(fallbackUrl == null ? "" : fallbackUrl);
        }
    }

    private void normalizeSystemModel(ConfigModel.SystemModel model) {
        if (model.getSearchEngines() == null) {
            model.setSearchEngines(new ArrayList<>());
        }
        if (model.getSecurity() == null) {
            model.setSecurity(new ConfigModel.SecurityModel());
        }
        if (!StringUtils.hasText(model.getNetworkModePreference())) {
            model.setNetworkModePreference(ConfigModel.NETWORK_MODE_AUTO);
        } else {
            model.setNetworkModePreference(model.getNetworkModePreference().toLowerCase());
        }
        if (!StringUtils.hasText(model.getBackgroundType())) {
            model.setBackgroundType("gradient");
        } else {
            model.setBackgroundType(model.getBackgroundType().trim().toLowerCase());
        }
        if (!StringUtils.hasText(model.getBackgroundImageDataUrl())) {
            model.setBackgroundImageDataUrl(null);
        } else {
            model.setBackgroundImageDataUrl(model.getBackgroundImageDataUrl().trim());
        }
        if (model.getSecurity().getSessionTimeoutMinutes() <= 0) {
            model.getSecurity().setSessionTimeoutMinutes(480);
        }
        for (ConfigModel.SearchEngineItem engine : model.getSearchEngines()) {
            if (!StringUtils.hasText(engine.getSearchUrlTemplate())) {
                engine.setSearchUrlTemplate(firstNonBlank(engine.getLanUrl(), engine.getWanUrl()));
            }
            if (StringUtils.hasText(engine.getSearchUrlTemplate())) {
                engine.setLanUrl(engine.getSearchUrlTemplate());
                engine.setWanUrl(engine.getSearchUrlTemplate());
            }
            if (!StringUtils.hasText(engine.getIcon())) {
                engine.setIcon(null);
            } else {
                engine.setIcon(engine.getIcon().trim());
            }
        }
    }

    private void validateNavModel(ConfigModel.NavModel model) {
        Set<String> groupIds = new HashSet<>();
        for (ConfigModel.GroupItem group : model.getGroups()) {
            if (!StringUtils.hasText(group.getId())) {
                throw new IllegalStateException("Group id is required");
            }
            if (!groupIds.add(group.getId())) {
                throw new IllegalStateException("Duplicated group id: " + group.getId());
            }
            if (!StringUtils.hasText(group.getName())) {
                throw new IllegalStateException("Group name is required");
            }
        }

        Set<String> cardIds = new HashSet<>();
        for (ConfigModel.CardItem card : model.getCards()) {
            if (!StringUtils.hasText(card.getId())) {
                throw new IllegalStateException("Card id is required");
            }
            if (!cardIds.add(card.getId())) {
                throw new IllegalStateException("Duplicated card id: " + card.getId());
            }
            if (!groupIds.contains(card.getGroupId())) {
                throw new IllegalStateException("Card group not found: " + card.getGroupId());
            }
            if (!StringUtils.hasText(card.getName())) {
                throw new IllegalStateException("Card name is required");
            }
            if (!StringUtils.hasText(firstNonBlank(card.getUrl(), card.getLanUrl(), card.getWanUrl()))) {
                throw new IllegalStateException("Card url is required: " + card.getId());
            }
            String normalizedMode = normalizeOpenMode(card.getOpenMode());
            if (!normalizedMode.equals(card.getOpenMode())) {
                card.setOpenMode(normalizedMode);
            }
        }
    }

    private void validateSystemModel(ConfigModel.SystemModel model) {
        if (!StringUtils.hasText(model.getAdminPassword()) || !model.getAdminPassword().startsWith("$2")) {
            throw new IllegalStateException("adminPassword must be a BCrypt hash");
        }
        if (!BCRYPT.upgradeEncoding(model.getAdminPassword())
                && !model.getAdminPassword().matches("^\\$2[aby]\\$.{56}$")) {
            throw new IllegalStateException("adminPassword must be a valid BCrypt hash");
        }
        if (!isValidNetworkMode(model.getNetworkModePreference())) {
            throw new IllegalStateException("Invalid networkModePreference");
        }
        if (!"gradient".equals(model.getBackgroundType()) && !"image".equals(model.getBackgroundType())) {
            throw new IllegalStateException("Invalid backgroundType");
        }
        validateBackgroundDataUrl(model.getBackgroundImageDataUrl());

        Set<String> engineIds = new HashSet<>();
        for (ConfigModel.SearchEngineItem engine : model.getSearchEngines()) {
            if (!StringUtils.hasText(engine.getId())) {
                throw new IllegalStateException("Search engine id is required");
            }
            if (!engineIds.add(engine.getId())) {
                throw new IllegalStateException("Duplicated search engine id: " + engine.getId());
            }
            if (!StringUtils.hasText(engine.getName())) {
                throw new IllegalStateException("Search engine name is required");
            }
            if (!StringUtils.hasText(engine.getSearchUrlTemplate())) {
                throw new IllegalStateException("Search engine template is required: " + engine.getId());
            }
            if (StringUtils.hasText(engine.getIcon()) && engine.getIcon().length() > MAX_SEARCH_ICON_LENGTH) {
                throw new IllegalStateException("Search engine icon exceeds max length: " + engine.getId());
            }
        }
        if (!engineIds.isEmpty() && !engineIds.contains(model.getDefaultSearchEngineId())) {
            throw new IllegalStateException("defaultSearchEngineId not found in searchEngines");
        }
    }

    private void validateBackgroundDataUrl(String dataUrl) {
        if (!StringUtils.hasText(dataUrl)) {
            return;
        }
        String normalized = dataUrl.trim();
        if (!normalized.startsWith("data:image/") || !normalized.contains(";base64,")) {
            throw new IllegalStateException("backgroundImageDataUrl must be data:image/*;base64");
        }
        int base64Index = normalized.indexOf(";base64,");
        if (base64Index < 0) {
            throw new IllegalStateException("backgroundImageDataUrl must be base64 encoded");
        }
        String payload = normalized.substring(base64Index + ";base64,".length());
        byte[] decoded;
        try {
            decoded = Base64.getDecoder().decode(payload);
        } catch (IllegalArgumentException ex) {
            throw new IllegalStateException("backgroundImageDataUrl is not valid base64");
        }
        if (decoded.length > MAX_BACKGROUND_IMAGE_BYTES) {
            throw new IllegalStateException("backgroundImageDataUrl exceeds 512KB");
        }
    }

    private byte[] readFile(Path path, String label) {
        try {
            return Files.readAllBytes(path);
        } catch (IOException e) {
            throw new IllegalStateException("Cannot read " + label + ": " + path, e);
        }
    }

    private boolean isHashChanged(String key, String hash) {
        Optional<AppMetaEntity> existing = appMetaRepository.findById(key);
        return existing.isEmpty() || !existing.get().getValue().equals(hash);
    }

    private String computeHash(byte[] input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return Base64.getEncoder().encodeToString(digest.digest(input));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not supported", e);
        }
    }

    private void upsertMeta(String key, String value) {
        AppMetaEntity entity = appMetaRepository.findById(key).orElseGet(AppMetaEntity::new);
        entity.setKey(key);
        entity.setValue(value);
        appMetaRepository.save(entity);
    }

    private String stringify(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (IOException e) {
            throw new IllegalStateException("Cannot stringify config", e);
        }
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }

    private String normalizeOpenMode(String openMode) {
        if (!StringUtils.hasText(openMode)) {
            return "iframe";
        }
        String normalized = openMode.toLowerCase();
        if ("new_tab".equals(normalized)) {
            return "newtab";
        }
        if (!normalized.equals("iframe") && !normalized.equals("newtab") && !normalized.equals("auto")) {
            throw new IllegalStateException("Invalid openMode: " + openMode);
        }
        return normalized;
    }

    private boolean isValidNetworkMode(String mode) {
        return ConfigModel.NETWORK_MODE_AUTO.equals(mode)
                || ConfigModel.NETWORK_MODE_LAN.equals(mode)
                || ConfigModel.NETWORK_MODE_WAN.equals(mode);
    }

    private Path ensureParent(Path path) {
        Path parent = path.toAbsolutePath().normalize().getParent();
        if (parent == null) {
            throw new IllegalStateException("Invalid config path: " + path);
        }
        try {
            Files.createDirectories(parent);
        } catch (IOException e) {
            throw new IllegalStateException("Cannot create config directory: " + parent, e);
        }
        return path.toAbsolutePath().normalize();
    }

    private Path detectWorkspaceConfigPath(String fileName) {
        List<Path> candidates = Stream.of(
                        Paths.get("config", fileName),
                        Paths.get("..", "config", fileName))
                .map(path -> path.toAbsolutePath().normalize())
                .toList();
        for (Path candidate : candidates) {
            if (Files.exists(candidate)) {
                return candidate;
            }
        }
        return candidates.get(0);
    }

    public record ImportResult(boolean changed, String message) {
    }
}
