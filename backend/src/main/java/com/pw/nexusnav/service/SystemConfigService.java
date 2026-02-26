package com.pw.nexusnav.service;

import com.pw.nexusnav.config.IpUtils;
import com.pw.nexusnav.dto.AdminConfigDTO;
import com.pw.nexusnav.dto.AdminConfigUpdateRequest;
import com.pw.nexusnav.dto.SystemConfigDTO;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.Base64;
import java.util.List;
import java.util.Locale;

@Service
public class SystemConfigService {

    private static final BCryptPasswordEncoder BCRYPT = new BCryptPasswordEncoder();
    private static final int MAX_BACKGROUND_IMAGE_BYTES = 512 * 1024;
    private static final int MAX_SEARCH_ICON_LENGTH = 2048;

    private final ConfigImportService configImportService;
    private final ConfigMutationService configMutationService;

    public SystemConfigService(
            ConfigImportService configImportService,
            ConfigMutationService configMutationService
    ) {
        this.configImportService = configImportService;
        this.configMutationService = configMutationService;
    }

    public SystemConfigDTO getConfigForIp(String clientIp) {
        ConfigModel.SystemModel model = configImportService.getSystemConfig();
        String resolvedMode = resolveEffectiveMode(model.getNetworkModePreference(), clientIp);

        List<SystemConfigDTO.SearchEngineDTO> engines = model.getSearchEngines().stream()
                .map(item -> new SystemConfigDTO.SearchEngineDTO(
                        item.getId(),
                        item.getName(),
                        resolveTemplate(item, resolvedMode),
                        item.getIcon()
                ))
                .toList();

        return new SystemConfigDTO(
                model.getNetworkModePreference(),
                resolvedMode,
                model.getDefaultSearchEngineId(),
                engines,
                model.getSecurity().isEnabled(),
                model.getSecurity().isRequireAuthForConfig(),
                model.isDailySentenceEnabled(),
                model.getBackgroundType(),
                model.getBackgroundImageDataUrl()
        );
    }

    public AdminConfigDTO getAdminConfig() {
        ConfigModel.SystemModel model = configImportService.getSystemConfig();
        AdminConfigDTO dto = new AdminConfigDTO();
        dto.setNetworkModePreference(model.getNetworkModePreference());
        dto.setDefaultSearchEngineId(model.getDefaultSearchEngineId());
        dto.setDailySentenceEnabled(model.isDailySentenceEnabled());
        dto.setBackgroundType(model.getBackgroundType());
        dto.setBackgroundImageDataUrl(model.getBackgroundImageDataUrl());
        dto.setSearchEngines(model.getSearchEngines().stream().map(this::toSearchEngineDto).toList());

        AdminConfigDTO.SecurityDTO securityDTO = new AdminConfigDTO.SecurityDTO();
        securityDTO.setEnabled(model.getSecurity().isEnabled());
        securityDTO.setSessionTimeoutMinutes(model.getSecurity().getSessionTimeoutMinutes());
        securityDTO.setRequireAuthForConfig(model.getSecurity().isRequireAuthForConfig());
        dto.setSecurity(securityDTO);
        return dto;
    }

    public AdminConfigDTO updateAdminConfig(AdminConfigUpdateRequest request) {
        configMutationService.mutateSystem(system -> {
            validateAdminConfigRequest(request);
            system.setNetworkModePreference(request.getNetworkModePreference().toLowerCase(Locale.ROOT));
            system.setDefaultSearchEngineId(request.getDefaultSearchEngineId().trim());
            system.setDailySentenceEnabled(request.getDailySentenceEnabled() == null || request.getDailySentenceEnabled());
            system.setBackgroundType(request.getBackgroundType().trim().toLowerCase(Locale.ROOT));
            system.setBackgroundImageDataUrl(normalizeImageDataUrl(request.getBackgroundImageDataUrl()));
            system.setSearchEngines(request.getSearchEngines().stream().map(this::toSearchEngineModel).toList());

            ConfigModel.SecurityModel security = system.getSecurity();
            security.setEnabled(request.getSecurity().isEnabled());
            security.setSessionTimeoutMinutes(request.getSecurity().getSessionTimeoutMinutes());
            security.setRequireAuthForConfig(Boolean.TRUE.equals(request.getSecurity().getRequireAuthForConfig()));
            system.setSecurity(security);

            if (StringUtils.hasText(request.getNewAdminPassword())) {
                system.setAdminPassword(BCRYPT.encode(request.getNewAdminPassword().trim()));
            }
        });
        return getAdminConfig();
    }

    private AdminConfigDTO.SearchEngineItemDTO toSearchEngineDto(ConfigModel.SearchEngineItem item) {
        AdminConfigDTO.SearchEngineItemDTO dto = new AdminConfigDTO.SearchEngineItemDTO();
        dto.setId(item.getId());
        dto.setName(item.getName());
        dto.setSearchUrlTemplate(resolveTemplate(item, ConfigModel.NETWORK_MODE_AUTO));
        dto.setIcon(item.getIcon());
        return dto;
    }

    private ConfigModel.SearchEngineItem toSearchEngineModel(AdminConfigUpdateRequest.SearchEngineItemRequest request) {
        ConfigModel.SearchEngineItem item = new ConfigModel.SearchEngineItem();
        item.setId(request.getId().trim());
        item.setName(request.getName().trim());
        item.setSearchUrlTemplate(request.getSearchUrlTemplate().trim());
        item.setLanUrl(item.getSearchUrlTemplate());
        item.setWanUrl(item.getSearchUrlTemplate());
        item.setIcon(normalizeSearchIcon(request.getIcon()));
        return item;
    }

    private String resolveTemplate(ConfigModel.SearchEngineItem engine, String mode) {
        if (StringUtils.hasText(engine.getSearchUrlTemplate())) {
            return engine.getSearchUrlTemplate();
        }
        if (ConfigModel.NETWORK_MODE_LAN.equals(mode) && StringUtils.hasText(engine.getLanUrl())) {
            return engine.getLanUrl();
        }
        if (ConfigModel.NETWORK_MODE_WAN.equals(mode) && StringUtils.hasText(engine.getWanUrl())) {
            return engine.getWanUrl();
        }
        if (StringUtils.hasText(engine.getLanUrl())) {
            return engine.getLanUrl();
        }
        if (StringUtils.hasText(engine.getWanUrl())) {
            return engine.getWanUrl();
        }
        return "";
    }

    private String resolveEffectiveMode(String preference, String clientIp) {
        if (ConfigModel.NETWORK_MODE_LAN.equals(preference) || ConfigModel.NETWORK_MODE_WAN.equals(preference)) {
            return preference;
        }
        return IpUtils.isLanIp(clientIp) ? ConfigModel.NETWORK_MODE_LAN : ConfigModel.NETWORK_MODE_WAN;
    }

    private void validateAdminConfigRequest(AdminConfigUpdateRequest request) {
        if (request.getSecurity() == null) {
            throw new IllegalArgumentException("security is required");
        }
        if (request.getSecurity().getSessionTimeoutMinutes() <= 0) {
            throw new IllegalArgumentException("sessionTimeoutMinutes must be greater than 0");
        }
        if (request.getSearchEngines() == null || request.getSearchEngines().isEmpty()) {
            throw new IllegalArgumentException("searchEngines cannot be empty");
        }
        if (!StringUtils.hasText(request.getBackgroundType())) {
            throw new IllegalArgumentException("backgroundType is required");
        }
        String normalizedBackgroundType = request.getBackgroundType().trim().toLowerCase(Locale.ROOT);
        if (!"gradient".equals(normalizedBackgroundType) && !"image".equals(normalizedBackgroundType)) {
            throw new IllegalArgumentException("backgroundType must be gradient or image");
        }
        validateBackgroundDataUrl(request.getBackgroundImageDataUrl());
        for (AdminConfigUpdateRequest.SearchEngineItemRequest item : request.getSearchEngines()) {
            String icon = normalizeSearchIcon(item.getIcon());
            if (icon != null && icon.length() > MAX_SEARCH_ICON_LENGTH) {
                throw new IllegalArgumentException("searchEngine icon exceeds max length");
            }
        }
        boolean defaultExists = request.getSearchEngines().stream()
                .anyMatch(item -> item.getId().equals(request.getDefaultSearchEngineId()));
        if (!defaultExists) {
            throw new IllegalArgumentException("defaultSearchEngineId not found in searchEngines");
        }
    }

    private String normalizeSearchIcon(String icon) {
        if (!StringUtils.hasText(icon)) {
            return null;
        }
        String value = icon.trim();
        if (value.length() > MAX_SEARCH_ICON_LENGTH) {
            throw new IllegalArgumentException("searchEngine icon exceeds max length");
        }
        return value;
    }

    private String normalizeImageDataUrl(String dataUrl) {
        if (!StringUtils.hasText(dataUrl)) {
            return null;
        }
        return dataUrl.trim();
    }

    private void validateBackgroundDataUrl(String dataUrl) {
        if (!StringUtils.hasText(dataUrl)) {
            return;
        }
        String normalized = dataUrl.trim();
        if (!normalized.startsWith("data:image/") || !normalized.contains(";base64,")) {
            throw new IllegalArgumentException("backgroundImageDataUrl must be data:image/*;base64");
        }
        int base64Index = normalized.indexOf(";base64,");
        if (base64Index < 0) {
            throw new IllegalArgumentException("backgroundImageDataUrl must be base64 encoded");
        }
        String payload = normalized.substring(base64Index + ";base64,".length());
        byte[] decoded;
        try {
            decoded = Base64.getDecoder().decode(payload);
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("backgroundImageDataUrl is not valid base64");
        }
        if (decoded.length > MAX_BACKGROUND_IMAGE_BYTES) {
            throw new IllegalArgumentException("backgroundImageDataUrl exceeds 512KB");
        }
    }
}
