package com.pw.nexusnav.dto;

import java.util.Map;

public record CardDTO(
        String id,
        String groupId,
        String name,
        String cardType,
        String openMode,
        String icon,
        String description,
        int orderIndex,
        boolean enabled,
        boolean healthCheckEnabled,
        String url,
        String lanUrl,
        String wanUrl,
        Map<String, Object> config,
        Map<String, Boolean> secretState
) {
}
