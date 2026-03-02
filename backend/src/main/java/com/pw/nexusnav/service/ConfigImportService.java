package com.pw.nexusnav.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pw.nexusnav.config.NexusNavProperties;
import com.pw.nexusnav.entity.CardEntity;
import com.pw.nexusnav.entity.GroupEntity;
import com.pw.nexusnav.repository.CardRepository;
import com.pw.nexusnav.repository.GroupRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
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
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Stream;

@Service
public class ConfigImportService {

    private static final int MAX_BACKGROUND_IMAGE_BYTES = 512 * 1024;
    private static final int MAX_SEARCH_ICON_LENGTH = 2048;

    private final ObjectMapper objectMapper;
    private final GroupRepository groupRepository;
    private final CardRepository cardRepository;
    private final NexusNavProperties properties;
    private final CardTypeSchemaService cardTypeSchemaService;

    private volatile String lastNavHash = "";
    private volatile String lastSystemHash = "";
    private volatile ConfigModel.SystemModel cachedSystemModel;

    public ConfigImportService(
            ObjectMapper objectMapper,
            GroupRepository groupRepository,
            CardRepository cardRepository,
            NexusNavProperties properties,
            CardTypeSchemaService cardTypeSchemaService
    ) {
        this.objectMapper = objectMapper;
        this.groupRepository = groupRepository;
        this.cardRepository = cardRepository;
        this.properties = properties;
        this.cardTypeSchemaService = cardTypeSchemaService;
    }

    @PostConstruct
    public void init() {
        importConfig(true);
    }

    public synchronized ImportResult importConfig(boolean prune) {
        byte[] navBytes = loadNavBytes();
        byte[] systemBytes = loadSystemBytes();

        String navHash = computeHash(navBytes);
        String systemHash = computeHash(systemBytes);
        boolean navChanged = !navHash.equals(lastNavHash);
        boolean systemChanged = !systemHash.equals(lastSystemHash);

        ConfigModel.NavModel navModel = parseNav(navBytes);
        ConfigModel.SystemModel systemModel = parseSystem(systemBytes);

        syncNav(navModel, prune);
        cachedSystemModel = systemModel;
        lastNavHash = navHash;
        lastSystemHash = systemHash;

        boolean changed = navChanged || systemChanged;
        return new ImportResult(changed, changed ? "配置已导入" : "配置无变化");
    }

    public ConfigModel.SystemModel getSystemConfig() {
        ConfigModel.SystemModel cached = cachedSystemModel;
        if (cached != null) {
            return cloneSystemModel(cached);
        }
        ConfigModel.SystemModel loaded = parseSystem(loadSystemBytes());
        cachedSystemModel = loaded;
        return cloneSystemModel(loaded);
    }

    public byte[] loadNavBytes() {
        String navPath = properties.getNavPath();
        if (StringUtils.hasText(navPath)) {
            Path path = Path.of(navPath);
            if (Files.exists(path)) {
                return readFile(path, "导航配置文件");
            }
        }

        if (StringUtils.hasText(properties.getConfigPath())) {
            Path base = Path.of(properties.getConfigPath());
            Path sibling = base.resolveSibling("nav.json");
            if (Files.exists(sibling)) {
                return readFile(sibling, "导航配置文件");
            }
        }

        Path workspaceConfig = detectWorkspaceConfigPath("nav.json");
        if (workspaceConfig != null && Files.exists(workspaceConfig)) {
            return readFile(workspaceConfig, "导航配置文件");
        }

        ClassPathResource resource = new ClassPathResource("seed/nav.json");
        try (InputStream inputStream = resource.getInputStream()) {
            return inputStream.readAllBytes();
        } catch (IOException e) {
            throw new IllegalStateException("无法读取默认导航配置", e);
        }
    }

    public byte[] loadSystemBytes() {
        if (StringUtils.hasText(properties.getConfigPath())) {
            Path path = Path.of(properties.getConfigPath());
            if (Files.exists(path)) {
                return readFile(path, "系统配置文件");
            }
        }

        Path workspaceConfig = detectWorkspaceConfigPath("config.json");
        if (workspaceConfig != null && Files.exists(workspaceConfig)) {
            return readFile(workspaceConfig, "系统配置文件");
        }

        ClassPathResource resource = new ClassPathResource("seed/config.json");
        try (InputStream inputStream = resource.getInputStream()) {
            return inputStream.readAllBytes();
        } catch (IOException e) {
            throw new IllegalStateException("无法读取默认系统配置", e);
        }
    }

    public byte[] loadSecretBytes() {
        Path path = resolveReadableSecretsPath();
        if (path != null && Files.exists(path)) {
            return readFile(path, "密文配置文件");
        }
        return stringifyBytes(new SecretConfigModel());
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

    public Path resolveWritableSecretsPath() {
        if (StringUtils.hasText(properties.getSecretsPath())) {
            return ensureParent(Path.of(properties.getSecretsPath()));
        }
        if (StringUtils.hasText(properties.getConfigPath())) {
            Path configPath = Path.of(properties.getConfigPath()).toAbsolutePath().normalize();
            return ensureParent(configPath.resolveSibling("secrets.json"));
        }
        Path workspace = detectWorkspaceConfigPath("secrets.json");
        if (workspace != null) {
            return ensureParent(workspace);
        }
        return ensureParent(Paths.get("config", "secrets.json").toAbsolutePath().normalize());
    }

    public ConfigModel.NavModel parseNav(byte[] payload) {
        try {
            ConfigModel.NavModel model = objectMapper.readValue(payload, ConfigModel.NavModel.class);
            normalizeNavModel(model);
            validateNavModel(model);
            return model;
        } catch (IOException e) {
            throw new IllegalStateException("导航配置 JSON 格式错误", e);
        }
    }

    public ConfigModel.SystemModel parseSystem(byte[] payload) {
        try {
            ConfigModel.SystemModel model = objectMapper.readValue(payload, ConfigModel.SystemModel.class);
            normalizeSystemModel(model);
            validateSystemModel(model);
            return model;
        } catch (IOException e) {
            throw new IllegalStateException("系统配置 JSON 格式错误", e);
        }
    }

    public SecretConfigModel parseSecrets(byte[] payload) {
        try {
            SecretConfigModel model = objectMapper.readValue(payload, SecretConfigModel.class);
            normalizeSecretsModel(model);
            validateSecretsModel(model);
            return model;
        } catch (IOException e) {
            throw new IllegalStateException("密文配置 JSON 格式错误", e);
        }
    }

    public byte[] stringifyBytes(Object value) {
        try {
            return objectMapper.writerWithDefaultPrettyPrinter().writeValueAsBytes(value);
        } catch (IOException e) {
            throw new IllegalStateException("配置序列化失败", e);
        }
    }

    private void syncNav(ConfigModel.NavModel model, boolean prune) {
        Map<String, GroupEntity> groupMap = new HashMap<>();
        if (prune) {
            groupRepository.clear();
            cardRepository.clear();
        } else {
            for (GroupEntity existing : groupRepository.findAll()) {
                groupMap.put(existing.getId(), existing);
            }
        }

        Set<String> groupIds = new HashSet<>();
        for (ConfigModel.GroupItem group : model.getGroups()) {
            GroupEntity entity = groupRepository.findById(group.getId()).orElseGet(GroupEntity::new);
            entity.setId(group.getId());
            entity.setName(group.getName());
            entity.setOrderIndex(group.getOrderIndex());
            groupRepository.save(entity);
            groupMap.put(entity.getId(), entity);
            groupIds.add(entity.getId());
        }

        Set<String> cardIds = new HashSet<>();
        for (ConfigModel.CardItem card : model.getCards()) {
            GroupEntity group = groupMap.get(card.getGroupId());
            if (group == null) {
                throw new IllegalStateException("卡片分组不存在：" + card.getGroupId());
            }
            CardEntity entity = cardRepository.findById(card.getId()).orElseGet(CardEntity::new);
            entity.setId(card.getId());
            entity.setGroup(group);
            entity.setName(card.getName());
            entity.setCardType(card.getCardType());
            entity.setOpenMode(card.getOpenMode());
            entity.setIcon(card.getIcon());
            entity.setDescription(card.getDescription());
            entity.setOrderIndex(card.getOrderIndex());
            entity.setEnabled(card.isEnabled());
            entity.setHealthCheckEnabled(card.isHealthCheckEnabled());
            entity.setConfig(new LinkedHashMap<>(card.getConfig()));
            entity.setSecretRefs(new LinkedHashMap<>(card.getSecretRefs()));
            cardRepository.save(entity);
            cardIds.add(entity.getId());
        }

        if (!prune) {
            return;
        }

        cardRepository.findAll().stream()
                .filter(card -> !cardIds.contains(card.getId()))
                .toList()
                .forEach(cardRepository::delete);
        groupRepository.findAll().stream()
                .filter(group -> !groupIds.contains(group.getId()))
                .toList()
                .forEach(groupRepository::delete);
    }

    private void normalizeNavModel(ConfigModel.NavModel model) {
        if (model.getGroups() == null) {
            model.setGroups(new ArrayList<>());
        }
        if (model.getCards() == null) {
            model.setCards(new ArrayList<>());
        }
        for (ConfigModel.CardItem card : model.getCards()) {
            card.setCardType(cardTypeSchemaService.normalizeCardType(card.getCardType()));
            card.setOpenMode(cardTypeSchemaService.normalizeOpenMode(card.getOpenMode()));
            if (card.getConfig() == null) {
                card.setConfig(new LinkedHashMap<>());
            }
            card.setConfig(cardTypeSchemaService.normalizeConfig(card.getCardType(), card.getConfig()));
            card.setHealthCheckEnabled(cardTypeSchemaService.supportsHealthCheck(card.getCardType()) && card.isHealthCheckEnabled());
            if (card.getSecretRefs() == null) {
                card.setSecretRefs(new LinkedHashMap<>());
            } else {
                Map<String, String> normalizedRefs = new LinkedHashMap<>();
                for (Map.Entry<String, String> entry : card.getSecretRefs().entrySet()) {
                    if (!StringUtils.hasText(entry.getKey())) {
                        continue;
                    }
                    String ref = entry.getValue();
                    normalizedRefs.put(entry.getKey().trim(), StringUtils.hasText(ref) ? ref.trim() : null);
                }
                card.setSecretRefs(normalizedRefs);
            }
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
            model.setNetworkModePreference(model.getNetworkModePreference().toLowerCase(Locale.ROOT));
        }
        if (!StringUtils.hasText(model.getBackgroundType())) {
            model.setBackgroundType("gradient");
        } else {
            model.setBackgroundType(model.getBackgroundType().trim().toLowerCase(Locale.ROOT));
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
                engine.setLanUrl(engine.getSearchUrlTemplate().trim());
                engine.setWanUrl(engine.getSearchUrlTemplate().trim());
            }
            if (!StringUtils.hasText(engine.getIcon())) {
                engine.setIcon(null);
            } else {
                engine.setIcon(engine.getIcon().trim());
            }
        }
    }

    private void normalizeSecretsModel(SecretConfigModel model) {
        if (!StringUtils.hasText(model.getVersion())) {
            model.setVersion("1.0");
        }
        if (model.getSecrets() == null) {
            model.setSecrets(new LinkedHashMap<>());
            return;
        }
        Map<String, SecretConfigModel.SecretItem> normalized = new LinkedHashMap<>();
        for (Map.Entry<String, SecretConfigModel.SecretItem> entry : model.getSecrets().entrySet()) {
            if (!StringUtils.hasText(entry.getKey()) || entry.getValue() == null) {
                continue;
            }
            SecretConfigModel.SecretItem item = entry.getValue();
            if (!StringUtils.hasText(item.getAlgorithm())) {
                item.setAlgorithm("AES-256-GCM");
            }
            normalized.put(entry.getKey().trim(), item);
        }
        model.setSecrets(normalized);
    }

    private void validateNavModel(ConfigModel.NavModel model) {
        Set<String> groupIds = new HashSet<>();
        for (ConfigModel.GroupItem group : model.getGroups()) {
            if (!StringUtils.hasText(group.getId())) {
                throw new IllegalStateException("分组 ID 不能为空");
            }
            if (!groupIds.add(group.getId())) {
                throw new IllegalStateException("分组 ID 重复：" + group.getId());
            }
            if (!StringUtils.hasText(group.getName())) {
                throw new IllegalStateException("分组名称不能为空：" + group.getId());
            }
        }

        Set<String> cardIds = new HashSet<>();
        for (ConfigModel.CardItem card : model.getCards()) {
            if (!StringUtils.hasText(card.getId())) {
                throw new IllegalStateException("卡片 ID 不能为空");
            }
            if (!cardIds.add(card.getId())) {
                throw new IllegalStateException("卡片 ID 重复：" + card.getId());
            }
            if (!groupIds.contains(card.getGroupId())) {
                throw new IllegalStateException("卡片分组不存在：" + card.getGroupId());
            }
            if (!StringUtils.hasText(card.getName())) {
                throw new IllegalStateException("卡片名称不能为空：" + card.getId());
            }
            cardTypeSchemaService.validateCard(
                    card.getId(),
                    card.getCardType(),
                    card.getConfig(),
                    card.getSecretRefs()
            );
        }
    }

    private void validateSystemModel(ConfigModel.SystemModel model) {
        if (!StringUtils.hasText(model.getAdminPassword()) || !model.getAdminPassword().startsWith("$2")) {
            throw new IllegalStateException("adminPassword 必须是 BCrypt 哈希");
        }
        if (!isValidNetworkMode(model.getNetworkModePreference())) {
            throw new IllegalStateException("networkModePreference 配置无效");
        }
        if (!"gradient".equals(model.getBackgroundType()) && !"image".equals(model.getBackgroundType())) {
            throw new IllegalStateException("backgroundType 只能是 gradient 或 image");
        }
        validateBackgroundDataUrl(model.getBackgroundImageDataUrl());

        Set<String> engineIds = new HashSet<>();
        for (ConfigModel.SearchEngineItem engine : model.getSearchEngines()) {
            if (!StringUtils.hasText(engine.getId())) {
                throw new IllegalStateException("搜索引擎 ID 不能为空");
            }
            if (!engineIds.add(engine.getId())) {
                throw new IllegalStateException("搜索引擎 ID 重复：" + engine.getId());
            }
            if (!StringUtils.hasText(engine.getName())) {
                throw new IllegalStateException("搜索引擎名称不能为空：" + engine.getId());
            }
            if (!StringUtils.hasText(engine.getSearchUrlTemplate())) {
                throw new IllegalStateException("搜索引擎模板不能为空：" + engine.getId());
            }
            if (StringUtils.hasText(engine.getIcon()) && engine.getIcon().length() > MAX_SEARCH_ICON_LENGTH) {
                throw new IllegalStateException("搜索引擎图标长度超限：" + engine.getId());
            }
        }
        if (!engineIds.isEmpty() && !engineIds.contains(model.getDefaultSearchEngineId())) {
            throw new IllegalStateException("defaultSearchEngineId 未命中 searchEngines");
        }
    }

    private void validateSecretsModel(SecretConfigModel model) {
        for (Map.Entry<String, SecretConfigModel.SecretItem> entry : model.getSecrets().entrySet()) {
            if (!StringUtils.hasText(entry.getKey())) {
                throw new IllegalStateException("密文键名不能为空");
            }
            SecretConfigModel.SecretItem item = entry.getValue();
            if (!StringUtils.hasText(item.getIv())) {
                throw new IllegalStateException("密文缺少 iv：" + entry.getKey());
            }
            if (!StringUtils.hasText(item.getCipherText())) {
                throw new IllegalStateException("密文缺少 cipherText：" + entry.getKey());
            }
        }
    }

    private void validateBackgroundDataUrl(String dataUrl) {
        if (!StringUtils.hasText(dataUrl)) {
            return;
        }
        String normalized = dataUrl.trim();
        if (!normalized.startsWith("data:image/") || !normalized.contains(";base64,")) {
            throw new IllegalStateException("backgroundImageDataUrl 必须是 data:image/*;base64");
        }
        int base64Index = normalized.indexOf(";base64,");
        if (base64Index < 0) {
            throw new IllegalStateException("backgroundImageDataUrl 必须是 Base64 编码");
        }
        String payload = normalized.substring(base64Index + ";base64,".length());
        byte[] decoded;
        try {
            decoded = Base64.getDecoder().decode(payload);
        } catch (IllegalArgumentException ex) {
            throw new IllegalStateException("backgroundImageDataUrl 不是合法的 Base64");
        }
        if (decoded.length > MAX_BACKGROUND_IMAGE_BYTES) {
            throw new IllegalStateException("backgroundImageDataUrl 不能超过 512KB");
        }
    }

    private byte[] readFile(Path path, String label) {
        try {
            return Files.readAllBytes(path);
        } catch (IOException e) {
            throw new IllegalStateException("读取" + label + "失败：" + path, e);
        }
    }

    private String computeHash(byte[] input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return Base64.getEncoder().encodeToString(digest.digest(input));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("当前运行环境不支持 SHA-256", e);
        }
    }

    private boolean isValidNetworkMode(String mode) {
        return ConfigModel.NETWORK_MODE_AUTO.equals(mode)
                || ConfigModel.NETWORK_MODE_LAN.equals(mode)
                || ConfigModel.NETWORK_MODE_WAN.equals(mode);
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value.trim();
            }
        }
        return null;
    }

    private Path ensureParent(Path path) {
        Path normalized = path.toAbsolutePath().normalize();
        Path parent = normalized.getParent();
        if (parent == null) {
            throw new IllegalStateException("配置路径无效：" + path);
        }
        try {
            Files.createDirectories(parent);
        } catch (IOException e) {
            throw new IllegalStateException("创建配置目录失败：" + parent, e);
        }
        return normalized;
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

    private Path resolveReadableSecretsPath() {
        if (StringUtils.hasText(properties.getSecretsPath())) {
            return Path.of(properties.getSecretsPath()).toAbsolutePath().normalize();
        }
        if (StringUtils.hasText(properties.getConfigPath())) {
            return Path.of(properties.getConfigPath()).toAbsolutePath().normalize().resolveSibling("secrets.json");
        }
        return detectWorkspaceConfigPath("secrets.json");
    }

    private ConfigModel.SystemModel cloneSystemModel(ConfigModel.SystemModel source) {
        return parseSystem(stringifyBytes(source));
    }

    public record ImportResult(boolean changed, String message) {
    }
}
