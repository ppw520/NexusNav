package com.pw.nexusnav.service;

import com.pw.nexusnav.dto.CardTypeSchemaDTO;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
public class CardTypeSchemaService {

    private static final Set<String> SUPPORTED_TYPES = Set.of(
            ConfigModel.CARD_TYPE_GENERIC,
            ConfigModel.CARD_TYPE_SSH,
            ConfigModel.CARD_TYPE_EMBY,
            ConfigModel.CARD_TYPE_QBITTORRENT,
            ConfigModel.CARD_TYPE_TRANSMISSION
    );

    public List<CardTypeSchemaDTO> listSchemas() {
        List<CardTypeSchemaDTO> schemas = new ArrayList<>();
        schemas.add(buildGenericSchema());
        schemas.add(buildSshSchema());
        schemas.add(buildEmbySchema());
        schemas.add(buildQbSchema());
        schemas.add(buildTransmissionSchema());
        return schemas;
    }

    public String normalizeCardType(String cardType) {
        if (!StringUtils.hasText(cardType)) {
            return ConfigModel.CARD_TYPE_GENERIC;
        }
        String normalized = cardType.trim().toLowerCase(Locale.ROOT);
        if (!SUPPORTED_TYPES.contains(normalized)) {
            throw new IllegalArgumentException("不支持的卡片类型：" + cardType);
        }
        return normalized;
    }

    public String normalizeOpenMode(String openMode) {
        if (!StringUtils.hasText(openMode)) {
            return "iframe";
        }
        String normalized = openMode.trim().toLowerCase(Locale.ROOT);
        if ("new_tab".equals(normalized)) {
            return "newtab";
        }
        if (!normalized.equals("iframe") && !normalized.equals("newtab") && !normalized.equals("auto")) {
            throw new IllegalArgumentException("打开方式无效：" + openMode);
        }
        return normalized;
    }

    public boolean supportsHealthCheck(String cardType) {
        return ConfigModel.CARD_TYPE_GENERIC.equals(normalizeCardType(cardType));
    }

    public Map<String, Object> normalizeConfig(String cardType, Map<String, Object> rawConfig) {
        String normalizedType = normalizeCardType(cardType);
        Map<String, Object> normalized = new LinkedHashMap<>();
        Map<String, Object> source = rawConfig == null ? Map.of() : rawConfig;

        if (ConfigModel.CARD_TYPE_SSH.equals(normalizedType)) {
            normalized.put("host", trimToNull(source.get("host")));
            normalized.put("port", normalizePort(source.get("port")));
            normalized.put("username", trimToNull(source.get("username")));
            normalized.put("authMode", normalizeSshAuthMode(source.get("authMode")));
            return normalized;
        }

        normalized.put("url", trimToNull(source.get("url")));
        normalized.put("lanUrl", trimToNull(source.get("lanUrl")));
        normalized.put("wanUrl", trimToNull(source.get("wanUrl")));
        if (ConfigModel.CARD_TYPE_QBITTORRENT.equals(normalizedType) || ConfigModel.CARD_TYPE_TRANSMISSION.equals(normalizedType)) {
            normalized.put("username", trimToNull(source.get("username")));
        }
        return normalized;
    }

    public void validateCard(
            String cardId,
            String cardType,
            Map<String, Object> config,
            Map<String, ?> secretValuesOrRefs
    ) {
        String normalizedType = normalizeCardType(cardType);
        String idPart = StringUtils.hasText(cardId) ? cardId : "unknown";
        Map<String, Object> normalizedConfig = normalizeConfig(normalizedType, config);
        Map<String, ?> secrets = secretValuesOrRefs == null ? Map.of() : secretValuesOrRefs;

        if (ConfigModel.CARD_TYPE_SSH.equals(normalizedType)) {
            requireText(normalizedConfig.get("host"), "SSH 主机不能为空：" + idPart);
            requireText(normalizedConfig.get("username"), "SSH 用户名不能为空：" + idPart);
            int port = normalizePort(normalizedConfig.get("port"));
            if (port <= 0 || port > 65535) {
                throw new IllegalArgumentException("SSH 端口无效：" + idPart);
            }
            normalizeSshAuthMode(normalizedConfig.get("authMode"));
            return;
        }

        if (!hasAnyUrl(normalizedConfig)) {
            throw new IllegalArgumentException("卡片地址不能为空：" + idPart);
        }

        if (ConfigModel.CARD_TYPE_EMBY.equals(normalizedType)) {
            requireSecret(secrets, "apiKey", "Emby API Key 不能为空：" + idPart);
            return;
        }
        if (ConfigModel.CARD_TYPE_QBITTORRENT.equals(normalizedType)) {
            requireText(normalizedConfig.get("username"), "qBittorrent 用户名不能为空：" + idPart);
            requireSecret(secrets, "password", "qBittorrent 密码不能为空：" + idPart);
            return;
        }
        if (ConfigModel.CARD_TYPE_TRANSMISSION.equals(normalizedType)) {
            requireText(normalizedConfig.get("username"), "Transmission 用户名不能为空：" + idPart);
            requireSecret(secrets, "password", "Transmission 密码不能为空：" + idPart);
        }
    }

    public String resolveUrl(Map<String, Object> config, String networkMode) {
        String lan = trimToNull(config == null ? null : config.get("lanUrl"));
        String wan = trimToNull(config == null ? null : config.get("wanUrl"));
        String url = trimToNull(config == null ? null : config.get("url"));
        if (ConfigModel.NETWORK_MODE_LAN.equals(networkMode)) {
            return firstNonBlank(lan, url, wan);
        }
        return firstNonBlank(wan, url, lan);
    }

    public String firstNonBlankUrl(Map<String, Object> config) {
        String url = trimToNull(config == null ? null : config.get("url"));
        String lan = trimToNull(config == null ? null : config.get("lanUrl"));
        String wan = trimToNull(config == null ? null : config.get("wanUrl"));
        return firstNonBlank(url, lan, wan);
    }

    public String getTextConfig(Map<String, Object> config, String key) {
        if (config == null || !StringUtils.hasText(key)) {
            return null;
        }
        return trimToNull(config.get(key));
    }

    public int getIntConfig(Map<String, Object> config, String key, int defaultValue) {
        if (config == null || !StringUtils.hasText(key)) {
            return defaultValue;
        }
        Object value = config.get(key);
        if (value instanceof Number number) {
            return number.intValue();
        }
        if (value instanceof String text && StringUtils.hasText(text)) {
            try {
                return Integer.parseInt(text.trim());
            } catch (NumberFormatException ignored) {
                return defaultValue;
            }
        }
        return defaultValue;
    }

    public String normalizeSshAuthMode(Object raw) {
        String value = trimToNull(raw);
        if (!StringUtils.hasText(value)) {
            return "password";
        }
        String normalized = value.toLowerCase(Locale.ROOT);
        if ("private_key".equals(normalized)) {
            normalized = "privatekey";
        }
        if (!"password".equals(normalized) && !"privatekey".equals(normalized)) {
            throw new IllegalArgumentException("SSH 认证方式无效：" + value);
        }
        return normalized;
    }

    private CardTypeSchemaDTO buildGenericSchema() {
        CardTypeSchemaDTO schema = baseSchema(ConfigModel.CARD_TYPE_GENERIC, "通用链接", "普通网页服务卡片", true, "iframe");
        schema.getFields().add(urlField("url", "默认地址", false, "https://example.com"));
        schema.getFields().add(urlField("lanUrl", "内网地址", false, "http://192.168.1.2:8080"));
        schema.getFields().add(urlField("wanUrl", "外网地址", false, "https://example.com"));
        return schema;
    }

    private CardTypeSchemaDTO buildSshSchema() {
        CardTypeSchemaDTO schema = baseSchema(ConfigModel.CARD_TYPE_SSH, "SSH 终端", "打开内置 SSH 终端窗口", false, "iframe");
        schema.getFields().add(textField("host", "SSH 主机", true, "192.168.1.10"));
        CardTypeSchemaDTO.FieldSchemaDTO portField = numberField("port", "SSH 端口", false, 22, 1, 65535);
        schema.getFields().add(portField);
        schema.getFields().add(textField("username", "SSH 用户名", true, "root"));
        CardTypeSchemaDTO.FieldSchemaDTO authMode = selectField("authMode", "认证方式", true, "password");
        authMode.setOptions(List.of(
                new CardTypeSchemaDTO.FieldOptionDTO("密码", "password"),
                new CardTypeSchemaDTO.FieldOptionDTO("私钥", "privatekey")
        ));
        schema.getFields().add(authMode);
        return schema;
    }

    private CardTypeSchemaDTO buildEmbySchema() {
        CardTypeSchemaDTO schema = baseSchema(ConfigModel.CARD_TYPE_EMBY, "Emby 统计", "展示 Emby 统计与任务", false, "iframe");
        schema.getFields().add(urlField("url", "默认地址", false, "https://emby.example.com"));
        schema.getFields().add(urlField("lanUrl", "内网地址", false, "http://192.168.1.100:8096"));
        schema.getFields().add(urlField("wanUrl", "外网地址", false, "https://emby.example.com"));
        CardTypeSchemaDTO.FieldSchemaDTO apiKey = passwordField("apiKey", "API Key", true, "请输入 Emby API Key");
        apiKey.setSecret(true);
        schema.getFields().add(apiKey);
        return schema;
    }

    private CardTypeSchemaDTO buildQbSchema() {
        CardTypeSchemaDTO schema = baseSchema(ConfigModel.CARD_TYPE_QBITTORRENT, "qBittorrent 统计", "展示 qBittorrent 下载状态", false, "iframe");
        schema.getFields().add(urlField("url", "默认地址", false, "https://qbt.example.com"));
        schema.getFields().add(urlField("lanUrl", "内网地址", false, "http://192.168.1.100:8081"));
        schema.getFields().add(urlField("wanUrl", "外网地址", false, "https://qbt.example.com"));
        schema.getFields().add(textField("username", "用户名", true, "admin"));
        CardTypeSchemaDTO.FieldSchemaDTO password = passwordField("password", "密码", true, "请输入 qBittorrent 密码");
        password.setSecret(true);
        schema.getFields().add(password);
        return schema;
    }

    private CardTypeSchemaDTO buildTransmissionSchema() {
        CardTypeSchemaDTO schema = baseSchema(ConfigModel.CARD_TYPE_TRANSMISSION, "Transmission 统计", "展示 Transmission 下载状态", false, "iframe");
        schema.getFields().add(urlField("url", "默认地址", false, "https://tr.example.com"));
        schema.getFields().add(urlField("lanUrl", "内网地址", false, "http://192.168.1.100:9091"));
        schema.getFields().add(urlField("wanUrl", "外网地址", false, "https://tr.example.com"));
        schema.getFields().add(textField("username", "用户名", true, "admin"));
        CardTypeSchemaDTO.FieldSchemaDTO password = passwordField("password", "密码", true, "请输入 Transmission 密码");
        password.setSecret(true);
        schema.getFields().add(password);
        return schema;
    }

    private CardTypeSchemaDTO baseSchema(
            String type,
            String name,
            String description,
            boolean healthCheckSupported,
            String defaultOpenMode
    ) {
        CardTypeSchemaDTO schema = new CardTypeSchemaDTO();
        schema.setType(type);
        schema.setName(name);
        schema.setDescription(description);
        schema.setHealthCheckSupported(healthCheckSupported);
        schema.setDefaultOpenMode(defaultOpenMode);
        return schema;
    }

    private CardTypeSchemaDTO.FieldSchemaDTO urlField(String key, String label, boolean required, String placeholder) {
        CardTypeSchemaDTO.FieldSchemaDTO field = new CardTypeSchemaDTO.FieldSchemaDTO();
        field.setKey(key);
        field.setLabel(label);
        field.setType("url");
        field.setRequired(required);
        field.setPlaceholder(placeholder);
        return field;
    }

    private CardTypeSchemaDTO.FieldSchemaDTO textField(String key, String label, boolean required, String placeholder) {
        CardTypeSchemaDTO.FieldSchemaDTO field = new CardTypeSchemaDTO.FieldSchemaDTO();
        field.setKey(key);
        field.setLabel(label);
        field.setType("text");
        field.setRequired(required);
        field.setPlaceholder(placeholder);
        return field;
    }

    private CardTypeSchemaDTO.FieldSchemaDTO passwordField(String key, String label, boolean required, String placeholder) {
        CardTypeSchemaDTO.FieldSchemaDTO field = new CardTypeSchemaDTO.FieldSchemaDTO();
        field.setKey(key);
        field.setLabel(label);
        field.setType("password");
        field.setRequired(required);
        field.setPlaceholder(placeholder);
        return field;
    }

    private CardTypeSchemaDTO.FieldSchemaDTO numberField(
            String key,
            String label,
            boolean required,
            Integer defaultValue,
            Integer min,
            Integer max
    ) {
        CardTypeSchemaDTO.FieldSchemaDTO field = new CardTypeSchemaDTO.FieldSchemaDTO();
        field.setKey(key);
        field.setLabel(label);
        field.setType("number");
        field.setRequired(required);
        field.setDefaultValue(defaultValue);
        field.setMin(min);
        field.setMax(max);
        return field;
    }

    private CardTypeSchemaDTO.FieldSchemaDTO selectField(String key, String label, boolean required, String defaultValue) {
        CardTypeSchemaDTO.FieldSchemaDTO field = new CardTypeSchemaDTO.FieldSchemaDTO();
        field.setKey(key);
        field.setLabel(label);
        field.setType("select");
        field.setRequired(required);
        field.setDefaultValue(defaultValue);
        return field;
    }

    private int normalizePort(Object value) {
        int port = 22;
        if (value instanceof Number number) {
            port = number.intValue();
        } else if (value instanceof String text && StringUtils.hasText(text)) {
            try {
                port = Integer.parseInt(text.trim());
            } catch (NumberFormatException ignored) {
                port = 22;
            }
        }
        if (port <= 0 || port > 65535) {
            return 22;
        }
        return port;
    }

    private void requireText(Object rawValue, String message) {
        if (!StringUtils.hasText(trimToNull(rawValue))) {
            throw new IllegalArgumentException(message);
        }
    }

    private void requireSecret(Map<String, ?> secrets, String key, String message) {
        Object raw = secrets.get(key);
        if (!StringUtils.hasText(trimToNull(raw))) {
            throw new IllegalArgumentException(message);
        }
    }

    private boolean hasAnyUrl(Map<String, Object> config) {
        return StringUtils.hasText(trimToNull(config.get("url")))
                || StringUtils.hasText(trimToNull(config.get("lanUrl")))
                || StringUtils.hasText(trimToNull(config.get("wanUrl")));
    }

    private String firstNonBlank(String... values) {
        Set<String> deduplicated = new LinkedHashSet<>();
        for (String value : values) {
            if (StringUtils.hasText(value)) {
                deduplicated.add(value.trim());
            }
        }
        return deduplicated.stream().findFirst().orElse(null);
    }

    private String trimToNull(Object raw) {
        if (!(raw instanceof String text)) {
            return null;
        }
        return StringUtils.hasText(text) ? text.trim() : null;
    }
}
