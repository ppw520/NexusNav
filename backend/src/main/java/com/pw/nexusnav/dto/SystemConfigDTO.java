package com.pw.nexusnav.dto;

import java.util.List;

public record SystemConfigDTO(
        String networkModePreference,
        String resolvedNetworkMode,
        String defaultSearchEngineId,
        List<SearchEngineDTO> searchEngines,
        boolean securityEnabled,
        boolean requireAuthForConfig,
        boolean dailySentenceEnabled,
        String backgroundType,
        String backgroundImageDataUrl
) {
    public record SearchEngineDTO(String id, String name, String searchUrlTemplate, String icon) {
    }
}
